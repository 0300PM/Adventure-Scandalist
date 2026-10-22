import { describe, expect, it } from 'vitest'
import { Inventory } from './inventory'
import {
  applyStatus,
  chooseDialogue,
  createRpgState,
  getHealthTier,
  grantExperience,
  npcPositionAt,
  NPCS,
  normalizeRpgState,
  tickStatuses,
  tradeOffer,
  unlockSkill,
  useRpgItem,
} from './rpg'

describe('RPG progression', () => {
  it('levels from combat experience and awards skill points and stronger stats', () => {
    const state = createRpgState()
    expect(grantExperience(state, 100)).toBe(1)
    expect(state.player.level).toBe(2)
    expect(state.player.skillPoints).toBe(1)
    expect(state.player.maxHealth).toBe(108)
    expect(unlockSkill(state, 'vitality')).toBe(true)
    expect(state.player.maxHealth).toBe(128)
    expect(unlockSkill(state, 'bladecraft')).toBe(false)
  })

  it('keeps combatant and player data inside valid bounds when restoring saves', () => {
    const saved = createRpgState()
    saved.player.health = 9999
    saved.player.level = -7
    saved.player.weaponLevel = 99
    saved.player.skills = ['vitality', 'unknown']
    saved.enemies[0].hp = 9999
    const normalized = normalizeRpgState(saved)
    expect(normalized.player.health).toBe(normalized.player.maxHealth)
    expect(normalized.player.level).toBe(1)
    expect(normalized.player.weaponLevel).toBe(3)
    expect(normalized.player.skills).toEqual(['vitality'])
    expect(normalized.enemies[0].hp).toBe(normalized.enemies[0].maxHp)
  })

  it('applies and expires poison and burn damage over time', () => {
    const target = { hp: 30, statuses: [] as ReturnType<typeof createRpgState>['player']['statuses'] }
    applyStatus(target, 'poison', 2)
    tickStatuses(target, 0.6)
    expect(target.hp).toBe(26)
    applyStatus(target, 'burn', 0.5)
    tickStatuses(target, 0.6)
    expect(target.hp).toBe(16)
    tickStatuses(target, 0.8)
    expect(target.hp).toBe(12)
    expect(target.statuses).toHaveLength(0)
  })

  it('records dialogue choices, trust, reputation and accepted quests', () => {
    const state = createRpgState()
    expect(chooseDialogue(state, 'tala', 'share-herbs')).toBe(true)
    expect(chooseDialogue(state, 'tala', 'share-herbs')).toBe(false)
    expect(state.social.choices.tala).toBe('share-herbs')
    expect(state.social.trust.tala).toBe(3)
    expect(state.social.reputation).toBe(2)
    expect(state.social.acceptedQuests).toContain('herbal-aid')
  })

  it('moves NPCs between home, work and evening locations as the day passes', () => {
    const tala = NPCS.find((npc) => npc.id === 'tala')!
    expect(npcPositionAt(tala, 0)).toEqual(tala.home)
    expect(npcPositionAt(tala, 200)).toEqual(tala.work)
    expect(npcPositionAt(tala, 900)).toEqual(tala.evening)
  })

  it('trades ingredients once per day and applies crafted potions', () => {
    const state = createRpgState()
    const inventory = new Inventory()
    inventory.add('berry_cluster', 2)
    inventory.add('medicinal_herb', 1)
    expect(tradeOffer(state, inventory, 'health-draught', 1)).toBe(true)
    expect(inventory.count('health_draught')).toBe(1)
    expect(tradeOffer(state, inventory, 'health-draught', 1)).toBe(false)
    state.player.health = 40
    expect(useRpgItem(state, inventory, 'health_draught')).toBe(true)
    expect(state.player.health).toBe(85)
    expect(inventory.count('health_draught')).toBe(0)
  })
})


describe('survival system couplings', () => {
  it('classifies health tiers from the ratio of current to maximum health', () => {
    expect(getHealthTier(100, 100)).toBe('healthy')
    expect(getHealthTier(76, 100)).toBe('healthy')
    expect(getHealthTier(75, 100)).toBe('damaged')
    expect(getHealthTier(41, 100)).toBe('damaged')
    expect(getHealthTier(40, 100)).toBe('warning')
    expect(getHealthTier(16, 100)).toBe('warning')
    expect(getHealthTier(15, 100)).toBe('critical')
    expect(getHealthTier(1, 100)).toBe('critical')
    expect(getHealthTier(0, 100)).toBe('dead')
  })

  it('normalizes the stamina regen delay field when restoring saves', () => {
    const saved = createRpgState()
    saved.player.staminaRegenDelay = 9999
    expect(normalizeRpgState(saved).player.staminaRegenDelay).toBe(10)
    saved.player.staminaRegenDelay = -5
    expect(normalizeRpgState(saved).player.staminaRegenDelay).toBe(0)
  })

  it('resets stamina regen delay on level up', () => {
    const state = createRpgState()
    state.player.staminaRegenDelay = 0.7
    grantExperience(state, 100)
    expect(state.player.staminaRegenDelay).toBe(0)
  })
})
