import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Inventory } from './inventory'
import { RESOURCE_PICKUPS } from './world'
import { advanceSurvival, canPerformRecipe, decayHunger, consumeSurvivalItem, createSurvivalNeeds, getDayCycle, getObjectives, ITEM_DETAILS, performRecipe, RECIPES, recordGathering, type SurvivalNeeds } from './survival'

const inventoryWith = (items: Record<string, number>) => {
  const inventory = new Inventory()
  for (const [itemId, quantity] of Object.entries(items)) inventory.add(itemId, quantity, 99)
  return inventory
}

describe('survival needs', () => {
  it('advances a readable day and night cycle from daylight into night', () => {
    expect(getDayCycle(0)).toMatchObject({ day: 1, time: '08:00', phase: 'day', darkness: 0 })
    expect(getDayCycle(750)).toMatchObject({ time: '18:00', phase: 'dusk' })
    expect(getDayCycle(975)).toMatchObject({ time: '21:00', phase: 'night', darkness: 0.56 })
    expect(getDayCycle(1800)).toMatchObject({ day: 2, time: '08:00', phase: 'day', darkness: 0 })
    expect(getDayCycle(Number.NaN).time).toBe('08:00')
  })

  it('drains food proportionally to what is left and water with activity', () => {
    const start = createSurvivalNeeds()
    const moving = Array.from({ length: 60 }).reduce<SurvivalNeeds>((state) => advanceSurvival(state, 1, true, false), start)
    expect(moving.hunger).toBeCloseTo(100 * Math.exp(-60 * 0.0017), 3)
    expect(moving.thirst).toBeCloseTo(96.1)
    expect(moving.energy).toBeCloseTo(97.9)
    const resting = Array.from({ length: 60 }).reduce<SurvivalNeeds>((state) => advanceSurvival(state, 1, false, true), { ...moving, energy: 40 })
    expect(resting.energy).toBeGreaterThan(57)
    expect(resting.elapsedSeconds).toBe(120)
  })

  it('loses hunger faster when it is high than when it is almost empty', () => {
    const full = decayHunger(100, 60, true)
    const half = decayHunger(50, 60, true)
    expect(100 - full).toBeGreaterThan(50 - half)
    expect(full / 100).toBeCloseTo(half / 50, 6)
    expect(decayHunger(100, 60, false)).toBeGreaterThan(full)
    expect(decayHunger(4, 600, true)).toBeLessThan(4)
    expect(decayHunger(4, 600, true)).toBeGreaterThan(0)
    expect(decayHunger(100, -5, true)).toBe(100)
  })

  it('consumes food and fresh water only when the needs can benefit', () => {
    const inventory = inventoryWith({ berry_cluster: 2, sap_jar: 1 })
    const needs = { ...createSurvivalNeeds(), hunger: 50, thirst: 25 }
    expect(consumeSurvivalItem('berry_cluster', inventory, needs)).toBe(true)
    expect(needs.hunger).toBe(74)
    expect(consumeSurvivalItem('sap_jar', inventory, needs)).toBe(true)
    expect(needs.thirst).toBe(63)
    expect(consumeSurvivalItem('berry_cluster', inventory, { ...needs, hunger: 100 })).toBe(false)
    expect(inventory.count('berry_cluster')).toBe(1)
  })
})

describe('island crafting and expedition tasks', () => {
  it('twists multiple ropes and crafts then equips the stone axe materials', () => {
    const inventory = inventoryWith({ flax_bundle: 4, wood_log: 3, flint_stone: 2 })
    const needs = createSurvivalNeeds()
    expect(performRecipe('cordage', inventory, needs, false)).toBe('crafted')
    expect(performRecipe('cordage', inventory, needs, false)).toBe('crafted')
    expect(inventory.count('rope_coil')).toBe(2)
    expect(performRecipe('stone-axe', inventory, needs, false)).toBe('crafted')
    expect(inventory.count('axe_tool')).toBe(1)
    expect(inventory.count('wood_log')).toBe(0)
    expect(canPerformRecipe(RECIPES.find((recipe) => recipe.id === 'stone-axe')!, inventory, needs, false)).toBe('complete')
  })

  it('requires the campfire, ingredients and capacity before building', () => {
    const recipe = RECIPES.find((candidate) => candidate.id === 'lean-to')!
    const empty = new Inventory()
    const needs = createSurvivalNeeds()
    needs.crafted.push('stone-axe')
    expect(canPerformRecipe(recipe, empty, needs, false)).toBe('station')
    const ready = inventoryWith({ wood_log: 5, rope_coil: 2, flax_bundle: 2 })
    expect(performRecipe('lean-to', ready, needs, true)).toBe('crafted')
    expect(needs.built).toContain('lean-to')
    expect(performRecipe('lean-to', ready, needs, true)).toBe('complete')
  })

  it('unlocks advanced recipes only after their earlier milestones', () => {
    const recipe = RECIPES.find((candidate) => candidate.id === 'iron-nails')!
    const needs = createSurvivalNeeds()
    const inventory = inventoryWith({ iron_ore: 2, coal_chunk: 1, charcoal: 1 })
    expect(canPerformRecipe(recipe, inventory, needs, true)).toBe('locked')
    needs.crafted.push('stone-pick')
    expect(canPerformRecipe(recipe, inventory, needs, false)).toBe('station')
    expect(canPerformRecipe(recipe, inventory, needs, true)).toBe('crafted')
  })

  it('gates every advanced recipe behind its declared progression milestones', () => {
    const inventory = new Inventory()
    for (const recipe of RECIPES.filter((candidate) => candidate.requires?.length)) {
      const needs = createSurvivalNeeds()
      expect(canPerformRecipe(recipe, inventory, needs, true), recipe.id).toBe('locked')
      needs.crafted.push(...(recipe.requires ?? []))
      expect(canPerformRecipe(recipe, inventory, needs, true), recipe.id).not.toBe('locked')
    }

    expect(RECIPES.find((recipe) => recipe.id === 'thread-spool')?.requires).toContain('lean-to')
    expect(RECIPES.find((recipe) => recipe.id === 'herb-bundle')?.requires).toContain('lean-to')
    expect(RECIPES.find((recipe) => recipe.id === 'grain-sack')?.requires).toContain('lean-to')
    expect(RECIPES.find((recipe) => recipe.id === 'charcoal')?.requires).toContain('stone-pick')
    expect(RECIPES.find((recipe) => recipe.id === 'hammer')?.requires).toEqual(expect.arrayContaining(['iron-nails', 'lean-to']))
  })

  it('uses every supplied crafting-material icon in the recipe progression or island pickups', () => {
    const assets = readdirSync('Public/Items/Crafting_materials/png_32')
      .filter((filename) => filename.endsWith('.png'))
      .map((filename) => filename.replace(/\.png$/, ''))
    const recipeItems = new Set(RECIPES.flatMap((recipe) => [
      ...Object.keys(recipe.ingredients),
      ...(recipe.output ? [recipe.output.itemId] : []),
    ]))
    const pickupItems = new Set(RESOURCE_PICKUPS.map((pickup) => pickup.itemId))
    for (const itemId of assets) {
      expect(ITEM_DETAILS[itemId], itemId).toBeTruthy()
      expect(recipeItems.has(itemId) || pickupItems.has(itemId), `${itemId} is part of progression`).toBe(true)
    }
  })

  it('tracks the second-shore echoes and return trip independently from the first chapter', () => {
    const needs = createSurvivalNeeds()
    const onShore = getObjectives(needs, ['shore-echo', 'oak-echo', 'camp-echo'], [], 'continent', false)
    expect(onShore.find((task) => task.id === 'continent-signals')?.current).toBe(0)
    const atBeacon = getObjectives(needs, ['continent-memory-shore', 'continent-memory-oak', 'continent-memory-beacon'], [], 'continent', true)
    expect(atBeacon.find((task) => task.id === 'continent-signals')?.complete).toBe(true)
    expect(atBeacon.find((task) => task.id === 'continent-beacon')?.complete).toBe(true)
  })

  it('counts lifetime harvesting and preserves optional exploration goals', () => {
    let needs = createSurvivalNeeds()
    for (const item of ['wood_log', 'flint_stone', 'flax_bundle', 'berry_cluster', 'sap_jar']) needs = recordGathering(needs, item, 1)
    needs.gathered.axe_harvest = 6
    const tasks = getObjectives(needs, ['shore-echo'], ['place-camp'])
    expect(tasks.find((task) => task.id === 'shore-supplies')?.complete).toBe(true)
    expect(tasks.find((task) => task.id === 'forest-harvest')?.complete).toBe(true)
    expect(tasks.some((task) => task.optional && !task.complete)).toBe(true)
  })
})
