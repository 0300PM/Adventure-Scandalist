import { canOccupyCells, moveWithCellCollisions, normalizeDirection, type CellCollisionGrid, type Point, type Rectangle } from './core'

export type EngineSettings = {
  position: Point
  speed: number
  radius: number
  grid: CellCollisionGrid
  bounds: Rectangle
  colliders: Rectangle[]
}

export type EngineFrame = {
  position: Point
  velocity: Point
  steering: number
  blocked: boolean
  simulatedMs: number
}

const STEP_MS = 1000 / 60
const MAX_FRAME_MS = 100
const MAX_STEPS = 6
const ACCELERATION = 1550
const BRAKING = 2100
const approach = (current: number, target: number, amount: number) =>
  current < target ? Math.min(current + amount, target) : Math.max(current - amount, target)

const mix = (start: Point, end: Point, amount: number): Point => ({
  x: start.x + (end.x - start.x) * amount,
  y: start.y + (end.y - start.y) * amount,
})

const length = (point: Point) => Math.hypot(point.x, point.y)

export class IslandMovementEngine {
  private position: Point
  private previousPosition: Point
  private velocity: Point = { x: 0, y: 0 }
  private accumulator = 0
  private steering = 0
  private readonly settings: EngineSettings

  constructor(settings: EngineSettings) {
    this.settings = settings
    this.position = { ...settings.position }
    this.previousPosition = { ...settings.position }
  }

  setPosition(position: Point) {
    const safePosition = canOccupyCells(position, this.settings.radius, this.settings.grid, this.settings.bounds, this.settings.colliders)
      ? position
      : this.settings.position
    this.position = { ...safePosition }
    this.previousPosition = { ...safePosition }
    this.velocity = { x: 0, y: 0 }
    this.accumulator = 0
    this.steering = 0
  }

  advance(deltaMs: number, input: Point, speedFactor = 1): EngineFrame {
    const frameMs = Math.max(0, Math.min(MAX_FRAME_MS, Number.isFinite(deltaMs) ? deltaMs : 0))
    const direction = normalizeDirection(input.x, input.y)
    const factor = Math.max(0, Math.min(2, speedFactor))
    this.accumulator += frameMs
    let steps = 0
    let blocked = false

    while (this.accumulator >= STEP_MS && steps < MAX_STEPS) {
      this.previousPosition = { ...this.position }
      const result = this.step(direction, factor, STEP_MS / 1000)
      blocked = blocked || result.blocked
      this.accumulator -= STEP_MS
      steps += 1
    }

    if (steps === MAX_STEPS && this.accumulator >= STEP_MS) this.accumulator = Math.min(this.accumulator, STEP_MS * 0.999)
    const alpha = this.accumulator / STEP_MS
    const interpolated = mix(this.previousPosition, this.position, alpha)
    const renderPosition = canOccupyCells(interpolated, this.settings.radius, this.settings.grid, this.settings.bounds, this.settings.colliders)
      ? interpolated
      : this.position
    return {
      position: renderPosition,
      velocity: { ...this.velocity },
      steering: this.steering,
      blocked,
      simulatedMs: steps * STEP_MS,
    }
  }

  private step(direction: Point, speedFactor: number, seconds: number) {
    const target = { x: direction.x * this.settings.speed * speedFactor, y: direction.y * this.settings.speed * speedFactor }
    const acceleration = direction.x === 0 && direction.y === 0 ? BRAKING : ACCELERATION
    const maxChange = acceleration * seconds
    this.velocity = {
      x: approach(this.velocity.x, target.x, maxChange),
      y: approach(this.velocity.y, target.y, maxChange),
    }

    const intended = { x: this.velocity.x * seconds, y: this.velocity.y * seconds }
    if (length(intended) < 0.001) {
      this.steering = approach(this.steering, 0, seconds * 1.8)
      return { blocked: false }
    }

    const direct = moveWithCellCollisions(this.position, intended, this.settings.radius, this.settings.grid, this.settings.bounds, this.settings.colliders)
    const directMovement = { x: direct.x - this.position.x, y: direct.y - this.position.y }
    const blocked = Math.hypot(directMovement.x - intended.x, directMovement.y - intended.y) > 0.001
    this.position = direct
    this.steering = 0

    if (blocked) this.velocity = { x: 0, y: 0 }

    return { blocked }
  }
}
