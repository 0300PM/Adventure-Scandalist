export type Point = { x: number; y: number }
export type Rectangle = { left: number; right: number; top: number; bottom: number }
export type WorldBounds = Rectangle

export const normalizeDirection = (x: number, y: number): Point => {
  const length = Math.hypot(x, y)
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length }
}

export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

export const touchesRectangle = (point: Point, radius: number, rectangle: Rectangle, padding = 0): boolean =>
  point.x + radius + padding >= rectangle.left &&
  point.x - radius - padding <= rectangle.right &&
  point.y + radius + padding >= rectangle.top &&
  point.y - radius - padding <= rectangle.bottom

export const canOccupy = (
  point: Point,
  radius: number,
  polygon: Point[],
  colliders: Rectangle[],
  bounds: WorldBounds,
): boolean => {
  if (
    point.x - radius < bounds.left || point.x + radius > bounds.right ||
    point.y - radius < bounds.top || point.y + radius > bounds.bottom
  ) return false

  const corners = [
    { x: point.x - radius, y: point.y - radius },
    { x: point.x + radius, y: point.y - radius },
    { x: point.x - radius, y: point.y + radius },
    { x: point.x + radius, y: point.y + radius },
  ]
  if (!corners.every((corner) => pointInPolygon(corner, polygon))) return false
  return !colliders.some((collider) => touchesRectangle(point, radius, collider))
}

export const moveWithCollisions = (
  origin: Point,
  movement: Point,
  radius: number,
  polygon: Point[],
  colliders: Rectangle[],
  bounds: WorldBounds,
): Point => {
  const largestDelta = Math.max(Math.abs(movement.x), Math.abs(movement.y))
  const maxStep = Math.max(1, radius / 2)
  const steps = Math.max(1, Math.ceil(largestDelta / maxStep))
  const stepX = movement.x / steps
  const stepY = movement.y / steps
  let position = { ...origin }

  for (let step = 0; step < steps; step += 1) {
    const diagonal = { x: position.x + stepX, y: position.y + stepY }
    if (canOccupy(diagonal, radius, polygon, colliders, bounds)) {
      position = diagonal
      continue
    }

    const horizontal = { x: position.x + stepX, y: position.y }
    if (canOccupy(horizontal, radius, polygon, colliders, bounds)) position = horizontal

    const vertical = { x: position.x, y: position.y + stepY }
    if (canOccupy(vertical, radius, polygon, colliders, bounds)) position = vertical
  }

  return position
}
