<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger' | 'icon'
  skin?: 'button' | 'close'
  disabled?: boolean
  ariaLabel?: string
  wide?: boolean
}>(), {
  type: 'button',
  variant: 'primary',
  skin: 'button',
  disabled: false,
  wide: false,
})

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    class="game-button"
    :class="[`game-button--${variant}`, { 'game-button--wide': wide }]"
    :type="type"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <img v-if="variant === 'primary' || variant === 'icon'" class="game-button__skin" :src="skin === 'close' ? '/Public/gui/pocket_inv/Sprites/Content/UI Buttons/5.png' : '/Public/gui/pocket_inv/Sprites/Content/UI Buttons/6.png'" alt="">
    <span class="game-button__content"><slot /></span>
  </button>
</template>
