<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GameButton from './GameButton.vue'
import type { InventorySlot } from '../game/inventory'
import type { Copy, Language } from '../i18n'
import type { Objective, Recipe, RecipeResult, SurvivalNeeds } from '../game/survival'

const props = defineProps<{
  t: Copy
  language: Language
  mode: 'craft' | 'tasks'
  survival: SurvivalNeeds
  inventory: InventorySlot[]
  objectives: Objective[]
  recipes: Recipe[]
  nearCamp: boolean
  itemIcon: (itemId: string) => string
  itemName: (itemId: string) => string
  recipeStatus: (recipeId: string) => RecipeResult
}>()

defineEmits<{
  close: []
  craft: [recipeId: string]
  rest: []
}>()

const activeTab = ref<'craft' | 'tasks'>('tasks')
const elapsed = computed(() => {
  const total = Math.floor(props.survival.elapsedSeconds)
  const hours = Math.floor(total / 3600).toString().padStart(2, '0')
  const minutes = Math.floor(total % 3600 / 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
})
const quantity = (itemId: string) => props.inventory.reduce((sum, slot) => sum + (slot?.itemId === itemId ? slot.quantity : 0), 0)
const recipeOutput = (recipe: Recipe) => recipe.output?.itemId ?? (recipe.id === 'lighthouse-repair' ? 'crystal_shard' : recipe.id === 'rain-catcher' ? 'sap_jar' : 'wood_log')
const unlockNames = (recipe: Recipe) => (recipe.requires ?? [])
  .map((id) => props.recipes.find((candidate) => candidate.id === id)?.title[props.language] ?? id)
  .join(' · ')
watch(() => props.mode, (mode) => { activeTab.value = mode }, { immediate: true })
</script>

<template>
  <div class="modal-screen survival-screen" @click.self="$emit('close')">
    <section class="survival-panel" role="dialog" aria-modal="true" :aria-label="t.survivalTitle">
      <img class="gui-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/8 Shop/1.png" alt="">
      <div class="survival-content">
        <header class="survival-header">
          <div><p class="inventory-kicker">{{ t.survivalNeeds }} · {{ elapsed }}</p><h2>{{ t.survivalTitle }}</h2></div>
          <GameButton size="icon" skin="close" :aria-label="t.menuBack" @click="$emit('close')" />
        </header>
        <nav class="survival-tabs" :aria-label="t.survivalTitle">
          <GameButton size="sm" :variant="activeTab === 'tasks' ? 'primary' : 'secondary'" @click="activeTab = 'tasks'">{{ t.survivalTasks }}</GameButton>
          <GameButton size="sm" :variant="activeTab === 'craft' ? 'primary' : 'secondary'" @click="activeTab = 'craft'">{{ t.survivalCraft }}</GameButton>
        </nav>
        <div v-if="activeTab === 'tasks'" class="objective-list">
          <section class="objective-section">
            <h3>{{ t.objectiveMain }}</h3>
            <article v-for="objective in objectives.filter((entry) => !entry.optional)" :key="objective.id" class="objective-card" :class="{ complete: objective.complete }">
              <span class="objective-mark">{{ objective.complete ? '✓' : '·' }}</span>
              <div class="objective-copy"><strong>{{ objective.title[language] }}</strong><p>{{ objective.detail[language] }}</p><div class="objective-track"><i :style="{ width: `${Math.min(100, objective.current / objective.target * 100)}%` }"></i></div></div>
              <small>{{ objective.current }} / {{ objective.target }}</small>
            </article>
          </section>
          <section class="objective-section">
            <h3>{{ t.objectiveOptional }}</h3>
            <article v-for="objective in objectives.filter((entry) => entry.optional)" :key="objective.id" class="objective-card" :class="{ complete: objective.complete }">
              <span class="objective-mark">{{ objective.complete ? '✓' : '·' }}</span>
              <div class="objective-copy"><strong>{{ objective.title[language] }}</strong><p>{{ objective.detail[language] }}</p><div class="objective-track"><i :style="{ width: `${Math.min(100, objective.current / objective.target * 100)}%` }"></i></div></div>
              <small>{{ objective.current }} / {{ objective.target }}</small>
            </article>
          </section>
        </div>
        <div v-else class="crafting-board">
          <p class="recipe-tip">{{ t.needWater }}</p>
          <div class="craft-grid" :aria-label="t.survivalCraft">
            <article v-for="recipe in recipes" :key="recipe.id" class="recipe-card" :class="{ 'recipe-locked': recipeStatus(recipe.id) !== 'crafted' }" :title="recipe.detail[language]">
              <img class="recipe-icon" :src="itemIcon(recipeOutput(recipe))" alt="">
              <strong class="recipe-title">{{ recipe.title[language] }}</strong>
              <div class="recipe-ingredients"><span v-for="(amount, itemId) in recipe.ingredients" :key="itemId" :class="{ 'ingredient-missing': quantity(String(itemId)) < amount }"><img :src="itemIcon(String(itemId))" alt="">{{ quantity(String(itemId)) }}/{{ amount }}</span></div>
              <small v-if="recipeStatus(recipe.id) === 'locked'" class="recipe-station" :title="unlockNames(recipe)">{{ t.recipeLocked }}: {{ unlockNames(recipe) }}</small>
              <small v-else-if="recipe.station === 'camp' && !nearCamp" class="recipe-station">{{ t.recipeAtCamp }}</small>
              <GameButton size="sm" :variant="recipe.kind === 'build' ? 'secondary' : 'primary'" :disabled="recipeStatus(recipe.id) !== 'crafted'" @click="$emit('craft', recipe.id)">{{ recipe.kind === 'build' ? t.buildAction : t.craftAction }}</GameButton>
            </article>
            <div v-for="empty in Math.max(0, 16 - recipes.length)" :key="`empty-${empty}`" class="recipe-empty" aria-hidden="true"></div>
          </div>
          <GameButton v-if="nearCamp" class="rest-action" variant="secondary" wide @click="$emit('rest')">{{ t.restAtCamp }}</GameButton>
        </div>
      </div>
    </section>
  </div>
</template>
