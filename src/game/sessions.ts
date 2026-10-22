import type { Point } from './core'
import type { DroppedItem } from './world'
import type { WorldRegion } from './world'
import { ITEM_DETAILS } from './survival'
import type { InventorySlot } from './inventory'
import type { SurvivalNeeds } from './survival'
import { normalizeRpgState } from './rpg'
import type { RpgState } from './rpg'

export const SESSION_COUNT = 3
export const SESSION_STORAGE_KEY = 'memory-lighthouse-sessions-v1'
export const SAVE_BACKUP_FORMAT = 'latarnia-pamieci-save'

export type SavedAdventure = {
  position: Point
  inventory: InventorySlot[]
  collected: string[]
  completed: boolean
  region?: WorldRegion
  /** Odkryte wpisy Kroniki — starsze zapisy mogą ich nie mieć. */
  discovered?: string[]
  survival?: SurvivalNeeds
  equippedTool?: 'axe_tool' | 'pickaxe_tool' | null
  droppedItems?: DroppedItem[]
  rpg?: RpgState
}

export type GameSession = {
  slot: number
  updatedAt: number
  save: SavedAdventure
}

export type SessionList = Array<GameSession | null>
export type GraphicsQuality = 'low' | 'medium' | 'high'
export type GameAction = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight' | 'interact' | 'inventory' | 'chronicle' | 'craft' | 'tasks' | 'pause' | 'melee' | 'ranged' | 'dodge' | 'sprint'
export type GameKeybinds = Record<GameAction, string>
export const DEFAULT_KEYBINDS: GameKeybinds = {
  moveUp: 'W', moveDown: 'S', moveLeft: 'A', moveRight: 'D', interact: 'E', inventory: 'I', chronicle: 'K', craft: 'C', tasks: 'J', pause: 'Escape', melee: 'F', ranged: 'G', dodge: 'Space', sprint: 'Shift',
}
export type GamePreferences = {
  language: 'pl' | 'en' | 'es'
  graphicsQuality?: GraphicsQuality
  shadows?: boolean
  zoom?: number
  keybinds?: GameKeybinds
}
export type SaveBackup = {
  format: typeof SAVE_BACKUP_FORMAT
  version: 1
  exportedAt: string
  sessions: SessionList
  preferences: GamePreferences
}

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

export const emptySessions = (): SessionList => Array.from({ length: SESSION_COUNT }, () => null)
export const defaultPreferences = (): GamePreferences => ({ language: 'pl', graphicsQuality: 'high', shadows: true, zoom: 1, keybinds: { ...DEFAULT_KEYBINDS } })

const validKeybind = (key: unknown): key is string => typeof key === 'string' && /^(?:[A-Z0-9]|Arrow(?:Up|Down|Left|Right)|Space|Escape|Enter)$/i.test(key)

export const normalizePreferences = (value: Partial<GamePreferences>): GamePreferences => {
  const defaults = defaultPreferences()
  const zoom = Number.isFinite(value.zoom) ? Math.min(1.5, Math.max(0.7, value.zoom!)) : defaults.zoom
  const keybinds = { ...DEFAULT_KEYBINDS }
  if (value.keybinds && typeof value.keybinds === 'object') {
    for (const action of Object.keys(DEFAULT_KEYBINDS) as GameAction[]) {
      const candidate = value.keybinds[action]
      if (validKeybind(candidate)) keybinds[action] = candidate.length === 1 ? candidate.toUpperCase() : candidate
    }
  }
  return {
    language: value.language && ['pl', 'en', 'es'].includes(value.language) ? value.language : defaults.language,
    graphicsQuality: value.graphicsQuality && ['low', 'medium', 'high'].includes(value.graphicsQuality) ? value.graphicsQuality : defaults.graphicsQuality,
    shadows: typeof value.shadows === 'boolean' ? value.shadows : defaults.shadows,
    zoom,
    keybinds,
  }
}

export const isSavedAdventure = (value: unknown): value is SavedAdventure => {
  if (!value || typeof value !== 'object') return false
  const save = value as Partial<SavedAdventure>
  const region = save.region
  const discovered = save.discovered
  const survival = save.survival
  const equippedTool = save.equippedTool
  const droppedItems = save.droppedItems
  return Boolean(
    save.position && Number.isFinite(save.position.x) && Number.isFinite(save.position.y) &&
    (region === undefined || region === 'shore' || region === 'continent') &&
    (save.rpg === undefined || Boolean(save.rpg && typeof save.rpg === 'object')) &&
    (discovered === undefined || (Array.isArray(discovered) && discovered.every((id) => typeof id === 'string'))) &&
    (equippedTool === undefined || equippedTool === null || equippedTool === 'axe_tool' || equippedTool === 'pickaxe_tool') &&
    (droppedItems === undefined || (Array.isArray(droppedItems) && droppedItems.every((item) => Boolean(
      item && typeof item.id === 'string' && item.id.length > 0 && (item.region === undefined || item.region === 'shore' || item.region === 'continent') && typeof item.itemId === 'string' && Object.prototype.hasOwnProperty.call(ITEM_DETAILS, item.itemId) &&
      Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isInteger(item.quantity) && item.quantity > 0 &&
      Number.isInteger(item.maxStack) && item.maxStack > 0 && item.quantity <= item.maxStack
    )))) &&
    (survival === undefined || (
      Number.isFinite(survival.hunger) && survival.hunger >= 0 && survival.hunger <= 100 &&
      Number.isFinite(survival.thirst) && survival.thirst >= 0 && survival.thirst <= 100 &&
      Number.isFinite(survival.energy) && survival.energy >= 0 && survival.energy <= 100 &&
      Number.isFinite(survival.elapsedSeconds) && survival.elapsedSeconds >= 0 &&
      Boolean(survival.gathered && typeof survival.gathered === 'object' && Object.values(survival.gathered).every((count) => Number.isInteger(count) && count >= 0)) &&
      Array.isArray(survival.crafted) && survival.crafted.every((id) => typeof id === 'string') &&
      Array.isArray(survival.built) && survival.built.every((id) => typeof id === 'string')
    )) &&
    Array.isArray(save.inventory) && save.inventory.length === 12 &&
    save.inventory.every((slot) => slot === null || (
      Boolean(slot) && typeof slot.itemId === 'string' && slot.itemId.length > 0 &&
      Number.isInteger(slot.quantity) && slot.quantity > 0
    )) &&
    Array.isArray(save.collected) && save.collected.every((id) => typeof id === 'string') &&
    typeof save.completed === 'boolean',
  )
}

export const isGameSession = (value: unknown, slot: number): value is GameSession => {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<GameSession>
  return session.slot === slot && Number.isFinite(session.updatedAt) && isSavedAdventure(session.save)
}

export const parseSessionList = (value: unknown): SessionList => {
  if (!Array.isArray(value) || value.length !== SESSION_COUNT) return emptySessions()
  return value.map((session, index) => isGameSession(session, index + 1) ? session : null)
}

export const readSessions = (storage: StorageAdapter): SessionList => {
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY)
    return raw ? parseSessionList(JSON.parse(raw)) : emptySessions()
  } catch {
    return emptySessions()
  }
}

export const writeSessions = (sessions: SessionList, storage: StorageAdapter): void => {
  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    return
  }
}

export const replaceSession = (sessions: SessionList, slot: number, save: SavedAdventure, updatedAt = Date.now()): SessionList => {
  if (!Number.isInteger(slot) || slot < 1 || slot > SESSION_COUNT) return sessions
  const next = [...sessions]
  next[slot - 1] = {
    slot,
    updatedAt,
    save: {
      position: { ...save.position },
      inventory: save.inventory.map((item) => item && { ...item }),
      collected: [...save.collected],
      completed: save.completed,
      region: save.region ?? 'shore',
      discovered: [...(save.discovered ?? [])],
      survival: save.survival ? {
        ...save.survival,
        gathered: { ...save.survival.gathered },
        crafted: [...save.survival.crafted],
        built: [...save.survival.built],
      } : undefined,
      equippedTool: save.equippedTool ?? null,
      droppedItems: (save.droppedItems ?? []).map((item) => ({ ...item, region: item.region ?? 'shore' })),
      rpg: save.rpg ? normalizeRpgState(save.rpg) : undefined,
    },
  }
  return next
}

export const removeSession = (sessions: SessionList, slot: number): SessionList => {
  if (!Number.isInteger(slot) || slot < 1 || slot > SESSION_COUNT) return sessions
  const next = [...sessions]
  next[slot - 1] = null
  return next
}

export const createSaveBackup = (sessions: SessionList, preferences: GamePreferences, exportedAt = new Date().toISOString()): SaveBackup => ({
  format: SAVE_BACKUP_FORMAT,
  version: 1,
  exportedAt,
  sessions: parseSessionList(sessions),
  preferences: normalizePreferences(preferences),
})

export const parseSaveBackup = (value: unknown): SaveBackup | null => {
  if (!value || typeof value !== 'object') return null
  const backup = value as Partial<SaveBackup>
  if (backup.format !== SAVE_BACKUP_FORMAT || backup.version !== 1 || !Array.isArray(backup.sessions)) return null
  const preferences = backup.preferences as Partial<GamePreferences> | undefined
  if (!preferences || !['pl', 'en', 'es'].includes(preferences.language ?? '')) return null
  if (backup.sessions.length !== SESSION_COUNT || backup.sessions.some((session, index) => session !== null && !isGameSession(session, index + 1))) return null
  return createSaveBackup(backup.sessions as SessionList, normalizePreferences(preferences), backup.exportedAt ?? new Date().toISOString())
}

export const parseSaveBackupText = (content: string): SaveBackup | null => {
  try {
    return parseSaveBackup(JSON.parse(content))
  } catch {
    return null
  }
}
