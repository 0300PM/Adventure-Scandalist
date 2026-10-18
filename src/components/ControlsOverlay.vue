<script setup lang="ts">
import type { Direction } from '../game/adventure'
import type { Copy } from '../i18n'

defineProps<{
  t: Copy
  started: boolean
  paused: boolean
  nearbyHint: string
}>()

defineEmits<{
  interact: [pressed: boolean]
  direction: [direction: Direction, pressed: boolean]
}>()
</script>

<template>
  <div v-if="started && !paused && nearbyHint" class="interaction-hint">
    <img class="prompt-frame" src="/Public/gui/pocket_inv/Sprites/Content/Holders/10.png" alt="">
    <span class="hint-sparkle">✦</span><span>{{ nearbyHint }}</span>
    <button class="interaction-key" type="button" :aria-label="t.interact" @pointerdown.prevent="$emit('interact', true)" @pointerup.prevent="$emit('interact', false)" @pointerleave="$emit('interact', false)"><img src="/Public/gui/pocket_inv/Sprites/Content/UI Buttons/0.png" alt="E"></button>
  </div>
  <div v-if="started && !paused" class="control-hint"><img class="move-art" src="/Public/gui/pocket_inv/Sprites/Content/UI Buttons/10.png" alt="W A S D"><span>{{ t.interact }}</span><img class="interact-art" src="/Public/gui/pocket_inv/Sprites/Content/UI Buttons/0.png" alt="E"></div>
  <div v-if="started && !paused" class="touch-controls" :aria-label="t.mobile">
    <button aria-label="Up" type="button" @pointerdown.prevent="$emit('direction', 'up', true)" @pointerup.prevent="$emit('direction', 'up', false)" @pointerleave="$emit('direction', 'up', false)" @pointercancel="$emit('direction', 'up', false)"><img src="/Public/gui/pocket_inv/Sprites/Content/UI Buttons/6.png" alt=""><span>↑</span></button>
    <div>
      <button aria-label="Left" type="button" @pointerdown.prevent="$emit('direction', 'left', true)" @pointerup.prevent="$emit('direction', 'left', false)" @pointerleave="$emit('direction', 'left', false)" @pointercancel="$emit('direction', 'left', false)"><img src="/Public/gui/pocket_inv/Sprites/Content/UI Buttons/6.png" alt=""><span>←</span></button>
      <button aria-label="Down" type="button" @pointerdown.prevent="$emit('direction', 'down', true)" @pointerup.prevent="$emit('direction', 'down', false)" @pointerleave="$emit('direction', 'down', false)" @pointercancel="$emit('direction', 'down', false)"><img src="/Public/gui/pocket_inv/Sprites/Content/UI Buttons/6.png" alt=""><span>↓</span></button>
      <button aria-label="Right" type="button" @pointerdown.prevent="$emit('direction', 'right', true)" @pointerup.prevent="$emit('direction', 'right', false)" @pointerleave="$emit('direction', 'right', false)" @pointercancel="$emit('direction', 'right', false)"><img src="/Public/gui/pocket_inv/Sprites/Content/UI Buttons/6.png" alt=""><span>→</span></button>
    </div>
  </div>
</template>
