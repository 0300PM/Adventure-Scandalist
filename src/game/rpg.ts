import type { Point } from './core'
import type { Inventory } from './inventory'
import type { WorldRegion } from './world'
import type { Language } from '../i18n'

export type StatusKind = 'poison' | 'burn' | 'freeze'
export type StatusEffect = { kind: StatusKind; remaining: number; tickIn: number }
export type EnemyBehavior = 'stalker' | 'skirmisher' | 'ranged' | 'boss'
export type EnemyPhase = 'patrol' | 'alert' | 'enraged' | 'dead'

/** Poziomy kondycji zdrowotnej — sterują ostrzeżeniami w HUD. */
export type HealthTier = 'healthy' | 'damaged' | 'warning' | 'critical' | 'dead'

export type Combatant = {
  id: string
  region: WorldRegion
  x: number
  y: number
  hp: number
  maxHp: number
  behavior: EnemyBehavior
  phase: EnemyPhase
  attackCooldown: number
  alive: boolean
  statuses: StatusEffect[]
}

export type PlayerProgress = {
  health: number
  maxHealth: number
  stamina: number
  maxStamina: number
  mana: number
  maxMana: number
  level: number
  experience: number
  skillPoints: number
  skills: string[]
  equippedWeapon: string | null
  weaponLevel: number
  armorLevel: number
  statuses: StatusEffect[]
  invulnerability: number
  meleeCooldown: number
  rangedCooldown: number
  dodgeCooldown: number
  /** Sekundy do rozpoczęcia regeneracji staminy po ostatniej czynności zużywającej energię. */
  staminaRegenDelay: number
}

export type SocialProgress = {
  choices: Record<string, string>
  trust: Record<string, number>
  reputation: number
  acceptedQuests: string[]
  completedQuests: string[]
  questProgress: Record<string, number>
  tradedOffers: Record<string, number>
}

export type RpgState = {
  player: PlayerProgress
  enemies: Combatant[]
  social: SocialProgress
}

export type DialogueChoice = {
  id: string
  label: Record<Language, string>
  result: Record<Language, string>
  trust: number
  reputation: number
  quest?: string
}

export type NpcDefinition = {
  id: string
  name: Record<Language, string>
  role: Record<Language, string>
  region: WorldRegion
  home: Point
  work: Point
  evening: Point
  dialogue: Record<Language, string>
  choices: DialogueChoice[]
  quest: string
  questName: Record<Language, string>
}

export type TradeOffer = {
  id: string
  npcId: string
  label: Record<Language, string>
  cost: Record<string, number>
  reward: { itemId: string; quantity: number; maxStack: number }
  experience: number
}

export type SkillDefinition = {
  id: string
  name: Record<Language, string>
  description: Record<Language, string>
  level: number
  requires?: string[]
}

export const SKILL_TREE: SkillDefinition[] = [
  { id: 'vitality', name: { pl: 'Hart ducha', en: 'Vitality', es: 'Vitalidad' }, description: { pl: '+20 maksymalnego zdrowia.', en: '+20 maximum health.', es: '+20 de salud máxima.' }, level: 2 },
  { id: 'bladecraft', name: { pl: 'Mistrzyni ostrza', en: 'Bladecraft', es: 'Dominio de la hoja' }, description: { pl: 'Ataki wręcz zadają o 30% więcej obrażeń.', en: 'Melee attacks deal 30% more damage.', es: 'Los ataques cuerpo a cuerpo infligen un 30% más de daño.' }, level: 2 },
  { id: 'arcana', name: { pl: 'Skupienie many', en: 'Arcane focus', es: 'Enfoque arcano' }, description: { pl: '+25 maksymalnej many i silniejsze pociski.', en: '+25 maximum mana and stronger bolts.', es: '+25 de maná máximo y proyectiles más potentes.' }, level: 3 },
  { id: 'fleetfoot', name: { pl: 'Lekki krok', en: 'Fleetfoot', es: 'Paso ligero' }, description: { pl: 'Unik kosztuje mniej staminy i szybciej wraca.', en: 'Dodges cost less stamina and recover sooner.', es: 'Las esquivas cuestan menos aguante y se recuperan antes.' }, level: 3 },
  { id: 'second-wind', name: { pl: 'Drugi oddech', en: 'Second wind', es: 'Segundo aliento' }, description: { pl: '+25 maksymalnej staminy.', en: '+25 maximum stamina.', es: '+25 de aguante máximo.' }, level: 4, requires: ['vitality'] },
]

export const NPCS: NpcDefinition[] = [
  {
    id: 'tala',
    name: { pl: 'Tala', en: 'Tala', es: 'Tala' },
    role: { pl: 'zielarka i handlarz', en: 'herbalist and trader', es: 'herbolaria y comerciante' },
    region: 'shore', home: { x: 304, y: 510 }, work: { x: 344, y: 486 }, evening: { x: 320, y: 520 },
    dialogue: {
      pl: 'Pamiętam, komu wyspa podała dłoń. Ty też możesz wybrać, co zostawisz po sobie.',
      en: 'I remember who the island reached for. You can choose what you leave behind, too.',
      es: 'Recuerdo a quién tendió la mano la isla. Tú también puedes elegir qué dejar atrás.',
    },
    choices: [
      { id: 'share-herbs', label: { pl: 'Podziel się ziołami', en: 'Share medicinal herbs', es: 'Compartir hierbas' }, result: { pl: 'Tala zapamięta Twoją hojność.', en: 'Tala will remember your generosity.', es: 'Tala recordará tu generosidad.' }, trust: 3, reputation: 2, quest: 'herbal-aid' },
      { id: 'ask-trade', label: { pl: 'Zapytaj o wymianę', en: 'Ask about trading', es: 'Preguntar por intercambios' }, result: { pl: 'Pokazuje Ci swoje dzienne oferty.', en: 'She shows you today’s trade offers.', es: 'Te muestra las ofertas de hoy.' }, trust: 1, reputation: 0 },
      { id: 'keep-distance', label: { pl: 'Zachowaj ostrożność', en: 'Keep your distance', es: 'Mantener la distancia' }, result: { pl: 'Tala nie zapomni Twojej nieufności.', en: 'Tala will remember your caution.', es: 'Tala recordará tu desconfianza.' }, trust: -1, reputation: 0 },
    ],
    quest: 'herbal-aid',
    questName: { pl: 'Zioła dla Tali', en: 'Herbs for Tala', es: 'Hierbas para Tala' },
  },
  {
    id: 'oren',
    name: { pl: 'Oren', en: 'Oren', es: 'Oren' },
    role: { pl: 'strażnik ścieżki', en: 'path keeper', es: 'guardián del sendero' },
    region: 'shore', home: { x: 492, y: 416 }, work: { x: 520, y: 388 }, evening: { x: 468, y: 432 },
    dialogue: {
      pl: 'Cienie uczą się naszych kroków. Gdy wrócisz, opowiedz mi, jak walczyłaś.',
      en: 'The shadows are learning our footsteps. Tell me how you fought when you return.',
      es: 'Las sombras aprenden nuestros pasos. Cuéntame cómo luchaste cuando vuelvas.',
    },
    choices: [
      { id: 'promise-warden', label: { pl: 'Obiecaj pokonać Strażnika', en: 'Promise to face the Warden', es: 'Prometer enfrentarte al Guardián' }, result: { pl: 'Oren zapamięta Twoją obietnicę.', en: 'Oren will remember your promise.', es: 'Oren recordará tu promesa.' }, trust: 2, reputation: 1, quest: 'warden-hunt' },
      { id: 'ask-rumor', label: { pl: 'Zapytaj o pogłoski', en: 'Ask about the rumors', es: 'Preguntar por los rumores' }, result: { pl: 'Oren ostrzega: silniejsze ciosy zdradzają fazę przeciwnika.', en: 'Oren warns that stronger attacks reveal an enemy’s phase.', es: 'Oren advierte que los golpes más fuertes revelan la fase del enemigo.' }, trust: 1, reputation: 0 },
      { id: 'dismiss-oren', label: { pl: 'Zignoruj ostrzeżenie', en: 'Dismiss the warning', es: 'Ignorar la advertencia' }, result: { pl: 'Oren zapamięta, że nie cenisz ostrzeżeń.', en: 'Oren will remember that you dismissed his warning.', es: 'Oren recordará que ignoraste su advertencia.' }, trust: -2, reputation: -1 },
    ],
    quest: 'warden-hunt',
    questName: { pl: 'Łowca Strażnika', en: 'The Warden Hunt', es: 'Cacería del Guardián' },
  },
  {
    id: 'mirae',
    name: { pl: 'Mirae', en: 'Mirae', es: 'Mirae' },
    role: { pl: 'kartografka nowego brzegu', en: 'new-shore cartographer', es: 'cartógrafa de la nueva costa' },
    region: 'continent', home: { x: 540, y: 480 }, work: { x: 572, y: 452 }, evening: { x: 520, y: 500 },
    dialogue: {
      pl: 'Strażnik pilnuje źródła światła. Wróć z dowodem, że nowy brzeg może zaufać przybyszom.',
      en: 'The Warden guards the source of light. Return with proof that this shore can trust newcomers.',
      es: 'El Guardián protege la fuente de luz. Vuelve con pruebas de que esta costa puede confiar en los recién llegados.',
    },
    choices: [
      { id: 'promise-beacon', label: { pl: 'Obiecaj rozpalić latarnię', en: 'Promise to light the beacon', es: 'Prometer encender la baliza' }, result: { pl: 'Mirae zapamięta Twoje zobowiązanie.', en: 'Mirae will remember your commitment.', es: 'Mirae recordará tu compromiso.' }, trust: 3, reputation: 2, quest: 'beacon-vow' },
      { id: 'ask-warden', label: { pl: 'Zapytaj o Strażnika', en: 'Ask about the Warden', es: 'Preguntar por el Guardián' }, result: { pl: 'Wskaże Ci drogę przez lodowy przesmyk.', en: 'She marks a route through the ice pass.', es: 'Te señala un camino por el paso helado.' }, trust: 1, reputation: 0 },
      { id: 'leave-mirae', label: { pl: 'Odejdź bez słowa', en: 'Leave without a word', es: 'Marcharse sin decir nada' }, result: { pl: 'Mirae zapamięta Twój chłód.', en: 'Mirae will remember your silence.', es: 'Mirae recordará tu silencio.' }, trust: -2, reputation: -1 },
    ],
    quest: 'beacon-vow',
    questName: { pl: 'Przysięga latarni', en: 'The Beacon Vow', es: 'La promesa de la baliza' },
  },
]

export const TRADE_OFFERS: TradeOffer[] = [
  { id: 'health-draught', npcId: 'tala', label: { pl: 'Kup miksturę zdrowia', en: 'Buy a health draught', es: 'Comprar una poción de salud' }, cost: { berry_cluster: 2, medicinal_herb: 1 }, reward: { itemId: 'health_draught', quantity: 1, maxStack: 10 }, experience: 12 },
  { id: 'mana-draught', npcId: 'tala', label: { pl: 'Kup miksturę many', en: 'Buy a mana draught', es: 'Comprar una poción de maná' }, cost: { crystal_shard: 1, sap_jar: 1 }, reward: { itemId: 'mana_draught', quantity: 1, maxStack: 10 }, experience: 16 },
  { id: 'rune-for-ore', npcId: 'mirae', label: { pl: 'Wymień rudę na runę', en: 'Trade ore for a rune', es: 'Cambiar mineral por una runa' }, cost: { copper_ore: 2, quartz_chunk: 1 }, reward: { itemId: 'arcane_rune', quantity: 1, maxStack: 5 }, experience: 18 },
]

const ENEMY_SPAWNS: Array<Omit<Combatant, 'attackCooldown' | 'alive' | 'statuses'>> = [
  { id: 'moss-stalker', region: 'shore', x: 264, y: 230, hp: 48, maxHp: 48, behavior: 'stalker', phase: 'patrol' },
  { id: 'ember-skirmisher', region: 'shore', x: 530, y: 360, hp: 40, maxHp: 40, behavior: 'skirmisher', phase: 'patrol' },
  { id: 'frost-ranger', region: 'shore', x: 160, y: 300, hp: 56, maxHp: 56, behavior: 'ranged', phase: 'patrol' },
  { id: 'dawn-warden', region: 'continent', x: 536, y: 230, hp: 220, maxHp: 220, behavior: 'boss', phase: 'patrol' },
  { id: 'shardling', region: 'continent', x: 420, y: 360, hp: 52, maxHp: 52, behavior: 'stalker', phase: 'patrol' },
]

/**
 * Opóźnienie regeneracji staminy po ostatniej czynności zużywającej energię.
 * Zapobiega natychmiastowemu odzyskiwaniu punktów pomiędzy kolejnymi atakami.
 */
export const STAMINA_REGEN_DELAY = 0.7

/** Zużycie staminy podczas ciągłego ruchu (punkty na sekundę). */
export const RUN_STAMINA_DRAIN_PER_SEC = 4

/** Bazowe tempo regeneracji staminy (punkty na sekundę). */
export const STAMINA_REGEN_PER_SEC = 18

/**
 * Zwraca poziom kondycji zdrowotnej na podstawie stosunku zdrowia do maksimum.
 * 76–100% zdrowe · 41–75% obrażenia · 16–40% ostrzeżenie · 1–15% krytyczne · 0% śmierć.
 */
export const getHealthTier = (health: number, maxHealth: number): HealthTier => {
  const ratio = maxHealth > 0 ? health / maxHealth : 0
  if (ratio <= 0) return 'dead'
  if (ratio <= 0.15) return 'critical'
  if (ratio <= 0.40) return 'warning'
  if (ratio <= 0.75) return 'damaged'
  return 'healthy'
}

export const createRpgState = (): RpgState => ({
  player: {
    health: 100, maxHealth: 100, stamina: 100, maxStamina: 100, mana: 100, maxMana: 100,
    level: 1, experience: 0, skillPoints: 0, skills: [], equippedWeapon: null, weaponLevel: 0, armorLevel: 0,
    statuses: [], invulnerability: 0, meleeCooldown: 0, rangedCooldown: 0, dodgeCooldown: 0, staminaRegenDelay: 0,
  },
  enemies: ENEMY_SPAWNS.map((enemy) => ({ ...enemy, attackCooldown: 0, alive: true, statuses: [] })),
  social: { choices: {}, trust: {}, reputation: 0, acceptedQuests: [], completedQuests: [], questProgress: {}, tradedOffers: {} },
})

export const normalizeRpgState = (value?: Partial<RpgState>): RpgState => {
  const defaults = createRpgState()
  const player = value?.player
  const validStatus = (entry: unknown): entry is StatusEffect => Boolean(entry && typeof entry === 'object'
    && ['poison', 'burn', 'freeze'].includes((entry as StatusEffect).kind)
    && Number.isFinite((entry as StatusEffect).remaining) && (entry as StatusEffect).remaining > 0
    && Number.isFinite((entry as StatusEffect).tickIn))
  const statuses = (entries?: StatusEffect[]) => Array.isArray(entries) ? entries.filter(validStatus).map((entry) => ({ ...entry })) : []
  return {
    player: {
      ...defaults.player,
      ...player,
      maxHealth: clamp(player?.maxHealth ?? 100, 1, 1000),
      maxStamina: clamp(player?.maxStamina ?? 100, 1, 1000),
      maxMana: clamp(player?.maxMana ?? 100, 1, 1000),
      health: clamp(player?.health ?? 100, 0, clamp(player?.maxHealth ?? 100, 1, 1000)),
      stamina: clamp(player?.stamina ?? 100, 0, clamp(player?.maxStamina ?? 100, 1, 1000)),
      mana: clamp(player?.mana ?? 100, 0, clamp(player?.maxMana ?? 100, 1, 1000)),
      level: Math.floor(clamp(player?.level ?? 1, 1, 99)),
      experience: Math.floor(clamp(player?.experience ?? 0, 0, 10000000)),
      skillPoints: Math.floor(clamp(player?.skillPoints ?? 0, 0, 999)),
      skills: Array.isArray(player?.skills) ? [...new Set(player.skills.filter((id) => SKILL_TREE.some((skill) => skill.id === id)))] : [],
      equippedWeapon: typeof player?.equippedWeapon === 'string' ? player.equippedWeapon : null,
      weaponLevel: Math.floor(clamp(player?.weaponLevel ?? 0, 0, 3)),
      armorLevel: Math.floor(clamp(player?.armorLevel ?? 0, 0, 3)),
      statuses: statuses(player?.statuses),
      invulnerability: clamp(player?.invulnerability ?? 0, 0, 10),
      meleeCooldown: clamp(player?.meleeCooldown ?? 0, 0, 10),
      rangedCooldown: clamp(player?.rangedCooldown ?? 0, 0, 10),
      dodgeCooldown: clamp(player?.dodgeCooldown ?? 0, 0, 10),
      staminaRegenDelay: clamp(player?.staminaRegenDelay ?? 0, 0, 10),
    },
    enemies: defaults.enemies.map((enemy) => {
      const saved = Array.isArray(value?.enemies) ? value.enemies.find((entry) => entry.id === enemy.id) : undefined
      if (!saved) return enemy
      return {
        ...enemy,
        x: clamp(saved.x, 0, 800), y: clamp(saved.y, 0, 640),
        hp: clamp(saved.hp, 0, enemy.maxHp),
        phase: ['patrol', 'alert', 'enraged', 'dead'].includes(saved.phase) ? saved.phase : 'patrol',
        attackCooldown: clamp(saved.attackCooldown, 0, 30),
        alive: saved.alive && saved.hp > 0,
        statuses: statuses(saved.statuses),
      }
    }),
    social: {
      choices: value?.social?.choices && typeof value.social.choices === 'object' ? { ...value.social.choices } : {},
      trust: value?.social?.trust && typeof value.social.trust === 'object' ? Object.fromEntries(Object.entries(value.social.trust).map(([id, score]) => [id, clamp(score, -100, 100)])) : {},
      reputation: Math.floor(clamp(value?.social?.reputation ?? 0, -100, 100)),
      acceptedQuests: Array.isArray(value?.social?.acceptedQuests) ? [...new Set(value.social.acceptedQuests.filter((id) => typeof id === 'string'))] : [],
      completedQuests: Array.isArray(value?.social?.completedQuests) ? [...new Set(value.social.completedQuests.filter((id) => typeof id === 'string'))] : [],
      questProgress: value?.social?.questProgress && typeof value.social.questProgress === 'object' ? Object.fromEntries(Object.entries(value.social.questProgress).map(([id, progress]) => [id, clamp(Number(progress) || 0, 0, 100000)])) : {},
      tradedOffers: value?.social?.tradedOffers && typeof value.social.tradedOffers === 'object' ? Object.fromEntries(Object.entries(value.social.tradedOffers).map(([id, day]) => [id, Math.max(0, Math.floor(Number(day) || 0))])) : {},
    },
  }
}

export const npcPositionAt = (npc: NpcDefinition, elapsedSeconds: number): Point => {
  const daySeconds = 1800
  const time = ((elapsedSeconds % daySeconds) + daySeconds) % daySeconds / daySeconds
  const hour = (8 + time * 24) % 24
  if (hour >= 18 || hour < 6) return npc.evening
  if (hour >= 9 && hour < 17) return npc.work
  return npc.home
}

export const experienceToNextLevel = (level: number) => 100 + (level - 1) * 50

export const grantExperience = (state: RpgState, amount: number) => {
  const player = state.player
  player.experience += Math.max(0, Math.floor(amount))
  let levels = 0
  while (player.level < 99 && player.experience >= experienceToNextLevel(player.level)) {
    player.experience -= experienceToNextLevel(player.level)
    player.level += 1
    player.skillPoints += 1
    player.maxHealth += 8
    player.maxStamina += 4
    player.maxMana += 4
    player.health = player.maxHealth
    player.stamina = player.maxStamina
    player.mana = player.maxMana
    player.staminaRegenDelay = 0
    levels += 1
  }
  return levels
}

export const unlockSkill = (state: RpgState, skillId: string) => {
  const skill = SKILL_TREE.find((candidate) => candidate.id === skillId)
  if (!skill || state.player.skills.includes(skillId) || state.player.level < skill.level || state.player.skillPoints < 1) return false
  if (skill.requires?.some((required) => !state.player.skills.includes(required))) return false
  state.player.skills.push(skillId)
  state.player.skillPoints -= 1
  if (skillId === 'vitality') { state.player.maxHealth += 20; state.player.health += 20 }
  if (skillId === 'arcana') { state.player.maxMana += 25; state.player.mana += 25 }
  if (skillId === 'second-wind') { state.player.maxStamina += 25; state.player.stamina += 25 }
  return true
}

export const attackDamage = (state: RpgState, type: 'melee' | 'ranged') => {
  const player = state.player
  if (type === 'melee') return Math.round((18 + player.level * 2 + (player.skills.includes('bladecraft') ? 10 : 0)) * (player.equippedWeapon === 'iron_sword' ? 1.5 + player.weaponLevel * 0.2 : 1))
  return 20 + player.level * 2 + (player.skills.includes('arcana') ? 12 : 0) + (player.equippedWeapon === 'arcane_staff' ? 8 + player.weaponLevel * 5 : 0)
}

export const applyStatus = (target: { statuses: StatusEffect[] }, kind: StatusKind, duration: number) => {
  const existing = target.statuses.find((status) => status.kind === kind)
  if (existing) existing.remaining = Math.max(existing.remaining, duration)
  else target.statuses.push({ kind, remaining: duration, tickIn: 0.6 })
}

export const tickStatuses = (target: { hp?: number; health?: number; statuses: StatusEffect[] }, seconds: number) => {
  for (const status of target.statuses) {
    status.remaining -= seconds
    status.tickIn -= seconds
    if ((status.kind === 'poison' || status.kind === 'burn') && status.tickIn <= 0) {
      const damage = status.kind === 'poison' ? 4 : 6
      if (typeof target.health === 'number') target.health = Math.max(0, target.health - damage)
      else if (typeof target.hp === 'number') target.hp = Math.max(0, target.hp - damage)
      status.tickIn += 0.6
    }
  }
  target.statuses = target.statuses.filter((status) => status.remaining > 0)
}

export const chooseDialogue = (state: RpgState, npcId: string, choiceId: string) => {
  const npc = NPCS.find((entry) => entry.id === npcId)
  const choice = npc?.choices.find((entry) => entry.id === choiceId)
  if (!npc || !choice) return false
  const key = `${npcId}:${choiceId}`
  if (state.social.choices[npcId] === choiceId) return false
  state.social.choices[npcId] = choiceId
  state.social.trust[npcId] = clamp((state.social.trust[npcId] ?? 0) + choice.trust, -100, 100)
  state.social.reputation = clamp(state.social.reputation + choice.reputation, -100, 100)
  if (choice.quest && !state.social.completedQuests.includes(choice.quest) && !state.social.acceptedQuests.includes(choice.quest)) state.social.acceptedQuests.push(choice.quest)
  state.social.choices[`${key}:memory`] = choiceId
  return true
}

export const completeQuest = (state: RpgState, questId: string) => {
  if (!state.social.acceptedQuests.includes(questId) || state.social.completedQuests.includes(questId)) return false
  state.social.completedQuests.push(questId)
  state.social.acceptedQuests = state.social.acceptedQuests.filter((id) => id !== questId)
  state.social.reputation = clamp(state.social.reputation + 2, -100, 100)
  return true
}

export const tradeOffer = (state: RpgState, inventory: Inventory, offerId: string, day: number) => {
  const offer = TRADE_OFFERS.find((candidate) => candidate.id === offerId)
  if (!offer || (state.social.tradedOffers[offerId] ?? -1) === day) return false
  if (Object.entries(offer.cost).some(([itemId, quantity]) => inventory.count(itemId) < quantity)) return false
  if (!inventory.canAdd(offer.reward.itemId, offer.reward.quantity, offer.reward.maxStack)) return false
  Object.entries(offer.cost).forEach(([itemId, quantity]) => inventory.remove(itemId, quantity))
  inventory.add(offer.reward.itemId, offer.reward.quantity, offer.reward.maxStack)
  state.social.tradedOffers[offerId] = day
  grantExperience(state, offer.experience)
  return true
}

export const useRpgItem = (state: RpgState, inventory: Inventory, itemId: string) => {
  const player = state.player
  if ((itemId === 'iron_sword' || itemId === 'arcane_staff') && inventory.count(itemId) > 0) {
    player.equippedWeapon = itemId
    return true
  }
  if (itemId === 'health_draught' && player.health < player.maxHealth && inventory.remove(itemId, 1)) {
    player.health = Math.min(player.maxHealth, player.health + 45)
    return true
  }
  if (itemId === 'bandage' && player.health < player.maxHealth && inventory.remove(itemId, 1)) {
    player.health = Math.min(player.maxHealth, player.health + 18)
    return true
  }
  if (itemId === 'medkit' && player.health < player.maxHealth && inventory.remove(itemId, 1)) {
    player.health = Math.min(player.maxHealth, player.health + 55)
    return true
  }
  if (itemId === 'mana_draught' && player.mana < player.maxMana && inventory.remove(itemId, 1)) {
    player.mana = Math.min(player.maxMana, player.mana + 48)
    return true
  }
  if (itemId === 'weapon_upgrade' && player.equippedWeapon && player.weaponLevel < 3 && inventory.remove(itemId, 1)) {
    player.weaponLevel += 1
    return true
  }
  if (itemId === 'armor_upgrade' && player.armorLevel < 3 && inventory.remove(itemId, 1)) {
    player.armorLevel += 1
    player.maxHealth += 15
    player.health = Math.min(player.maxHealth, player.health + 15)
    return true
  }
  if (itemId === 'arcane_rune' && player.mana < player.maxMana && inventory.remove(itemId, 1)) {
    player.mana = Math.min(player.maxMana, player.mana + 25)
    return true
  }
  return false
}

export const NPC_QUEST_GOALS: Record<string, number> = { 'herbal-aid': 3, 'warden-hunt': 1, 'beacon-vow': 1 }

export const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum))

export const QUEST_REWARDS: Record<string, { itemId: string; quantity: number; experience: number; maxStack: number }> = {
  'herbal-aid': { itemId: 'health_draught', quantity: 2, experience: 70, maxStack: 10 },
  'warden-hunt': { itemId: 'arcane_rune', quantity: 1, experience: 120, maxStack: 5 },
  'beacon-vow': { itemId: 'mana_draught', quantity: 2, experience: 90, maxStack: 10 },
}
