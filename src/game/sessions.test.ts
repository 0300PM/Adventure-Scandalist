import { describe, expect, it } from 'vitest'
import { createSaveBackup, DEFAULT_KEYBINDS, emptySessions, normalizePreferences, parseSaveBackupText, readSessions, removeSession, replaceSession, SESSION_STORAGE_KEY, writeSessions, type SavedAdventure } from './sessions'
import { createSurvivalNeeds } from './survival'
import { createRpgState } from './rpg'

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
    expect(sessions[1]?.save.region).toBe('shore')
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
    const backup = createSaveBackup(sessions, { language: 'es', graphicsQuality: 'low', shadows: false, zoom: 1.2 }, '2026-10-18T00:00:00.000Z')
    expect(parseSaveBackupText(JSON.stringify(backup))).toEqual(backup)
    expect(parseSaveBackupText('{bad json')).toBeNull()
    expect(parseSaveBackupText(JSON.stringify({ ...backup, format: 'other' }))).toBeNull()
  })

  it('normalizes older and invalid graphics preferences while preserving language', () => {
    expect(normalizePreferences({ language: 'es', graphicsQuality: 'medium', shadows: false, zoom: 2 })).toEqual({
      language: 'es', graphicsQuality: 'medium', shadows: false, zoom: 1.5, keybinds: DEFAULT_KEYBINDS,
    })
    expect(normalizePreferences({ language: 'en' })).toEqual({ language: 'en', graphicsQuality: 'high', shadows: true, zoom: 1, keybinds: DEFAULT_KEYBINDS })
  })

  it('round-trips survival needs, crafted upgrades and the equipped tool in JSON backups', () => {
    const survival = { ...createSurvivalNeeds(), hunger: 61, thirst: 44, energy: 83, elapsedSeconds: 2400, gathered: { wood_log: 8 }, crafted: ['stone-axe'], built: ['lean-to'] }
    const droppedItems = [{ id: 'dropped-1', itemId: 'wood_log', x: 512, y: 704, quantity: 3, maxStack: 99, region: 'continent' as const }]
    const session = replaceSession(emptySessions(), 1, { ...sampleSave, survival, equippedTool: 'axe_tool', droppedItems, region: 'continent' }, 4000)
    const backup = parseSaveBackupText(JSON.stringify(createSaveBackup(session, { language: 'en' })))
    expect(backup?.sessions[0]?.save.survival).toEqual(survival)
    expect(backup?.sessions[0]?.save.equippedTool).toBe('axe_tool')
    expect(backup?.sessions[0]?.save.droppedItems).toEqual(droppedItems)
    expect(backup?.sessions[0]?.save.region).toBe('continent')
  })

  it('keeps discovered chronicle entries and accepts older saves without them', () => {
    const legacy = { ...sampleSave }
    delete (legacy as Partial<SavedAdventure>).discovered
    const sessions = replaceSession(emptySessions(), 1, legacy, 2000)
    expect(sessions[0]?.save.discovered).toEqual([])

    const withLore = replaceSession(emptySessions(), 1, { ...sampleSave, discovered: ['place-camp', 'echo-shore'] }, 3000)
    expect(withLore[0]?.save.discovered).toEqual(['place-camp', 'echo-shore'])
    const restored = parseSaveBackupText(JSON.stringify(createSaveBackup(withLore, { language: 'pl' })))
    expect(restored?.sessions[0]?.save.discovered).toEqual(['place-camp', 'echo-shore'])
  })

  it('round-trips RPG progression, enemy state and NPC choices through JSON backups', () => {
    const rpg = createRpgState()
    rpg.player.level = 4
    rpg.player.experience = 42
    rpg.enemies[0].hp = 17
    rpg.social.choices.tala = 'share-herbs'
    rpg.social.trust.tala = 3
    rpg.social.acceptedQuests.push('herbal-aid')
    rpg.social.questProgress['herbal-aid'] = 2
    const saved = replaceSession(emptySessions(), 1, { ...sampleSave, rpg }, 5000)
    const restored = parseSaveBackupText(JSON.stringify(createSaveBackup(saved, { language: 'pl' })))
    expect(restored?.sessions[0]?.save.rpg?.player.level).toBe(4)
    expect(restored?.sessions[0]?.save.rpg?.enemies[0].hp).toBe(17)
    expect(restored?.sessions[0]?.save.rpg?.social.choices.tala).toBe('share-herbs')
    expect(restored?.sessions[0]?.save.rpg?.social.questProgress['herbal-aid']).toBe(2)
  })

  it('ignores malformed session data', () => {
    const storage = createStorage()
    storage.setItem(SESSION_STORAGE_KEY, '{broken')
    expect(readSessions(storage)).toEqual(emptySessions())
  })
})
