import Phaser from 'phaser'
import { canOccupyCells, moveWithCellCollisions, normalizeDirection, touchesRectangle, type Point, type Rectangle } from './core'
import type { GameAction, GameKeybinds, GraphicsQuality, SavedAdventure } from './sessions'
import { DEFAULT_KEYBINDS } from './sessions'
import { IslandMovementEngine } from './engine'
import { DEATH_HEALTH_RATIO, DODGE_STAMINA_COST, MELEE_STAMINA_COST, SPRINT_MULTIPLIER, STAMINA_RECOVERY_DELAY, applyStarvation, getVitalProfile, type HungerTier } from './vitals'
import { collectNearbyItem, type Collectible } from './collectibles'
import { Inventory, type InventorySlot } from './inventory'
import { advanceSurvival, consumeSurvivalItem, createSurvivalNeeds, performRecipe, recordGathering, normalizeSurvivalNeeds, getDayCycle, ITEM_DETAILS, type RecipeResult, type SurvivalNeeds } from './survival'
import { NPCS, NPC_QUEST_GOALS, QUEST_REWARDS, TRADE_OFFERS, applyStatus, attackDamage, chooseDialogue, completeQuest, createRpgState, grantExperience, npcPositionAt, normalizeRpgState, tickStatuses, tradeOffer, unlockSkill, useRpgItem, type Combatant, type RpgState, type StatusKind } from './rpg'
import {
  CONTINENT_ECHO_PICKUPS,
  CONTINENT_RESOURCE_PICKUPS,
  CONTINENT_ROCKS,
  DISCOVERY_ZONES,
  ECHO_ITEM_ID,
  ECHO_PICKUPS,
  ECHO_TOTAL,
  ENDING_LORE,
  type DroppedItem,
  RESOURCE_PICKUPS,
  HERO_RADIUS,
  PROLOGUE_LORE,
  PICKUP_LORE,
  RELIC_PICKUPS,
  SPAWN,
  WORLD,
  WORLD_BOUNDS,
  getRegionCamp,
  getRegionGrid,
  getRegionSpawn,
  type WorldRegion,
  WORLD_ROCKS,
  isPickupUnlocked,
  type WorldPickup,
} from './world'

export type Direction = 'up' | 'down' | 'left' | 'right'

export type NearbyPickup = { id: string; itemId: string }

export type GameSnapshot = {
  memories: number
  totalEchoes: number
  nearPickup: NearbyPickup | null
  nearCamp: boolean
  completed: boolean
  inventory: InventorySlot[]
  position: Point
  collected: string[]
  discovered: string[]
  survival: SurvivalNeeds
  equippedTool: 'axe_tool' | 'pickaxe_tool' | null
  droppedItems: DroppedItem[]
  region: WorldRegion
  nearbyNpc: string | null
  rpg: RpgState
}

export type GameCallbacks = {
  onSnapshot: (snapshot: GameSnapshot) => void
  onNotice: (notice: 'memory' | 'relic' | 'camp' | 'ending' | 'inventory-full' | 'tool-needed' | 'beacon-needed' | 'enemy-defeated' | 'level-up' | 'player-defeated' | 'quest-complete' | 'combat-reward' | 'hungry' | 'starving') => void
  onPickup: (pickup: NearbyPickup) => void
  onNpc: (npcId: string) => void
  onDiscover: (loreId: string) => void
  onCamp: () => void
  onCraft: () => void
  onTasks: () => void
  onZoomChange: (zoom: number) => void
  onPause: () => void
  onInventory: () => void
  onSelect: () => void
  onChronicle: () => void
  onReady: () => void
}

export type CameraView = { x: number; y: number; width: number; height: number; portUnlocked?: boolean }
export type GameGraphicsSettings = { quality: GraphicsQuality; shadows: boolean }

const MOVE_SPEED = 128
const PICKUP_RADIUS = 42
const PICKUP_REVEAL_RADIUS = 64

type WorldObject = {
  baseX: number
  baseY: number
  region?: WorldRegion
  width: number
  height: number
  sprite: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Ellipse
  bounds: Rectangle
  touching: boolean
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const KEY_CODE_ALIASES: Record<string, string> = { ARROWUP: 'UP', ARROWDOWN: 'DOWN', ARROWLEFT: 'LEFT', ARROWRIGHT: 'RIGHT', SPACE: 'SPACE', ESCAPE: 'ESC', ENTER: 'ENTER', SHIFT: 'SHIFT' }
const keyCodeFromBinding = (key: string) => {
  const normalized = key.toUpperCase()
  const code = (Phaser.Input.Keyboard.KeyCodes as unknown as Record<string, number>)[KEY_CODE_ALIASES[normalized] ?? normalized]
  return code ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0)
}
const keyNameFromEvent = (key: string) => key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key

class IslandScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Sprite
  private mapImage!: Phaser.GameObjects.Image
  private boatMark!: Phaser.GameObjects.Graphics
  private region: WorldRegion = 'shore'
  private heroShadow!: Phaser.GameObjects.Ellipse
  private engine!: IslandMovementEngine
  private graphicsQuality: GraphicsQuality
  private shadowsEnabled: boolean
  private zoomFactor = 1
  private cameraFollowOffset: Point = { x: 0, y: 0 }
  private panning = false
  private lastPanPointer: Point | null = null
  private memorySprites = new Map<string, Phaser.GameObjects.Image>()
  private droppedPickupIds = new Set<string>()
  private dropCounter = 0
  private pickups: Collectible[] = []
  private worldObjects: WorldObject[] = []
  private rockColliders: Rectangle[] = []
  private inventory = new Inventory()
  private rpg = createRpgState()
  private enemySprites = new Map<string, Phaser.GameObjects.Graphics>()
  private enemyVisualStates = new Map<string, string>()
  private npcGraphicsReady = false
  private npcSprites = new Map<string, { graphic: Phaser.GameObjects.Graphics; name: Phaser.GameObjects.Text }>()
  private survival = createSurvivalNeeds()
  private equippedTool: 'axe_tool' | 'pickaxe_tool' | null = null
  private heldTool!: Phaser.GameObjects.Sprite
  private boundKeys = {} as Record<GameAction, Phaser.Input.Keyboard.Key>
  private arrowKeys = {} as Record<Direction, Phaser.Input.Keyboard.Key>
  private keybinds: GameKeybinds
  private virtualDirections = new Set<Direction>()
  private virtualInteract = false
  private started = false
  private completed = false
  private facing: Direction = 'down'
  private lastInteract = false
  private lastSnapshotAt = 0
  private lastSnapshotKey = ''
  private staminaRecoveryDelay = 0
  private lastHungerTier: HungerTier = 'sated'
  private vitalNoticeAt = -60
  private discovered = new Set<string>()
  private readonly callbacks: GameCallbacks

  constructor(callbacks: GameCallbacks, graphics: GameGraphicsSettings, keybinds: GameKeybinds) {
    super('island')
    this.callbacks = callbacks
    this.graphicsQuality = graphics.quality
    this.shadowsEnabled = graphics.shadows
    this.keybinds = { ...keybinds }
  }

  preload() {
    this.load.image('island-map', '/Public/Tiled/Tiled_map.png')
    this.load.image('echo-gem', '/Public/gui/paperUISystem/Sprites/Content/1 Items/1.png')
    this.load.image('relic-gem', '/Public/gui/paperUISystem/Sprites/Content/1 Items/2.png')
    this.load.spritesheet('hero-idle', '/Public/Characters/Character_1/Idle.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('hero-walk', '/Public/Characters/Character_1/Walk.png', { frameWidth: 32, frameHeight: 32 })
    this.load.image('rock-cave', '/Public/png_assets/cave_rocks/cave_rock5.png')
    this.load.image('rock-lane', '/Public/png_assets/middle_lane_rocks1/middle_lane_rock1_5.png')
    this.load.image('rock-snow', '/Public/png_assets/snowy_rocks1/snowy_rock5.png')
    this.load.image('rock-canyon', '/Public/png_assets/canyon_rocks/canyon_rock5.png')
    this.load.image('rock-desert', '/Public/png_assets/desert_rocks/desert_rock5.png')
    this.load.image('rock-ice', '/Public/png_assets/ice_rock/ice_rock5.png')
    this.load.image('rock-stalagmite', '/Public/png_assets/stalagmites/stalagmite5.png')
    this.load.atlas('craft-items', '/Public/Items/Crafting_materials/atlas/atlas_32.png', '/Public/Items/Crafting_materials/atlas/atlas_32.json')
    this.load.spritesheet('tool-axe', '/Public/Items/Tools_with_animate/PNG_Spritesheets/Axe.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('tool-pick', '/Public/Items/Tools_with_animate/PNG_Spritesheets/Pick.png', { frameWidth: 16, frameHeight: 16 })
  }

  private addPickupSprite(pickup: Pick<WorldPickup, 'itemId' | 'x' | 'y'>) {
    if (pickup.itemId === ECHO_ITEM_ID) return this.add.image(pickup.x, pickup.y - 8, 'echo-gem').setDepth(pickup.y + 8).setScale(1.35)
    if (pickup.itemId === 'sea-glass') return this.add.image(pickup.x, pickup.y - 8, 'relic-gem').setDepth(pickup.y + 8).setScale(1.15)
    const itemAliases: Record<string, string> = { hearty_ration: 'berry_cluster', herbal_tonic: 'medicinal_herb' }
    const frame = `${itemAliases[pickup.itemId] ?? ITEM_DETAILS[pickup.itemId]?.icon ?? pickup.itemId}.png`
    return this.add.image(pickup.x, pickup.y - 5, 'craft-items', frame).setDepth(pickup.y + 7).setScale(0.78)
  }

  private pickupUnlocked(pickup: Collectible) {
    return isPickupUnlocked(pickup, this.survival.crafted, this.survival.built)
  }

  private getNearbyNpc() {
    const player = { x: this.hero.x, y: this.hero.y }
    return NPCS.find((npc) => npc.region === this.region && distance(player, npcPositionAt(npc, this.survival.elapsedSeconds)) <= 48) ?? null
  }

  private refreshRpgSprites() {
    for (const enemy of this.rpg.enemies) {
      const graphic = this.enemySprites.get(enemy.id)
      if (!graphic) continue
      const visible = this.region === enemy.region && enemy.alive
      const boss = enemy.behavior === 'boss'
      const radius = boss ? 15 : 9
      const color = enemy.phase === 'enraged' ? 0xc94e43 : boss ? 0x6a5d8e : enemy.behavior === 'ranged' ? 0x72a4bd : enemy.behavior === 'skirmisher' ? 0xc97948 : 0x647e55
      const visualState = `${enemy.alive}:${enemy.phase}:${enemy.statuses.map((status) => status.kind).join(',')}`
      if (this.enemyVisualStates.get(enemy.id) !== visualState) {
        graphic.clear()
        graphic.fillStyle(0x152019, 0.24).fillEllipse(0, 2, radius * 2.2, radius * 0.65)
        graphic.fillStyle(color, 1).fillCircle(0, -radius * 0.55, radius)
        graphic.fillStyle(0xe5d59d, 1).fillCircle(-radius * 0.3, -radius * 0.7, Math.max(1.5, radius * 0.14))
        graphic.fillStyle(0xe5d59d, 1).fillCircle(radius * 0.3, -radius * 0.7, Math.max(1.5, radius * 0.14))
        if (boss) {
          graphic.fillStyle(0xb1a6d0, 0.95).fillTriangle(-radius * 0.65, -radius * 1.1, -radius * 0.35, -radius * 1.75, -radius * 0.05, -radius * 1.05)
          graphic.fillTriangle(radius * 0.65, -radius * 1.1, radius * 0.35, -radius * 1.75, radius * 0.05, -radius * 1.05)
        }
        if (enemy.statuses.length > 0) {
          const tint = enemy.statuses[0].kind === 'poison' ? 0x83d16b : enemy.statuses[0].kind === 'burn' ? 0xff8c45 : 0x7bd6ec
          graphic.lineStyle(2, tint, 0.9).strokeCircle(0, -radius * 0.55, radius + 3)
        }
        this.enemyVisualStates.set(enemy.id, visualState)
      }
      graphic.setPosition(enemy.x, enemy.y).setDepth(enemy.y + radius + 4).setVisible(visible)
    }
    for (const npc of NPCS) {
      const sprite = this.npcSprites.get(npc.id)
      if (!sprite) continue
      const position = npcPositionAt(npc, this.survival.elapsedSeconds)
      const visible = npc.region === this.region
      if (!this.npcGraphicsReady) {
        sprite.graphic.fillStyle(0x352b25, 0.25).fillEllipse(0, 0, 18, 6)
        sprite.graphic.fillStyle(npc.id === 'tala' ? 0x62805c : npc.id === 'oren' ? 0x587187 : 0xb27c55, 1).fillRoundedRect(-7, -20, 14, 18, 4)
        sprite.graphic.fillStyle(0xe6c39b, 1).fillCircle(0, -23, 5)
        sprite.graphic.fillStyle(npc.id === 'tala' ? 0x7a5945 : 0x40352b, 1).fillEllipse(0, -27, 10, 4)
      }
      sprite.graphic.setPosition(position.x, position.y).setDepth(position.y + 8).setVisible(visible)
      sprite.name.setPosition(position.x, position.y - 29).setDepth(position.y + 9).setVisible(visible)
    }
    this.npcGraphicsReady = true
  }

  private refreshPickupVisibility() {
    const hero = this.hero ? { x: this.hero.x, y: this.hero.y } : getRegionSpawn(this.region)
    for (const pickup of this.pickups) {
      const activeRegion = (pickup.region ?? 'shore') === this.region
      const alwaysShow = pickup.itemId === ECHO_ITEM_ID || pickup.itemId === 'sea-glass'
      const nearby = distance(hero, pickup) <= PICKUP_REVEAL_RADIUS
      const visible = activeRegion && !pickup.collected && (
        this.droppedPickupIds.has(pickup.id) ||
        (this.pickupUnlocked(pickup) && (alwaysShow || nearby))
      )
      this.memorySprites.get(pickup.id)?.setVisible(visible)
    }
  }

  private clearDroppedPickups() {
    for (const id of this.droppedPickupIds) {
      this.memorySprites.get(id)?.destroy()
      this.memorySprites.delete(id)
    }
    this.pickups = this.pickups.filter((pickup) => !this.droppedPickupIds.has(pickup.id))
    this.droppedPickupIds.clear()
  }

  create() {
    this.mapImage = this.add.image(0, 0, 'island-map').setOrigin(0).setDepth(0)
    this.boatMark = this.createBoatMark().setVisible(false)

    this.anims.create({ key: 'hero-idle', frames: this.anims.generateFrameNumbers('hero-idle', { start: 0, end: 3 }), frameRate: 5, repeat: -1 })
    this.anims.create({ key: 'hero-walk', frames: this.anims.generateFrameNumbers('hero-walk', { start: 0, end: 3 }), frameRate: 9, repeat: -1 })
    this.anims.create({ key: 'axe-swing', frames: this.anims.generateFrameNumbers('tool-axe', { start: 0, end: 12 }), frameRate: 20, repeat: 0 })
    this.anims.create({ key: 'pick-swing', frames: this.anims.generateFrameNumbers('tool-pick', { start: 0, end: 12 }), frameRate: 20, repeat: 0 })
    const spawns: WorldPickup[] = [...ECHO_PICKUPS, ...RELIC_PICKUPS, ...RESOURCE_PICKUPS, ...CONTINENT_ECHO_PICKUPS, ...CONTINENT_RESOURCE_PICKUPS]
    this.pickups = spawns.map((pickup) => ({ ...pickup, collected: false }))
    this.memorySprites = new Map(this.pickups.map((pickup) => [pickup.id, this.addPickupSprite(pickup)] as const))
    this.refreshPickupVisibility()

    const rockPlacements: Array<{ key: string; x: number; y: number; scale: number; region?: WorldRegion }> = [...WORLD_ROCKS, ...CONTINENT_ROCKS]
    this.worldObjects = rockPlacements.map(({ key, x, y, scale, region }) => {
      const visible = !region || region === this.region
      const sprite = this.add.image(x, y, key).setOrigin(0.5, 0.88).setScale(scale).setDepth(y).setVisible(visible)
      const shadowAlpha = this.graphicsQuality === 'high' ? 0.24 : this.graphicsQuality === 'medium' ? 0.18 : 0.12
      const shadow = this.add.ellipse(x, y - 2, sprite.displayWidth * 0.78, 8, 0x152018, shadowAlpha).setDepth(y - 1).setVisible(this.shadowsEnabled && visible)
      const width = sprite.displayWidth * 0.62
      const height = Math.max(8, sprite.displayHeight * 0.28)
      return {
        baseX: x,
        baseY: y,
        region,
        width,
        height,
        sprite,
        shadow,
        bounds: { left: x - width / 2, right: x + width / 2, top: y - height, bottom: y },
        touching: false,
      }
    })
    this.rockColliders = this.worldObjects.filter((object) => !object.region || object.region === this.region).map(({ bounds }) => bounds)
    this.engine = new IslandMovementEngine({ position: SPAWN, speed: MOVE_SPEED, radius: HERO_RADIUS, grid: getRegionGrid(this.region), bounds: WORLD_BOUNDS, colliders: this.rockColliders })

    const heroShadowAlpha = this.graphicsQuality === 'high' ? 0.36 : this.graphicsQuality === 'medium' ? 0.28 : 0.2
    this.heroShadow = this.add.ellipse(SPAWN.x, SPAWN.y + 10, 15, 5, 0x101710, heroShadowAlpha).setDepth(SPAWN.y + 13).setVisible(this.shadowsEnabled)
    this.hero = this.add.sprite(SPAWN.x, SPAWN.y, 'hero-idle', 0)
    this.hero.setScale(1.15)
    this.hero.play('hero-idle')
    this.heldTool = this.add.sprite(SPAWN.x, SPAWN.y, 'tool-axe', 0).setScale(1.35).setVisible(false)
    this.heldTool.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.heldTool.setFrame(0))
    this.enemySprites = new Map(this.rpg.enemies.map((enemy) => [enemy.id, this.add.graphics().setDepth(enemy.y + 8)]))
    this.npcSprites = new Map(NPCS.map((npc) => [npc.id, {
      graphic: this.add.graphics().setDepth(npc.home.y + 10),
      name: this.add.text(npc.home.x, npc.home.y - 22, npc.name.pl, { fontFamily: 'Georgia, serif', fontSize: '8px', color: '#fff1d4', stroke: '#25332a', strokeThickness: 2 }).setOrigin(0.5, 1),
    }]))
    this.refreshRpgSprites()

    this.configureKeybinds()
    this.input.keyboard!.on('keydown', this.handleKeydown, this)
    this.input.keyboard!.on('keydown-X', () => this.callbacks.onSelect())
    this.bindMapPanning()
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (this.started) this.zoomAt(pointer.x, pointer.y, deltaY < 0 ? 0.08 : -0.08)
    })

    this.configureCamera()
    this.scale.on('resize', this.configureCamera, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.configureCamera, this))

    this.publishSnapshot()
    this.callbacks.onReady()
  }

  private bindMapPanning() {
    const canvas = this.game.canvas
    canvas.addEventListener('contextmenu', this.preventMapContextMenu)
    canvas.addEventListener('pointerdown', this.startMapPan)
    window.addEventListener('pointermove', this.moveMapPan)
    window.addEventListener('pointerup', this.stopMapPan)
    window.addEventListener('pointercancel', this.stopMapPan)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      canvas.removeEventListener('contextmenu', this.preventMapContextMenu)
      canvas.removeEventListener('pointerdown', this.startMapPan)
      window.removeEventListener('pointermove', this.moveMapPan)
      window.removeEventListener('pointerup', this.stopMapPan)
      window.removeEventListener('pointercancel', this.stopMapPan)
      this.panning = false
      this.lastPanPointer = null
    })
  }

  private preventMapContextMenu = (event: MouseEvent) => event.preventDefault()

  private startMapPan = (event: PointerEvent) => {
    if (event.button !== 2 || !this.started) return
    event.preventDefault()
    this.panning = true
    this.lastPanPointer = { x: event.clientX, y: event.clientY }
  }

  private moveMapPan = (event: PointerEvent) => {
    if (!this.panning || !this.lastPanPointer) return
    if ((event.buttons & 2) === 0) {
      this.stopMapPan()
      return
    }
    const canvas = this.game.canvas
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const deltaX = (event.clientX - this.lastPanPointer.x) * this.scale.width / rect.width
    const deltaY = (event.clientY - this.lastPanPointer.y) * this.scale.height / rect.height
    const camera = this.cameras.main
    camera.scrollX -= deltaX / camera.zoom
    camera.scrollY -= deltaY / camera.zoom
    this.cameraFollowOffset = {
      x: camera.scrollX + camera.width / 2 - this.hero.x,
      y: camera.scrollY + camera.height / 2 - this.hero.y,
    }
    this.lastPanPointer = { x: event.clientX, y: event.clientY }
  }

  private stopMapPan = () => {
    this.panning = false
    this.lastPanPointer = null
  }

  private configureCamera() {
    if (!this.cameras?.main) return
    const camera = this.cameras.main
    const cover = Math.max(this.scale.width / WORLD.width, this.scale.height / WORLD.height)
    const base = Math.max(cover, cover * 1.6)
    const target = Math.max(0.5, Math.min(6, base * this.zoomFactor))
    camera.setZoom(target)
    camera.setBounds(0, 0, WORLD.width, WORLD.height)
    if (this.hero) camera.centerOn(this.hero.x + this.cameraFollowOffset.x, this.hero.y + this.cameraFollowOffset.y)
    camera.setRoundPixels(true)
  }

  /** Widok kamery w koordynatach świata — używany przez warstwę atmosfery. */
  cameraView(): CameraView {
    const view = this.cameras?.main?.worldView
    if (!view) return { x: 0, y: 0, width: WORLD.width, height: WORLD.height, portUnlocked: this.completed || this.region === 'continent' }
    return { x: view.x, y: view.y, width: view.width, height: view.height, portUnlocked: this.completed || this.region === 'continent' }
  }

  setStarted(value: boolean) {
    this.started = value
  }

  setGraphicsSettings(settings: GameGraphicsSettings) {
    this.graphicsQuality = settings.quality
    this.shadowsEnabled = settings.shadows
    const shadowAlpha = settings.quality === 'high' ? 0.24 : settings.quality === 'medium' ? 0.18 : 0.12
    this.worldObjects.forEach(({ shadow, region }) => shadow.setAlpha(shadowAlpha).setVisible(settings.shadows && (!region || region === this.region)))
    this.heroShadow?.setAlpha(shadowAlpha * 1.5).setVisible(settings.shadows)
    if (this.game.loop) this.game.loop.targetFps = settings.quality === 'low' ? 45 : 60
  }

  setKeybinds(keybinds: GameKeybinds) {
    this.keybinds = { ...keybinds }
    this.configureKeybinds()
  }

  private configureKeybinds() {
    const keyboard = this.input?.keyboard
    if (!keyboard) return
    Object.values(this.boundKeys).forEach((key) => keyboard.removeKey(key.keyCode))
    for (const action of Object.keys(this.keybinds) as GameAction[]) {
      const keyCode = keyCodeFromBinding(this.keybinds[action])
      if (keyCode) this.boundKeys[action] = keyboard.addKey(keyCode)
    }
    this.arrowKeys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    }
    keyboard.addCapture([...Object.values(this.keybinds).map(keyCodeFromBinding).filter(Boolean), Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.RIGHT])
  }

  private handleKeydown(event: KeyboardEvent) {
    if (!this.started) return
    const pressed = keyNameFromEvent(event.key)
    const action = (Object.keys(this.keybinds) as GameAction[]).find((candidate) => keyNameFromEvent(this.keybinds[candidate]) === pressed)
    if (action === 'inventory') this.callbacks.onInventory()
    else if (action === 'chronicle') this.callbacks.onChronicle()
    else if (action === 'craft') this.callbacks.onCraft()
    else if (action === 'tasks') this.callbacks.onTasks()
    else if (action === 'pause') this.callbacks.onPause()
    else if (action === 'melee') this.meleeAttack()
    else if (action === 'ranged') this.rangedAttack()
    else if (action === 'dodge') this.dodge()
  }

  setZoom(zoom: number) {
    this.zoomFactor = Math.max(0.7, Math.min(1.5, Number.isFinite(zoom) ? zoom : 1))
    this.configureCamera()
    return this.zoomFactor
  }

  private zoomAt(screenX: number, screenY: number, amount: number) {
    const camera = this.cameras.main
    const pointBefore = camera.getWorldPoint(screenX, screenY)
    this.setZoom(this.zoomFactor + amount)
    const pointAfter = camera.getWorldPoint(screenX, screenY)
    camera.scrollX += pointBefore.x - pointAfter.x
    camera.scrollY += pointBefore.y - pointAfter.y
    const center = camera.getWorldPoint(this.scale.width / 2, this.scale.height / 2)
    this.cameraFollowOffset = { x: center.x - this.hero.x, y: center.y - this.hero.y }
    this.callbacks.onZoomChange(this.zoomFactor)
  }

  setDirection(direction: Direction, pressed: boolean) {
    if (pressed) this.virtualDirections.add(direction)
    else this.virtualDirections.delete(direction)
  }

  setInteract(pressed: boolean) {
    this.virtualInteract = pressed
  }

  equipTool(itemId: 'axe_tool' | 'pickaxe_tool' | null) {
    this.equippedTool = itemId && this.inventory.count(itemId) > 0 ? itemId : null
    this.refreshHeldTool()
    this.publishSnapshot()
  }

  craft(recipeId: string): RecipeResult {
    const camp = getRegionCamp(this.region)
    const result = performRecipe(recipeId, this.inventory, this.survival, distance({ x: this.hero.x, y: this.hero.y }, camp) < camp.radius)
    if (result !== 'crafted') return result
    if (recipeId === 'stone-axe') {
      this.equippedTool = 'axe_tool'
      this.refreshHeldTool()
    }
    if (recipeId === 'stone-pick') {
      this.equippedTool = 'pickaxe_tool'
      this.refreshHeldTool()
    }
    if (recipeId === 'iron-sword') this.rpg.player.equippedWeapon = 'iron_sword'
    if (recipeId === 'arcane-staff') this.rpg.player.equippedWeapon = 'arcane_staff'
    this.refreshPickupVisibility()
    this.publishSnapshot()
    return result
  }

  useItem(itemId: string) {
    if (useRpgItem(this.rpg, this.inventory, itemId)) {
      this.publishSnapshot()
      return true
    }
    const used = consumeSurvivalItem(itemId, this.inventory, this.survival)
    if (used) {
      const item = ITEM_DETAILS[itemId]
      if (item?.health) this.rpg.player.health = Math.min(this.rpg.player.maxHealth, this.rpg.player.health + item.health)
      if (item?.poisonChance && item.poisonChance > 0 && Math.random() < item.poisonChance) applyStatus(this.rpg.player, 'poison', 4)
      this.publishSnapshot()
    }
    return used
  }

  dropItem(itemId: string, quantity: number) {
    if (!this.inventory.remove(itemId, quantity)) return false
    if (itemId === this.equippedTool) {
      this.equippedTool = null
      this.refreshHeldTool()
    }
    if (itemId === this.rpg.player.equippedWeapon) this.rpg.player.equippedWeapon = null
    const offsets: Record<Direction, { x: number; y: number }> = {
      up: { x: 0, y: -24 }, down: { x: 0, y: 24 }, left: { x: -24, y: 0 }, right: { x: 24, y: 0 },
    }
    const offset = offsets[this.facing]
    const nearby = { x: this.hero.x + offset.x, y: this.hero.y + offset.y }
    const position = canOccupyCells(nearby, HERO_RADIUS, getRegionGrid(this.region), WORLD_BOUNDS, this.rockColliders)
      ? nearby
      : { x: this.hero.x, y: this.hero.y }
    const id = `dropped-${Date.now()}-${this.dropCounter++}`
    const pickup: Collectible = {
      id,
      region: this.region,
      itemId,
      x: position.x,
      y: position.y,
      quantity,
      maxStack: ITEM_DETAILS[itemId]?.tool ? 1 : 99,
      collected: false,
    }
    this.pickups.push(pickup)
    this.droppedPickupIds.add(id)
    this.memorySprites.set(id, this.addPickupSprite(pickup))
    this.publishSnapshot()
    return true
  }

  restAtCamp() {
    const camp = getRegionCamp(this.region)
    if (distance({ x: this.hero.x, y: this.hero.y }, camp) >= camp.radius) return false
    this.survival.energy = Math.min(100, this.survival.energy + 55)
    if (this.survival.built.includes('rain-catcher')) this.survival.thirst = Math.min(100, this.survival.thirst + 35)
    this.rpg.player.health = Math.min(this.rpg.player.maxHealth, this.rpg.player.health + 25)
    this.rpg.player.mana = Math.min(this.rpg.player.maxMana, this.rpg.player.mana + 30)
    this.rpg.player.stamina = this.rpg.player.maxStamina
    this.rpg.player.statuses = []
    this.staminaRecoveryDelay = 0
    this.publishSnapshot()
    return true
  }

  meleeAttack() {
    const player = this.rpg.player
    if (!this.started || player.meleeCooldown > 0 || player.stamina < MELEE_STAMINA_COST || player.statuses.some((status) => status.kind === 'freeze')) return false
    const target = this.rpg.enemies.filter((enemy) => enemy.alive && enemy.region === this.region && distance(this.hero, enemy) <= 52)
      .sort((a, b) => distance(this.hero, a) - distance(this.hero, b))[0]
    if (!target) return false
    player.stamina -= MELEE_STAMINA_COST
    this.staminaRecoveryDelay = STAMINA_RECOVERY_DELAY
    player.meleeCooldown = 0.42
    const meleeProfile = getVitalProfile({
      hunger: this.survival.hunger,
      health: player.health,
      maxHealth: player.maxHealth,
      stamina: player.stamina,
      maxStamina: player.maxStamina,
      skills: player.skills,
    })
    target.hp = Math.max(0, target.hp - Math.round(attackDamage(this.rpg, 'melee') * meleeProfile.meleeScale))
    this.showAttackFlash(target, 0xf5d58c)
    if (target.hp === 0) this.defeatEnemy(target)
    this.publishSnapshot()
    return true
  }

  rangedAttack() {
    const player = this.rpg.player
    if (!this.started || player.rangedCooldown > 0 || player.mana < 16 || player.statuses.some((status) => status.kind === 'freeze')) return false
    const target = this.rpg.enemies.filter((enemy) => enemy.alive && enemy.region === this.region && distance(this.hero, enemy) <= 220)
      .sort((a, b) => distance(this.hero, a) - distance(this.hero, b))[0]
    if (!target) return false
    player.mana -= player.skills.includes('arcana') ? 10 : 16
    player.rangedCooldown = 0.68
    target.hp = Math.max(0, target.hp - attackDamage(this.rpg, 'ranged'))
    const bolt = this.add.circle(this.hero.x, this.hero.y - 12, 4, 0x93dcf2, 0.95).setDepth(this.hero.depth + 1)
    this.tweens.add({ targets: bolt, x: target.x, y: target.y - 10, scale: 0.4, alpha: 0.2, duration: 220, onComplete: () => bolt.destroy() })
    if (target.hp === 0) this.defeatEnemy(target)
    this.publishSnapshot()
    return true
  }

  dodge() {
    const player = this.rpg.player
    if (!this.started || player.dodgeCooldown > 0 || player.statuses.some((status) => status.kind === 'freeze')) return false
    const cost = player.skills.includes('fleetfoot') ? 12 : DODGE_STAMINA_COST
    if (player.stamina < cost) return false
    const directions: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
    const direction = directions[this.facing]
    const movement = { x: direction.x * 48, y: direction.y * 48 }
    const destination = moveWithCellCollisions({ x: this.hero.x, y: this.hero.y }, movement, HERO_RADIUS, getRegionGrid(this.region), WORLD_BOUNDS, this.rockColliders)
    if (distance(this.hero, destination) < 12) return false
    player.stamina -= cost
    this.staminaRecoveryDelay = STAMINA_RECOVERY_DELAY
    player.dodgeCooldown = player.skills.includes('fleetfoot') ? 0.72 : 1.1
    player.invulnerability = 0.52
    this.engine.setPosition(destination)
    this.hero.setPosition(destination.x, destination.y)
    this.publishSnapshot()
    return true
  }

  chooseNpcDialogue(npcId: string, choiceId: string) {
    const npc = NPCS.find((entry) => entry.id === npcId && entry.region === this.region)
    if (!npc || distance({ x: this.hero.x, y: this.hero.y }, npcPositionAt(npc, this.survival.elapsedSeconds)) > 48) return false
    const changed = chooseDialogue(this.rpg, npcId, choiceId)
    if (changed) this.publishSnapshot()
    return changed
  }

  tradeWithNpc(offerId: string) {
    const offer = TRADE_OFFERS.find((entry) => entry.id === offerId)
    const npc = NPCS.find((entry) => entry.id === offer?.npcId && entry.region === this.region)
    if (!offer || !npc || distance({ x: this.hero.x, y: this.hero.y }, npcPositionAt(npc, this.survival.elapsedSeconds)) > 48) return false
    const day = getDayCycle(this.survival.elapsedSeconds).day
    const completed = tradeOffer(this.rpg, this.inventory, offerId, day)
    if (completed) this.publishSnapshot()
    return completed
  }

  unlockCharacterSkill(skillId: string) {
    const unlocked = unlockSkill(this.rpg, skillId)
    if (unlocked) this.publishSnapshot()
    return unlocked
  }

  private announceVitalShift(tier: HungerTier) {
    if (tier === this.lastHungerTier) return
    const previous = this.lastHungerTier
    this.lastHungerTier = tier
    const worse = ['sated', 'steady', 'hungry', 'starving'].indexOf(tier) > ['sated', 'steady', 'hungry', 'starving'].indexOf(previous)
    if (!worse) return
    const now = this.survival.elapsedSeconds
    if (now - this.vitalNoticeAt < 20) return
    this.vitalNoticeAt = now
    this.callbacks.onNotice(tier === 'starving' ? 'starving' : 'hungry')
  }

  private showAttackFlash(target: Combatant, color: number) {
    const flash = this.add.circle(target.x, target.y - 10, target.behavior === 'boss' ? 22 : 15, color, 0.5).setDepth(target.y + 60)
    this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 220, onComplete: () => flash.destroy() })
  }

  private progressSocialQuest(questId: string, amount: number) {
    if (!this.rpg.social.acceptedQuests.includes(questId) || this.rpg.social.completedQuests.includes(questId)) return
    const goal = NPC_QUEST_GOALS[questId] ?? 1
    this.rpg.social.questProgress[questId] = Math.min(goal, (this.rpg.social.questProgress[questId] ?? 0) + amount)
    this.completePendingQuests()
  }

  private completePendingQuests() {
    for (const questId of this.rpg.social.acceptedQuests) {
      const goal = NPC_QUEST_GOALS[questId] ?? 1
      if ((this.rpg.social.questProgress[questId] ?? 0) < goal) continue
      const reward = QUEST_REWARDS[questId]
      if (reward && !this.inventory.canAdd(reward.itemId, reward.quantity, reward.maxStack)) continue
      if (!completeQuest(this.rpg, questId)) continue
      if (reward) {
        this.inventory.add(reward.itemId, reward.quantity, reward.maxStack)
        grantExperience(this.rpg, reward.experience)
      }
      this.callbacks.onNotice('quest-complete')
    }
  }

  private storeCombatLoot(itemId: string, quantity: number, maxStack: number, position: Point) {
    if (this.inventory.canAdd(itemId, quantity, maxStack)) {
      this.inventory.add(itemId, quantity, maxStack)
      return
    }
    const id = `combat-loot-${Date.now()}-${this.dropCounter++}`
    const pickup: Collectible = { id, region: this.region, itemId, x: position.x, y: position.y, quantity, maxStack, collected: false }
    this.pickups.push(pickup)
    this.droppedPickupIds.add(id)
    this.memorySprites.set(id, this.addPickupSprite(pickup))
    this.callbacks.onNotice('inventory-full')
  }

  private defeatEnemy(enemy: Combatant) {
    if (!enemy.alive) return
    enemy.alive = false
    enemy.phase = 'dead'
    const experience = enemy.behavior === 'boss' ? 180 : enemy.behavior === 'ranged' ? 55 : 38
    const levels = grantExperience(this.rpg, experience)
    const loot: Record<string, { itemId: string; quantity: number; maxStack: number }> = {
      'moss-stalker': { itemId: 'copper_ore', quantity: 1, maxStack: 20 },
      'ember-skirmisher': { itemId: 'iron_ore', quantity: 1, maxStack: 20 },
      'frost-ranger': { itemId: 'crystal_shard', quantity: 1, maxStack: 20 },
      'dawn-warden': { itemId: 'arcane_rune', quantity: 1, maxStack: 5 },
      shardling: { itemId: 'quartz_chunk', quantity: 1, maxStack: 20 },
    }
    const drop = loot[enemy.id]
    if (drop) this.storeCombatLoot(drop.itemId, drop.quantity, drop.maxStack, enemy)
    if (enemy.behavior === 'boss') {
      this.progressSocialQuest('warden-hunt', 1)
      this.progressSocialQuest('beacon-vow', 1)
    }
    this.callbacks.onNotice(levels > 0 ? 'level-up' : 'combat-reward')
  }

  private updateRpg(deltaMs: number, activity: { moving: boolean; sprinting: boolean }) {
    const seconds = Math.max(0, Math.min(deltaMs / 1000, 0.1))
    const player = this.rpg.player
    this.staminaRecoveryDelay = Math.max(0, this.staminaRecoveryDelay - seconds)
    player.meleeCooldown = Math.max(0, player.meleeCooldown - seconds)
    player.rangedCooldown = Math.max(0, player.rangedCooldown - seconds)
    player.dodgeCooldown = Math.max(0, player.dodgeCooldown - seconds)
    player.invulnerability = Math.max(0, player.invulnerability - seconds)
    const camp = getRegionCamp(this.region)
    const atCamp = distance({ x: this.hero.x, y: this.hero.y }, camp) < camp.radius
    const profile = getVitalProfile({
      hunger: this.survival.hunger,
      health: player.health,
      maxHealth: player.maxHealth,
      stamina: player.stamina,
      maxStamina: player.maxStamina,
      atCamp,
      resting: atCamp,
      hasStatus: player.statuses.length > 0,
      skills: player.skills,
    })
    const canRecover = !activity.sprinting && this.staminaRecoveryDelay <= 0
    if (canRecover) {
      const regen = profile.staminaRegenPerSecond * (activity.moving ? 0.55 : 1)
      player.stamina = Math.min(player.maxStamina, player.stamina + seconds * regen)
    }
    player.stamina = Math.max(0, Math.min(player.maxStamina, player.stamina))
    if (profile.starvationDamagePerSecond > 0) player.health = applyStarvation(player.health, player.maxHealth, profile, seconds)
    player.mana = Math.min(player.maxMana, player.mana + seconds * 5)
    this.announceVitalShift(profile.hungerTier)
    tickStatuses(player, seconds)
    if (player.health <= 0) {
      player.health = Math.max(1, Math.round(player.maxHealth * DEATH_HEALTH_RATIO))
      player.stamina = Math.round(player.maxStamina * DEATH_HEALTH_RATIO)
      player.mana = Math.round(player.maxMana * 0.35)
      player.statuses = []
      player.invulnerability = 2
      player.experience = Math.max(0, player.experience - 20)
      const spawn = getRegionSpawn(this.region)
      this.engine.setPosition(spawn)
      this.hero.setPosition(spawn.x, spawn.y)
      this.callbacks.onNotice('player-defeated')
    }
    for (const enemy of this.rpg.enemies) {
      if (!enemy.alive || enemy.region !== this.region) continue
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - seconds)
      tickStatuses(enemy, seconds)
      if (enemy.hp <= 0) {
        this.defeatEnemy(enemy)
        continue
      }
      if (enemy.behavior === 'boss') {
        const phase = enemy.hp <= enemy.maxHp * 0.3 ? 'enraged' : enemy.hp <= enemy.maxHp * 0.65 ? 'alert' : 'patrol'
        enemy.phase = phase
      }
      const dx = this.hero.x - enemy.x
      const dy = this.hero.y - enemy.y
      const range = Math.hypot(dx, dy)
      const aggro = enemy.behavior === 'boss' ? 250 : 180
      if (range > aggro) {
        if (enemy.phase !== 'dead' && enemy.behavior !== 'boss') enemy.phase = 'patrol'
        continue
      }
      if (enemy.behavior !== 'boss' && enemy.phase === 'patrol') enemy.phase = 'alert'
      const attackRange = enemy.behavior === 'ranged' ? 120 : enemy.behavior === 'boss' ? (enemy.phase === 'enraged' ? 82 : 58) : 28
      if (range <= attackRange && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = enemy.behavior === 'boss' ? (enemy.phase === 'enraged' ? 1.25 : 2) : enemy.behavior === 'ranged' ? 2.2 : 1.6
        if (player.invulnerability <= 0) {
          const rawDamage = enemy.behavior === 'boss' ? (enemy.phase === 'enraged' ? 22 : 14) : enemy.behavior === 'ranged' ? 10 : 8
          const damage = Math.max(1, Math.round(rawDamage * (1 - player.armorLevel * 0.08)))
          player.health = Math.max(0, player.health - damage)
          const status: StatusKind | null = enemy.id === 'moss-stalker' ? 'poison' : enemy.id === 'ember-skirmisher' || (enemy.behavior === 'boss' && enemy.phase === 'enraged') ? 'burn' : enemy.id === 'frost-ranger' || enemy.id === 'dawn-warden' ? 'freeze' : null
          if (status) applyStatus(player, status, enemy.behavior === 'boss' ? 3 : 2.4)
        }
        if (enemy.behavior === 'boss') {
          const pulse = this.add.circle(enemy.x, enemy.y, enemy.phase === 'enraged' ? 24 : 16, enemy.phase === 'enraged' ? 0xd65c4b : 0x8e80b5, 0.32).setDepth(enemy.y + 48)
          this.tweens.add({ targets: pulse, scale: enemy.phase === 'enraged' ? 3.6 : 2.8, alpha: 0, duration: 420, onComplete: () => pulse.destroy() })
        }
      } else if (range > attackRange * (enemy.behavior === 'ranged' ? 0.82 : 0.7) && range < aggro) {
        const approach = enemy.behavior === 'ranged' && range < 90 ? -1 : 1
        const speed = enemy.behavior === 'boss' ? (enemy.phase === 'enraged' ? 53 : 34) : enemy.behavior === 'skirmisher' ? 45 : 30
        const next = { x: enemy.x + dx / Math.max(1, range) * speed * seconds * approach, y: enemy.y + dy / Math.max(1, range) * speed * seconds * approach }
        if (canOccupyCells(next, enemy.behavior === 'boss' ? 10 : 6, getRegionGrid(this.region), WORLD_BOUNDS, this.rockColliders)) {
          enemy.x = next.x
          enemy.y = next.y
        }
      }
    }
    this.completePendingQuests()
    this.refreshRpgSprites()
  }

  private createBoatMark() {
    const boat = this.add.graphics().setDepth(544)
    boat.fillStyle(0x523a2a, 1).fillPoints([{ x: -20, y: 2 }, { x: 20, y: 2 }, { x: 13, y: 12 }, { x: -13, y: 12 }], true)
    boat.lineStyle(2, 0xead5a6, 1).lineBetween(-17, 4, 17, 4)
    boat.lineStyle(2, 0x49362a, 1).lineBetween(0, -20, 0, 3)
    boat.fillStyle(0xe8d39e, 1).fillPoints([{ x: -2, y: -17 }, { x: -2, y: 0 }, { x: -15, y: 0 }], true)
    boat.fillStyle(0xd7a25a, 1).fillPoints([{ x: 2, y: -14 }, { x: 2, y: 0 }, { x: 13, y: 0 }], true)
    boat.lineStyle(1, 0xf5e3b5, 0.9).lineBetween(-24, 16, -12, 16)
    boat.lineBetween(11, 18, 24, 18)
    boat.setPosition(360, 520)
    this.tweens.add({ targets: boat, y: 516, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    return boat
  }

  private applyRegion(region: WorldRegion, position: Point) {
    this.region = region
    this.cameraFollowOffset = { x: 0, y: 0 }
    if (this.mapImage) this.mapImage.setFlipX(region === 'continent').setTint(region === 'continent' ? 0xf1d5a8 : 0xffffff)
    const flip = region === 'continent'
    for (const object of this.worldObjects) {
      const x = flip ? WORLD.width - object.baseX : object.baseX
      object.sprite.setPosition(x, object.baseY)
      object.shadow.setPosition(x, object.baseY - 2)
      const visible = !object.region || object.region === region
      object.sprite.setVisible(visible)
      object.shadow.setVisible(visible && this.shadowsEnabled)
      object.bounds = {
        left: x - object.width / 2,
        right: x + object.width / 2,
        top: object.baseY - object.height,
        bottom: object.baseY,
      }
      object.touching = false
    }
    this.rockColliders = this.worldObjects.filter((object) => !object.region || object.region === region).map(({ bounds }) => bounds)
    if (this.engine) {
      this.engine = new IslandMovementEngine({ position, speed: MOVE_SPEED, radius: HERO_RADIUS, grid: getRegionGrid(region), bounds: WORLD_BOUNDS, colliders: this.rockColliders })
    }
    if (this.hero) {
      this.hero.setPosition(position.x, position.y)
      this.heroShadow.setPosition(position.x, position.y + 10).setDepth(position.y + 13)
      this.hero.setDepth(position.y + 16)
      this.cameras.main.centerOn(position.x, position.y)
    }
    if (this.boatMark) {
      this.boatMark.setPosition(region === 'shore' ? 360 : 440, region === 'shore' ? 520 : 520)
      this.boatMark.setVisible(region === 'continent' || this.completed)
    }
    this.refreshPickupVisibility()
    this.refreshRpgSprites()
  }

  sailToContinent() {
    if (!this.completed || this.region !== 'shore') return false
    this.completed = false
    this.applyRegion('continent', getRegionSpawn('continent'))
    this.started = true
    this.lastInteract = false
    this.virtualDirections.clear()
    this.virtualInteract = false
    this.hero.play('hero-idle')
    this.cameras.main.flash(650, 239, 213, 168)
    this.publishSnapshot()
    return true
  }

  resetAdventure() {
    this.clearDroppedPickups()
    this.pickups.forEach((pickup) => { pickup.collected = false })
    this.inventory.clear()
    this.survival = createSurvivalNeeds()
    this.rpg = createRpgState()
    this.staminaRecoveryDelay = 0
    this.lastHungerTier = 'sated'
    this.equippedTool = null
    this.refreshHeldTool()
    this.virtualDirections.clear()
    this.virtualInteract = false
    this.lastInteract = false
    this.discovered = new Set(PROLOGUE_LORE)
    this.refreshPickupVisibility()
    this.engine.setPosition(SPAWN)
    this.cameraFollowOffset = { x: 0, y: 0 }
    this.cameras.main.centerOn(SPAWN.x, SPAWN.y)
    this.hero.setPosition(SPAWN.x, SPAWN.y).setFlipX(false).setRotation(0)
    this.heroShadow.setPosition(SPAWN.x, SPAWN.y + 10).setDepth(SPAWN.y + 13)
    this.facing = 'down'
    this.completed = false
    this.region = 'shore'
    this.applyRegion('shore', SPAWN)
    this.boatMark.setVisible(false)
    this.started = false
    this.callbacks.onSnapshot(this.snapshot())
  }

  restoreAdventure(save: SavedAdventure) {
    this.clearDroppedPickups()
    this.rpg = normalizeRpgState(save.rpg)
    this.region = save.region ?? 'shore'
    this.applyRegion(this.region, getRegionSpawn(this.region))
    const position = canOccupyCells(save.position, HERO_RADIUS, getRegionGrid(this.region), WORLD_BOUNDS, this.rockColliders)
      ? save.position
      : getRegionSpawn(this.region)
    this.engine.setPosition(position)
    this.cameraFollowOffset = { x: 0, y: 0 }
    this.hero.setPosition(position.x, position.y).setFlipX(false).setRotation(0)
    this.heroShadow.setPosition(position.x, position.y + 10).setDepth(position.y + 13)
    this.cameras.main.centerOn(position.x, position.y)
    this.inventory.restore(save.inventory)
    this.survival = normalizeSurvivalNeeds(save.survival)
    this.equippedTool = save.equippedTool && this.inventory.count(save.equippedTool) > 0 ? save.equippedTool : null
    this.refreshHeldTool()
    this.pickups.forEach((pickup) => {
      pickup.collected = save.collected.includes(pickup.id)
    })
    for (const dropped of save.droppedItems ?? []) {
      const pickup: Collectible = { ...dropped, region: dropped.region ?? this.region, collected: false }
      this.pickups.push(pickup)
      this.droppedPickupIds.add(pickup.id)
      this.memorySprites.set(pickup.id, this.addPickupSprite(pickup))
    }
    this.discovered = new Set([...PROLOGUE_LORE, ...(save.discovered ?? [])])
    if (save.completed) ENDING_LORE.forEach((loreId) => this.discovered.add(loreId))
    this.refreshPickupVisibility()
    this.virtualDirections.clear()
    this.virtualInteract = false
    this.lastInteract = false
    this.facing = 'down'
    this.completed = save.completed
    this.boatMark.setVisible(this.region === 'continent' || save.completed)
    this.started = !save.completed
    this.hero.play('hero-idle')
    this.publishSnapshot()
  }

  update(time: number, delta: number) {
    if (!this.started || this.completed) return

    const left = this.boundKeys.moveLeft.isDown || (this.keybinds.moveLeft === 'A' && this.arrowKeys.left.isDown) || this.virtualDirections.has('left')
    const right = this.boundKeys.moveRight.isDown || (this.keybinds.moveRight === 'D' && this.arrowKeys.right.isDown) || this.virtualDirections.has('right')
    const up = this.boundKeys.moveUp.isDown || (this.keybinds.moveUp === 'W' && this.arrowKeys.up.isDown) || this.virtualDirections.has('up')
    const down = this.boundKeys.moveDown.isDown || (this.keybinds.moveDown === 'S' && this.arrowKeys.down.isDown) || this.virtualDirections.has('down')
    const { x: dx, y: dy } = normalizeDirection(Number(right) - Number(left), Number(down) - Number(up))
    const moving = dx !== 0 || dy !== 0
    const camp = getRegionCamp(this.region)
    const nearCampBeforeStep = distance({ x: this.hero.x, y: this.hero.y }, camp) < camp.radius
    const player = this.rpg.player
    const frozen = player.statuses.some((status) => status.kind === 'freeze')
    const profile = getVitalProfile({
      hunger: this.survival.hunger,
      health: player.health,
      maxHealth: player.maxHealth,
      stamina: player.stamina,
      maxStamina: player.maxStamina,
      atCamp: nearCampBeforeStep,
      resting: !moving && nearCampBeforeStep,
      hasStatus: frozen || player.statuses.length > 0,
      skills: player.skills,
    })
    const sprinting = moving && !frozen && this.boundKeys.sprint?.isDown === true && profile.canSprint
    const speedFactor = frozen ? 0.18 : profile.moveScale * (sprinting ? SPRINT_MULTIPLIER : 1)
    if (sprinting) {
      player.stamina = Math.max(0, player.stamina - profile.sprintDrainPerSecond * Math.min(delta, 100) / 1000)
      this.staminaRecoveryDelay = STAMINA_RECOVERY_DELAY
    }
    const frame = this.engine.advance(delta, { x: dx, y: dy }, speedFactor)
    this.survival = advanceSurvival(this.survival, frame.simulatedMs / 1000, moving, nearCampBeforeStep)
    this.hero.setPosition(frame.position.x, frame.position.y)
    this.updateRpg(delta, { moving, sprinting })
    this.cameras.main.centerOn(this.hero.x + this.cameraFollowOffset.x, this.hero.y + this.cameraFollowOffset.y)
    const actualMotion = Math.hypot(frame.velocity.x, frame.velocity.y) > 2

    if (actualMotion) {
      this.facing = Math.abs(frame.velocity.x) > Math.abs(frame.velocity.y)
        ? (frame.velocity.x < 0 ? 'left' : 'right')
        : (frame.velocity.y < 0 ? 'up' : 'down')
      this.hero.setFlipX(this.facing === 'left')
      if (this.hero.anims.currentAnim?.key !== 'hero-walk') this.hero.play('hero-walk')
    } else if (this.hero.anims.currentAnim?.key !== 'hero-idle') {
      this.hero.play('hero-idle')
    }

    this.hero.setRotation(Phaser.Math.Linear(this.hero.rotation, frame.steering, 0.28))
    this.heroShadow.setPosition(this.hero.x, this.hero.y + 10).setDepth(this.hero.y + 13)
    this.hero.setDepth(this.hero.y + 16)
    this.positionHeldTool()
    this.updateWorldObjectOpacity()
    this.refreshPickupVisibility()
    this.detectDiscovery()

    const nearestPickup = this.getNearbyPickup()
    const nearCamp = distance({ x: this.hero.x, y: this.hero.y }, camp) < camp.radius
    const nearbyNpc = this.getNearbyNpc()
    const interact = this.boundKeys.interact.isDown || this.virtualInteract

    if (interact && !this.lastInteract) {
      if (nearestPickup) {
        if (nearestPickup.requiredTool && this.equippedTool !== nearestPickup.requiredTool) {
          this.callbacks.onNotice('tool-needed')
        } else {
          const basketBonus = this.inventory.count('gathering_basket') > 0 && ['berry_cluster', 'medicinal_herb', 'mushroom', 'flax_bundle'].includes(nearestPickup.itemId) ? 1 : 0
          const pickedUp = collectNearbyItem(
            { x: this.hero.x, y: this.hero.y },
            this.pickups.filter((pickup) => (pickup.region ?? 'shore') === this.region && this.pickupUnlocked(pickup)),
            PICKUP_RADIUS,
            this.inventory,
            (pickup) => {
              if (pickup.requiredTool) this.playToolAction(pickup.requiredTool)
              return pickup.quantity + basketBonus
            },
          )
          if (pickedUp) {
            this.memorySprites.get(pickedUp.id)?.setVisible(false)
            const wasDropped = this.droppedPickupIds.delete(pickedUp.id)
            if (!wasDropped) this.survival = recordGathering(this.survival, pickedUp.itemId, pickedUp.quantity + basketBonus)
            if (pickedUp.requiredTool === 'axe_tool') this.survival = recordGathering(this.survival, 'axe_harvest', pickedUp.quantity + basketBonus)
            if (pickedUp.requiredTool === 'pickaxe_tool') this.survival = recordGathering(this.survival, 'pick_harvest', pickedUp.quantity + basketBonus)
            if (pickedUp.itemId === 'medicinal_herb' || pickedUp.itemId === 'herb_bundle') this.progressSocialQuest('herbal-aid', pickedUp.quantity + basketBonus)
            const loreId = PICKUP_LORE[pickedUp.id]
            if (loreId && !this.discovered.has(loreId)) {
              this.discovered.add(loreId)
              this.callbacks.onDiscover(loreId)
            }
            this.callbacks.onPickup({ id: pickedUp.id, itemId: pickedUp.itemId })
            if (pickedUp.itemId === ECHO_ITEM_ID) this.callbacks.onNotice('memory')
            else if (pickedUp.itemId === 'sea-glass') this.callbacks.onNotice('relic')
            this.publishSnapshot()
          } else {
            this.callbacks.onNotice('inventory-full')
          }
        }
      } else if (nearbyNpc) {
        this.callbacks.onNpc(nearbyNpc.id)
      } else if (nearCamp) {
        const currentEchoes = this.region === 'shore' ? ECHO_PICKUPS : CONTINENT_ECHO_PICKUPS
        const allEchoes = currentEchoes.every((pickup) => this.pickups.find((candidate) => candidate.id === pickup.id)?.collected)
        const campReady = this.region === 'continent' || (this.survival.built.includes('lighthouse-repair')
          && this.survival.built.includes('lean-to')
          && this.survival.crafted.includes('hearty-ration'))
        if (allEchoes && !campReady) this.callbacks.onNotice('beacon-needed')
        else if (allEchoes && campReady) {
          this.completed = true
          this.boatMark.setVisible(true)
          if (this.region === 'shore') ENDING_LORE.forEach((loreId) => this.discovered.add(loreId))
          this.hero.play('hero-idle')
          this.publishSnapshot()
          this.callbacks.onNotice('ending')
        } else this.callbacks.onCamp()
      }
    }
    this.lastInteract = interact

    if (time - this.lastSnapshotAt > 120) {
      this.publishSnapshot()
      this.lastSnapshotAt = time
    }
  }

  private detectDiscovery() {
    const hero = { x: this.hero.x, y: this.hero.y }
    if (this.region === 'continent') return
    for (const zone of DISCOVERY_ZONES) {
      if (distance(hero, zone) > zone.radius) continue
      const fresh = zone.loreIds.filter((loreId) => !this.discovered.has(loreId))
      if (fresh.length === 0) continue
      fresh.forEach((loreId) => this.discovered.add(loreId))
      fresh.forEach((loreId) => this.callbacks.onDiscover(loreId))
      this.publishSnapshot()
    }
  }

  private getNearbyPickup(): Collectible | null {
    let nearest: Collectible | null = null
    let nearestDistance = PICKUP_RADIUS
    for (const pickup of this.pickups) {
      if ((pickup.region ?? 'shore') !== this.region || pickup.collected || !this.pickupUnlocked(pickup)) continue
      const pickupDistance = distance({ x: this.hero.x, y: this.hero.y }, pickup)
      if (pickupDistance >= nearestDistance) continue
      nearest = pickup
      nearestDistance = pickupDistance
    }
    return nearest
  }

  private refreshHeldTool() {
    if (!this.heldTool) return
    const texture = this.equippedTool === 'axe_tool' ? 'tool-axe' : this.equippedTool === 'pickaxe_tool' ? 'tool-pick' : null
    if (!texture) {
      this.heldTool.setVisible(false)
      return
    }
    if (this.heldTool.texture.key !== texture) this.heldTool.setTexture(texture, 0)
    this.heldTool.setVisible(true).setFrame(0)
    this.positionHeldTool()
  }

  private playToolAction(tool: 'axe_tool' | 'pickaxe_tool') {
    if (this.equippedTool !== tool || !this.heldTool) return
    this.heldTool.play(tool === 'axe_tool' ? 'axe-swing' : 'pick-swing')
  }

  private positionHeldTool() {
    if (!this.heldTool?.visible || !this.hero) return
    const offsets: Record<Direction, Point> = {
      up: { x: 5, y: -11 },
      down: { x: 8, y: 1 },
      left: { x: -10, y: -2 },
      right: { x: 10, y: -2 },
    }
    const offset = offsets[this.facing]
    this.heldTool.setPosition(this.hero.x + offset.x, this.hero.y + offset.y)
      .setFlipX(this.facing === 'left')
      .setDepth(this.hero.depth + (this.facing === 'up' ? -1 : 1))
  }

  private updateWorldObjectOpacity() {
    for (const object of this.worldObjects) {
      if (object.region && object.region !== this.region) continue
      const touching = touchesRectangle({ x: this.hero.x, y: this.hero.y }, HERO_RADIUS, object.bounds, 2)
      if (touching === object.touching) continue
      object.touching = touching
      this.tweens.killTweensOf(object.sprite)
      this.tweens.add({
        targets: object.sprite,
        alpha: touching ? 0.42 : 1,
        duration: 180,
        ease: 'Sine.Out',
      })
    }
  }

  private snapshot(): GameSnapshot {
    const nearby = this.getNearbyPickup()
    return {
      memories: (this.region === 'shore' ? ECHO_PICKUPS : CONTINENT_ECHO_PICKUPS).filter((echo) => this.pickups.find((pickup) => pickup.id === echo.id)?.collected).length,
      totalEchoes: ECHO_TOTAL,
      nearPickup: nearby ? { id: nearby.id, itemId: nearby.itemId } : null,
      nearCamp: distance({ x: this.hero.x, y: this.hero.y }, getRegionCamp(this.region)) < getRegionCamp(this.region).radius,
      completed: this.completed,
      inventory: this.inventory.snapshot(),
      position: { x: this.hero.x, y: this.hero.y },
      collected: this.pickups.filter((pickup) => pickup.collected).map((pickup) => pickup.id),
      discovered: [...this.discovered],
      survival: {
        ...this.survival,
        gathered: { ...this.survival.gathered },
        crafted: [...this.survival.crafted],
        built: [...this.survival.built],
      },
      equippedTool: this.equippedTool,
      droppedItems: this.pickups.filter((pickup) => this.droppedPickupIds.has(pickup.id) && !pickup.collected).map(({ id, itemId, x, y, quantity, maxStack, region }) => ({ id, itemId, x, y, quantity, maxStack, region })),
      region: this.region,
      nearbyNpc: this.getNearbyNpc()?.id ?? null,
      rpg: normalizeRpgState(this.rpg),
    }
  }

  private publishSnapshot() {
    const snapshot = this.snapshot()
    const key = JSON.stringify({
      ...snapshot,
      position: { x: Math.round(snapshot.position.x / 8), y: Math.round(snapshot.position.y / 8) },
    })
    if (key === this.lastSnapshotKey) return
    this.lastSnapshotKey = key
    this.callbacks.onSnapshot(snapshot)
  }
}

export type AdventureGame = {
  start: (started: boolean) => void
  direction: (direction: Direction, pressed: boolean) => void
  interact: (pressed: boolean) => void
  reset: () => void
  restore: (save: SavedAdventure) => void
  sailToContinent: () => boolean
  craft: (recipeId: string) => RecipeResult
  useItem: (itemId: string) => boolean
  dropItem: (itemId: string, quantity: number) => boolean
  equipTool: (itemId: 'axe_tool' | 'pickaxe_tool' | null) => void
  restAtCamp: () => boolean
  meleeAttack: () => boolean
  rangedAttack: () => boolean
  dodge: () => boolean
  chooseNpcDialogue: (npcId: string, choiceId: string) => boolean
  tradeWithNpc: (offerId: string) => boolean
  unlockCharacterSkill: (skillId: string) => boolean
  cameraView: () => CameraView
  setGraphicsSettings: (settings: GameGraphicsSettings) => void
  setKeybinds: (keybinds: GameKeybinds) => void
  setZoom: (zoom: number) => number
  destroy: () => void
}

export const createAdventureGame = (parent: HTMLElement, callbacks: GameCallbacks, graphics: GameGraphicsSettings = { quality: 'high', shadows: true }, keybinds: GameKeybinds = DEFAULT_KEYBINDS): AdventureGame => {
  const scene = new IslandScene(callbacks, graphics, keybinds)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#42bfe8',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [scene],
    fps: { target: 60, min: 30 },
    render: { powerPreference: 'high-performance', transparent: true },
    banner: false,
  })
  return {
    start: (started) => scene.setStarted(started),
    direction: (direction, pressed) => scene.setDirection(direction, pressed),
    interact: (pressed) => scene.setInteract(pressed),
    reset: () => scene.resetAdventure(),
    restore: (save) => scene.restoreAdventure(save),
    sailToContinent: () => scene.sailToContinent(),
    craft: (recipeId) => scene.craft(recipeId),
    useItem: (itemId) => scene.useItem(itemId),
    dropItem: (itemId, quantity) => scene.dropItem(itemId, quantity),
    equipTool: (itemId) => scene.equipTool(itemId),
    restAtCamp: () => scene.restAtCamp(),
    meleeAttack: () => scene.meleeAttack(),
    rangedAttack: () => scene.rangedAttack(),
    dodge: () => scene.dodge(),
    chooseNpcDialogue: (npcId, choiceId) => scene.chooseNpcDialogue(npcId, choiceId),
    tradeWithNpc: (offerId) => scene.tradeWithNpc(offerId),
    unlockCharacterSkill: (skillId) => scene.unlockCharacterSkill(skillId),
    cameraView: () => scene.cameraView(),
    setGraphicsSettings: (settings) => scene.setGraphicsSettings(settings),
    setKeybinds: (keybinds) => scene.setKeybinds(keybinds),
    setZoom: (zoom) => scene.setZoom(zoom),
    destroy: () => game.destroy(true),
  }
}
