<script setup lang="ts">
import GameButton from './GameButton.vue'
import type { Copy } from '../i18n'

defineProps<{ t: Copy }>()
defineEmits<{ back: [] }>()
</script>

<template>
  <div class="modal-screen ending-screen">
    <section class="story-card ending-card" role="dialog" aria-modal="true" :aria-label="t.finishTitle">
      <img class="gui-frame" src="/Public/gui/pocket_inv/Sprites/Content/Power Hub/1.png" alt="">
      <div class="story-content">
        <span class="story-sigil"><img src="/Public/gui/pocket_inv/Sprites/Content/Items/1.png" alt=""></span>
        <p class="story-chapter">{{ t.chapterEnd }}</p>
        <h2>{{ t.finishTitle }}</h2>
        <p class="story-copy">{{ t.finish }}</p>
        <GameButton wide @click="$emit('back')">{{ t.finishButton }}</GameButton>
      </div>
    </section>
  </div>
</template>
