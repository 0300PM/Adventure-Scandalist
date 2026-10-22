import type { Point, Rectangle } from './core'

/**
 * Statyczny świat gry: 50 × 40 kafli po 16 px, czyli 800 × 640 px.
 * Maska kolizji została wyprowadzona z warstw TMX — woda, klify, pnie drzew,
 * skały i zabudowania są nieprzenikalne, natomiast plaża, łąki, ścieżki
 * i polany pozostają wolne.
 */
export const WORLD = {
  width: 800,
  height: 640,
  columns: 50,
  rows: 40,
  cellSize: 16,
} as const

export const WORLD_BOUNDS: Rectangle = { left: 0, top: 0, right: WORLD.width, bottom: WORLD.height }

export type WorldRegion = 'shore' | 'continent'

export const getRegionGrid = (region: WorldRegion) => region === 'shore' ? WORLD_GRID : {
  ...WORLD_GRID,
  isSolid: (column: number, row: number) => WORLD_GRID.isSolid(WORLD.columns - 1 - column, row),
}

const SOLID_MASK = [
  '11111111111111111111111111111111111111111111111111',
  '11111111111111111111111111111111111111111111111111',
  '11111111111111111111111111111111111111111111111111',
  '11111111111111111111111111111111111111111111111111',
  '11111111111111111111111111111111111111111111111111',
  '11111111111111111111111111111111111101101110111111',
  '11111111111111111111111111111111111000000000111111',
  '11000010000111100111000000000011000000000000111111',
  '11000000000000100110000000000000000000000001111111',
  '10001110000000011100000000000000000000000000100111',
  '11101111000000011100000000000000000000000000110011',
  '11001111000000011100000000000000000000000000000111',
  '11101111000000001100000000000000000000000000000111',
  '10000000000000011100000000000000000000000000000111',
  '11000000000000000000000000000000000000000000000011',
  '11100000000000000000000000000000000000000000111111',
  '11000000000000000000000000000000000000011111111111',
  '11000000000000000000000000000000000000000111111111',
  '11100000000000000000000000000000000000000111111111',
  '11111110000000000000000000000000000000000111111111',
  '11111110000000000000000000000000000000000001111111',
  '11111110000000000000000000000000000000000001111111',
  '11111110000000000000000000000000000000000001111101',
  '11111110000000000000000000000000000000000001111111',
  '11110000000000000000000000000000000000000001111111',
  '11110000000000000000000000000000000000000001111111',
  '11110000000000000000000000000000000000000001111111',
  '11110000000000000000000000000000000000000001111111',
  '11110000000000000000000000000000000000000001111111',
  '11111000000000000000000000000000000000000011110111',
  '11111100000000000000000000000000000000000011011100',
  '11111110000000000000000000000000000000000111101100',
  '11111110000000000000000000000000000000001111011110',
  '11111111000000000000000000000000000000111111111111',
  '11111111110000000000000000000000000001111111111111',
  '11111111111111100000000000000000000011111111111111',
  '11111111111111111000000000000000011111111111111111',
  '11111111111111111111111111111111111111111111111111',
  '11111111111111111111111111111111111111111111111111',
  '11111111111111111111111111111111111111111111111111',
] as const

/** Siatka kolizji zgodna z interfejsem `CellCollisionGrid` z `core.ts`. */
export const WORLD_GRID = {
  columns: WORLD.columns,
  rows: WORLD.rows,
  cellSize: WORLD.cellSize,
  isSolid: (column: number, row: number): boolean => {
    if (column < 0 || row < 0 || column >= WORLD.columns || row >= WORLD.rows) return true
    return SOLID_MASK[row].charAt(column) === '1'
  },
}

export const isSolidCell = (column: number, row: number): boolean => WORLD_GRID.isSolid(column, row)

/** Promień hitboxa Miry — mieści się w 16-pikselowym korytarzu. */
export const HERO_RADIUS = 6

export const SPAWN: Point = { x: 376, y: 328 }

/** Ognisko obozu północnego — miejsce, w którym kończy się rozdział. */
export const CAMP = { x: 664, y: 186, radius: 58 }
export const getRegionCamp = (region: WorldRegion) => ({ ...CAMP, x: region === 'shore' ? CAMP.x : WORLD.width - CAMP.x })
export const getRegionSpawn = (region: WorldRegion) => ({ ...SPAWN, x: region === 'shore' ? SPAWN.x : WORLD.width - SPAWN.x })
/** Ognisko na plaży — drugi, martwy punkt ognia; czysta sceneria i lore. */
export const BEACH_FIRE = { x: 304, y: 524 }

export type DroppedItem = {
  id: string
  region?: WorldRegion
  itemId: string
  x: number
  y: number
  quantity: number
  maxStack: number
}

export type PickupMilestone = 'stone-axe' | 'lean-to' | 'stone-pick' | 'hammer'

export type WorldPickup = {
  id: string
  region?: WorldRegion
  itemId: string
  x: number
  y: number
  quantity: number
  maxStack: number
  requiredTool?: 'axe_tool' | 'pickaxe_tool'
  unlockAfter?: PickupMilestone
}

export const isPickupUnlocked = (pickup: Pick<WorldPickup, 'unlockAfter'>, crafted: string[], built: string[] = []) =>
  !pickup.unlockAfter || crafted.includes(pickup.unlockAfter) || built.includes(pickup.unlockAfter)

/** Trzy echa pamięci — cel rozdziału pierwszego. */
export const ECHO_PICKUPS: WorldPickup[] = [
  { id: 'shore-echo', itemId: 'memory-echo', x: 184, y: 312, quantity: 1, maxStack: 99 },
  { id: 'oak-echo', itemId: 'memory-echo', x: 296, y: 372, quantity: 1, maxStack: 99 },
  { id: 'camp-echo', itemId: 'memory-echo', x: 648, y: 208, quantity: 1, maxStack: 99 },
]

/** Opcjonalny artefakt: szkło pamięci z sakiewki Arona. */
export const RELIC_PICKUPS: WorldPickup[] = [
  { id: 'aron-glass', itemId: 'sea-glass', x: 200, y: 148, quantity: 1, maxStack: 1 },
]

export const RESOURCE_PICKUPS: WorldPickup[] = [
  { id: 'beach-driftwood', itemId: 'wood_log', x: 300, y: 510, quantity: 7, maxStack: 20 },
  { id: 'beach-flint', itemId: 'flint_stone', x: 220, y: 460, quantity: 4, maxStack: 20 },
  { id: 'beach-water', itemId: 'sap_jar', x: 340, y: 530, quantity: 6, maxStack: 10 },
  { id: 'forest-berries', itemId: 'berry_cluster', x: 260, y: 276, quantity: 4, maxStack: 20 },
  { id: 'forest-flax', itemId: 'flax_bundle', x: 350, y: 430, quantity: 4, maxStack: 20 },
  { id: 'forest-mushrooms', itemId: 'mushroom', x: 348, y: 268, quantity: 2, maxStack: 20 },
  { id: 'forest-herbs', itemId: 'medicinal_herb', x: 440, y: 430, quantity: 2, maxStack: 20 },
  { id: 'old-tree-a', itemId: 'wood_log', x: 316, y: 240, quantity: 6, maxStack: 20, requiredTool: 'axe_tool', unlockAfter: 'stone-axe' },
  { id: 'old-tree-b', itemId: 'wood_log', x: 428, y: 180, quantity: 6, maxStack: 20, requiredTool: 'axe_tool', unlockAfter: 'stone-axe' },
  { id: 'old-tree-c', itemId: 'wood_log', x: 384, y: 340, quantity: 7, maxStack: 20, requiredTool: 'axe_tool', unlockAfter: 'stone-axe' },
  { id: 'forest-resin', itemId: 'resin_lump', x: 456, y: 188, quantity: 4, maxStack: 20, requiredTool: 'axe_tool', unlockAfter: 'stone-axe' },
  { id: 'forest-flax-extra', itemId: 'flax_bundle', x: 520, y: 340, quantity: 6, maxStack: 20, unlockAfter: 'stone-axe' },
  { id: 'forest-berries-extra', itemId: 'berry_cluster', x: 552, y: 370, quantity: 4, maxStack: 20, unlockAfter: 'stone-axe' },
  { id: 'forest-herbs-extra', itemId: 'medicinal_herb', x: 530, y: 300, quantity: 2, maxStack: 20, unlockAfter: 'stone-axe' },
  { id: 'camp-clay', itemId: 'clay_lump', x: 668, y: 184, quantity: 3, maxStack: 20 },
  { id: 'shore-salt', itemId: 'salt_crystal', x: 220, y: 473, quantity: 2, maxStack: 20, unlockAfter: 'lean-to' },
  { id: 'shore-stone', itemId: 'stone_block', x: 252, y: 473, quantity: 2, maxStack: 20, unlockAfter: 'lean-to' },
  { id: 'forest-hide', itemId: 'raw_hide', x: 224, y: 244, quantity: 2, maxStack: 8, unlockAfter: 'lean-to' },
  { id: 'forest-pelt', itemId: 'animal_pelt', x: 208, y: 260, quantity: 1, maxStack: 8, unlockAfter: 'lean-to' },
  { id: 'forest-bone', itemId: 'bone', x: 272, y: 244, quantity: 2, maxStack: 20, unlockAfter: 'lean-to' },
  { id: 'forest-feather', itemId: 'feather', x: 416, y: 260, quantity: 2, maxStack: 20, unlockAfter: 'lean-to' },
  { id: 'forest-cotton', itemId: 'cotton_fiber', x: 528, y: 244, quantity: 2, maxStack: 20, unlockAfter: 'lean-to' },
  { id: 'forest-wheat', itemId: 'wheat_bundle', x: 320, y: 228, quantity: 3, maxStack: 20, unlockAfter: 'lean-to' },
  { id: 'forest-wool', itemId: 'wool', x: 496, y: 260, quantity: 1, maxStack: 8, unlockAfter: 'lean-to' },
  { id: 'forest-silk', itemId: 'silk_thread', x: 560, y: 276, quantity: 2, maxStack: 20, unlockAfter: 'lean-to' },
  { id: 'ruins-coal', itemId: 'coal_chunk', x: 119, y: 143, quantity: 3, maxStack: 20, requiredTool: 'pickaxe_tool', unlockAfter: 'stone-pick' },
  { id: 'ruins-iron', itemId: 'iron_ore', x: 135, y: 159, quantity: 6, maxStack: 20, requiredTool: 'pickaxe_tool', unlockAfter: 'stone-pick' },
  { id: 'ruins-copper', itemId: 'copper_ore', x: 140, y: 200, quantity: 4, maxStack: 20, requiredTool: 'pickaxe_tool', unlockAfter: 'stone-pick' },
  { id: 'ruins-quartz', itemId: 'quartz_chunk', x: 220, y: 188, quantity: 4, maxStack: 20, requiredTool: 'pickaxe_tool', unlockAfter: 'stone-pick' },
  { id: 'central-crystal', itemId: 'crystal_shard', x: 490, y: 270, quantity: 3, maxStack: 20, requiredTool: 'pickaxe_tool', unlockAfter: 'stone-pick' },
  { id: 'ruins-sulfur', itemId: 'sulfur_chunk', x: 231, y: 159, quantity: 2, maxStack: 20, requiredTool: 'pickaxe_tool', unlockAfter: 'stone-pick' },
  { id: 'camp-ash', itemId: 'ash_pile', x: 672, y: 222, quantity: 2, maxStack: 20, unlockAfter: 'stone-pick' },
  { id: 'ruins-gold', itemId: 'gold_ore', x: 151, y: 175, quantity: 1, maxStack: 10, requiredTool: 'pickaxe_tool', unlockAfter: 'hammer' },
  { id: 'ruins-silver', itemId: 'silver_ore', x: 167, y: 191, quantity: 1, maxStack: 10, requiredTool: 'pickaxe_tool', unlockAfter: 'hammer' },
  { id: 'ruins-obsidian', itemId: 'obsidian_shard', x: 183, y: 207, quantity: 1, maxStack: 10, requiredTool: 'pickaxe_tool', unlockAfter: 'hammer' },
  { id: 'ruins-gemstone', itemId: 'gemstone_rough', x: 231, y: 191, quantity: 1, maxStack: 10, requiredTool: 'pickaxe_tool', unlockAfter: 'hammer' },
  { id: 'shore-sand', itemId: 'sand_pile', x: 188, y: 489, quantity: 2, maxStack: 20, unlockAfter: 'hammer' },
]

export const CONTINENT_ECHO_PICKUPS: WorldPickup[] = [
  { id: 'continent-memory-shore', itemId: 'memory-echo', x: 616, y: 312, quantity: 1, maxStack: 99, region: 'continent' },
  { id: 'continent-memory-oak', itemId: 'memory-echo', x: 504, y: 372, quantity: 1, maxStack: 99, region: 'continent' },
  { id: 'continent-memory-beacon', itemId: 'memory-echo', x: 152, y: 208, quantity: 1, maxStack: 99, region: 'continent' },
]

export const CONTINENT_RESOURCE_PICKUPS: WorldPickup[] = RESOURCE_PICKUPS.map((pickup) => ({
  ...pickup,
  id: `continent-${pickup.id}`,
  x: WORLD.width - pickup.x,
  region: 'continent',
}))


export type DiscoveryZone = {
  id: string
  x: number
  y: number
  radius: number
  loreIds: string[]
}

/** Miejsca odsłaniające wpisy Kroniki; wystarczy wejść w promień. */
export const DISCOVERY_ZONES: DiscoveryZone[] = [
  { id: 'camp', x: 664, y: 186, radius: 76, loreIds: ['place-camp', 'keepers'] },
  { id: 'shore', x: 184, y: 312, radius: 60, loreIds: ['place-shore'] },
  { id: 'oak', x: 296, y: 372, radius: 60, loreIds: ['place-oak'] },
  { id: 'watchtower', x: 176, y: 150, radius: 70, loreIds: ['place-watchtower', 'jana'] },
  { id: 'gate', x: 72, y: 296, radius: 58, loreIds: ['place-gate', 'history-hush'] },
  { id: 'lighthouse', x: 700, y: 500, radius: 150, loreIds: ['place-lighthouse', 'history-sea'] },
  { id: 'wreck', x: 704, y: 424, radius: 120, loreIds: ['place-wreck', 'aron', 'history-fall'] },
  { id: 'beachfire', x: 304, y: 524, radius: 60, loreIds: ['place-beachfire'] },
]

/** Wpisy znane od początku — Mira i kompas, który nosi. */
export const PROLOGUE_LORE = ['mira', 'relic-compass']

/** Wpisy odsłaniane dopiero po rozpaleniu latarni. */
export const ENDING_LORE = ['history-name', 'history-epilogue']

/** Dekoracyjne głazy z własnymi, precyzyjnymi hitboxami. */
export const WORLD_ROCKS = [
  { key: 'rock-cave', x: 240, y: 500, scale: 1.1 },
  { key: 'rock-lane', x: 560, y: 540, scale: 1.05 },
  { key: 'rock-snow', x: 120, y: 430, scale: 1.15 },
  { key: 'rock-canyon', x: 640, y: 470, scale: 1.25 },
]

export const CONTINENT_ROCKS = [
  { key: 'rock-desert', x: 280, y: 168, scale: 1.1, region: 'continent' as const },
  { key: 'rock-ice', x: 504, y: 168, scale: 1.15, region: 'continent' as const },
  { key: 'rock-stalagmite', x: 392, y: 120, scale: 0.9, region: 'continent' as const },
]

/** Powiązanie przedmiotu z wpisem Kroniki odsłanianym przy podniesieniu. */
export const PICKUP_LORE: Record<string, string> = {
  'shore-echo': 'echo-shore',
  'oak-echo': 'echo-oak',
  'camp-echo': 'echo-flame',
  'aron-glass': 'relic-sea-glass',
}

export const ECHO_ITEM_ID = 'memory-echo'
export const RELIC_ITEM_ID = 'sea-glass'
export const ECHO_TOTAL = ECHO_PICKUPS.length
