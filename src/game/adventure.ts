import Phaser from 'phaser'
import { canOccupy, moveWithCollisions, normalizeDirection, touchesRectangle, type Point, type Rectangle } from './core'
import type { SavedAdventure } from './sessions'
import { collectNearbyItem, type Collectible } from './collectibles'
import { Inventory, type InventorySlot } from './inventory'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameSnapshot = {
  memories: number
  nearMemory: boolean
  nearCamp: boolean
  completed: boolean
  inventory: InventorySlot[]
  position: Point
  collected: string[]
}

export type GameCallbacks = {
  onSnapshot: (snapshot: GameSnapshot) => void
  onNotice: (notice: 'memory' | 'camp' | 'ending' | 'inventory-full') => void
  onPause: () => void
  onInventory: () => void
  onSelect: () => void
  onReady: () => void
}

const WORLD_WIDTH = 800
const WORLD_HEIGHT = 640
const WORLD_BOUNDS: Rectangle = { left: 0, top: 0, right: WORLD_WIDTH, bottom: WORLD_HEIGHT }
const MOVE_SPEED = 118
const MEMORY_ITEM_ID = 'memory-echo'
const MEMORY_PICKUP_SPAWNS: Omit<Collectible, 'collected'>[] = [
  { id: 'shore-echo', itemId: MEMORY_ITEM_ID, x: 166, y: 249, quantity: 1, maxStack: 99 },
  { id: 'oak-echo', itemId: MEMORY_ITEM_ID, x: 405, y: 332, quantity: 1, maxStack: 99 },
  { id: 'camp-echo', itemId: MEMORY_ITEM_ID, x: 528, y: 237, quantity: 1, maxStack: 99 },
]
const CAMP = { x: 612, y: 159 }
const WORLD_OBJECTS = [
  { key: 'rock-cave', x: 252, y: 413, scale: 1.1 },
  { key: 'rock-lane', x: 430, y: 426, scale: 1.05 },
  { key: 'rock-snow', x: 502, y: 389, scale: 1.15 },
  { key: 'rock-canyon', x: 586, y: 405, scale: 1.25 },
]
const ISLAND: Point[] = [
  { x: 103, y: 201 }, { x: 174, y: 177 }, { x: 258, y: 179 },
  { x: 301, y: 137 }, { x: 379, y: 131 }, { x: 468, y: 165 },
  { x: 501, y: 115 }, { x: 548, y: 99 }, { x: 626, y: 105 },
  { x: 681, y: 148 }, { x: 683, y: 246 }, { x: 645, y: 300 },
  { x: 643, y: 391 }, { x: 607, y: 438 }, { x: 548, y: 451 },
  { x: 475, y: 437 }, { x: 421, y: 473 }, { x: 344, y: 474 },
  { x: 300, y: 440 }, { x: 228, y: 435 }, { x: 170, y: 405 },
  { x: 112, y: 358 }, { x: 87, y: 292 },
]
const BLOCKERS = [
  { x: 228, y: 215, w: 28, h: 30 }, { x: 285, y: 264, w: 34, h: 36 },
  { x: 346, y: 215, w: 28, h: 30 }, { x: 460, y: 221, w: 34, h: 30 },
  { x: 499, y: 311, w: 36, h: 35 }, { x: 332, y: 366, w: 32, h: 32 },
  { x: 552, y: 332, w: 34, h: 38 }, { x: 192, y: 342, w: 34, h: 35 },
  { x: 397, y: 247, w: 29, h: 28 }, { x: 583, y: 204, w: 27, h: 30 },
  { x: 264, y: 376, w: 34, h: 31 }, { x: 446, y: 365, w: 35, h: 30 },
]

type WorldObject = {
  sprite: Phaser.GameObjects.Image
  bounds: Rectangle
  touching: boolean
}

const MAP_COLLIDERS: Rectangle[] = BLOCKERS.map(({ x, y, w, h }) => ({
  left: x,
  right: x + w,
  top: y,
  bottom: y + h,
}))

class IslandScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Sprite
  private memorySprites: Phaser.GameObjects.Sprite[] = []
  private pickups: Collectible[] = []
  private worldObjects: WorldObject[] = []
  private collisionRects: Rectangle[] = []
  private inventory = new Inventory()
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private virtualDirections = new Set<Direction>()
  private virtualInteract = false
  private started = false
  private completed = false
  private facing: Direction = 'down'
  private lastInteract = false
  private lastSnapshotAt = 0
  private readonly callbacks: GameCallbacks

  constructor(callbacks: GameCallbacks) {
    super('island')
    this.callbacks = callbacks
  }

  preload() {
    this.load.image('island-map', '/Public/Tiled/Tiled_map.png')
    this.load.spritesheet('world-animations', '/Public/Tiled/Tiled_animation_32px.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('hero-idle', '/Public/Characters/Character_1/Idle.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('hero-walk', '/Public/Characters/Character_1/Walk.png', { frameWidth: 32, frameHeight: 32 })
    this.load.image('rock-cave', '/Public/png_assets/cave_rocks/cave_rock5.png')
    this.load.image('rock-lane', '/Public/png_assets/middle_lane_rocks1/middle_lane_rock1_5.png')
    this.load.image('rock-snow', '/Public/png_assets/snowy_rocks1/snowy_rock5.png')
    this.load.image('rock-canyon', '/Public/png_assets/canyon_rocks/canyon_rock5.png')
  }

  create() {
    this.add.image(0, 0, 'island-map').setOrigin(0).setDepth(0)
    this.anims.create({ key: 'hero-idle', frames: this.anims.generateFrameNumbers('hero-idle', { start: 0, end: 3 }), frameRate: 5, repeat: -1 })
    this.anims.create({ key: 'hero-walk', frames: this.anims.generateFrameNumbers('hero-walk', { start: 0, end: 3 }), frameRate: 9, repeat: -1 })
    this.anims.create({ key: 'memory-glimmer', frames: this.anims.generateFrameNumbers('world-animations', { start: 5, end: 9 }), frameRate: 7, repeat: -1 })
    this.pickups = MEMORY_PICKUP_SPAWNS.map((pickup) => ({ ...pickup, collected: false }))
    this.memorySprites = this.pickups.map((pickup) => this.add.sprite(pickup.x, pickup.y - 13, 'world-animations', 5).setDepth(pickup.y).setScale(0.9).play('memory-glimmer'))
    this.worldObjects = WORLD_OBJECTS.map(({ key, x, y, scale }) => {
      const sprite = this.add.image(x, y, key).setOrigin(0.5, 0.88).setScale(scale).setDepth(y)
      const width = sprite.displayWidth * 0.62
      const height = Math.max(8, sprite.displayHeight * 0.28)
      return {
        sprite,
        bounds: { left: x - width / 2, right: x + width / 2, top: y - height, bottom: y },
        touching: false,
      }
    })
    this.collisionRects = [...MAP_COLLIDERS, ...this.worldObjects.map(({ bounds }) => bounds)]

    this.hero = this.add.sprite(374, 321, 'hero-idle', 0)
    this.hero.setDepth(4).setScale(1.15)
    this.hero.play('hero-idle')
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE') as Record<string, Phaser.Input.Keyboard.Key>
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'])
    this.input.keyboard!.on('keydown-ESC', () => this.callbacks.onPause())
    this.input.keyboard!.on('keydown-I', () => this.callbacks.onInventory())
    this.input.keyboard!.on('keydown-X', () => this.callbacks.onSelect())
    this.publishSnapshot()
    this.callbacks.onReady()
  }

  setStarted(value: boolean) {
    this.started = value
  }

  setDirection(direction: Direction, pressed: boolean) {
    if (pressed) this.virtualDirections.add(direction)
    else this.virtualDirections.delete(direction)
  }

  setInteract(pressed: boolean) {
    this.virtualInteract = pressed
  }

  resetAdventure() {
    this.pickups.forEach((pickup) => { pickup.collected = false })
    this.inventory.clear()
    this.virtualDirections.clear()
    this.virtualInteract = false
    this.lastInteract = false
    this.memorySprites.forEach((sprite) => sprite.setVisible(true))
    this.hero.setPosition(374, 321).setFlipX(false)
    this.facing = 'down'
    this.completed = false
    this.started = false
    this.callbacks.onSnapshot({ memories: 0, nearMemory: false, nearCamp: false, completed: false, inventory: this.inventory.snapshot(), position: { x: this.hero.x, y: this.hero.y }, collected: [] })
  }

  restoreAdventure(save: SavedAdventure) {
    const position = canOccupy(save.position, 8, ISLAND, this.collisionRects, WORLD_BOUNDS) ? save.position : { x: 374, y: 321 }
    this.hero.setPosition(position.x, position.y).setFlipX(false)
    this.inventory.restore(save.inventory)
    this.pickups.forEach((pickup, index) => {
      pickup.collected = save.collected.includes(pickup.id)
      this.memorySprites[index].setVisible(!pickup.collected)
    })
    this.virtualDirections.clear()
    this.virtualInteract = false
    this.lastInteract = false
    this.facing = 'down'
    this.completed = save.completed
    this.started = !save.completed
    this.hero.play('hero-idle')
    this.publishSnapshot()
  }

  update(time: number, delta: number) {
    if (!this.started || this.completed) return

    const left = this.keys.LEFT.isDown || this.keys.A.isDown || this.virtualDirections.has('left')
    const right = this.keys.RIGHT.isDown || this.keys.D.isDown || this.virtualDirections.has('right')
    const up = this.keys.UP.isDown || this.keys.W.isDown || this.virtualDirections.has('up')
    const down = this.keys.DOWN.isDown || this.keys.S.isDown || this.virtualDirections.has('down')
    const { x: dx, y: dy } = normalizeDirection(Number(right) - Number(left), Number(down) - Number(up))
    if (dx !== 0 || dy !== 0) {
      this.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down')
      this.hero.setFlipX(this.facing === 'left')
      if (this.hero.anims.currentAnim?.key !== 'hero-walk') this.hero.play('hero-walk')
      const elapsed = Math.min(delta, 50) / 1000
      const position = moveWithCollisions(
        { x: this.hero.x, y: this.hero.y },
        { x: dx * MOVE_SPEED * elapsed, y: dy * MOVE_SPEED * elapsed },
        8,
        ISLAND,
        this.collisionRects,
        WORLD_BOUNDS,
      )
      this.hero.setPosition(position.x, position.y)
    } else if (this.hero.anims.currentAnim?.key !== 'hero-idle') {
      this.hero.play('hero-idle')
    }

    this.hero.setDepth(this.hero.y + 16)
    this.updateWorldObjectOpacity()

    const nearestPickup = this.getNearbyPickup()
    const nearCamp = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, CAMP.x, CAMP.y) < 48
    const interact = this.keys.E.isDown || this.keys.SPACE.isDown || this.virtualInteract
    if (interact && !this.lastInteract) {
      if (nearestPickup) {
        const pickedUp = collectNearbyItem({ x: this.hero.x, y: this.hero.y }, this.pickups, 43, this.inventory)
        if (pickedUp) this.memorySprites[this.pickups.indexOf(pickedUp)].setVisible(false)
        if (pickedUp) {
          this.callbacks.onNotice('memory')
          this.publishSnapshot()
        } else {
          this.callbacks.onNotice('inventory-full')
        }
      } else if (nearCamp) {
        if (this.pickups.every((pickup) => pickup.collected)) {
          this.completed = true
          this.hero.play('hero-idle')
          this.publishSnapshot()
          this.callbacks.onNotice('ending')
        } else {
          this.callbacks.onNotice('camp')
        }
      }
    }
    this.lastInteract = interact

    if (time - this.lastSnapshotAt > 120) {
      this.publishSnapshot()
      this.lastSnapshotAt = time
    }
  }

  private getNearbyPickup() {
    let nearest: Collectible | null = null
    let nearestDistance = 43
    for (const pickup of this.pickups) {
      if (pickup.collected) continue
      const distance = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, pickup.x, pickup.y)
      if (distance >= nearestDistance) continue
      nearest = pickup
      nearestDistance = distance
    }
    return nearest
  }

  private updateWorldObjectOpacity() {
    const radius = 8
    for (const object of this.worldObjects) {
      const touching = touchesRectangle({ x: this.hero.x, y: this.hero.y }, radius, object.bounds, 2)
      if (touching === object.touching) continue
      object.touching = touching
      this.tweens.killTweensOf(object.sprite)
      this.tweens.add({
        targets: object.sprite,
        alpha: touching ? 0.38 : 1,
        duration: 180,
        ease: 'Sine.Out',
      })
    }
  }

  private publishSnapshot() {
    this.callbacks.onSnapshot({
      memories: this.inventory.count(MEMORY_ITEM_ID),
      nearMemory: Boolean(this.getNearbyPickup()),
      nearCamp: Phaser.Math.Distance.Between(this.hero.x, this.hero.y, CAMP.x, CAMP.y) < 48,
      completed: this.completed,
      inventory: this.inventory.snapshot(),
      position: { x: this.hero.x, y: this.hero.y },
      collected: this.pickups.filter((pickup) => pickup.collected).map((pickup) => pickup.id),
    })
  }
}

export type AdventureGame = {
  start: (started: boolean) => void
  direction: (direction: Direction, pressed: boolean) => void
  interact: (pressed: boolean) => void
  reset: () => void
  restore: (save: SavedAdventure) => void
  destroy: () => void
}

export const createAdventureGame = (parent: HTMLElement, callbacks: GameCallbacks): AdventureGame => {
  const scene = new IslandScene(callbacks)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    parent,
    backgroundColor: '#4bbcd2',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: WORLD_WIDTH, height: WORLD_HEIGHT },
    scene: [scene],
    render: { powerPreference: 'high-performance', transparent: false },
    banner: false,
  })
  return {
    start: (started) => scene.setStarted(started),
    direction: (direction, pressed) => scene.setDirection(direction, pressed),
    interact: (pressed) => scene.setInteract(pressed),
    reset: () => scene.resetAdventure(),
    restore: (save) => scene.restoreAdventure(save),
    destroy: () => game.destroy(true),
  }
}
