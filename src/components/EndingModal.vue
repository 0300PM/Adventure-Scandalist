<script setup lang="ts">
import GameButton from './GameButton.vue'
import type { Copy } from '../i18n'

defineProps<{ t: Copy; relicFound: boolean; region: 'shore' | 'continent' }>()
defineEmits<{ back: []; sail: []; 'open-chronicle': [] }>()
</script>

<template>
  <div class="modal-screen ending-screen">
    <section class="story-card ending-card" role="dialog" aria-modal="true" :aria-label="t.finishTitle">
      <img class="gui-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/8 Shop/1.png" alt="">
      <div class="story-content ending-content">
        <span class="story-sigil"><img src="/Public/gui/paperUISystem/Sprites/Content/1 Items/1.png" alt=""></span>
        <p class="story-chapter">{{ region === 'shore' ? t.chapterEnd : t.continentChapter }}</p>
        <h2>{{ region === 'shore' ? t.finishTitle : t.continentFinishTitle }}</h2>
        <p class="story-copy">{{ region === 'shore' ? t.finish : t.continentFinish }}</p>
        <p v-if="region === 'shore'" class="story-copy story-epilogue">{{ t.epilogue }}</p>
        <p v-if="region === 'shore' && relicFound" class="story-copy story-epilogue story-relic">{{ t.epilogueRelic }}</p>
        <div v-if="region === 'shore'" class="boat-reward">
          <span class="boat-reward-mark" aria-hidden="true"><i></i><b></b></span>
          <span><strong>{{ t.boatReward }}</strong><small>{{ t.continentName }}</small></span>
        </div>
        <div class="ending-actions">
          <GameButton v-if="region === 'shore'" wide @click="$emit('sail')">{{ t.sailButton }}</GameButton>
          <GameButton variant="secondary" wide @click="$emit('back')">{{ t.finishButton }}</GameButton>
          <GameButton variant="secondary" wide @click="$emit('open-chronicle')">{{ t.chronicleOpen }}</GameButton>
        </div>
      </div>
    </section>
  </div>
</template>
