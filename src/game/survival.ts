import type { Language } from '../i18n'
import type { Inventory } from './inventory'

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night'

export type DayCycle = {
  day: number
  hours: number
  minutes: number
  time: string
  phase: DayPhase
  darkness: number
}

const GAME_DAY_SECONDS = 1800

const smoothstep = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

export const getDayCycle = (elapsedSeconds: number): DayCycle => {
  const elapsed = Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0)
  const dayProgress = (elapsed % GAME_DAY_SECONDS) / GAME_DAY_SECONDS
  const hour = (8 + dayProgress * 24) % 24
  const hours = Math.floor(hour)
  const minutes = Math.floor((hour - hours) * 60)
  const darkness = hour >= 20 || hour < 5
    ? 0.56
    : hour >= 17
      ? smoothstep((hour - 17) / 3) * 0.56
      : hour >= 5
        ? (1 - smoothstep((hour - 5) / 2)) * 0.56
        : 0
  const phase: DayPhase = hour >= 5 && hour < 7
    ? 'dawn'
    : hour >= 17 && hour < 20
      ? 'dusk'
      : hour >= 20 || hour < 5
        ? 'night'
        : 'day'

  return {
    day: Math.floor(elapsed / GAME_DAY_SECONDS) + 1,
    hours,
    minutes,
    time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    phase,
    darkness,
  }
}

export type SurvivalNeeds = {
  hunger: number
  thirst: number
  energy: number
  elapsedSeconds: number
  gathered: Record<string, number>
  crafted: string[]
  built: string[]
}

export type Recipe = {
  id: string
  title: Record<Language, string>
  detail: Record<Language, string>
  ingredients: Record<string, number>
  output?: { itemId: string; quantity: number; maxStack: number }
  station: 'anywhere' | 'camp'
  kind: 'craft' | 'build'
  repeatable?: boolean
  requires?: string[]
}

export type Objective = {
  id: string
  title: Record<Language, string>
  detail: Record<Language, string>
  current: number
  target: number
  complete: boolean
  optional?: boolean
}

export type RecipeResult = 'crafted' | 'missing' | 'station' | 'complete' | 'capacity' | 'locked'

export const createSurvivalNeeds = (): SurvivalNeeds => ({
  hunger: 100,
  thirst: 100,
  energy: 100,
  elapsedSeconds: 0,
  gathered: {},
  crafted: [],
  built: [],
})

export const normalizeSurvivalNeeds = (value?: Partial<SurvivalNeeds>): SurvivalNeeds => ({
  hunger: clamp(value?.hunger ?? 100),
  thirst: clamp(value?.thirst ?? 100),
  energy: clamp(value?.energy ?? 100),
  elapsedSeconds: Math.max(0, Number.isFinite(value?.elapsedSeconds) ? value!.elapsedSeconds! : 0),
  gathered: value?.gathered && typeof value.gathered === 'object' ? { ...value.gathered } : {},
  crafted: Array.isArray(value?.crafted) ? [...new Set(value.crafted.filter((id) => typeof id === 'string'))] : [],
  built: Array.isArray(value?.built) ? [...new Set(value.built.filter((id) => typeof id === 'string'))] : [],
})

const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 100))

export const HUNGER_DECAY_PER_SECOND = { moving: 0.0017, idle: 0.001 } as const

export const decayHunger = (hunger: number, seconds: number, moving: boolean) =>
  clamp(hunger * Math.exp(-Math.max(0, seconds) * HUNGER_DECAY_PER_SECOND[moving ? 'moving' : 'idle']))

export const advanceSurvival = (needs: SurvivalNeeds, seconds: number, moving: boolean, atCamp: boolean): SurvivalNeeds => {
  const elapsed = Math.max(0, Math.min(seconds, 1))
  if (elapsed === 0) return needs
  const shelterBonus = needs.built.includes('lean-to') && atCamp
  return {
    ...needs,
    elapsedSeconds: needs.elapsedSeconds + elapsed,
    hunger: decayHunger(needs.hunger, elapsed, moving),
    thirst: clamp(needs.thirst - elapsed * (moving ? 0.065 : 0.045)),
    energy: clamp(needs.energy + elapsed * (atCamp && !moving ? (shelterBonus ? 0.48 : 0.3) : moving ? -0.035 : 0.025)),
  }
}

/**
 * Mnożnik regeneracji staminy zależny od poziomu najedienia.
 * Głód ogranicza odzyskiwanie energii — przy zerowym głodzie stamina nie regeneruje się wcale.
 * 76–100 pełna wydajność · 41–75 brak kar · 21–40 wolniejsza · 1–20 słaba · 0 brak.
 */
export const getHungerStaminaFactor = (hunger: number): number => {
  if (hunger <= 0) return 0
  if (hunger <= 20) return 0.3
  if (hunger <= 40) return 0.6
  return 1
}

/** Utrata zdrowia przy skrajnym wycieńczeniu głodowym (punkty na sekundę). */
export const STARVATION_HEALTH_DRAIN_PER_SEC = 2

export const recordGathering = (needs: SurvivalNeeds, itemId: string, quantity: number): SurvivalNeeds => ({
  ...needs,
  gathered: { ...needs.gathered, [itemId]: (needs.gathered[itemId] ?? 0) + quantity },
})

export const ITEM_DETAILS: Record<string, { icon: string; name: Record<Language, string>; food?: number; water?: number; energy?: number; health?: number; tool?: boolean; poisonChance?: number }> = {
  'wood_log': { icon: 'wood_log', name: { pl: 'Drewno', en: 'Wood', es: 'Madera' } },
  'stone_block': { icon: 'stone_block', name: { pl: 'Kamień', en: 'Stone', es: 'Piedra' } },
  'flint_stone': { icon: 'flint_stone', name: { pl: 'Krzemień', en: 'Flint', es: 'Pedernal' } },
  'berry_cluster': { icon: 'berry_cluster', name: { pl: 'Jagody', en: 'Berries', es: 'Bayas' }, food: 24 },
  'medicinal_herb': { icon: 'medicinal_herb', name: { pl: 'Zioła lecznicze', en: 'Medicinal herbs', es: 'Hierbas medicinales' }, energy: 15 },
  'mushroom': { icon: 'mushroom', name: { pl: 'Grzyby', en: 'Mushrooms', es: 'Setas' }, food: 20, poisonChance: 0.25 },
  'flax_bundle': { icon: 'flax_bundle', name: { pl: 'Len', en: 'Flax', es: 'Lino' } },
  'resin_lump': { icon: 'resin_lump', name: { pl: 'Żywica', en: 'Resin', es: 'Resina' } },
  'clay_lump': { icon: 'clay_lump', name: { pl: 'Glina', en: 'Clay', es: 'Arcilla' } },
  'copper_ore': { icon: 'copper_ore', name: { pl: 'Ruda miedzi', en: 'Copper ore', es: 'Mena de cobre' } },
  'crystal_shard': { icon: 'crystal_shard', name: { pl: 'Odłamek kryształu', en: 'Crystal shard', es: 'Fragmento de cristal' } },
  'quartz_chunk': { icon: 'quartz_chunk', name: { pl: 'Kwarc', en: 'Quartz', es: 'Cuarzo' } },
  'salt_crystal': { icon: 'salt_crystal', name: { pl: 'Sól', en: 'Salt', es: 'Sal' } },
  'sap_jar': { icon: 'sap_jar', name: { pl: 'Woda źródlana', en: 'Spring water', es: 'Agua de manantial' }, water: 38 },
  'rope_coil': { icon: 'rope_coil', name: { pl: 'Lina', en: 'Rope', es: 'Cuerda' } },
  'axe_tool': { icon: 'axe_tool', name: { pl: 'Kamienna siekiera', en: 'Stone axe', es: 'Hacha de piedra' }, tool: true },
  'pickaxe_tool': { icon: 'pickaxe_tool', name: { pl: 'Kamienny kilof', en: 'Stone pickaxe', es: 'Pico de piedra' }, tool: true },
  'gathering_basket': { icon: 'gathering_basket', name: { pl: 'Kosz zbieracza', en: 'Gatherer basket', es: 'Cesta recolectora' } },
  'hearty_ration': { icon: 'berry_cluster', name: { pl: 'Pożywna racja', en: 'Hearty ration', es: 'Ración nutritiva' }, food: 48, energy: 12, health: 8 },
  'herbal_tonic': { icon: 'medicinal_herb', name: { pl: 'Tonik ziołowy', en: 'Herbal tonic', es: 'Tónico herbal' }, energy: 42 },
  'animal_pelt': { icon: 'animal_pelt', name: { pl: 'Skóra zwierzęcia', en: 'Animal pelt', es: 'Piel animal' } },
  'ash_pile': { icon: 'ash_pile', name: { pl: 'Popiół', en: 'Ash', es: 'Ceniza' } },
  'bone': { icon: 'bone', name: { pl: 'Kość', en: 'Bone', es: 'Hueso' } },
  'charcoal': { icon: 'charcoal', name: { pl: 'Węgiel drzewny', en: 'Charcoal', es: 'Carbón vegetal' } },
  'coal_chunk': { icon: 'coal_chunk', name: { pl: 'Bryłka węgla', en: 'Coal chunk', es: 'Trozo de carbón' } },
  'cotton_fiber': { icon: 'cotton_fiber', name: { pl: 'Włókno bawełny', en: 'Cotton fiber', es: 'Fibra de algodón' } },
  'feather': { icon: 'feather', name: { pl: 'Pióro', en: 'Feather', es: 'Pluma' } },
  'fishing_rod': { icon: 'fishing_rod', name: { pl: 'Wędka', en: 'Fishing rod', es: 'Caña de pescar' }, tool: true },
  'gold_ore': { icon: 'gold_ore', name: { pl: 'Ruda złota', en: 'Gold ore', es: 'Mena de oro' } },
  'herb_bundle': { icon: 'herb_bundle', name: { pl: 'Pęczek ziół', en: 'Herb bundle', es: 'Manojo de hierbas' } },
  'iron_ore': { icon: 'iron_ore', name: { pl: 'Ruda żelaza', en: 'Iron ore', es: 'Mena de hierro' } },
  'nail': { icon: 'nail', name: { pl: 'Gwoździe', en: 'Nails', es: 'Clavos' } },
  'oak_plank': { icon: 'oak_plank', name: { pl: 'Deska dębowa', en: 'Oak plank', es: 'Tabla de roble' } },
  'obsidian_shard': { icon: 'obsidian_shard', name: { pl: 'Odłamek obsydianu', en: 'Obsidian shard', es: 'Fragmento de obsidiana' } },
  'raw_hide': { icon: 'raw_hide', name: { pl: 'Surowa skóra', en: 'Raw hide', es: 'Piel sin curtir' } },
  'sand_pile': { icon: 'sand_pile', name: { pl: 'Piasek', en: 'Sand', es: 'Arena' } },
  'screw': { icon: 'screw', name: { pl: 'Śruby', en: 'Screws', es: 'Tornillos' } },
  'shovel_tool': { icon: 'shovel_tool', name: { pl: 'Łopata', en: 'Shovel', es: 'Pala' }, tool: true },
  'sickle_tool': { icon: 'sickle_tool', name: { pl: 'Sierp', en: 'Sickle', es: 'Hoz' }, tool: true },
  'silk_thread': { icon: 'silk_thread', name: { pl: 'Jedwabna nić', en: 'Silk thread', es: 'Hilo de seda' } },
  'silver_ore': { icon: 'silver_ore', name: { pl: 'Ruda srebra', en: 'Silver ore', es: 'Mena de plata' } },
  'sulfur_chunk': { icon: 'sulfur_chunk', name: { pl: 'Bryłka siarki', en: 'Sulfur chunk', es: 'Trozo de azufre' } },
  'tanned_leather': { icon: 'tanned_leather', name: { pl: 'Wyprawiona skóra', en: 'Tanned leather', es: 'Cuero curtido' } },
  'thread_spool': { icon: 'thread_spool', name: { pl: 'Nić lniana', en: 'Flax thread', es: 'Hilo de lino' } },
  'wheat_bundle': { icon: 'wheat_bundle', name: { pl: 'Kłos zboża', en: 'Wheat bundle', es: 'Manojo de trigo' } },
  'wool': { icon: 'wool', name: { pl: 'Wełna', en: 'Wool', es: 'Lana' } },
  'hammer_tool': { icon: 'hammer_tool', name: { pl: 'Młotek', en: 'Hammer', es: 'Martillo' }, tool: true },
  'gemstone_rough': { icon: 'gemstone_rough', name: { pl: 'Surowy klejnot', en: 'Rough gemstone', es: 'Gema en bruto' } },
  'cut_gemstone': { icon: 'cut_gemstone', name: { pl: 'Oszlifowany klejnot', en: 'Cut gemstone', es: 'Gema tallada' } },
  'sack_of_grain': { icon: 'sack_of_grain', name: { pl: 'Worek ziarna', en: 'Sack of grain', es: 'Saco de grano' }, food: 36 },
  'sea-glass': { icon: 'crystal_shard', name: { pl: 'Szkło pamięci', en: 'Memory glass', es: 'Vidrio de memoria' } },
  'memory-echo': { icon: 'cut_gemstone', name: { pl: 'Echo pamięci', en: 'Memory echo', es: 'Eco de memoria' } },
  'health_draught': { icon: 'medicinal_herb', name: { pl: 'Mikstura zdrowia', en: 'Health draught', es: 'Poción de salud' } },
  'bandage': { icon: 'flax_bundle', name: { pl: 'Bandaż', en: 'Bandage', es: 'Vendaje' } },
  'medkit': { icon: 'medicinal_herb', name: { pl: 'Apteczka', en: 'Medkit', es: 'Botiquín' } },
  'mana_draught': { icon: 'crystal_shard', name: { pl: 'Mikstura many', en: 'Mana draught', es: 'Poción de maná' } },
  'iron_sword': { icon: 'iron_ore', name: { pl: 'Żelazny miecz', en: 'Iron sword', es: 'Espada de hierro' }, tool: true },
  'arcane_staff': { icon: 'cut_gemstone', name: { pl: 'Kostur runiczny', en: 'Arcane staff', es: 'Bastón arcano' }, tool: true },
  'weapon_upgrade': { icon: 'copper_ore', name: { pl: 'Ostrzenie broni', en: 'Weapon sharpening kit', es: 'Mejora de arma' } },
  'armor_upgrade': { icon: 'tanned_leather', name: { pl: 'Wzmocnienie pancerza', en: 'Armor upgrade', es: 'Mejora de armadura' } },
  'arcane_rune': { icon: 'cut_gemstone', name: { pl: 'Runa arcana', en: 'Arcane rune', es: 'Runa arcana' } },
}

export const RECIPES: Recipe[] = [
  {
    id: 'cordage',
    title: { pl: 'Skręć linę', en: 'Twist cordage', es: 'Trenzar cuerda' },
    detail: { pl: 'Dwa pęczki lnu zamienią się w mocną linę.', en: 'Twist two bundles of flax into a strong rope.', es: 'Trenza dos manojos de lino para hacer una cuerda resistente.' },
    ingredients: { flax_bundle: 2 }, output: { itemId: 'rope_coil', quantity: 1, maxStack: 10 }, station: 'anywhere', kind: 'craft', repeatable: true,
  },
  {
    id: 'stone-axe',
    title: { pl: 'Wykonaj siekierę', en: 'Craft a stone axe', es: 'Fabricar un hacha' },
    detail: { pl: 'Do ścinania żywicznych drzew i zbierania drewna.', en: 'Chop resin trees and harvest sturdy wood.', es: 'Tala árboles resinosos y recoge madera resistente.' },
    ingredients: { wood_log: 3, flint_stone: 2, rope_coil: 1 }, output: { itemId: 'axe_tool', quantity: 1, maxStack: 1 }, station: 'anywhere', kind: 'craft',
  },
  {
    id: 'stone-pick',
    title: { pl: 'Wykonaj kilof', en: 'Craft a stone pickaxe', es: 'Fabricar un pico' },
    detail: { pl: 'Pozwala wydobywać rudę i kryształy w zachodnich ruinach.', en: 'Mine ore and crystals in the western ruins.', es: 'Extrae mineral y cristales en las ruinas del oeste.' },
    ingredients: { wood_log: 3, flint_stone: 2, rope_coil: 1 }, output: { itemId: 'pickaxe_tool', quantity: 1, maxStack: 1 }, station: 'camp', kind: 'craft', requires: ['stone-axe'],
  },
  {
    id: 'gatherer-basket',
    title: { pl: 'Upleć kosz', en: 'Weave a gatherer basket', es: 'Tejer una cesta' },
    detail: { pl: 'Kosz dodaje jedną sztukę do zbiorów jagód i ziół.', en: 'The basket adds one extra berry or herb per harvest.', es: 'La cesta añade una baya o hierba a cada recolección.' },
    ingredients: { wood_log: 2, flax_bundle: 3 }, output: { itemId: 'gathering_basket', quantity: 1, maxStack: 1 }, station: 'anywhere', kind: 'craft',
  },
  {
    id: 'hearty-ration',
    title: { pl: 'Przygotuj rację', en: 'Prepare a hearty ration', es: 'Preparar una ración' },
    detail: { pl: 'Jagody i grzyby przy ognisku dają pożywny posiłek.', en: 'Cook berries and mushrooms at the campfire for a filling meal.', es: 'Cocina bayas y setas en la hoguera para obtener una comida saciante.' },
    ingredients: { berry_cluster: 2, mushroom: 1 }, output: { itemId: 'hearty_ration', quantity: 1, maxStack: 5 }, station: 'camp', kind: 'craft', repeatable: true,
  },
  {
    id: 'herbal-tonic',
    title: { pl: 'Zaparz tonik', en: 'Brew a tonic', es: 'Preparar un tónico' },
    detail: { pl: 'Zioła i źródlana woda przywracają energię.', en: 'Medicinal herbs and spring water restore energy.', es: 'Las hierbas medicinales y el agua de manantial recuperan energía.' },
    ingredients: { herb_bundle: 1, sap_jar: 1 }, output: { itemId: 'herbal_tonic', quantity: 1, maxStack: 5 }, station: 'anywhere', kind: 'craft', repeatable: true, requires: ['herb-bundle'],
  },
  {
    id: 'lean-to',
    title: { pl: 'Zbuduj szałas', en: 'Build a lean-to', es: 'Construir un refugio' },
    detail: { pl: 'Odpoczynek w obozie szybciej przywraca energię.', en: 'Resting in camp restores energy faster.', es: 'Descansar en el campamento recupera energía más rápido.' },
    ingredients: { wood_log: 5, rope_coil: 2, flax_bundle: 2 }, station: 'camp', kind: 'build', requires: ['stone-axe'],
  },
  {
    id: 'rain-catcher',
    title: { pl: 'Zbuduj zbieracz deszczu', en: 'Build a rain catcher', es: 'Construir un recolector de lluvia' },
    detail: { pl: 'Ceramiczne naczynie pozwala uzupełnić wodę w obozie.', en: 'A clay vessel lets you refill water at camp.', es: 'Un recipiente de arcilla permite rellenar agua en el campamento.' },
    ingredients: { wood_log: 3, clay_lump: 2, rope_coil: 1 }, station: 'camp', kind: 'build', requires: ['cordage'],
  },
  {
    id: 'lighthouse-repair',
    title: { pl: 'Napraw soczewkę latarni', en: 'Repair the lighthouse lens', es: 'Reparar la lente del faro' },
    detail: { pl: 'Połącz szkło Arona z kryształami i rudą z ruin.', en: 'Combine Aron’s glass with crystals and ore from the ruins.', es: 'Combina el vidrio de Aron con cristales y mineral de las ruinas.' },
    ingredients: { 'sea-glass': 1, crystal_shard: 2, quartz_chunk: 2, copper_ore: 2, cut_gemstone: 1 }, station: 'camp', kind: 'build', requires: ['cut-gemstone'],
  },
  {
    id: 'thread-spool',
    title: { pl: 'Uprzędź nić', en: 'Spin flax thread', es: 'Hilar lino' },
    detail: { pl: 'Len i bawełna dają mocną nić do wyposażenia.', en: 'Flax and cotton make sturdy thread for equipment.', es: 'El lino y el algodón producen hilo resistente para el equipo.' },
    ingredients: { flax_bundle: 2, cotton_fiber: 1 }, output: { itemId: 'thread_spool', quantity: 2, maxStack: 20 }, station: 'anywhere', kind: 'craft', repeatable: true, requires: ['lean-to'],
  },
  {
    id: 'herb-bundle',
    title: { pl: 'Zwiąż zioła', en: 'Bundle medicinal herbs', es: 'Atar hierbas medicinales' },
    detail: { pl: 'Zioła i kość tworzą zapas leczniczy do dalszych receptur.', en: 'Herbs and bone form a useful medicinal supply.', es: 'Las hierbas y el hueso forman una reserva medicinal.' },
    ingredients: { medicinal_herb: 2, bone: 1 }, output: { itemId: 'herb_bundle', quantity: 1, maxStack: 8 }, station: 'anywhere', kind: 'craft', repeatable: true, requires: ['lean-to'],
  },
  {
    id: 'grain-sack',
    title: { pl: 'Przygotuj zapas ziarna', en: 'Pack a grain ration', es: 'Preparar una ración de grano' },
    detail: { pl: 'Ziarno i jagody tworzą sycący zapas na dalszą drogę.', en: 'Grain and berries make a filling travel ration.', es: 'El grano y las bayas forman una ración saciante para el viaje.' },
    ingredients: { wheat_bundle: 3, berry_cluster: 1 }, output: { itemId: 'sack_of_grain', quantity: 1, maxStack: 5 }, station: 'anywhere', kind: 'craft', repeatable: true, requires: ['lean-to'],
  },
  {
    id: 'charcoal',
    title: { pl: 'Wypal węgiel drzewny', en: 'Fire charcoal', es: 'Hacer carbón vegetal' },
    detail: { pl: 'Drewno, popiół i siarka dają paliwo do obróbki metalu.', en: 'Wood, ash and sulfur make fuel for metalworking.', es: 'La madera, la ceniza y el azufre crean combustible para trabajar metales.' },
    ingredients: { wood_log: 2, ash_pile: 1, sulfur_chunk: 1 }, output: { itemId: 'charcoal', quantity: 2, maxStack: 12 }, station: 'camp', kind: 'craft', repeatable: true, requires: ['stone-pick'],
  },
  {
    id: 'oak-planks',
    title: { pl: 'Przygotuj deski dębowe', en: 'Prepare oak planks', es: 'Preparar tablas de roble' },
    detail: { pl: 'Twardsze drewno z żywicą przyda się do narzędzi.', en: 'Resin-treated timber is sturdy enough for tools.', es: 'La madera tratada con resina es resistente para fabricar herramientas.' },
    ingredients: { wood_log: 3, resin_lump: 1 }, output: { itemId: 'oak_plank', quantity: 3, maxStack: 12 }, station: 'anywhere', kind: 'craft', requires: ['stone-axe'],
  },
  {
    id: 'tanned-leather',
    title: { pl: 'Wypraw skórę', en: 'Tan a hide', es: 'Curtir una piel' },
    detail: { pl: 'Skóra, futro i sól tworzą wytrzymałe okrycie narzędzi.', en: 'Hide, pelt and salt make durable tool wrapping.', es: 'La piel, el pelaje y la sal crean un refuerzo resistente para herramientas.' },
    ingredients: { raw_hide: 2, animal_pelt: 1, wool: 1, salt_crystal: 1 }, output: { itemId: 'tanned_leather', quantity: 1, maxStack: 5 }, station: 'camp', kind: 'craft', requires: ['stone-axe', 'lean-to'],
  },
  {
    id: 'iron-nails',
    title: { pl: 'Wyklep gwoździe', en: 'Forge nails', es: 'Forjar clavos' },
    detail: { pl: 'Ruda, węgiel i węgiel drzewny pozwalają wzmocnić konstrukcje.', en: 'Ore, coal and charcoal reinforce camp structures.', es: 'El mineral, el carbón y el carbón vegetal refuerzan las estructuras.' },
    ingredients: { iron_ore: 2, coal_chunk: 1, charcoal: 1 }, output: { itemId: 'nail', quantity: 4, maxStack: 20 }, station: 'camp', kind: 'craft', repeatable: true, requires: ['stone-pick'],
  },
  {
    id: 'hammer',
    title: { pl: 'Złóż młotek', en: 'Assemble a hammer', es: 'Montar un martillo' },
    detail: { pl: 'Dębowa rękojeść i gwoździe tworzą narzędzie do obróbki.', en: 'An oak handle and nails make a tool for precision work.', es: 'Un mango de roble y clavos forman una herramienta de precisión.' },
    ingredients: { oak_plank: 2, nail: 2, bone: 1 }, output: { itemId: 'hammer_tool', quantity: 1, maxStack: 1 }, station: 'camp', kind: 'craft', requires: ['iron-nails', 'lean-to'],
  },
  {
    id: 'screws',
    title: { pl: 'Wykonaj śruby', en: 'Make screws', es: 'Fabricar tornillos' },
    detail: { pl: 'Drobne łączniki przydadzą się do napraw i połowów.', en: 'Small fasteners are useful for repairs and fishing gear.', es: 'Los pequeños cierres sirven para reparar y preparar equipo de pesca.' },
    ingredients: { nail: 2, copper_ore: 1, charcoal: 1 }, output: { itemId: 'screw', quantity: 2, maxStack: 12 }, station: 'camp', kind: 'craft', repeatable: true, requires: ['hammer'],
  },
  {
    id: 'shovel',
    title: { pl: 'Złóż łopatę', en: 'Assemble a shovel', es: 'Montar una pala' },
    detail: { pl: 'Wzmocniona łopata ułatwia przekopywanie wybrzeża.', en: 'A reinforced shovel helps search the shoreline.', es: 'Una pala reforzada facilita explorar la costa.' },
    ingredients: { oak_plank: 2, stone_block: 2, nail: 2, tanned_leather: 1 }, output: { itemId: 'shovel_tool', quantity: 1, maxStack: 1 }, station: 'camp', kind: 'craft', requires: ['hammer', 'tanned-leather'],
  },
  {
    id: 'sickle',
    title: { pl: 'Wykonaj sierp', en: 'Forge a sickle', es: 'Forjar una hoz' },
    detail: { pl: 'Obsydianowe ostrze i nić pozwalają sprawnie zbierać rośliny.', en: 'An obsidian edge and thread make harvesting plants easier.', es: 'Un filo de obsidiana y el hilo facilitan recolectar plantas.' },
    ingredients: { oak_plank: 1, obsidian_shard: 1, thread_spool: 2, nail: 1 }, output: { itemId: 'sickle_tool', quantity: 1, maxStack: 1 }, station: 'camp', kind: 'craft', requires: ['hammer', 'oak-planks'],
  },
  {
    id: 'fishing-rod',
    title: { pl: 'Złóż wędkę', en: 'Assemble a fishing rod', es: 'Montar una caña de pescar' },
    detail: { pl: 'Deska, jedwab, pióro i skóra tworzą lekką wędkę.', en: 'Plank, silk, feather and leather make a light fishing rod.', es: 'La tabla, la seda, la pluma y el cuero forman una caña ligera.' },
    ingredients: { oak_plank: 2, silk_thread: 1, feather: 1, tanned_leather: 1, screw: 1 }, output: { itemId: 'fishing_rod', quantity: 1, maxStack: 1 }, station: 'camp', kind: 'craft', requires: ['hammer', 'tanned-leather'],
  },
  {
    id: 'cut-gemstone',
    title: { pl: 'Oszlifuj klejnot', en: 'Cut a gemstone', es: 'Tallar una gema' },
    detail: { pl: 'Piasek ścierny, kwarc i metale pozwalają oszlifować rzadki klejnot.', en: 'Abrasive sand, quartz and precious ore polish a rare gemstone.', es: 'La arena abrasiva, el cuarzo y los minerales preciosos tallan una gema rara.' },
    ingredients: { gemstone_rough: 1, sand_pile: 2, quartz_chunk: 1, silver_ore: 1, gold_ore: 1 }, output: { itemId: 'cut_gemstone', quantity: 1, maxStack: 2 }, station: 'camp', kind: 'craft', requires: ['hammer', 'iron-nails'],
  },
  {
    id: 'health-draught', title: { pl: 'Uwarz miksturę zdrowia', en: 'Brew a health draught', es: 'Preparar una poción de salud' },
    detail: { pl: 'Zioła i jagody zamieniają się w miksturę leczniczą.', en: 'Herbs and berries become a restorative draught.', es: 'Las hierbas y las bayas se convierten en una poción curativa.' },
    ingredients: { medicinal_herb: 2, berry_cluster: 1, sap_jar: 1 }, output: { itemId: 'health_draught', quantity: 1, maxStack: 10 }, station: 'anywhere', kind: 'craft', repeatable: true,
  },
  {
    id: 'mana-draught', title: { pl: 'Uwarz miksturę many', en: 'Brew a mana draught', es: 'Preparar una poción de maná' },
    detail: { pl: 'Kryształ, zioła i woda odnawiają energię magiczną.', en: 'Crystal, herbs and water restore arcane energy.', es: 'El cristal, las hierbas y el agua restauran la energía arcana.' },
    ingredients: { crystal_shard: 1, herb_bundle: 1, sap_jar: 1 }, output: { itemId: 'mana_draught', quantity: 1, maxStack: 10 }, station: 'camp', kind: 'craft', repeatable: true, requires: ['cut-gemstone'],
  },
  {
    id: 'iron-sword', title: { pl: 'Wyk kuj żelazny miecz', en: 'Forge an iron sword', es: 'Forjar una espada de hierro' },
    detail: { pl: 'Ciężkie ostrze zwiększa obrażenia ataków wręcz.', en: 'A forged blade increases melee damage.', es: 'Una hoja forjada aumenta el daño cuerpo a cuerpo.' },
    ingredients: { iron_ore: 4, wood_log: 2, rope_coil: 1, charcoal: 1 }, output: { itemId: 'iron_sword', quantity: 1, maxStack: 1 }, station: 'camp', kind: 'craft', requires: ['stone-pick', 'iron-nails'],
  },
  {
    id: 'arcane-staff', title: { pl: 'Zbuduj kostur runiczny', en: 'Build an arcane staff', es: 'Crear un bastón arcano' },
    detail: { pl: 'Kostur skupia manę w silniejszy pocisk dystansowy.', en: 'The staff focuses mana into a stronger ranged bolt.', es: 'El bastón concentra el maná en un proyectil más potente.' },
    ingredients: { oak_plank: 2, crystal_shard: 2, cut_gemstone: 1, rope_coil: 1 }, output: { itemId: 'arcane_staff', quantity: 1, maxStack: 1 }, station: 'camp', kind: 'craft', requires: ['cut-gemstone'],
  },
  {
    id: 'weapon-upgrade', title: { pl: 'Przygotuj ulepszenie broni', en: 'Prepare a weapon upgrade', es: 'Preparar una mejora de arma' },
    detail: { pl: 'Runiczna osełka zwiększa moc wyposażonej broni.', en: 'A runed whetstone strengthens your equipped weapon.', es: 'Una piedra rúnica fortalece el arma equipada.' },
    ingredients: { copper_ore: 2, crystal_shard: 1, charcoal: 1 }, output: { itemId: 'weapon_upgrade', quantity: 1, maxStack: 3 }, station: 'camp', kind: 'craft', repeatable: true, requires: ['iron-sword'],
  },
  {
    id: 'armor-upgrade', title: { pl: 'Wzmocnij pancerz', en: 'Reinforce armor', es: 'Reforzar armadura' },
    detail: { pl: 'Skóra i żelazo podnoszą maksymalne zdrowie.', en: 'Leather and iron increase maximum health.', es: 'El cuero y el hierro aumentan la salud máxima.' },
    ingredients: { tanned_leather: 1, iron_ore: 2, animal_pelt: 1 }, output: { itemId: 'armor_upgrade', quantity: 1, maxStack: 3 }, station: 'camp', kind: 'craft', repeatable: true, requires: ['tanned-leather', 'iron-nails'],
  },
  {
    id: 'bandage', title: { pl: 'Zawiń bandaż', en: 'Wrap a bandage', es: 'Vendar una herida' },
    detail: { pl: 'Zioła i len tworzą prosty opatrunek przywracający trochę zdrowia.', en: 'Herbs and flax make a simple dressing that restores some health.', es: 'Las hierbas y el lino crean un vendaje que restaura algo de salud.' },
    ingredients: { medicinal_herb: 2, flax_bundle: 1 }, output: { itemId: 'bandage', quantity: 2, maxStack: 5 }, station: 'anywhere', kind: 'craft', repeatable: true,
  },
  {
    id: 'medkit', title: { pl: 'Złóż apteczkę', en: 'Assemble a medkit', es: 'Montar un botiquín' },
    detail: { pl: 'Zioła, skóra i kość tworzą porządny zestaw ratunkowy.', en: 'Herbs, leather and bone make a proper medical kit.', es: 'Las hierbas, el cuero y el hueso crean un botiquín completo.' },
    ingredients: { herb_bundle: 1, tanned_leather: 1, bone: 1 }, output: { itemId: 'medkit', quantity: 1, maxStack: 3 }, station: 'camp', kind: 'craft', repeatable: true, requires: ['herb-bundle', 'tanned-leather'],
  },
]

export const findRecipe = (recipeId: string) => RECIPES.find((recipe) => recipe.id === recipeId)

export const canPerformRecipe = (recipe: Recipe, inventory: Inventory, needs: SurvivalNeeds, nearCamp: boolean) => {
  if (recipe.kind === 'build' && needs.built.includes(recipe.id)) return 'complete' as RecipeResult
  if (recipe.output && !recipe.repeatable && needs.crafted.includes(recipe.id)) return 'complete' as RecipeResult
  if (recipe.requires?.some((required) => !needs.crafted.includes(required) && !needs.built.includes(required))) return 'locked' as RecipeResult
  if (recipe.station === 'camp' && !nearCamp) return 'station' as RecipeResult
  if (Object.entries(recipe.ingredients).some(([itemId, quantity]) => inventory.count(itemId) < quantity)) return 'missing' as RecipeResult
  if (recipe.output && !inventory.canAdd(recipe.output.itemId, recipe.output.quantity, recipe.output.maxStack)) return 'capacity' as RecipeResult
  return 'crafted' as RecipeResult
}

export const performRecipe = (recipeId: string, inventory: Inventory, needs: SurvivalNeeds, nearCamp: boolean): RecipeResult => {
  const recipe = findRecipe(recipeId)
  if (!recipe) return 'missing'
  const result = canPerformRecipe(recipe, inventory, needs, nearCamp)
  if (result !== 'crafted') return result
  Object.entries(recipe.ingredients).forEach(([itemId, quantity]) => inventory.remove(itemId, quantity))
  if (recipe.output) inventory.add(recipe.output.itemId, recipe.output.quantity, recipe.output.maxStack)
  if (recipe.kind === 'build') needs.built.push(recipe.id)
  else if (!needs.crafted.includes(recipe.id)) needs.crafted.push(recipe.id)
  return 'crafted'
}

export const consumeSurvivalItem = (itemId: string, inventory: Inventory, needs: SurvivalNeeds) => {
  const item = ITEM_DETAILS[itemId]
  if (!item || (!item.food && !item.water && !item.energy && !item.health)) return false
  const wouldHelp = Boolean((item.food && needs.hunger < 100) || (item.water && needs.thirst < 100) || (item.energy && needs.energy < 100) || item.health)
  if (!wouldHelp || !inventory.remove(itemId, 1)) return false
  needs.hunger = clamp(needs.hunger + (item.food ?? 0))
  needs.thirst = clamp(needs.thirst + (item.water ?? 0))
  needs.energy = clamp(needs.energy + (item.energy ?? 0))
  return true
}

export const getObjectives = (needs: SurvivalNeeds, collected: string[], discovered: string[], region: 'shore' | 'continent' = 'shore', nearCamp = false): Objective[] => {
  const total = (itemId: string) => needs.gathered[itemId] ?? 0
  const objective = (id: string, title: Record<Language, string>, detail: Record<Language, string>, current: number, target: number, optional = false): Objective => ({
    id, title, detail, current: Math.min(current, target), target, complete: current >= target, optional,
  })
  if (region === 'continent') {
    const signals = collected.filter((id) => id.startsWith('continent-memory-')).length
    return [
      objective('continent-signals',
        { pl: 'Odnajdź trzy echa kontynentu', en: 'Find the three mainland echoes', es: 'Encuentra los tres ecos del continente' },
        { pl: 'Podążaj za światłem przez nowy brzeg i zbierz jego echa.', en: 'Follow the light across the new shore and gather its echoes.', es: 'Sigue la luz por la nueva costa y reúne sus ecos.' },
        signals, 3),
      objective('continent-beacon',
        { pl: 'Wróć do ogniska na cyplu', en: 'Return to the headland beacon', es: 'Vuelve a la hoguera del cabo' },
        { pl: 'Zanieś odzyskane echa do ogniska na brzegu.', en: 'Carry the recovered echoes to the shoreline campfire.', es: 'Lleva los ecos recuperados a la hoguera de la costa.' },
        Number(signals >= 3 && nearCamp), 1),
    ]
  }
  return [
    objective('shore-supplies',
      { pl: 'Zabezpiecz zapasy na brzegu', en: 'Secure supplies on the shore', es: 'Asegura provisiones en la orilla' },
      { pl: 'Zbierz drewno, krzemień, len, jagody i wodę.', en: 'Gather wood, flint, flax, berries and fresh water.', es: 'Reúne madera, pedernal, lino, bayas y agua fresca.' },
      ['wood_log', 'flint_stone', 'flax_bundle', 'berry_cluster', 'sap_jar'].filter((id) => total(id) > 0).length, 5),
    objective('cordage',
      { pl: 'Przygotuj pierwszą linę', en: 'Make your first rope', es: 'Prepara tu primera cuerda' },
      { pl: 'Skręć włókna lnu, aby wykonać narzędzia.', en: 'Twist flax fibres into rope for your tools.', es: 'Trenza fibras de lino para fabricar herramientas.' },
      Number(needs.crafted.includes('cordage')), 1),
    objective('axe',
      { pl: 'Wykonaj kamienną siekierę', en: 'Craft a stone axe', es: 'Fabrica un hacha de piedra' },
      { pl: 'Siekiera otwiera dostęp do drewna i żywicy.', en: 'The axe unlocks wood and resin gathering.', es: 'El hacha permite recoger madera y resina.' },
      Number(needs.crafted.includes('stone-axe')), 1),
    objective('forest-harvest',
      { pl: 'Zbadaj głębię lasu', en: 'Explore the deep forest', es: 'Explora el bosque profundo' },
      { pl: 'Zbierz drewno z trzech starych drzew.', en: 'Harvest wood from three old trees.', es: 'Recoge madera de tres árboles antiguos.' },
      total('axe_harvest'), 6),
    objective('pickaxe',
      { pl: 'Wykonaj kamienny kilof', en: 'Craft a stone pickaxe', es: 'Fabrica un pico de piedra' },
      { pl: 'Przy ognisku połącz drewno, krzemień i linę.', en: 'Combine wood, flint and rope at the campfire.', es: 'Combina madera, pedernal y cuerda junto a la hoguera.' },
      Number(needs.crafted.includes('stone-pick')), 1),
    objective('ruins',
      { pl: 'Przeszukaj zachodnie ruiny', en: 'Search the western ruins', es: 'Busca en las ruinas del oeste' },
      { pl: 'Wydobądź miedź, kwarc i kryształy kilofem.', en: 'Mine copper, quartz and crystals with the pickaxe.', es: 'Extrae cobre, cuarzo y cristales con el pico.' },
      ['copper_ore', 'quartz_chunk', 'crystal_shard'].filter((id) => total(id) > 0).length, 3),
    objective('food',
      { pl: 'Ugotuj zapasową rację', en: 'Cook a spare ration', es: 'Cocina una ración de reserva' },
      { pl: 'Przygotuj jagody i grzyby przy ognisku.', en: 'Cook berries and mushrooms at the campfire.', es: 'Cocina bayas y setas en la hoguera.' },
      Number(needs.crafted.includes('hearty-ration')), 1),
    objective('shelter',
      { pl: 'Przygotuj obóz na noc', en: 'Prepare camp for the night', es: 'Prepara el campamento para la noche' },
      { pl: 'Zbuduj szałas, aby odpoczywać bezpieczniej.', en: 'Build a lean-to for a safer rest.', es: 'Construye un refugio para descansar con seguridad.' },
      Number(needs.built.includes('lean-to')), 1),
    objective('echoes',
      { pl: 'Odzyskaj trzy echa', en: 'Recover the three echoes', es: 'Recupera los tres ecos' },
      { pl: 'Odwiedź Brzeg Milczenia, Dąb Przysiąg i obóz.', en: 'Visit the Shore of Silence, Oath Oak and camp.', es: 'Visita la Orilla del Silencio, el Roble de los Juramentos y el campamento.' },
      collected.filter((id) => id.endsWith('-echo')).length, 3),
    objective('lighthouse',
      { pl: 'Napraw latarnię i zakończ wyprawę', en: 'Repair the lighthouse and finish the journey', es: 'Repara el faro y termina el viaje' },
      { pl: 'Znajdź szkło Arona, wydobądź kryształy i wróć do ogniska.', en: 'Find Aron’s glass, mine the crystals and return to camp.', es: 'Encuentra el vidrio de Aron, extrae cristales y vuelve al campamento.' },
      Number(needs.built.includes('lighthouse-repair')), 1),
    objective('chronicle',
      { pl: 'Poznaj historię całej wyspy', en: 'Uncover the island’s history', es: 'Descubre la historia de la isla' },
      { pl: 'Odkryj 20 wpisów Kroniki w różnych zakątkach.', en: 'Discover 20 Chronicle entries across the island.', es: 'Descubre 20 entradas de la Crónica por toda la isla.' },
      discovered.length, 20, true),
    objective('basket',
      { pl: 'Upleć kosz zbieracza', en: 'Weave a gatherer basket', es: 'Teje una cesta recolectora' },
      { pl: 'Kosz zwiększa plony ziół i jagód.', en: 'The basket increases berry and herb yields.', es: 'La cesta aumenta la cosecha de bayas y hierbas.' },
      Number(needs.crafted.includes('gatherer-basket')), 1, true),
    objective('water-catcher',
      { pl: 'Zbuduj zbieracz deszczu', en: 'Build a rain catcher', es: 'Construye un recolector de lluvia' },
      { pl: 'Dodatkowe źródło wody dla obozu.', en: 'An extra source of water for the camp.', es: 'Una fuente adicional de agua para el campamento.' },
      Number(needs.built.includes('rain-catcher')), 1, true),
    objective('medicine',
      { pl: 'Przygotuj tonik ziołowy', en: 'Prepare an herbal tonic', es: 'Prepara un tónico herbal' },
      { pl: 'Wyprawa jest długa — zbierz lecznicze zioła i wodę.', en: 'The journey is long — gather medicinal herbs and water.', es: 'El viaje es largo: reúne hierbas medicinales y agua.' },
      Number(needs.crafted.includes('herbal-tonic')), 1, true),
    objective('aron-glass',
      { pl: 'Odnajdź szkło Arona', en: 'Find Aron’s glass', es: 'Encuentra el vidrio de Aron' },
      { pl: 'Przeszukaj ruiny wieży obserwacyjnej na zachodzie.', en: 'Search the western watchtower ruins.', es: 'Busca en las ruinas de la torre de vigía al oeste.' },
      Number(collected.includes('aron-glass')), 1, true),
  ]
}
