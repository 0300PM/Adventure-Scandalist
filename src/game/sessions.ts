import type { Point } from './core'
import type { InventorySlot } from './inventory'

export const SESSION_COUNT = 3
export const SESSION_STORAGE_KEY = 'memory-lighthouse-sessions-v1'
export const SAVE_BACKUP_FORMAT = 'latarnia-pamieci-save'

export type SavedAdventure = {
  position: Point
  inventory: InventorySlot[]
  collected: string[]
  completed: boolean
}

export type GameSession = {
  slot: number
  updatedAt: number
  save: SavedAdventure
}

export type SessionList = Array<GameSession | null>
export type GamePreferences = { language: 'pl' | 'en' | 'es' }
export type SaveBackup = {
  format: typeof SAVE_BACKUP_FORMAT
  version: 1
  exportedAt: string
  sessions: SessionList
  preferences: GamePreferences
}

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

export const emptySessions = (): SessionList => Array.from({ length: SESSION_COUNT }, () => null)
export const defaultPreferences = (): GamePreferences => ({ language: 'pl' })

export const isSavedAdventure = (value: unknown): value is SavedAdventure => {
  if (!value || typeof value !== 'object') return false
  const save = value as Partial<SavedAdventure>
  return Boolean(
    save.position && Number.isFinite(save.position.x) && Number.isFinite(save.position.y) &&
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
  next[slot - 1] = { slot, updatedAt, save: { position: { ...save.position }, inventory: save.inventory.map((item) => item && { ...item }), collected: [...save.collected], completed: save.completed } }
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
  preferences: { ...preferences },
})

export const parseSaveBackup = (value: unknown): SaveBackup | null => {
  if (!value || typeof value !== 'object') return null
  const backup = value as Partial<SaveBackup>
  if (backup.format !== SAVE_BACKUP_FORMAT || backup.version !== 1 || !Array.isArray(backup.sessions)) return null
  const preferences = backup.preferences as Partial<GamePreferences> | undefined
  if (!preferences || !['pl', 'en', 'es'].includes(preferences.language ?? '')) return null
  if (backup.sessions.length !== SESSION_COUNT || backup.sessions.some((session, index) => session !== null && !isGameSession(session, index + 1))) return null
  return createSaveBackup(backup.sessions as SessionList, { language: preferences.language as GamePreferences['language'] }, backup.exportedAt ?? new Date().toISOString())
}

export const parseSaveBackupText = (content: string): SaveBackup | null => {
  try {
    return parseSaveBackup(JSON.parse(content))
  } catch {
    return null
  }
}
