import { describe, expect, it } from 'vitest'
import { canOccupyCells, moveWithCellCollisions } from './core'
import {
  CAMP,
  DISCOVERY_ZONES,
  ECHO_PICKUPS,
  ECHO_TOTAL,
  CONTINENT_ECHO_PICKUPS,
  CONTINENT_RESOURCE_PICKUPS,
  CONTINENT_ROCKS,
  ENDING_LORE,
  HERO_RADIUS,
  PROLOGUE_LORE,
  RELIC_PICKUPS,
  RESOURCE_PICKUPS,
  SPAWN,
  WORLD,
  WORLD_BOUNDS,
  WORLD_GRID,
  getRegionCamp,
  getRegionGrid,
  getRegionSpawn,
  isPickupUnlocked,
  isSolidCell,
} from './world'
import { LORE_CATEGORIES, LORE_ENTRIES, entriesByCategory, findLoreEntry } from './lore'

const free = (x: number, y: number) => canOccupyCells({ x, y }, HERO_RADIUS, WORLD_GRID, WORLD_BOUNDS)

describe('world mask', () => {
  it('describes a 50 × 40 grid of 16 px tiles', () => {
    expect(WORLD).toMatchObject({ width: 800, height: 640, columns: 50, rows: 40, cellSize: 16 })
    expect(isSolidCell(-1, 0)).toBe(true)
    expect(isSolidCell(0, -1)).toBe(true)
    expect(isSolidCell(WORLD.columns, 0)).toBe(true)
    expect(isSolidCell(0, WORLD.rows)).toBe(true)
  })

  it('treats the surrounding sea as solid and the island interior as walkable', () => {
    expect(isSolidCell(0, 0)).toBe(true)
    expect(isSolidCell(49, 39)).toBe(true)
    expect(free(SPAWN.x, SPAWN.y)).toBe(true)
  })

  it('keeps every interactive point on walkable ground', () => {
    expect(free(SPAWN.x, SPAWN.y)).toBe(true)
    expect(free(CAMP.x, CAMP.y)).toBe(true)
    for (const pickup of [...ECHO_PICKUPS, ...RELIC_PICKUPS, ...RESOURCE_PICKUPS]) {
      expect(free(pickup.x, pickup.y), `pickup ${pickup.id}`).toBe(true)
    }
  })

  it('keeps the mirrored mainland spawn, camp and pickups reachable on walkable land', () => {
    const grid = getRegionGrid('continent')
    const spawn = getRegionSpawn('continent')
    const camp = getRegionCamp('continent')
    expect(canOccupyCells(spawn, HERO_RADIUS, grid, WORLD_BOUNDS)).toBe(true)
    expect(canOccupyCells(camp, HERO_RADIUS, grid, WORLD_BOUNDS)).toBe(true)
    for (const pickup of [...CONTINENT_ECHO_PICKUPS, ...CONTINENT_RESOURCE_PICKUPS]) {
      expect(canOccupyCells({ x: pickup.x, y: pickup.y }, HERO_RADIUS, grid, WORLD_BOUNDS), pickup.id).toBe(true)
    }
  })

  it('places mainland biome rocks on open cells away from signal pickups', () => {
    const grid = getRegionGrid('continent')
    for (const rock of CONTINENT_ROCKS) {
      expect(canOccupyCells({ x: rock.x, y: rock.y }, HERO_RADIUS, grid, WORLD_BOUNDS), rock.key).toBe(true)
      for (const pickup of CONTINENT_ECHO_PICKUPS) {
        expect(Math.hypot(rock.x - pickup.x, rock.y - pickup.y), `${rock.key} / ${pickup.id}`).toBeGreaterThan(36)
      }
    }
  })

  it('reaches every pickup, the camp and every discovery zone from the spawn', () => {
    const reached = new Set<string>()
    const start = { column: Math.floor(SPAWN.x / WORLD.cellSize), row: Math.floor(SPAWN.y / WORLD.cellSize) }
    const queue = [start]
    reached.add(`${start.column}:${start.row}`)
    while (queue.length > 0) {
      const cell = queue.pop()!
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const column = cell.column + dx
        const row = cell.row + dy
        if (column < 0 || row < 0 || column >= WORLD.columns || row >= WORLD.rows) continue
        const key = `${column}:${row}`
        if (reached.has(key)) continue
        const x = column * WORLD.cellSize + WORLD.cellSize / 2
        const y = row * WORLD.cellSize + WORLD.cellSize / 2
        if (!free(x, y)) continue
        reached.add(key)
        queue.push({ column, row })
      }
    }

    const hasReachableCell = (x: number, y: number, radius: number) => {
      for (const key of reached) {
        const [column, row] = key.split(':').map(Number)
        const cx = column * WORLD.cellSize + WORLD.cellSize / 2
        const cy = row * WORLD.cellSize + WORLD.cellSize / 2
        if (Math.hypot(cx - x, cy - y) <= radius) return true
      }
      return false
    }

    for (const pickup of [...ECHO_PICKUPS, ...RELIC_PICKUPS, ...RESOURCE_PICKUPS]) {
      expect(hasReachableCell(pickup.x, pickup.y, 24), pickup.id).toBe(true)
    }
    expect(hasReachableCell(CAMP.x, CAMP.y, CAMP.radius)).toBe(true)
    for (const zone of DISCOVERY_ZONES) {
      expect(hasReachableCell(zone.x, zone.y, zone.radius), zone.id).toBe(true)
    }
  })

  it('keeps the forest interior open so trees do not create invisible walls', () => {
    const forestSamples = [
      { x: 16 * 16 + 8, y: 17 * 16 + 8 },
      { x: 24 * 16 + 8, y: 19 * 16 + 8 },
      { x: 30 * 16 + 8, y: 18 * 16 + 8 },
      { x: 20 * 16 + 8, y: 22 * 16 + 8 },
      { x: 33 * 16 + 8, y: 21 * 16 + 8 },
      { x: 27 * 16 + 8, y: 24 * 16 + 8 },
    ]
    for (const sample of forestSamples) {
      expect(free(sample.x, sample.y), `${sample.x}:${sample.y}`).toBe(true)
    }

    let walkable = 0
    for (let row = 8; row < 30; row += 1) {
      for (let column = 8; column < 44; column += 1) {
        if (free(column * WORLD.cellSize + 8, row * WORLD.cellSize + 8)) walkable += 1
      }
    }
    expect(walkable).toBeGreaterThan(700)
  })

  it('stops the hero at a solid tile instead of letting them walk into the sea', () => {
    const start = { x: SPAWN.x, y: SPAWN.y }
    const moved = moveWithCellCollisions(start, { x: -2000, y: 0 }, HERO_RADIUS, WORLD_GRID, WORLD_BOUNDS)
    expect(moved.x).toBeLessThan(start.x)
    expect(moved.x).toBeGreaterThan(0)
    expect(free(moved.x, moved.y)).toBe(true)
  })

  it('stops diagonal movement at the first blocked cell without a sideways slide', () => {
    const start = { x: 150, y: 470 }
    const movement = { x: -60, y: 40 }
    const moved = moveWithCellCollisions(start, movement, HERO_RADIUS, WORLD_GRID, WORLD_BOUNDS)
    expect(free(moved.x, moved.y)).toBe(true)
    expect(moved.x).toBeLessThan(start.x)
    expect(moved.y).toBeGreaterThan(start.y)
    expect((moved.x - start.x) / movement.x).toBeCloseTo((moved.y - start.y) / movement.y, 0)
  })
})

describe('world content', () => {
  it('keeps exactly three echoes and one optional relic', () => {
    expect(ECHO_TOTAL).toBe(3)
    expect(ECHO_PICKUPS).toHaveLength(3)
    expect(RELIC_PICKUPS).toHaveLength(1)
    expect(RESOURCE_PICKUPS.length).toBeGreaterThanOrEqual(25)
    const allPickups = [...ECHO_PICKUPS, ...RELIC_PICKUPS, ...RESOURCE_PICKUPS]
    expect(new Set(allPickups.map((pickup) => pickup.id)).size).toBe(allPickups.length)
  })

  it('reveals resource pickups in five controlled progression stages', () => {
    const initial = RESOURCE_PICKUPS.filter((pickup) => !pickup.unlockAfter)
    expect(RESOURCE_PICKUPS).toHaveLength(37)
    expect(initial).toHaveLength(8)
    expect(RESOURCE_PICKUPS.filter((pickup) => pickup.unlockAfter === 'stone-axe')).toHaveLength(7)
    expect(RESOURCE_PICKUPS.filter((pickup) => pickup.unlockAfter === 'lean-to')).toHaveLength(10)
    expect(RESOURCE_PICKUPS.filter((pickup) => pickup.unlockAfter === 'stone-pick')).toHaveLength(7)
    expect(RESOURCE_PICKUPS.filter((pickup) => pickup.unlockAfter === 'hammer')).toHaveLength(5)
    expect(initial.every((pickup) => isPickupUnlocked(pickup, []))).toBe(true)

    const milestones = ['stone-axe', 'lean-to', 'stone-pick', 'hammer'] as const
    for (const [index, milestone] of milestones.entries()) {
      const pickup = RESOURCE_PICKUPS.find((candidate) => candidate.unlockAfter === milestone)!
      expect(isPickupUnlocked(pickup, milestones.slice(0, index))).toBe(false)
      expect(isPickupUnlocked(pickup, milestones.slice(0, index + 1))).toBe(true)
    }

    const builtShelterPickup = RESOURCE_PICKUPS.find((pickup) => pickup.unlockAfter === 'lean-to')!
    expect(isPickupUnlocked(builtShelterPickup, [], ['lean-to'])).toBe(true)
  })

  it('exposes discovery zones for every documented landmark', () => {
    const ids = DISCOVERY_ZONES.map((zone) => zone.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const loreId of DISCOVERY_ZONES.flatMap((zone) => zone.loreIds)) {
      expect(findLoreEntry(loreId), loreId).toBeTruthy()
    }
  })

  it('unlocks all 22 chronicle entries through prologue, zones, pickups, relic and ending', () => {
    const unlockable = new Set<string>([
      ...PROLOGUE_LORE,
      ...DISCOVERY_ZONES.flatMap((zone) => zone.loreIds),
      ...ECHO_PICKUPS.map((pickup) => ({ 'shore-echo': 'echo-shore', 'oak-echo': 'echo-oak', 'camp-echo': 'echo-flame' }[pickup.id] ?? '')),
      'relic-sea-glass',
      ...ENDING_LORE,
    ])
    unlockable.delete('')
    const all = LORE_ENTRIES.map((entry) => entry.id).sort()
    expect([...unlockable].sort()).toEqual(all)
  })
})

describe('lore chronicle', () => {
  it('contains complete entries in all three languages', () => {
    expect(LORE_ENTRIES.length).toBeGreaterThanOrEqual(20)
    for (const entry of LORE_ENTRIES) {
      for (const language of ['pl', 'en', 'es'] as const) {
        expect(entry.title[language].length, `${entry.id} title ${language}`).toBeGreaterThan(2)
        expect(entry.body[language].length, `${entry.id} body ${language}`).toBeGreaterThan(40)
      }
    }
  })

  it('uses unique ids and supported categories', () => {
    const ids = LORE_ENTRIES.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of LORE_ENTRIES) expect(LORE_CATEGORIES).toContain(entry.category)
    for (const category of LORE_CATEGORIES) expect(entriesByCategory(category).length).toBeGreaterThan(0)
  })
})
