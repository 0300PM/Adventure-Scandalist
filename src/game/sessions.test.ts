import { describe, expect, it } from 'vitest'
import { createSaveBackup, emptySessions, parseSaveBackupText, readSessions, removeSession, replaceSession, SESSION_STORAGE_KEY, writeSessions, type SavedAdventure } from './sessions'

const sampleSave: SavedAdventure = {
  position: { x: 374, y: 321 },
  inventory: [{ itemId: 'memory-echo', quantity: 2 }, ...Array.from({ length: 11 }, () => null)],
  collected: ['shore-echo', 'oak-echo'],
  completed: false,
}

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

describe('session slots', () => {
  it('starts with three empty slots', () => {
    expect(emptySessions()).toEqual([null, null, null])
  })

  it('saves and restores a session from storage', () => {
    const storage = createStorage()
    const sessions = replaceSession(emptySessions(), 2, sampleSave, 1234)
    writeSessions(sessions, storage)
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeTruthy()
    expect(readSessions(storage)).toEqual(sessions)
  })

  it('replaces and removes sessions without changing other slots', () => {
    const first = replaceSession(emptySessions(), 1, sampleSave, 100)
    const second = replaceSession(first, 3, sampleSave, 200)
    const removed = removeSession(second, 1)
    expect(removed).toEqual([null, null, second[2]])
  })

  it('exports and validates a JSON backup with sessions and preferences', () => {
    const sessions = replaceSession(emptySessions(), 1, sampleSave, 1234)
    const backup = createSaveBackup(sessions, { language: 'es' }, '2026-10-18T00:00:00.000Z')
    expect(parseSaveBackupText(JSON.stringify(backup))).toEqual(backup)
    expect(parseSaveBackupText('{bad json')).toBeNull()
    expect(parseSaveBackupText(JSON.stringify({ ...backup, format: 'other' }))).toBeNull()
  })

  it('ignores malformed session data', () => {
    const storage = createStorage()
    storage.setItem(SESSION_STORAGE_KEY, '{broken')
    expect(readSessions(storage)).toEqual(emptySessions())
  })
})
