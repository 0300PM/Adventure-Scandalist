<script setup lang="ts">
import { computed } from 'vue'
import GameButton from './GameButton.vue'
import type { InventorySlot } from '../game/inventory'
import type { Language, Copy } from '../i18n'
import type { Recipe, RecipeResult } from '../game/survival'
import { getDayCycle } from '../game/survival'
import { NPCS, NPC_QUEST_GOALS, SKILL_TREE, TRADE_OFFERS, experienceToNextLevel, type RpgState } from '../game/rpg'
import type { WorldRegion } from '../game/world'

export type RpgTab = 'combat' | 'skills' | 'dialogue' | 'trade' | 'craft'

const props = defineProps<{
  t: Copy
  language: Language
  mode: RpgTab
  npcId: string | null
  rpg: RpgState
  inventory: InventorySlot[]
  recipes: Recipe[]
  region: WorldRegion
  day: number
  position: { x: number; y: number }
  itemIcon: (itemId: string) => string
  itemName: (itemId: string) => string
  recipeStatus: (recipeId: string) => RecipeResult
}>()

defineEmits<{
  close: []
  tab: [tab: RpgTab]
  dialogue: [choiceId: string]
  trade: [offerId: string]
  skill: [skillId: string]
  craft: [recipeId: string]
  attack: [action: 'melee' | 'ranged' | 'dodge']
}>()

const tabs: RpgTab[] = ['combat', 'skills', 'dialogue', 'trade', 'craft']
const npc = computed(() => NPCS.find((entry) => entry.id === props.npcId) ?? null)
const lastChoice = computed(() => {
  if (!npc.value) return null
  const remembered = props.rpg.social.choices[npc.value.id]
  return npc.value.choices.find((choice) => choice.id === remembered) ?? null
})
const npcOffers = computed(() => TRADE_OFFERS.filter((offer) => !props.npcId || offer.npcId === props.npcId))
const enemies = computed(() => props.rpg.enemies.filter((enemy) => enemy.region === props.region))
const aliveEnemies = computed(() => enemies.value.filter((enemy) => enemy.alive))
const nearestEnemy = computed(() => aliveEnemies.value
  .map((enemy) => ({ enemy, distance: Math.hypot(enemy.x - props.position.x, enemy.y - props.position.y) }))
  .sort((a, b) => a.distance - b.distance)[0] ?? null)
const combatRecipes = computed(() => props.recipes.filter((recipe) => ['health-draught', 'mana-draught', 'iron-sword', 'arcane-staff', 'weapon-upgrade', 'armor-upgrade'].includes(recipe.id)))
const totalItems = (itemId: string) => props.inventory.reduce((sum, slot) => sum + (slot?.itemId === itemId ? slot.quantity : 0), 0)
const statusLabel: Record<string, keyof Copy> = { poison: 'poison', burn: 'burn', freeze: 'freeze' }
const phaseLabel: Record<string, keyof Copy> = { patrol: 'phasePatrol', alert: 'phaseAlert', enraged: 'phaseEnraged', dead: 'defeated' }
const enemyNameLabel: Record<string, keyof Copy> = { 'moss-stalker': 'enemyMossStalker', 'ember-skirmisher': 'enemyEmberSkirmisher', 'frost-ranger': 'enemyFrostRanger', 'dawn-warden': 'enemyDawnWarden', shardling: 'enemyShardling' }
const skillAvailable = (skillId: string) => {
  const skill = SKILL_TREE.find((entry) => entry.id === skillId)
  return Boolean(skill && !props.rpg.player.skills.includes(skill.id) && props.rpg.player.level >= skill.level
    && props.rpg.player.skillPoints > 0 && (!skill.requires || skill.requires.every((id) => props.rpg.player.skills.includes(id))))
}
const getDay = () => getDayCycle(props.day).day
</script>

<template>
  <div class="modal-screen rpg-screen" @click.self="$emit('close')">
    <section class="rpg-panel" role="dialog" aria-modal="true" :aria-label="t.rpgTitle">
      <img class="gui-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/8 Shop/1.png" alt="">
      <div class="rpg-content">
        <header class="rpg-header">
          <div><p class="inventory-kicker">{{ t.level }} {{ rpg.player.level }} · {{ t.skillPoints }}: {{ rpg.player.skillPoints }}</p><h2>{{ t.rpgTitle }}</h2></div>
          <GameButton size="icon" skin="close" :aria-label="t.menuBack" @click="$emit('close')" />
        </header>
        <nav class="rpg-tabs" :aria-label="t.rpgTitle">
          <GameButton v-for="tab in tabs" :key="tab" size="sm" :variant="mode === tab ? 'primary' : 'secondary'" @click="$emit('tab', tab)">{{ t[tab === 'skills' ? 'skillTree' : tab] }}</GameButton>
        </nav>

        <section v-if="mode === 'combat'" class="rpg-view combat-view">
          <div class="rpg-stat-grid">
            <div><span>{{ t.health }}</span><strong>{{ Math.ceil(rpg.player.health) }} / {{ rpg.player.maxHealth }}</strong></div>
            <div><span>{{ t.stamina }}</span><strong>{{ Math.ceil(rpg.player.stamina) }} / {{ rpg.player.maxStamina }}</strong></div>
            <div><span>{{ t.mana }}</span><strong>{{ Math.ceil(rpg.player.mana) }} / {{ rpg.player.maxMana }}</strong></div>
            <div><span>{{ t.experience }}</span><strong>{{ rpg.player.experience }} / {{ experienceToNextLevel(rpg.player.level) }}</strong></div>
          </div>
          <div class="rpg-weapon"><span>{{ t.equippedWeapon }}</span><strong>{{ rpg.player.equippedWeapon ? itemName(rpg.player.equippedWeapon) : t.noWeapon }}</strong><small>+{{ rpg.player.weaponLevel }} · {{ t.level }} {{ rpg.player.level }}</small></div>
          <div class="rpg-statuses"><strong>{{ t.statusEffects }}</strong><span v-if="!rpg.player.statuses.length">{{ t.noStatus }}</span><span v-for="status in rpg.player.statuses" :key="status.kind" :class="`status-${status.kind}`">{{ t[statusLabel[status.kind]] }} · {{ Math.ceil(status.remaining) }}s</span></div>
          <div class="combat-actions">
            <GameButton @click="$emit('attack', 'melee')">{{ t.meleeAttack }}</GameButton>
            <GameButton variant="secondary" @click="$emit('attack', 'ranged')">{{ t.rangedAttack }}</GameButton>
            <GameButton variant="secondary" @click="$emit('attack', 'dodge')">{{ t.dodgeAction }}</GameButton>
          </div>
          <div class="enemy-list">
            <h3>{{ t.enemies }} · {{ aliveEnemies.length }}</h3>
            <article v-for="enemy in aliveEnemies" :key="enemy.id" class="enemy-card" :class="{ 'is-boss': enemy.behavior === 'boss' }">
              <div class="enemy-info"><strong>{{ t[enemyNameLabel[enemy.id]] }}</strong><span>{{ t[phaseLabel[enemy.phase]] }} · {{ Math.round(Math.hypot(enemy.x - position.x, enemy.y - position.y)) }}</span></div>
              <div class="rpg-track"><i class="enemy-health" :style="{ width: `${enemy.hp / enemy.maxHp * 100}%` }"></i></div>
              <small>{{ enemy.hp }} / {{ enemy.maxHp }}</small>
            </article>
            <p v-if="!aliveEnemies.length" class="rpg-empty">{{ t.noEnemyNearby }}</p>
            <p v-else-if="!nearestEnemy || nearestEnemy.distance > 220" class="rpg-empty">{{ t.noEnemyNearby }}</p>
          </div>
        </section>

        <section v-else-if="mode === 'skills'" class="rpg-view skill-list">
          <p class="rpg-summary">{{ t.experience }}: {{ rpg.player.experience }} / {{ experienceToNextLevel(rpg.player.level) }} · {{ t.skillPoints }}: {{ rpg.player.skillPoints }}</p>
          <article v-for="skill in SKILL_TREE" :key="skill.id" class="skill-card" :class="{ 'skill-unlocked': rpg.player.skills.includes(skill.id) }">
            <div><strong>{{ skill.name[language] }}</strong><p>{{ skill.description[language] }}</p><small>{{ t.level }} {{ skill.level }}<span v-if="skill.requires"> · {{ skill.requires.join(', ') }}</span></small></div>
            <GameButton size="sm" :disabled="!skillAvailable(skill.id)" @click="$emit('skill', skill.id)">{{ rpg.player.skills.includes(skill.id) ? t.completed : t.unlockSkill }}</GameButton>
          </article>
        </section>

        <section v-else-if="mode === 'dialogue'" class="rpg-view dialogue-view">
          <template v-if="npc">
            <div class="npc-heading"><span class="npc-seal">✦</span><div><p>{{ npc.role[language] }}</p><h3>{{ npc.name[language] }}</h3></div></div>
            <p class="npc-dialogue">{{ npc.dialogue[language] }}</p>
            <p v-if="lastChoice" class="remembered-choice">{{ t.rememberedChoice }}: {{ lastChoice.label[language] }}</p>
            <div class="relationship-row"><span>{{ t.trust }} <strong>{{ rpg.social.trust[npc.id] ?? 0 }}</strong></span><span>{{ t.reputation }} <strong>{{ rpg.social.reputation }}</strong></span></div>
            <div class="dialogue-choices">
              <GameButton v-for="choice in npc.choices" :key="choice.id" variant="secondary" wide :disabled="rpg.social.choices[npc.id] === choice.id" @click="$emit('dialogue', choice.id)">{{ choice.label[language] }}</GameButton>
            </div>
          </template>
          <p v-else class="rpg-empty">{{ t.selectNpc }}</p>
          <div class="social-quests">
            <h3>{{ t.quests }}</h3>
            <article v-for="questNpc in NPCS" :key="questNpc.quest" class="social-quest">
              <div><strong>{{ questNpc.questName[language] }}</strong><small>{{ rpg.social.completedQuests.includes(questNpc.quest) ? t.completed : rpg.social.acceptedQuests.includes(questNpc.quest) ? t.accepted : t.questUnaccepted }}</small></div>
              <span v-if="rpg.social.acceptedQuests.includes(questNpc.quest)">{{ rpg.social.questProgress[questNpc.quest] ?? 0 }} / {{ NPC_QUEST_GOALS[questNpc.quest] }}</span>
            </article>
          </div>
        </section>

        <section v-else-if="mode === 'trade'" class="rpg-view trade-view">
          <header class="trade-heading"><h3>{{ npc?.name[language] ?? t.trade }}</h3><span>{{ t.dayLabel }} {{ getDay() }}</span></header>
          <article v-for="offer in npcOffers" :key="offer.id" class="trade-offer">
            <div><strong>{{ offer.label[language] }}</strong><p>{{ t.tradeCost }}: <span v-for="(amount, itemId) in offer.cost" :key="itemId">{{ itemName(String(itemId)) }} {{ amount }} · </span></p><small>{{ t.experience }} +{{ offer.experience }}</small></div>
            <GameButton size="sm" :disabled="!npcId || rpg.social.tradedOffers[offer.id] === getDay() || Object.entries(offer.cost).some(([itemId, quantity]) => totalItems(itemId) < quantity)" @click="$emit('trade', offer.id)">{{ rpg.social.tradedOffers[offer.id] === getDay() ? t.dailyLimit : t.tradeButton }}</GameButton>
          </article>
          <p v-if="!npcOffers.length" class="rpg-empty">{{ t.noTradeAvailable }}</p>
        </section>

        <section v-else class="rpg-view rpg-crafting">
          <article v-for="recipe in combatRecipes" :key="recipe.id" class="rpg-recipe">
            <img :src="itemIcon(recipe.output?.itemId ?? recipe.id)" alt="">
            <div><strong>{{ recipe.title[language] }}</strong><p>{{ recipe.detail[language] }}</p><small>{{ Object.entries(recipe.ingredients).map(([id, quantity]) => `${itemName(id)} ${quantity}`).join(' · ') }}</small></div>
            <GameButton size="sm" :disabled="recipeStatus(recipe.id) !== 'crafted'" @click="$emit('craft', recipe.id)">{{ recipe.kind === 'build' ? t.buildAction : t.craftAction }}</GameButton>
          </article>
        </section>
      </div>
    </section>
  </div>
</template>
