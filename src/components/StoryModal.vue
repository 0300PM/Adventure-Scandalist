<script setup lang="ts">
import GameButton from './GameButton.vue'
import type { LoreEntry } from '../game/lore'
import type { Copy, Language } from '../i18n'

defineProps<{
  t: Copy
  language: Language
  entry: LoreEntry
  itemIcon: string
  itemName: string
}>()

defineEmits<{ close: [] }>()
</script>

<template>
  <div class="modal-screen story-screen">
    <section class="story-card story-reveal" role="dialog" aria-modal="true" :aria-label="entry.title[language]">
      <img class="gui-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/8 Shop/1.png" alt="">
      <div class="story-content story-reveal-content">
        <span class="story-sigil"><img :src="itemIcon" :alt="itemName"></span>
        <p class="story-chapter">{{ t.storyFound }} · {{ t.chronicle }}</p>
        <h2>{{ entry.title[language] }}</h2>
        <p class="story-copy">{{ entry.body[language] }}</p>
        <p class="story-note"><span>✦</span> {{ t.chronicleNew }}</p>
        <GameButton wide @click="$emit('close')">{{ t.storyClose }}</GameButton>
      </div>
    </section>
  </div>
</template>
