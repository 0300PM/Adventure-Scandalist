import { describe, expect, it } from 'vitest'
import { applyStarvation, conditionTier, getVitalProfile, hungerTier, staminaRatio } from './vitals'

const base = {
  hunger: 100,
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
}

describe('vitals', () => {
  it('splits hunger into four readable tiers', () => {
    expect(hungerTier(100)).toBe('sated')
    expect(hungerTier(70)).toBe('sated')
    expect(hungerTier(69)).toBe('steady')
    expect(hungerTier(35)).toBe('steady')
    expect(hungerTier(34)).toBe('hungry')
    expect(hungerTier(15)).toBe('hungry')
    expect(hungerTier(14)).toBe('starving')
    expect(hungerTier(Number.NaN)).toBe('starving')
  })

  it('warns about wounds before the hero collapses', () => {
    expect(conditionTier(100, 100)).toBe('steady')
    expect(conditionTier(36, 100)).toBe('steady')
    expect(conditionTier(35, 100)).toBe('wounded')
    expect(conditionTier(21, 100)).toBe('wounded')
    expect(conditionTier(20, 100)).toBe('critical')
    expect(conditionTier(0, 0)).toBe('critical')
  })

  it('turns hunger into a stamina, movement and melee trade-off', () => {
    const sated = getVitalProfile(base)
    const hungry = getVitalProfile({ ...base, hunger: 30 })
    const starving = getVitalProfile({ ...base, hunger: 5 })

    expect(hungry.staminaRegenPerSecond).toBeLessThan(sated.staminaRegenPerSecond)
    expect(starving.staminaRegenPerSecond).toBeLessThan(hungry.staminaRegenPerSecond)
    expect(hungry.moveScale).toBeLessThan(1)
    expect(starving.moveScale).toBeLessThan(hungry.moveScale)
    expect(starving.meleeScale).toBeLessThan(1)
    expect(hungry.canSprint).toBe(true)
    expect(starving.canSprint).toBe(false)
  })

  it('never regenerates health without food, rest or a potion', () => {
    expect(getVitalProfile(base)).not.toHaveProperty('healthRegenPerSecond')
    expect(getVitalProfile({ ...base, atCamp: true, resting: true })).not.toHaveProperty('healthRegenPerSecond')
    expect(getVitalProfile({ ...base, hunger: 30 })).not.toHaveProperty('healthRegenPerSecond')
    expect(getVitalProfile({ ...base, hasStatus: true })).not.toHaveProperty('healthRegenPerSecond')
  })

  it('slows the hero down once stamina runs out', () => {
    const fresh = getVitalProfile(base)
    const drained = getVitalProfile({ ...base, stamina: 0 })
    const low = getVitalProfile({ ...base, stamina: 8 })
    expect(fresh.exhausted).toBe(false)
    expect(drained.exhausted).toBe(true)
    expect(drained.moveScale).toBeLessThanOrEqual(0.5)
    expect(low.moveScale).toBeLessThan(fresh.moveScale)
    expect(low.moveScale).toBeGreaterThan(drained.moveScale)
    expect(drained.canSprint).toBe(false)
    expect(drained.meleeScale).toBeLessThan(low.meleeScale)
  })

  it('drains health slowly while starving and never below zero', () => {
    const starving = getVitalProfile({ ...base, hunger: 0, health: 30 })
    expect(starving.starvationDamagePerSecond).toBeGreaterThan(0)
    expect(applyStarvation(30, 100, starving, 10)).toBeLessThan(30)
    expect(applyStarvation(1, 100, starving, 100)).toBe(0)
  })

  it('weakens tired arms so stamina matters in combat', () => {
    expect(getVitalProfile({ ...base, stamina: 10 }).meleeScale).toBeLessThan(1)
    expect(getVitalProfile({ ...base, stamina: 10, skills: ['second-wind'] }).meleeScale)
      .toBeGreaterThan(getVitalProfile({ ...base, stamina: 10 }).meleeScale)
    expect(staminaRatio(50, 100)).toBe(0.5)
    expect(staminaRatio(10, 0)).toBe(0)
  })
})
