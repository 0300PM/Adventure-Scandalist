import { describe, expect, it } from 'vitest'
import { IslandMovementEngine } from './engine'
import { canOccupyCells, type CellCollisionGrid } from './core'

const openGrid: CellCollisionGrid = {
  columns: 20,
  rows: 20,
  cellSize: 16,
  isSolid: (column, row) => column < 0 || row < 0 || column >= 20 || row >= 20,
}

const settings = (position = { x: 80, y: 80 }, grid = openGrid) => ({
  position,
  speed: 128,
  radius: 6,
  grid,
  bounds: { left: 0, top: 0, right: 320, bottom: 320 },
  colliders: [],
})

describe('IslandMovementEngine', () => {
  it('keeps travel distance consistent across uneven frame rates', () => {
    const steady = new IslandMovementEngine(settings())
    const uneven = new IslandMovementEngine(settings())
    let steadyFrame = steady.advance(0, { x: 0, y: 0 })
    for (let frame = 0; frame < 60; frame += 1) steadyFrame = steady.advance(1000 / 60, { x: 1, y: 0 })
    let unevenFrame = uneven.advance(0, { x: 0, y: 0 })
    const frameTimes = [8, 27, 13, 21, 9, 32, 16, 24, 18, 12, 20, 17, 25, 15, 19, 14, 22, 20, 18, 20, 22, 21, 24, 20, 20, 20, 20, 20, 20, 20]
    let elapsed = 0
    let frameIndex = 0
    while (elapsed < 1000) {
      const frameTime = Math.min(frameTimes[frameIndex % frameTimes.length], 1000 - elapsed)
      unevenFrame = uneven.advance(frameTime, { x: 1, y: 0 })
      elapsed += frameTime
      frameIndex += 1
    }
    expect(Math.abs(steadyFrame.position.x - unevenFrame.position.x)).toBeLessThan(4)
    expect(steadyFrame.position.y).toBe(80)
    expect(unevenFrame.position.y).toBe(80)
  })

  it('stops at a wall without automatic sideways movement', () => {
    const wallGrid: CellCollisionGrid = {
      ...openGrid,
      isSolid: (column, row) => column === 6 || openGrid.isSolid(column, row),
    }
    const engine = new IslandMovementEngine(settings({ x: 80, y: 80 }, wallGrid))
    let frame = engine.advance(0, { x: 0, y: 0 })
    for (let index = 0; index < 30; index += 1) frame = engine.advance(1000 / 60, { x: 1, y: 0 })
    expect(frame.position.x).toBeLessThan(90)
    expect(frame.position.y).toBe(80)
    expect(frame.steering).toBe(0)
    expect(frame.velocity).toEqual({ x: 0, y: 0 })
  })

  it('never renders Mira inside cliff cells while tracing an uneven ledge', () => {
    const cliffGrid: CellCollisionGrid = {
      ...openGrid,
      isSolid: (column, row) => (column === 7 && row < 11) || openGrid.isSolid(column, row),
    }
    const engine = new IslandMovementEngine(settings({ x: 95, y: 145 }, cliffGrid))
    for (let index = 0; index < 90; index += 1) {
      const frame = engine.advance(1000 / 60, { x: 1, y: index % 2 === 0 ? -0.35 : 0.35 })
      const column = Math.floor(frame.position.x / cliffGrid.cellSize)
      const row = Math.floor(frame.position.y / cliffGrid.cellSize)
      expect(cliffGrid.isSolid(column, row)).toBe(false)
      expect(canOccupyCells(frame.position, 6, cliffGrid, settings().bounds)).toBe(true)
      expect(Number.isFinite(frame.position.x) && Number.isFinite(frame.position.y)).toBe(true)
    }
  })

  it('resets velocity and clamps a long frame to the safe simulation window', () => {
    const engine = new IslandMovementEngine(settings())
    const frame = engine.advance(500, { x: 1, y: 0 })
    expect(frame.simulatedMs).toBeLessThanOrEqual(100)
    engine.setPosition({ x: 120, y: 120 })
    const resetFrame = engine.advance(0, { x: 0, y: 0 })
    expect(resetFrame.position).toEqual({ x: 120, y: 120 })
    expect(resetFrame.velocity).toEqual({ x: 0, y: 0 })
  })
})
