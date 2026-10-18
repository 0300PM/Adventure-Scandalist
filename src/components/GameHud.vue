<script setup lang="ts">
import GameButton from './GameButton.vue'
import type { GameSnapshot } from '../game/adventure'
import type { Copy, Language } from '../i18n'

defineProps<{
  t: Copy
  language: Language
  started: boolean
  snapshot: GameSnapshot
  inventoryOpen: boolean
}>()

defineEmits<{
  'cycle-language': []
  'toggle-inventory': []
  'toggle-pause': []
}>()
</script>

<template>
  <header class="game-hud">
    <div class="hud-left">
      <div class="hud-brand">
        <span class="brand-mark"><img src="/Public/gui/pocket_inv/Sprites/Content/Items/1.png" alt=""></span>
        <span><small>FIELD NOTES · 07</small><strong>{{ t.title }}</strong></span>
      </div>
      <section class="quest-card">
        <img class="gui-frame" src="/Public/gui/pocket_inv/Sprites/Content/Power Hub/1.png" alt="">
        <div class="quest-content">
          <div class="quest-overline"><img class="quest-pin" src="/Public/gui/pocket_inv/Sprites/Content/Items/1.png" alt="">{{ t.objective }}<span class="quest-status">{{ started ? t.active : t.ready }}</span></div>
          <h2>{{ snapshot.memories === 3 ? t.return : t.quest }}</h2>
          <p>{{ snapshot.memories === 3 ? t.findFire : t.discover }}</p>
          <div class="quest-progress">
            <div class="memory-pips" :aria-label="t.progress">
              <span v-for="index in 3" :key="index" class="memory-pip" :class="{ found: snapshot.memories >= index }">
                <img class="holder-art" src="/Public/gui/pocket_inv/Sprites/Content/Holders/3.png" alt="">
                <img v-if="snapshot.memories >= index" class="pip-item" src="/Public/gui/pocket_inv/Sprites/Content/Items/1.png" alt="">
              </span>
            </div>
            <span class="inventory-count">{{ snapshot.memories }} <small>{{ t.counter }}</small></span>
          </div>
          <div class="progress-art" aria-hidden="true">
            <img v-for="index in 3" :key="index" src="/Public/gui/pocket_inv/Sprites/Content/Progress Bars/0.png" :class="{ lit: snapshot.memories >= index }" alt="">
          </div>
        </div>
      </section>
    </div>
    <div class="hud-actions">
      <span class="map-label"><img src="/Public/gui/pocket_inv/Sprites/Content/Compass/0.png" alt="">{{ t.map }}</span>
      <GameButton class="language-button" variant="icon" :aria-label="t.locale" @click="$emit('cycle-language')">{{ language.toUpperCase() }}</GameButton>
      <GameButton v-if="started && !snapshot.completed" class="inventory-toggle" variant="icon" :aria-label="inventoryOpen ? t.inventoryClose : t.inventoryToggle" @click="$emit('toggle-inventory')">I</GameButton>
      <GameButton v-if="started && !snapshot.completed" class="pause-button" variant="icon" :aria-label="t.pause" @click="$emit('toggle-pause')">Ⅱ</GameButton>
    </div>
  </header>
</template>
