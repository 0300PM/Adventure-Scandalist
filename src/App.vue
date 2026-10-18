<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import type { AdventureGame, Direction, GameSnapshot } from './game/adventure'
import type { InventorySlot } from './game/inventory'
import { createGameRuntime, type GameRuntime } from './composables/createGameRuntime'
import { createSaveBackup, emptySessions, parseSaveBackupText, readSessions, removeSession as removeSavedSession, replaceSession, writeSessions, type GamePreferences, type GameSession, type SessionList } from './game/sessions'
import type { GameSaveStore } from './game/saveStore'

import { copy, type Language } from './i18n'
import MainMenu from './components/MainMenu.vue'
import GameHud from './components/GameHud.vue'
import ControlsOverlay from './components/ControlsOverlay.vue'
import PauseModal from './components/PauseModal.vue'
import InventoryModal from './components/InventoryModal.vue'
import EndingModal from './components/EndingModal.vue'
const language = ref<Language>('pl')
const t = computed(() => copy[language.value])
const gameHost = ref<HTMLElement | null>(null)
const atmosphereHost = ref<HTMLElement | null>(null)
const emptyInventory = (): InventorySlot[] => Array.from({ length: 12 }, () => null)
const emptySnapshot = (): GameSnapshot => ({ memories: 0, nearMemory: false, nearCamp: false, completed: false, inventory: emptyInventory(), position: { x: 374, y: 321 }, collected: [] })
const snapshot = ref<GameSnapshot>(emptySnapshot())
const started = ref(false)
const mainMenu = ref(true)
const menuRef = ref<InstanceType<typeof MainMenu> | null>(null)
const sessions = ref<SessionList>(emptySessions())
const activeSessionSlot = ref<number | null>(null)
const canContinue = computed(() => sessions.value.some(Boolean))
const fullscreenActive = ref(false)
const paused = ref(false)
const inventoryOpen = ref(false)
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
  'memory-echo': { icon: '/Public/gui/pocket_inv/Sprites/Content/Items/1.png', label: 'inventoryEcho' },
}
const itemIcon = (itemId: string) => itemPresentation[itemId]?.icon ?? '/Public/gui/pocket_inv/Sprites/Content/Items/0.png'
const itemName = (itemId: string) => {
  const label = itemPresentation[itemId]?.label
  return label ? t.value[label] : itemId
}
const nearbyHint = computed(() => {
  if (!started.value || paused.value) return ''
  if (snapshot.value.nearMemory) return t.value.collect
  if (snapshot.value.nearCamp) return snapshot.value.memories === 3 ? t.value.talk : t.value.returnDesc
  return ''
})

const showToast = (message: string) => {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3000)
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
  if (saveStore) void saveStore.savePreferences(preferences).catch(() => showToast(t.value.saveBackupError))
}

const downloadBackup = () => {
  const content = saveStore?.exportJson() ?? JSON.stringify(createSaveBackup(sessions.value, { language: language.value }), null, 2)
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'latarnia-pamieci-zapis.json'
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
    language.value = backup.preferences.language
    document.documentElement.lang = language.value
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
  }, now)
  persistSessionList()
  lastSessionSaveAt = now
}

const onNotice = (notice: 'memory' | 'camp' | 'ending' | 'inventory-full') => {
  if (notice === 'memory') {
    showToast(t.value.toastEcho)
    gsap.fromTo('.inventory-count', { scale: 1.4 }, { scale: 1, duration: 0.45, ease: 'back.out(2)' })
  } else if (notice === 'camp') {
    showToast(t.value.toastCamp)
  } else if (notice === 'inventory-full') {
    showToast(t.value.inventoryFull)
  } else {
    persistSession(true)
    started.value = false
    paused.value = false
    game.value?.start(false)
    gsap.fromTo('.ending-card', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' })
  }
}

const startNewSession = (slot: number) => {
  if (!gameReady.value) return
  game.value?.reset()
  snapshot.value = emptySnapshot()
  activeSessionSlot.value = slot
  lastSessionSaveAt = 0
  started.value = true
  mainMenu.value = false
  paused.value = false
  inventoryOpen.value = false
  game.value?.start(true)
  persistSession(true)
  gsap.fromTo('.map-stage', { scale: 0.985, opacity: 0.7 }, { scale: 1, opacity: 1, duration: 0.65, ease: 'power3.out' })
}

const continueSession = (session: GameSession | null) => {
  if (!session || !gameReady.value) return
  game.value?.restore(session.save)
  activeSessionSlot.value = session.slot
  lastSessionSaveAt = 0
  snapshot.value = { ...snapshot.value, completed: session.save.completed }
  started.value = !session.save.completed
  mainMenu.value = false
  paused.value = false
  inventoryOpen.value = false
  game.value?.start(started.value)
  gsap.fromTo('.map-stage', { scale: 0.985, opacity: 0.7 }, { scale: 1, opacity: 1, duration: 0.65, ease: 'power3.out' })
}

const goToMainMenu = () => {
  persistSession(true)
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
  if (inventoryOpen.value) inventoryOpen.value = false
  paused.value = !paused.value
  game.value?.start(!paused.value && !inventoryOpen.value)
  if (paused.value) persistSession(true)
}

const toggleInventory = (force?: boolean) => {
  const next = force ?? !inventoryOpen.value
  if (next && (!started.value || paused.value)) return
  inventoryOpen.value = next
  game.value?.start(started.value && !paused.value && !inventoryOpen.value)
}

const restart = () => {
  goToMainMenu()
  snapshot.value = emptySnapshot()
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
  savePreferences({ language: language.value })
}

onMounted(async () => {
  if (!gameHost.value || !atmosphereHost.value) return
  try {
    const { createGameSaveStore } = await import('./game/saveStore')
    saveStore = await createGameSaveStore()
    sessions.value = saveStore.loadSessions()
    const preferences = saveStore.loadPreferences()
    language.value = preferences.language
    document.documentElement.lang = language.value
  } catch {
    sessions.value = readSessions(window.localStorage)
  }
  window.addEventListener('pagehide', handlePageHide)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  handleFullscreenChange()
  gameRuntime = await createGameRuntime(gameHost.value, atmosphereHost.value, {
    onSnapshot: (value) => { snapshot.value = value; persistSession() },
    onNotice,
    onPause: () => {
      if (inventoryOpen.value) toggleInventory(false)
      else if (started.value || paused.value) togglePause()
    },
    onInventory: () => toggleInventory(),
    onSelect: () => {
      if (inventoryOpen.value) toggleInventory(false)
      else if (paused.value) togglePause()
      else if (mainMenu.value) menuRef.value?.selectFromKeyboard()
    },
    onReady: () => { gameReady.value = true },
  })
  game.value = gameRuntime.game
  gsap.from('.game-screen', { opacity: 0, duration: 0.8, ease: 'power2.out' })
})

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
  persistSession(true)
  window.removeEventListener('pagehide', handlePageHide)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  releaseAll()
  gameRuntime?.destroy()
  void saveStore?.close()
})
</script>

<template>
  <main class="game-screen fixed inset-0 overflow-hidden">
    <section class="map-stage relative h-full w-full" :class="{ 'is-paused': paused }" aria-label="Latarnia pamięci — świat gry">
      <div class="world-backdrop" :style="{ backgroundImage: `linear-gradient(rgba(7, 15, 12, .48), rgba(7, 15, 12, .58)), url('/Public/Tiled/Tiled_map.png')` }" aria-hidden="true"></div>
      <div ref="gameHost" class="phaser-host" aria-label="Interaktywna mapa gry"></div>
      <div ref="atmosphereHost" class="pixi-atmosphere" aria-hidden="true"></div>
      <div class="map-shade" aria-hidden="true"></div>

      <GameHud
        v-if="!mainMenu"
        :t="t"
        :language="language"
        :started="started"
        :snapshot="snapshot"
        :inventory-open="inventoryOpen"
        @cycle-language="cycleLanguage"
        @toggle-inventory="toggleInventory()"
        @toggle-pause="togglePause"
      />

      <ControlsOverlay
        :t="t"
        :started="started"
        :paused="paused"
        :nearby-hint="nearbyHint"
        @interact="setInteraction"
        @direction="setDirection"
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
          @start-new="startNewSession"
          @continue-session="continueSession"
          @delete-session="deleteSession"
          @cycle-language="cycleLanguage"
          @toggle-fullscreen="toggleFullscreen"
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
          @close="toggleInventory(false)"
          @select-slot="selectedSlot = $event"
        />
      </Transition>

      <Transition name="veil">
        <EndingModal v-if="snapshot.completed" :t="t" @back="restart" />
      </Transition>

      <Transition name="toast"><div v-if="toast" class="toast-message"><img class="toast-frame" src="/Public/gui/pocket_inv/Sprites/Content/Holders/10.png" alt=""><img class="toast-icon" src="/Public/gui/pocket_inv/Sprites/Content/Items/1.png" alt="">{{ toast }}</div></Transition>
    </section>
  </main>
</template>
