export type Point = { x: number; y: number }
export type Rectangle = { left: number; right: number; top: number; bottom: number }
export type WorldBounds = Rectangle

/** Opis siatki kolizji – każda komórka jest albo stała, albo przejezdna. */
export type CellCollisionGrid = {
  columns: number
  rows: number
  cellSize: number
  isSolid: (column: number, row: number) => boolean
}

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

/** Dokładny test koła i prostokąta – narożniki nie są już „kwadratowe”. */
export const circleOverlapsRectangle = (point: Point, radius: number, rectangle: Rectangle): boolean => {
  const nearestX = Math.min(Math.max(point.x, rectangle.left), rectangle.right)
  const nearestY = Math.min(Math.max(point.y, rectangle.top), rectangle.bottom)
  const dx = point.x - nearestX
  const dy = point.y - nearestY
  return dx * dx + dy * dy < radius * radius
}

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

    break
  }

  return position
}

const cellRectangle = (column: number, row: number, cellSize: number): Rectangle => ({
  left: column * cellSize,
  top: row * cellSize,
  right: (column + 1) * cellSize,
  bottom: (row + 1) * cellSize,
})

/**
 * Sprawdza, czy koło gracza mieści się na planszy.
 * Testowane są wyłącznie komórki w zasięgu hitboxa, więc siatka 50 × 40
 * nie obciąża klatki, a kontakt z narożnikiem jest precyzyjny.
 */
export const canOccupyCells = (
  point: Point,
  radius: number,
  grid: CellCollisionGrid,
  bounds: WorldBounds,
  extraColliders: Rectangle[] = [],
): boolean => {
  if (
    point.x - radius < bounds.left || point.x + radius > bounds.right ||
    point.y - radius < bounds.top || point.y + radius > bounds.bottom
  ) return false

  if (extraColliders.some((collider) => circleOverlapsRectangle(point, radius, collider))) return false

  const firstColumn = Math.floor((point.x - radius) / grid.cellSize)
  const lastColumn = Math.floor((point.x + radius) / grid.cellSize)
  const firstRow = Math.floor((point.y - radius) / grid.cellSize)
  const lastRow = Math.floor((point.y + radius) / grid.cellSize)

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      if (!grid.isSolid(column, row)) continue
      if (circleOverlapsRectangle(point, radius, cellRectangle(column, row, grid.cellSize))) return false
    }
  }

  return true
}

export const moveWithCellCollisions = (
  origin: Point,
  movement: Point,
  radius: number,
  grid: CellCollisionGrid,
  bounds: WorldBounds,
  extraColliders: Rectangle[] = [],
): Point => {
  const largestDelta = Math.max(Math.abs(movement.x), Math.abs(movement.y))
  if (largestDelta === 0) return { ...origin }
  const maxStep = Math.max(1, radius / 4)
  const steps = Math.max(1, Math.ceil(largestDelta / maxStep))
  const stepX = movement.x / steps
  const stepY = movement.y / steps
  let position = { ...origin }

  for (let step = 0; step < steps; step += 1) {
    const diagonal = { x: position.x + stepX, y: position.y + stepY }
    if (canOccupyCells(diagonal, radius, grid, bounds, extraColliders)) {
      position = diagonal
      continue
    }

    break
  }

  return position
}
