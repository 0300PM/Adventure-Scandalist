<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import type { AdventureGame, Direction, GameSnapshot, NearbyPickup } from './game/adventure'
import { Inventory, type InventorySlot } from './game/inventory'
import { createGameRuntime, type GameRuntime } from './composables/createGameRuntime'
import { createSaveBackup, DEFAULT_KEYBINDS, emptySessions, normalizePreferences, parseSaveBackupText, readSessions, removeSession as removeSavedSession, replaceSession, writeSessions, type GameAction, type GameKeybinds, type GamePreferences, type GameSession, type GraphicsQuality, type SessionList } from './game/sessions'
import type { GameSaveStore } from './game/saveStore'
import { findLoreEntry, type LoreEntry } from './game/lore'
import { ECHO_TOTAL, PICKUP_LORE, SPAWN } from './game/world'
import { createRpgState, NPCS } from './game/rpg'
import { getDayCycle, getObjectives, ITEM_DETAILS, RECIPES, canPerformRecipe, createSurvivalNeeds, type RecipeResult } from './game/survival'

import { copy, type Language } from './i18n'
import MainMenu from './components/MainMenu.vue'
import GameHud from './components/GameHud.vue'
import ControlsOverlay from './components/ControlsOverlay.vue'
import PauseModal from './components/PauseModal.vue'
import InventoryModal from './components/InventoryModal.vue'
import EndingModal from './components/EndingModal.vue'
import LoreModal from './components/LoreModal.vue'
import StoryModal from './components/StoryModal.vue'
import SurvivalModal from './components/SurvivalModal.vue'
import ToolToolbar, { type HarvestTool } from './components/ToolToolbar.vue'
import RpgModal, { type RpgTab } from './components/RpgModal.vue'

type ModalDestination = 'inventory' | 'chronicle' | 'craft' | 'tasks' | 'rpg'

const language = ref<Language>('pl')
const t = computed(() => copy[language.value])
const gameHost = ref<HTMLElement | null>(null)
const atmosphereHost = ref<HTMLElement | null>(null)
const emptyInventory = (): InventorySlot[] => Array.from({ length: 12 }, () => null)
const emptySnapshot = (): GameSnapshot => ({
  memories: 0,
  totalEchoes: ECHO_TOTAL,
  nearPickup: null,
  nearCamp: false,
  completed: false,
  region: 'shore',
  inventory: emptyInventory(),
  position: { ...SPAWN },
  collected: [],
  discovered: [],
  survival: createSurvivalNeeds(),
  equippedTool: null,
  droppedItems: [],
  nearbyNpc: null,
  rpg: createRpgState(),
})
const snapshot = ref<GameSnapshot>(emptySnapshot())
const started = ref(false)
const mainMenu = ref(true)
const menuRef = ref<InstanceType<typeof MainMenu> | null>(null)
const sessions = ref<SessionList>(emptySessions())
const activeSessionSlot = ref<number | null>(null)
const canContinue = computed(() => sessions.value.some(Boolean))
const fullscreenActive = ref(false)
const graphicsQuality = ref<GraphicsQuality>('high')
const shadowsEnabled = ref(true)
const zoom = ref(1)
const keybinds = ref<GameKeybinds>({ ...DEFAULT_KEYBINDS })
const paused = ref(false)
const hudActionsOpen = ref(true)
const inventoryOpen = ref(false)
const chronicleOpen = ref(false)
const survivalPanel = ref<'craft' | 'tasks' | null>(null)
const rpgPanel = ref<RpgTab | null>(null)
const selectedNpcId = ref<string | null>(null)
const storyEntry = ref<LoreEntry | null>(null)
const storyPickup = ref<NearbyPickup | null>(null)
const selectedSlot = ref(0)
const toast = ref('')
const gameReady = ref(false)
const game = ref<AdventureGame | null>(null)
let gameRuntime: GameRuntime | null = null
let toastTimer: ReturnType<typeof setTimeout> | undefined
let lastSessionSaveAt = 0
let saveStore: GameSaveStore | null = null

const selectedInventoryItem = computed(() => snapshot.value.inventory[selectedSlot.value])
const itemPresentation: Record<string, { icon: string; label: keyof typeof copy.pl }> = {
  'memory-echo': { icon: '/Public/gui/paperUISystem/Sprites/Content/1 Items/1.png', label: 'echoShort' },
  'sea-glass': { icon: '/Public/gui/paperUISystem/Sprites/Content/1 Items/2.png', label: 'relicShort' },
}
const itemIcon = (itemId: string) => itemPresentation[itemId]?.icon ?? `/Public/Items/Crafting_materials/png_32/${ITEM_DETAILS[itemId]?.icon ?? 'stone_block'}.png`
const itemName = (itemId: string) => {
  const label = itemPresentation[itemId]?.label
  return label ? t.value[label] : ITEM_DETAILS[itemId]?.name[language.value] ?? itemId
}
const overlayOpen = computed(() => paused.value || inventoryOpen.value || chronicleOpen.value || Boolean(survivalPanel.value) || Boolean(rpgPanel.value) || Boolean(storyEntry.value))
const activeModal = computed<ModalDestination | null>(() => inventoryOpen.value ? 'inventory' : chronicleOpen.value ? 'chronicle' : rpgPanel.value ? 'rpg' : survivalPanel.value)
const relicFound = computed(() => snapshot.value.collected.includes('aron-glass'))
const inventoryModel = computed(() => {
  const inventory = new Inventory()
  inventory.restore(snapshot.value.inventory)
  return inventory
})
const objectives = computed(() => getObjectives(snapshot.value.survival, snapshot.value.collected, snapshot.value.discovered, snapshot.value.region, snapshot.value.nearCamp))
const dayCycle = computed(() => getDayCycle(snapshot.value.survival.elapsedSeconds))
const recipeStatus = (recipeId: string) => {
  const recipe = RECIPES.find((candidate) => candidate.id === recipeId)
  return recipe ? canPerformRecipe(recipe, inventoryModel.value, snapshot.value.survival, snapshot.value.nearCamp) : 'missing'
}
const nearbyHint = computed(() => {
  if (!started.value || overlayOpen.value) return ''
  if (snapshot.value.nearPickup) {
    if (snapshot.value.nearPickup.itemId === 'memory-echo') return t.value.collect
    if (snapshot.value.nearPickup.itemId === 'sea-glass') return t.value.collectRelic
    return `${t.value.collectItem}: ${itemName(snapshot.value.nearPickup.itemId)}`
  }
  if (snapshot.value.nearbyNpc) {
    const npc = NPCS.find((entry) => entry.id === snapshot.value.nearbyNpc)
    return npc ? `${npc.name[language.value]} · ${npc.role[language.value]}` : t.value.dialogue
  }
  if (snapshot.value.nearCamp) {
    if (snapshot.value.region === 'continent') return snapshot.value.memories === ECHO_TOTAL ? t.value.continentReturn : t.value.continentQuest
    return snapshot.value.memories === ECHO_TOTAL ? t.value.talk : t.value.returnDesc
  }
  return ''
})

const showToast = (message: string) => {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3200)
}

const persistSessionList = () => {
  if (saveStore) {
    void saveStore.saveSessions(sessions.value).catch(() => showToast(t.value.saveBackupError))
    return
  }
  try {
    writeSessions(sessions.value, window.localStorage)
  } catch {
    showToast(t.value.saveBackupError)
  }
}

const savePreferences = (preferences: GamePreferences) => {
  const normalized = normalizePreferences(preferences)
  if (saveStore) {
    void saveStore.savePreferences(normalized).catch(() => showToast(t.value.saveBackupError))
    return
  }
  try {
    window.localStorage.setItem('memory-lighthouse-preferences', JSON.stringify(normalized))
  } catch {
    showToast(t.value.saveBackupError)
  }
}

const currentPreferences = (): GamePreferences => ({
  language: language.value,
  graphicsQuality: graphicsQuality.value,
  shadows: shadowsEnabled.value,
  zoom: zoom.value,
  keybinds: { ...keybinds.value },
})

const persistPreferences = () => savePreferences(currentPreferences())
const applyGraphicsSettings = () => gameRuntime?.setGraphicsSettings({ quality: graphicsQuality.value, shadows: shadowsEnabled.value })

const downloadBackup = () => {
  const content = saveStore?.exportJson() ?? JSON.stringify(createSaveBackup(sessions.value, currentPreferences()), null, 2)
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'adventure-scandalist-save.json'
  link.click()
  URL.revokeObjectURL(url)
  showToast(t.value.saveBackupDone)
}

const importBackup = async (file: File) => {
  try {
    const content = await file.text()
    const backup = saveStore
      ? await saveStore.importJson(content)
      : (() => {
        const parsed = parseSaveBackupText(content)
        if (!parsed) throw new Error('Invalid save backup')
        return { sessions: parsed.sessions, preferences: parsed.preferences }
      })()
    sessions.value = backup.sessions
    const preferences = normalizePreferences(backup.preferences)
    language.value = preferences.language
    graphicsQuality.value = preferences.graphicsQuality ?? 'high'
    shadowsEnabled.value = preferences.shadows ?? true
    zoom.value = preferences.zoom ?? 1
    keybinds.value = { ...(preferences.keybinds ?? DEFAULT_KEYBINDS) }
    document.documentElement.lang = language.value
    applyGraphicsSettings()
    game.value?.setKeybinds(keybinds.value)
    game.value?.setZoom(zoom.value)
    savePreferences(preferences)
    if (!saveStore) persistSessionList()
    showToast(t.value.saveBackupDone)
  } catch {
    showToast(t.value.saveBackupError)
  }
}

const persistSession = (force = false) => {
  const slot = activeSessionSlot.value
  const now = Date.now()
  if (slot === null || !started.value || (!force && now - lastSessionSaveAt < 1800)) return
  sessions.value = replaceSession(sessions.value, slot, {
    position: snapshot.value.position,
    inventory: snapshot.value.inventory,
    collected: snapshot.value.collected,
    completed: snapshot.value.completed,
    region: snapshot.value.region,
    discovered: snapshot.value.discovered,
    survival: snapshot.value.survival,
    equippedTool: snapshot.value.equippedTool,
    droppedItems: snapshot.value.droppedItems,
    rpg: snapshot.value.rpg,
  }, now)
  persistSessionList()
  lastSessionSaveAt = now
}

const resumeGame = () => game.value?.start(started.value && !paused.value && !inventoryOpen.value && !chronicleOpen.value && !survivalPanel.value && !rpgPanel.value && !storyEntry.value)

const closeOverlays = () => {
  inventoryOpen.value = false
  chronicleOpen.value = false
  survivalPanel.value = null
  rpgPanel.value = null
  selectedNpcId.value = null
  storyEntry.value = null
  storyPickup.value = null
}

const openStory = (pickup: NearbyPickup) => {
  const loreId = PICKUP_LORE[pickup.id]
  const entry = loreId ? findLoreEntry(loreId) : undefined
  if (!entry) return
  storyEntry.value = entry
  storyPickup.value = pickup
  game.value?.start(false)
}

const closeStory = () => {
  storyEntry.value = null
  storyPickup.value = null
  resumeGame()
  gsap.fromTo('.map-stage', { filter: 'brightness(1.08)' }, { filter: 'brightness(1)', duration: 0.5, ease: 'power2.out' })
}

const openSurvivalPanel = (mode: 'craft' | 'tasks') => {
  storyEntry.value = null
  inventoryOpen.value = false
  chronicleOpen.value = false
  rpgPanel.value = null
  selectedNpcId.value = null
  survivalPanel.value = mode
  game.value?.start(false)
}

const openRpgPanel = (tab: RpgTab = 'combat', npcId: string | null = null) => {
  if (!started.value || paused.value) return
  storyEntry.value = null
  inventoryOpen.value = false
  chronicleOpen.value = false
  survivalPanel.value = null
  rpgPanel.value = tab
  selectedNpcId.value = npcId
  game.value?.start(false)
}

const closeRpgPanel = () => {
  rpgPanel.value = null
  selectedNpcId.value = null
  resumeGame()
}

const chooseRpgDialogue = (choiceId: string) => {
  if (!selectedNpcId.value || !game.value?.chooseNpcDialogue(selectedNpcId.value, choiceId)) return
  const npc = NPCS.find((entry) => entry.id === selectedNpcId.value)
  const choice = npc?.choices.find((entry) => entry.id === choiceId)
  if (choiceId === 'ask-trade') rpgPanel.value = 'trade'
  if (choice) showToast(choice.result[language.value])
}

const tradeRpgOffer = (offerId: string) => {
  if (game.value?.tradeWithNpc(offerId)) showToast(t.value.traded)
  else showToast(t.value.tradeUnavailable)
}

const unlockRpgSkill = (skillId: string) => {
  if (game.value?.unlockCharacterSkill(skillId)) showToast(t.value.unlockSkill)
  else showToast(t.value.skillLocked)
}

const performCombatAction = (action: 'melee' | 'ranged' | 'dodge') => {
  const result = action === 'melee' ? game.value?.meleeAttack() : action === 'ranged' ? game.value?.rangedAttack() : game.value?.dodge()
  if (!result) showToast(action === 'dodge' ? t.value.attackNeeded : t.value.noEnemyNearby)
}

const closeSurvivalPanel = () => {
  survivalPanel.value = null
  resumeGame()
}

const navigateModal = (destination: ModalDestination) => {
  if (!started.value || paused.value) return
  if (destination === 'inventory') toggleInventory(true)
  else if (destination === 'chronicle') toggleChronicle(true)
  else if (destination === 'rpg') openRpgPanel('combat')
  else openSurvivalPanel(destination)
}

const cycleModal = (direction: -1 | 1) => {
  const destinations: ModalDestination[] = ['inventory', 'chronicle', 'craft', 'tasks', 'rpg']
  const current = activeModal.value
  if (!current) return
  const currentIndex = destinations.indexOf(current)
  const nextIndex = (currentIndex + direction + destinations.length) % destinations.length
  navigateModal(destinations[nextIndex])
}

const handleHudToggle = (event: KeyboardEvent) => {
  if (event.key !== 'Tab' || event.repeat || !started.value || mainMenu.value || overlayOpen.value) return
  const target = event.target as HTMLElement | null
  if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return
  event.preventDefault()
  event.stopImmediatePropagation()
  setHudActionsVisible(!hudActionsOpen.value)
}

const setHudActionsVisible = (visible: boolean) => {
  hudActionsOpen.value = visible
}

const handleModalNavigation = (event: KeyboardEvent) => {
  if (event.repeat || !activeModal.value || paused.value) return
  const target = event.target as HTMLElement | null
  if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return
  if (event.key.toLowerCase() === 'q') {
    event.preventDefault()
    event.stopImmediatePropagation()
    cycleModal(-1)
  } else if (event.key.toLowerCase() === 'e') {
    event.preventDefault()
    event.stopImmediatePropagation()
    cycleModal(1)
  }
}

const craftRecipe = (recipeId: string) => {
  const result: RecipeResult | undefined = game.value?.craft(recipeId)
  if (!result) return
  if (result === 'crafted') {
    const recipe = RECIPES.find((candidate) => candidate.id === recipeId)
    showToast(recipe?.kind === 'build' ? t.value.buildComplete : t.value.craftComplete)
  } else if (result === 'station') showToast(t.value.needCamp)
  else if (result === 'capacity') showToast(t.value.inventoryFull)
  else if (result === 'complete') showToast(t.value.alreadyComplete)
  else if (result === 'locked') showToast(t.value.recipeLocked)
  else showToast(t.value.needIngredients)
}

const useSelectedItem = () => {
  const item = selectedInventoryItem.value
  if (!item || !game.value?.useItem(item.itemId)) {
    showToast(t.value.cannotUse)
    return
  }
  showToast(t.value.itemUsed)
}

const toggleSelectedTool = () => {
  const itemId = selectedInventoryItem.value?.itemId
  if (itemId !== 'axe_tool' && itemId !== 'pickaxe_tool') return
  game.value?.equipTool(snapshot.value.equippedTool === itemId ? null : itemId)
}

const toggleToolbarTool = (itemId: HarvestTool) => {
  if (!snapshot.value.inventory.some((slot) => slot?.itemId === itemId)) return
  game.value?.equipTool(snapshot.value.equippedTool === itemId ? null : itemId)
}

const dropSelectedItem = () => {
  const item = selectedInventoryItem.value
  if (!item || !game.value?.dropItem(item.itemId, item.quantity)) return
  showToast(t.value.itemDropped)
}

const restAtCamp = () => {
  if (game.value?.restAtCamp()) showToast(t.value.rested)
  else showToast(t.value.needCamp)
}

const onNotice = (notice: 'memory' | 'relic' | 'camp' | 'ending' | 'inventory-full' | 'tool-needed' | 'beacon-needed' | 'enemy-defeated' | 'level-up' | 'player-defeated' | 'quest-complete' | 'combat-reward' | 'hungry' | 'starving') => {
  if (notice === 'memory') {
    showToast(t.value.toastEcho)
    gsap.fromTo('.inventory-count', { scale: 1.4 }, { scale: 1, duration: 0.45, ease: 'back.out(2)' })
  } else if (notice === 'relic') {
    showToast(t.value.relicToast)
  } else if (notice === 'camp') {
    showToast(t.value.toastCamp)
  } else if (notice === 'inventory-full') {
    showToast(t.value.inventoryFull)
  } else if (notice === 'tool-needed') {
    showToast(t.value.toolNeeded)
  } else if (notice === 'beacon-needed') {
    showToast(t.value.beaconNeeded)
  } else if (notice === 'enemy-defeated' || notice === 'combat-reward') {
    showToast(t.value.combatReward)
  } else if (notice === 'level-up') {
    showToast(`${t.value.level} ${snapshot.value.rpg.player.level + 1}`)
  } else if (notice === 'player-defeated') {
    showToast(t.value.respawned)
  } else if (notice === 'hungry') {
    showToast(t.value.toastHungry)
  } else if (notice === 'starving') {
    showToast(t.value.toastStarving)
    gsap.fromTo('.vitals', { x: -4 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
  } else if (notice === 'quest-complete') {
    showToast(`${t.value.completed}: ${t.value.quests}`)
  } else if (notice === 'ending') {
    persistSession(true)
    started.value = false
    paused.value = false
    chronicleOpen.value = false
    rpgPanel.value = null
    storyEntry.value = null
    game.value?.start(false)
    gsap.fromTo('.ending-card', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' })
  }
}

const onDiscover = (loreId: string) => {
  const entry = findLoreEntry(loreId)
  if (!entry) return
  showToast(`${t.value.loreUnlocked}: ${entry.title[language.value]}`)
  gsap.fromTo('.chronicle-toggle', { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'back.out(2.4)' })
}

const onPickup = (pickup: NearbyPickup) => {
  if (PICKUP_LORE[pickup.id]) openStory(pickup)
  else showToast(`+ ${itemName(pickup.itemId)}`)
}

const startNewSession = (slot: number) => {
  if (!gameReady.value) return
  closeOverlays()
  game.value?.reset()
  activeSessionSlot.value = slot
  lastSessionSaveAt = 0
  started.value = true
  mainMenu.value = false
  paused.value = false
  setHudActionsVisible(true)
  inventoryOpen.value = false
  game.value?.start(true)
  persistSession(true)
  gsap.fromTo('.map-stage', { scale: 0.985, opacity: 0.7 }, { scale: 1, opacity: 1, duration: 0.65, ease: 'power3.out' })
}

const continueSession = (session: GameSession | null) => {
  if (!session || !gameReady.value) return
  closeOverlays()
  game.value?.restore(session.save)
  activeSessionSlot.value = session.slot
  lastSessionSaveAt = 0
  started.value = !session.save.completed
  mainMenu.value = false
  paused.value = false
  setHudActionsVisible(true)
  inventoryOpen.value = false
  game.value?.start(started.value)
  gsap.fromTo('.map-stage', { scale: 0.985, opacity: 0.7 }, { scale: 1, opacity: 1, duration: 0.65, ease: 'power3.out' })
}

const goToMainMenu = () => {
  persistSession(true)
  closeOverlays()
  game.value?.start(false)
  started.value = false
  paused.value = false
  inventoryOpen.value = false
  mainMenu.value = true
  activeSessionSlot.value = null
}

const deleteSession = (slot: number) => {
  sessions.value = removeSavedSession(sessions.value, slot)
  persistSessionList()
}

const togglePause = () => {
  if (!started.value && !paused.value) return
  closeOverlays()
  paused.value = !paused.value
  resumeGame()
  if (paused.value) persistSession(true)
}

const toggleInventory = (force?: boolean) => {
  const next = force ?? !inventoryOpen.value
  if (next && (!started.value || paused.value)) return
  if (next) {
    chronicleOpen.value = false
    survivalPanel.value = null
    rpgPanel.value = null
    selectedNpcId.value = null
    storyEntry.value = null
    storyPickup.value = null
  }
  inventoryOpen.value = next
  resumeGame()
}

const toggleChronicle = (force?: boolean) => {
  const next = force ?? !chronicleOpen.value
  if (next && (mainMenu.value || paused.value)) return
  if (next) {
    inventoryOpen.value = false
    survivalPanel.value = null
    rpgPanel.value = null
    selectedNpcId.value = null
    storyEntry.value = null
    storyPickup.value = null
  }
  chronicleOpen.value = next
  resumeGame()
}

const restart = () => {
  goToMainMenu()
  snapshot.value = emptySnapshot()
}

const sailToContinent = () => {
  if (!game.value?.sailToContinent()) return
  closeOverlays()
  paused.value = false
  mainMenu.value = false
  started.value = true
  game.value.start(true)
  persistSession(true)
  showToast(t.value.voyageToast)
  gsap.fromTo('.map-stage', { filter: 'brightness(1.8) saturate(.7)' }, { filter: 'brightness(1)', duration: 1.1, ease: 'power2.out' })
}

const toggleFullscreen = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    showToast(t.value.settingsFullscreen)
  }
}

const exitGame = () => {
  persistSession(true)
  window.close()
}

const handlePageHide = () => persistSession(true)
const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') persistSession(true)
}
const handleFullscreenChange = () => { fullscreenActive.value = Boolean(document.fullscreenElement) }

const setDirection = (direction: Direction, pressed: boolean) => game.value?.direction(direction, pressed)
const releaseAll = () => (['up', 'down', 'left', 'right'] as Direction[]).forEach((direction) => setDirection(direction, false))
const setInteraction = (pressed: boolean) => game.value?.interact(pressed)

const cycleLanguage = () => {
  const options: Language[] = ['pl', 'en', 'es']
  language.value = options[(options.indexOf(language.value) + 1) % options.length]
  document.documentElement.lang = language.value
  persistPreferences()
}

const cycleGraphicsQuality = () => {
  const options: GraphicsQuality[] = ['low', 'medium', 'high']
  graphicsQuality.value = options[(options.indexOf(graphicsQuality.value) + 1) % options.length]
  applyGraphicsSettings()
  persistPreferences()
}

const toggleShadows = () => {
  shadowsEnabled.value = !shadowsEnabled.value
  applyGraphicsSettings()
  persistPreferences()
}

const setZoomFromEngine = (value: number) => {
  zoom.value = value
  persistPreferences()
}

const updateKeybind = (action: GameAction, key: string) => {
  keybinds.value = { ...keybinds.value, [action]: key }
  gameRuntime?.setKeybinds(keybinds.value)
  persistPreferences()
}

onMounted(async () => {
  if (!gameHost.value || !atmosphereHost.value) return
  try {
    const { createGameSaveStore } = await import('./game/saveStore')
    saveStore = await createGameSaveStore()
    sessions.value = saveStore.loadSessions()
    const preferences = normalizePreferences(saveStore.loadPreferences())
    language.value = preferences.language
    graphicsQuality.value = preferences.graphicsQuality ?? 'high'
    shadowsEnabled.value = preferences.shadows ?? true
    zoom.value = preferences.zoom ?? 1
    keybinds.value = { ...(preferences.keybinds ?? DEFAULT_KEYBINDS) }
    document.documentElement.lang = language.value
  } catch {
    sessions.value = readSessions(window.localStorage)
    try {
      const stored = window.localStorage.getItem('memory-lighthouse-preferences')
      if (stored) {
        const preferences = normalizePreferences(JSON.parse(stored) as Partial<GamePreferences>)
        language.value = preferences.language
        graphicsQuality.value = preferences.graphicsQuality ?? 'high'
        shadowsEnabled.value = preferences.shadows ?? true
        zoom.value = preferences.zoom ?? 1
        keybinds.value = { ...(preferences.keybinds ?? DEFAULT_KEYBINDS) }
        document.documentElement.lang = language.value
      }
    } catch {
      language.value = 'pl'
    }
  }
  window.addEventListener('pagehide', handlePageHide)
  window.addEventListener('keydown', handleModalNavigation, true)
  window.addEventListener('keydown', handleHudToggle, true)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  handleFullscreenChange()
  gameRuntime = await createGameRuntime(gameHost.value, atmosphereHost.value, {
    onSnapshot: (value) => {
      const previous = snapshot.value
      const gained = value.collected.length > previous.collected.length
        || value.discovered.length > previous.discovered.length
      const inventoryChanged = JSON.stringify(value.inventory) !== JSON.stringify(previous.inventory)
        || JSON.stringify(value.droppedItems) !== JSON.stringify(previous.droppedItems)
        || value.equippedTool !== previous.equippedTool
        || value.completed !== previous.completed
        || value.region !== previous.region
      const rpgMilestoneChanged = JSON.stringify(value.rpg.social) !== JSON.stringify(previous.rpg.social)
        || value.rpg.player.level !== previous.rpg.player.level
        || value.rpg.player.experience !== previous.rpg.player.experience
        || value.rpg.player.skillPoints !== previous.rpg.player.skillPoints
        || JSON.stringify(value.rpg.player.skills) !== JSON.stringify(previous.rpg.player.skills)
        || value.rpg.player.equippedWeapon !== previous.rpg.player.equippedWeapon
        || value.rpg.player.weaponLevel !== previous.rpg.player.weaponLevel
        || value.rpg.player.armorLevel !== previous.rpg.player.armorLevel
        || value.rpg.enemies.some((enemy, index) => enemy.alive !== previous.rpg.enemies[index]?.alive)
      snapshot.value = value
      persistSession(gained || inventoryChanged || rpgMilestoneChanged)
    },
    onNotice,
    onPickup,
    onNpc: (npcId) => openRpgPanel('dialogue', npcId),
    onDiscover,
    onCamp: () => openSurvivalPanel('craft'),
    onCraft: () => openSurvivalPanel('craft'),
    onTasks: () => openSurvivalPanel('tasks'),
    onZoomChange: setZoomFromEngine,
    onPause: () => {
      if (survivalPanel.value) closeSurvivalPanel()
      else if (rpgPanel.value) closeRpgPanel()
      else if (storyEntry.value) closeStory()
      else if (chronicleOpen.value) toggleChronicle(false)
      else if (inventoryOpen.value) toggleInventory(false)
      else if (started.value || paused.value) togglePause()
    },
    onInventory: () => toggleInventory(),
    onChronicle: () => toggleChronicle(),
    onSelect: () => {
      if (survivalPanel.value) closeSurvivalPanel()
      else if (rpgPanel.value) closeRpgPanel()
      else if (storyEntry.value) closeStory()
      else if (chronicleOpen.value) toggleChronicle(false)
      else if (inventoryOpen.value) toggleInventory(false)
      else if (paused.value) togglePause()
      else if (mainMenu.value) menuRef.value?.selectFromKeyboard()
    },
    onReady: () => { gameReady.value = true },
  }, { quality: graphicsQuality.value, shadows: shadowsEnabled.value }, keybinds.value)
  game.value = gameRuntime.game
  game.value.setZoom(zoom.value)
  gsap.from('.game-screen', { opacity: 0, duration: 0.8, ease: 'power2.out' })
})

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
  persistSession(true)
  window.removeEventListener('pagehide', handlePageHide)
  window.removeEventListener('keydown', handleModalNavigation, true)
  window.removeEventListener('keydown', handleHudToggle, true)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  releaseAll()
  gameRuntime?.destroy()
  void saveStore?.close()
})
</script>

<template>
  <main class="game-screen fixed inset-0 overflow-hidden">
    <section class="map-stage relative h-full w-full" :class="{ 'is-paused': paused, 'has-tool-toolbar': started && !overlayOpen, 'continent-mode': snapshot.region === 'continent' }" :aria-label="`${t.title} — ${snapshot.region === 'continent' ? t.continentName : t.map}`">
      <div class="world-backdrop" :style="{ backgroundImage: `linear-gradient(rgba(7, 15, 12, .48), rgba(7, 15, 12, .58)), url('/Public/Tiled/Tiled_map.png')` }" aria-hidden="true"></div>
      <div ref="gameHost" class="phaser-host" aria-label="Interaktywna mapa gry"></div>
      <div ref="atmosphereHost" class="pixi-atmosphere" aria-hidden="true"></div>
      <div class="day-night-overlay" :style="{ backgroundColor: `rgba(18, 25, 72, ${dayCycle.darkness})` }" aria-hidden="true"></div>
      <div class="map-shade" aria-hidden="true"></div>

      <GameHud
        v-if="!mainMenu"
        :t="t"
        :language="language"
        :started="started"
        :snapshot="snapshot"
        :survival="snapshot.survival"
        :inventory-open="inventoryOpen"
        :chronicle-open="chronicleOpen"
        :actions-open="hudActionsOpen"
        @toggle-actions="setHudActionsVisible(!hudActionsOpen)"
        @cycle-language="cycleLanguage"
        @toggle-inventory="toggleInventory()"
        @toggle-chronicle="toggleChronicle()"
        @open-craft="openSurvivalPanel('craft')"
        @open-tasks="openSurvivalPanel('tasks')"
        @toggle-pause="togglePause"
        @open-rpg="openRpgPanel('combat')"
      />

      <ControlsOverlay
        :t="t"
        :started="started"
        :paused="overlayOpen"
        :nearby-hint="nearbyHint"
        @interact="setInteraction"
        @direction="setDirection"
      />

      <ToolToolbar
        v-if="started && !overlayOpen"
        :t="t"
        :inventory="snapshot.inventory"
        :equipped-tool="snapshot.equippedTool"
        :item-icon="itemIcon"
        :item-name="itemName"
        @equip="toggleToolbarTool"
      />

      <Transition name="veil">
        <MainMenu
          v-if="mainMenu"
          ref="menuRef"
          :t="t"
          :language="language"
          :sessions="sessions"
          :game-ready="gameReady"
          :can-continue="canContinue"
          :fullscreen-active="fullscreenActive"
          :graphics-quality="graphicsQuality"
          :shadows="shadowsEnabled"
          :zoom="zoom"
          :keybinds="keybinds"
          @start-new="startNewSession"
          @continue-session="continueSession"
          @delete-session="deleteSession"
          @cycle-language="cycleLanguage"
          @toggle-fullscreen="toggleFullscreen"
          @cycle-graphics-quality="cycleGraphicsQuality"
          @toggle-shadows="toggleShadows"
          @set-keybind="updateKeybind"
          @exit="exitGame"
          @export-backup="downloadBackup"
          @import-backup="importBackup"
        />
      </Transition>

      <Transition name="veil">
        <PauseModal v-if="paused" :t="t" @resume="togglePause" @menu="goToMainMenu" />
      </Transition>

      <Transition name="veil">
        <InventoryModal
          v-if="inventoryOpen"
          :t="t"
          :snapshot="snapshot"
          :selected-slot="selectedSlot"
          :selected-inventory-item="selectedInventoryItem"
          :item-icon="itemIcon"
          :item-name="itemName"
          :equipped-tool="snapshot.equippedTool"
          @close="toggleInventory(false)"
          @select-slot="selectedSlot = $event"
          @use-item="useSelectedItem"
          @equip-tool="toggleSelectedTool"
          @drop-item="dropSelectedItem"
        />
      </Transition>

      <Transition name="veil">
        <SurvivalModal
          v-if="survivalPanel"
          :t="t"
          :language="language"
          :mode="survivalPanel"
          :survival="snapshot.survival"
          :inventory="snapshot.inventory"
          :objectives="objectives"
          :recipes="RECIPES"
          :near-camp="snapshot.nearCamp"
          :item-icon="itemIcon"
          :item-name="itemName"
          :recipe-status="recipeStatus"
          @close="closeSurvivalPanel"
          @craft="craftRecipe"
          @rest="restAtCamp"
        />
      </Transition>

      <Transition name="veil">
        <RpgModal
          v-if="rpgPanel"
          :t="t"
          :language="language"
          :mode="rpgPanel"
          :npc-id="selectedNpcId"
          :rpg="snapshot.rpg"
          :inventory="snapshot.inventory"
          :recipes="RECIPES"
          :region="snapshot.region"
          :day="snapshot.survival.elapsedSeconds"
          :position="snapshot.position"
          :item-icon="itemIcon"
          :item-name="itemName"
          :recipe-status="recipeStatus"
          @tab="rpgPanel = $event"
          @close="closeRpgPanel"
          @dialogue="chooseRpgDialogue"
          @trade="tradeRpgOffer"
          @skill="unlockRpgSkill"
          @craft="craftRecipe"
          @attack="performCombatAction"
        />
      </Transition>

      <Transition name="veil">
        <LoreModal
          v-if="chronicleOpen"
          :t="t"
          :language="language"
          :discovered="snapshot.discovered"
          @close="toggleChronicle(false)"
        />
      </Transition>

      <Transition name="veil">
        <StoryModal
          v-if="storyEntry"
          :t="t"
          :language="language"
          :entry="storyEntry"
          :item-icon="storyPickup ? itemIcon(storyPickup.itemId) : '/Public/gui/paperUISystem/Sprites/Content/1 Items/1.png'"
          :item-name="storyPickup ? itemName(storyPickup.itemId) : ''"
          @close="closeStory"
        />
      </Transition>

      <Transition name="veil">
        <EndingModal v-if="snapshot.completed && !chronicleOpen" :t="t" :relic-found="relicFound" :region="snapshot.region" @back="restart" @sail="sailToContinent" @open-chronicle="toggleChronicle(true)" />
      </Transition>

      <Transition name="toast"><div v-if="toast" class="toast-message"><img class="toast-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/4 Notification/1.png" alt=""><img class="toast-icon" src="/Public/gui/paperUISystem/Sprites/Content/1 Items/1.png" alt="">{{ toast }}</div></Transition>
    </section>
  </main>
</template>
