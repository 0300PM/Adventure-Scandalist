import { describe, expect, it } from 'vitest'
import { moveWithCollisions, normalizeDirection, pointInPolygon, touchesRectangle, type Point, type Rectangle } from './core'

const bounds: Rectangle = { left: 0, top: 0, right: 100, bottom: 100 }
const island: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
]
const wall: Rectangle = { left: 40, right: 44, top: 20, bottom: 80 }

describe('movement vector', () => {
  it('normalizes diagonal movement without increasing speed', () => {
    const direction = normalizeDirection(1, 1)

    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1)
    expect(direction.x).toBeCloseTo(direction.y)
  })

  it('returns a zero vector when there is no input', () => {
    expect(normalizeDirection(0, 0)).toEqual({ x: 0, y: 0 })
  })
})

describe('world collision', () => {
  it('detects points inside a polygon and rejects points outside', () => {
    expect(pointInPolygon({ x: 50, y: 50 }, island)).toBe(true)
    expect(pointInPolygon({ x: 110, y: 50 }, island)).toBe(false)
    expect(pointInPolygon({ x: 50, y: 50 }, [])).toBe(false)
  })

  it('stops the player at a solid object without crossing it', () => {
    const result = moveWithCollisions({ x: 20, y: 50 }, { x: 60, y: 0 }, 2, island, [wall], bounds)

    expect(result.x).toBeLessThan(wall.left - 2)
    expect(result.y).toBe(50)
  })

  it('stops diagonal movement at a wall without sliding along it', () => {
    const result = moveWithCollisions({ x: 20, y: 30 }, { x: 30, y: 30 }, 2, island, [wall], bounds)

    expect(result.x).toBeLessThan(wall.left - 2)
    expect(result.y).toBeLessThan(50)
    expect(result.x - 20).toBeCloseTo(result.y - 30, 0)
  })

  it('substeps large movement so a thin object cannot be skipped', () => {
    const thinWall: Rectangle = { left: 45, right: 46, top: 20, bottom: 80 }
    const result = moveWithCollisions({ x: 20, y: 50 }, { x: 70, y: 0 }, 2, island, [thinWall], bounds)

    expect(result.x).toBeLessThan(thinWall.left - 2)
  })

  it('keeps the full player hitbox inside the world boundary', () => {
    const result = moveWithCollisions({ x: 50, y: 50 }, { x: 100, y: 0 }, 2, island, [], bounds)

    expect(result.x).toBeLessThanOrEqual(bounds.right - 2)
    expect(pointInPolygon({ x: result.x, y: result.y }, island)).toBe(true)
  })

  it('detects contact for opacity feedback and clears it after separation', () => {
    const object: Rectangle = { left: 40, right: 50, top: 40, bottom: 50 }

    expect(touchesRectangle({ x: 36, y: 45 }, 2, object, 2)).toBe(true)
    expect(touchesRectangle({ x: 35, y: 45 }, 2, object, 2)).toBe(false)
  })
})
