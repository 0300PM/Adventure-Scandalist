<script setup lang="ts">
import { computed, ref } from 'vue'
import GameButton from './GameButton.vue'
import { LORE_CATEGORIES, entriesByCategory, findLoreEntry, LORE_ENTRIES, type LoreCategory } from '../game/lore'
import type { Copy, Language } from '../i18n'

const props = defineProps<{
  t: Copy
  language: Language
  discovered: string[]
}>()

defineEmits<{ close: [] }>()

const categoryLabels: Record<LoreCategory, keyof Copy> = {
  places: 'lorePlaces',
  people: 'lorePeople',
  echoes: 'loreEchoes',
  relics: 'loreRelics',
  history: 'loreHistory',
}

const activeCategory = ref<LoreCategory>('places')
const openEntryId = ref<string | null>(null)
const discoveredSet = computed(() => new Set(props.discovered))
const entries = computed(() => entriesByCategory(activeCategory.value))
const foundTotal = computed(() => LORE_ENTRIES.filter((entry) => discoveredSet.value.has(entry.id)).length)
const foundByCategory = (category: LoreCategory) =>
  entriesByCategory(category).filter((entry) => discoveredSet.value.has(entry.id)).length

const titleFor = (entryId: string) => {
  const entry = findLoreEntry(entryId)
  return entry ? entry.title[props.language] : entryId
}

const selectCategory = (category: LoreCategory) => {
  activeCategory.value = category
  openEntryId.value = null
}

const toggleEntry = (entryId: string) => {
  openEntryId.value = openEntryId.value === entryId ? null : entryId
}
</script>

<template>
  <div class="modal-screen lore-screen" @click.self="$emit('close')">
    <section class="lore-panel" role="dialog" aria-modal="true" :aria-label="t.chronicleTitle">
      <img class="gui-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/10 Calander/1.png" alt="">
      <div class="lore-content">
        <header class="lore-header">
          <div>
            <p class="lore-kicker">{{ t.chronicleDiscovered }} · {{ foundTotal }} / {{ LORE_ENTRIES.length }}</p>
            <h2>{{ t.chronicleTitle }}</h2>
            <p class="lore-subtitle">{{ t.chronicleSubtitle }}</p>
          </div>
          <GameButton size="icon" skin="close" :aria-label="t.chronicleClose" @click="$emit('close')" />
        </header>

        <nav class="lore-tabs" :aria-label="t.chronicleTitle">
          <GameButton
            v-for="category in LORE_CATEGORIES"
            :key="category"
            size="sm"
            :class="{ 'is-active': activeCategory === category }"
            :aria-pressed="activeCategory === category"
            @click="selectCategory(category)"
          >
            {{ t[categoryLabels[category]] }}
            <small>{{ foundByCategory(category) }}/{{ entriesByCategory(category).length }}</small>
          </GameButton>
        </nav>

        <div class="lore-list">
          <p v-if="!discovered.length" class="lore-empty">{{ t.chronicleEmpty }}</p>
          <article
            v-for="entry in entries"
            :key="entry.id"
            class="lore-entry"
            :class="{ 'is-locked': !discoveredSet.has(entry.id), 'is-open': openEntryId === entry.id }"
          >
            <button type="button" class="lore-entry-head" :aria-expanded="openEntryId === entry.id" @click="toggleEntry(entry.id)">
              <span class="lore-entry-mark">{{ discoveredSet.has(entry.id) ? '✦' : '✧' }}</span>
              <strong>{{ discoveredSet.has(entry.id) ? titleFor(entry.id) : t.chronicleLocked }}</strong>
              <span class="lore-entry-state">{{ discoveredSet.has(entry.id) ? t[categoryLabels[entry.category]] : '—' }}</span>
            </button>
            <p v-if="openEntryId === entry.id" class="lore-entry-body">
              {{ discoveredSet.has(entry.id) ? entry.body[language] : t.chronicleLockedHint }}
            </p>
          </article>
        </div>

        <footer class="lore-footer" :class="{ 'is-complete': foundTotal === LORE_ENTRIES.length }">
          <span>{{ foundTotal }} / {{ LORE_ENTRIES.length }}</span>
          <span class="lore-footer-rule" aria-hidden="true"></span>
          <span>{{ foundTotal === LORE_ENTRIES.length ? t.chronicleComplete : t.chronicleSubtitle }}</span>
        </footer>
      </div>
    </section>
  </div>
</template>
