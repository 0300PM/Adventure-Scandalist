<script setup lang="ts">
import GameButton from './GameButton.vue'
import type { Copy } from '../i18n'

export type HarvestTool = 'axe_tool' | 'pickaxe_tool'

defineProps<{
  t: Copy
  inventory: Array<{ itemId: string; quantity: number } | null>
  equippedTool: HarvestTool | null
  itemIcon: (itemId: string) => string
  itemName: (itemId: string) => string
}>()

defineEmits<{
  equip: [tool: HarvestTool]
}>()

const tools: HarvestTool[] = ['axe_tool', 'pickaxe_tool']
const quantity = (inventory: Array<{ itemId: string; quantity: number } | null>, itemId: string) =>
  inventory.reduce((total, slot) => total + (slot?.itemId === itemId ? slot.quantity : 0), 0)
</script>

<template>
  <nav class="tool-toolbar" :aria-label="t.toolbelt">
    <GameButton
      v-for="tool in tools"
      :key="tool"
      class="tool-slot"
      :class="{ 'is-equipped': equippedTool === tool }"
      size="icon"
      variant="secondary"
      :disabled="quantity(inventory, tool) === 0"
      :aria-label="`${itemName(tool)} · ${equippedTool === tool ? t.itemUnequip : t.itemEquip}`"
      :title="`${itemName(tool)} · ${equippedTool === tool ? t.itemUnequip : t.itemEquip}`"
      :aria-pressed="equippedTool === tool"
      @click="$emit('equip', tool)"
    >
      <img :src="itemIcon(tool)" alt="">
      <span class="tool-quantity">{{ quantity(inventory, tool) }}</span>
    </GameButton>
  </nav>
</template>
