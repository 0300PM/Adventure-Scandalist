<script setup lang="ts">
import GameButton from './GameButton.vue'
import type { Copy } from '../i18n'

defineProps<{ t: Copy }>()
defineEmits<{ resume: []; menu: [] }>()
</script>

<template>
  <div class="modal-screen">
    <section class="story-card compact-card" role="dialog" aria-modal="true" :aria-label="t.pauseTitle">
      <img class="gui-frame" src="/Public/gui/pocket_inv/Sprites/Content/Power Hub/1.png" alt="">
      <div class="story-content pause-content">
        <span class="story-sigil">Ⅱ</span>
        <p class="story-chapter">{{ t.pauseTitle }}</p>
        <h2>{{ t.pauseOverlay }}</h2>
        <GameButton wide @click="$emit('resume')">{{ t.resume }}</GameButton>
        <GameButton class="menu-back" variant="secondary" wide @click="$emit('menu')">{{ t.menuToTitle }}</GameButton>
      </div>
    </section>
  </div>
</template>
