<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'md' | 'sm' | 'icon'
  skin?: 'plate' | 'close'
  disabled?: boolean
  ariaLabel?: string
  wide?: boolean
}>(), {
  type: 'button',
  variant: 'primary',
  size: 'md',
  skin: 'plate',
  disabled: false,
  wide: false,
})

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    class="game-button"
    :class="[
      `game-button--${variant}`,
      `game-button--${size}`,
      { 'game-button--wide': wide, 'game-button--close': size === 'icon' && skin === 'close' },
    ]"
    :type="type"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <span v-if="size === 'icon' && skin === 'close'" class="game-button__close-mark" aria-hidden="true">×</span>
    <span v-else class="game-button__content"><slot /></span>
  </button>
</template>
