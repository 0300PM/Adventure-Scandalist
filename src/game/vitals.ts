export type HungerTier = 'sated' | 'steady' | 'hungry' | 'starving'
export type ConditionTier = 'steady' | 'wounded' | 'critical'

export type VitalInput = {
  hunger: number
  health: number
  maxHealth: number
  stamina: number
  maxStamina: number
  atCamp?: boolean
  resting?: boolean
  hasStatus?: boolean
  skills?: string[]
}

export type VitalProfile = {
  hungerTier: HungerTier
  condition: ConditionTier
  staminaRegenPerSecond: number
  moveScale: number
  meleeScale: number
  sprintDrainPerSecond: number
  starvationDamagePerSecond: number
  canSprint: boolean
  exhausted: boolean
}

export const SPRINT_MULTIPLIER = 1.62
export const BASE_STAMINA_REGEN = 12
export const STAMINA_RECOVERY_DELAY = 1.15
export const MELEE_STAMINA_COST = 14
export const DODGE_STAMINA_COST = 20
export const MIN_SPRINT_STAMINA = 10
export const DEATH_HEALTH_RATIO = 0.5

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))

export const hungerTier = (hunger: number): HungerTier => {
  const value = clamp(hunger, 0, 100)
  if (value >= 70) return 'sated'
  if (value >= 35) return 'steady'
  if (value >= 15) return 'hungry'
  return 'starving'
}

export const conditionTier = (health: number, maxHealth: number): ConditionTier => {
  const ratio = maxHealth > 0 ? clamp(health / maxHealth, 0, 1) : 0
  if (ratio <= 0.2) return 'critical'
  if (ratio <= 0.35) return 'wounded'
  return 'steady'
}

export const staminaRatio = (stamina: number, maxStamina: number) =>
  maxStamina > 0 ? clamp(stamina / maxStamina, 0, 1) : 0

const hungerRegenScale: Record<HungerTier, number> = { sated: 1.15, steady: 1, hungry: 0.55, starving: 0.2 }
const hungerMoveScale: Record<HungerTier, number> = { sated: 1, steady: 1, hungry: 0.94, starving: 0.8 }

const exhaustionMoveScale = (ratio: number) => {
  if (ratio <= 0.001) return 0.45
  if (ratio <= 0.1) return 0.68
  if (ratio <= 0.25) return 0.88
  return 1
}

export const getVitalProfile = (input: VitalInput): VitalProfile => {
  const tier = hungerTier(input.hunger)
  const condition = conditionTier(input.health, input.maxHealth)
  const skills = input.skills ?? []
  const atRest = Boolean(input.resting)
  const ratio = staminaRatio(input.stamina, input.maxStamina)

  let staminaRegen = BASE_STAMINA_REGEN * hungerRegenScale[tier]
  if (input.atCamp) staminaRegen *= 1.6
  if (atRest) staminaRegen *= 1.35
  if (condition === 'wounded') staminaRegen *= 0.75
  if (condition === 'critical') staminaRegen *= 0.5
  if (input.hasStatus) staminaRegen *= 0.5

  let moveScale = hungerMoveScale[tier] * exhaustionMoveScale(ratio)
  if (condition === 'wounded') moveScale *= 0.94
  if (condition === 'critical') moveScale *= 0.86

  const tiredArms = ratio < 0.25
  let meleeScale = tiredArms ? (skills.includes('second-wind') ? 0.85 : 0.65) : 1
  if (ratio <= 0.001) meleeScale *= 0.75
  if (tier === 'starving') meleeScale *= 0.9

  return {
    hungerTier: tier,
    condition,
    staminaRegenPerSecond: Math.max(0, staminaRegen),
    moveScale: clamp(moveScale, 0.4, 1.15),
    meleeScale,
    sprintDrainPerSecond: tier === 'sated' ? 14 : 17,
    starvationDamagePerSecond: tier === 'starving' ? 0.35 : 0,
    canSprint: tier !== 'starving' && input.stamina > MIN_SPRINT_STAMINA && !input.hasStatus,
    exhausted: ratio <= 0.001,
  }
}

export const applyStarvation = (health: number, maxHealth: number, profile: Pick<VitalProfile, 'starvationDamagePerSecond'>, seconds: number) =>
  clamp(health - profile.starvationDamagePerSecond * Math.max(0, seconds), 0, maxHealth)
