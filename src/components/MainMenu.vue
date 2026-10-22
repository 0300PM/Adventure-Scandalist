<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import GameButton from './GameButton.vue'
import type { Copy, Language } from '../i18n'
import type { GameAction, GameKeybinds, GameSession, GraphicsQuality, SessionList } from '../game/sessions'

export type MenuView = 'home' | 'new' | 'continue' | 'settings' | 'keybinds' | 'exit'

const props = defineProps<{
  t: Copy
  language: Language
  sessions: SessionList
  gameReady: boolean
  canContinue: boolean
  fullscreenActive: boolean
  graphicsQuality: GraphicsQuality
  shadows: boolean
  zoom: number
  keybinds: GameKeybinds
}>()
const emit = defineEmits<{
  'start-new': [slot: number, confirmed: boolean]
  'continue-session': [session: GameSession | null]
  'delete-session': [slot: number]
  'cycle-language': []
  'toggle-fullscreen': []
  'cycle-graphics-quality': []
  'toggle-shadows': []
  'set-keybind': [action: GameAction, key: string]
  exit: []
  'export-backup': []
  'import-backup': [file: File]
}>()

const pendingOverwrite = ref<number | null>(null)
const pendingDelete = ref<number | null>(null)
const sessionSlots = [1, 2, 3]
const fileInput = ref<HTMLInputElement | null>(null)
const view = ref<MenuView>('home')
const listeningAction = ref<GameAction | null>(null)
const keybindActions: Array<{ action: GameAction; label: keyof Copy }> = [
  { action: 'moveUp', label: 'bindMoveUp' }, { action: 'moveDown', label: 'bindMoveDown' },
  { action: 'moveLeft', label: 'bindMoveLeft' }, { action: 'moveRight', label: 'bindMoveRight' },
  { action: 'interact', label: 'bindInteract' }, { action: 'inventory', label: 'bindInventory' },
  { action: 'chronicle', label: 'bindChronicle' }, { action: 'craft', label: 'bindCraft' },
  { action: 'tasks', label: 'bindTasks' }, { action: 'pause', label: 'bindPause' },
  { action: 'melee', label: 'bindMelee' }, { action: 'ranged', label: 'bindRanged' }, { action: 'dodge', label: 'bindDodge' }, { action: 'sprint', label: 'bindSprint' },
]
const keyLabel = (key: string) => ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Escape: 'Esc' }[key] ?? key)
const stopListening = () => {
  window.removeEventListener('keydown', captureKey, true)
  listeningAction.value = null
}
const captureKey = (event: KeyboardEvent) => {
  const action = listeningAction.value
  if (!action) return
  const key = event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key
  if (!/^(?:[A-Z0-9]|Arrow(?:Up|Down|Left|Right)|Space|Escape|Enter)$/i.test(key)) return
  event.preventDefault()
  event.stopImmediatePropagation()
  emit('set-keybind', action, key)
  stopListening()
}
const listenForKey = (action: GameAction) => {
  stopListening()
  listeningAction.value = action
  window.addEventListener('keydown', captureKey, true)
}
onBeforeUnmount(stopListening)
const sessionAtSlot = (slot: number) => props.sessions[slot - 1] ?? null
const sessionDateForSlot = (slot: number) => {
  const session = sessionAtSlot(slot)
  return session ? new Intl.DateTimeFormat(props.language, { dateStyle: 'medium', timeStyle: 'short' }).format(session.updatedAt) : ''
}
const sessionEchoesForSlot = (slot: number) => {
  const save = sessionAtSlot(slot)?.save
  if (!save) return 0
  return save.region === 'continent'
    ? save.collected.filter((id) => id.startsWith('continent-memory-')).length
    : save.collected.filter((id) => ['shore-echo', 'oak-echo', 'camp-echo'].includes(id)).length
}

const openView = (next: MenuView) => {
  stopListening()
  pendingOverwrite.value = null
  pendingDelete.value = null
  view.value = next
}

const startSession = (slot: number) => {
  if (sessionAtSlot(slot) && pendingOverwrite.value !== slot) {
    pendingOverwrite.value = slot
    pendingDelete.value = null
    return
  }
  emit('start-new', slot, pendingOverwrite.value === slot)
  pendingOverwrite.value = null
}

const tryExit = () => {
  openView('exit')
  emit('exit')
}

const selectImportFile = () => fileInput.value?.click()
const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('import-backup', file)
  input.value = ''
}

const selectFromKeyboard = () => {
  if (view.value === 'home') openView('new')
  else openView('home')
}

defineExpose({ selectFromKeyboard })
</script>

<template>
  <div class="main-menu">
    <img class="menu-wallpaper" src="/Public/gui/paperUISystem/Sprites/Book Desk/1.png" alt="">
    <div class="menu-scrim" aria-hidden="true"></div>
    <GameButton class="menu-language" size="icon" :aria-label="t.locale" @click="emit('cycle-language')">{{ language.toUpperCase() }}</GameButton>
    <section class="menu-board" role="dialog" aria-modal="true" :aria-label="t.title">
      <img class="gui-frame" src="/Public/gui/paperUISystem/Sprites/Book Desk/2.png" alt="">
      <div v-if="view === 'home'" class="menu-content menu-home">
        <span class="story-sigil"><img src="/Public/gui/paperUISystem/Sprites/Content/1 Items/1.png" alt=""></span>
        <p class="story-chapter">{{ t.chapter }}</p>
        <h1>{{ t.title }}</h1>
        <p class="story-subtitle">{{ t.subtitle }}</p>
        <p class="menu-route">{{ t.menuRoute }}</p>
        <div class="story-rule"><span></span></div>
        <p class="story-copy">{{ t.intro }}</p>
        <div class="menu-actions">
          <GameButton class="menu-action" wide :disabled="!gameReady" @click="openView('new')">{{ t.menuNew }}</GameButton>
          <GameButton class="menu-action" wide :disabled="!canContinue || !gameReady" @click="openView('continue')">{{ t.menuContinue }}</GameButton>
          <GameButton class="menu-action" wide @click="openView('settings')">{{ t.menuSettings }}</GameButton>
          <GameButton class="menu-action" wide @click="tryExit">{{ t.menuExit }}</GameButton>
        </div>
      </div>
      <div v-else-if="view === 'new' || view === 'continue'" class="menu-content menu-subview menu-session-view">
        <p class="story-chapter">{{ t.title }}</p>
        <h2>{{ view === 'new' ? t.newSessionTitle : t.continueTitle }}</h2>
        <div class="session-list">
          <article v-for="slot in sessionSlots" :key="slot" class="session-card">
            <div class="session-info">
              <strong>{{ t.sessionSlot }} {{ slot }}</strong>
              <template v-if="sessionAtSlot(slot)">
                <small>{{ t.sessionProgress }}: {{ sessionEchoesForSlot(slot) }} / 3</small>
                <small>{{ sessionDateForSlot(slot) }}</small>
              </template>
              <small v-else>{{ t.sessionEmpty }}</small>
            </div>
            <div v-if="pendingOverwrite === slot" class="session-confirm">
              <span>{{ t.sessionConfirmReplace }}</span>
              <GameButton variant="danger" size="sm" @click="startSession(slot)">{{ t.sessionReplace }}</GameButton>
              <GameButton variant="secondary" size="sm" @click="pendingOverwrite = null">{{ t.sessionCancel }}</GameButton>
            </div>
            <div v-else-if="pendingDelete === slot" class="session-confirm">
              <span>{{ t.sessionConfirmDelete }}</span>
              <GameButton variant="danger" size="sm" @click="emit('delete-session', slot); pendingDelete = null">{{ t.sessionDelete }}</GameButton>
              <GameButton variant="secondary" size="sm" @click="pendingDelete = null">{{ t.sessionCancel }}</GameButton>
            </div>
            <div v-else class="session-actions">
              <GameButton v-if="view === 'new'" variant="secondary" size="sm" @click="startSession(slot)">{{ sessionAtSlot(slot) ? t.sessionReplace : t.sessionStart }}</GameButton>
              <template v-else>
                <GameButton size="sm" :disabled="!sessionAtSlot(slot) || !gameReady" @click="emit('continue-session', sessionAtSlot(slot))">{{ t.menuContinue }}</GameButton>
                <GameButton v-if="sessionAtSlot(slot)" variant="danger" size="sm" @click="pendingDelete = slot">{{ t.sessionDelete }}</GameButton>
              </template>
            </div>
          </article>
        </div>
        <GameButton class="menu-back" variant="secondary" wide @click="openView('home')">{{ t.menuBack }}</GameButton>
      </div>
      <div v-else-if="view === 'settings'" class="menu-content menu-subview settings-view">
        <p class="story-chapter">{{ t.title }}</p>
        <h2>{{ t.settingsTitle }}</h2>
        <div class="setting-row"><span>{{ t.settingsLanguage }}</span><GameButton variant="secondary" size="sm" :aria-label="t.settingsLanguage" @click="emit('cycle-language')">{{ language.toUpperCase() }}</GameButton></div>
        <div class="setting-row"><span>{{ fullscreenActive ? t.settingsFullscreenExit : t.settingsFullscreen }}</span><GameButton variant="secondary" size="sm" @click="emit('toggle-fullscreen')">{{ fullscreenActive ? '⤢' : '⛶' }}</GameButton></div>
        <div class="setting-row"><span>{{ t.settingsGraphics }}</span><GameButton variant="secondary" size="sm" @click="emit('cycle-graphics-quality')">{{ graphicsQuality === 'low' ? t.graphicsLow : graphicsQuality === 'medium' ? t.graphicsMedium : t.graphicsHigh }}</GameButton></div>
        <div class="setting-row"><span>{{ t.settingsShadows }}</span><GameButton variant="secondary" size="sm" @click="emit('toggle-shadows')">{{ shadows ? t.settingsOn : t.settingsOff }}</GameButton></div>
        <div class="setting-row"><span>{{ t.settingsZoom }}</span><strong>{{ t.zoomScroll }} · {{ Math.round(zoom * 100) }}%</strong></div>
        <div class="setting-row"><span>{{ t.settingsKeybinds }}</span><GameButton variant="secondary" size="sm" @click="openView('keybinds')">{{ t.configureKeybinds }}</GameButton></div>
        <div class="setting-row backup-actions"><GameButton variant="secondary" size="sm" @click="emit('export-backup')">{{ t.saveBackupExport }}</GameButton><GameButton variant="secondary" size="sm" @click="selectImportFile">{{ t.saveBackupImport }}</GameButton></div>
        <input ref="fileInput" class="backup-file-input" type="file" accept="application/json,.json" @change="handleFileChange">
        <GameButton class="menu-back" variant="secondary" wide @click="openView('home')">{{ t.menuBack }}</GameButton>
      </div>
      <div v-else-if="view === 'keybinds'" class="menu-content menu-subview keybind-view">
        <p class="story-chapter">{{ t.settingsTitle }}</p>
        <h2>{{ t.settingsKeybinds }}</h2>
        <div class="keybind-list">
          <div v-for="binding in keybindActions" :key="binding.action" class="setting-row keybind-row">
            <span>{{ t[binding.label] }}</span>
            <GameButton variant="secondary" size="sm" :class="{ 'keybind-listening': listeningAction === binding.action }" @click="listenForKey(binding.action)">{{ listeningAction === binding.action ? t.keybindListening : keyLabel(keybinds[binding.action]) }}</GameButton>
          </div>
        </div>
        <GameButton class="menu-back" variant="secondary" wide @click="openView('settings')">{{ t.menuBack }}</GameButton>
      </div>
      <div v-else class="menu-content menu-subview exit-view">
        <p class="story-chapter">{{ t.title }}</p>
        <h2>{{ t.exitTitle }}</h2>
        <p class="story-copy">{{ t.exitFallback }}</p>
        <GameButton wide @click="emit('exit')">{{ t.menuExit }}</GameButton>
        <GameButton class="menu-back" variant="secondary" wide @click="openView('home')">{{ t.menuBack }}</GameButton>
      </div>
    </section>
    <span class="story-footnote">{{ t.introTag }}</span>
  </div>
</template>
