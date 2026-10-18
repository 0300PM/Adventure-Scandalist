<script setup lang="ts">
import GameButton from './GameButton.vue'
import type { InventorySlot } from '../game/inventory'
import type { GameSnapshot } from '../game/adventure'
import type { Copy } from '../i18n'

defineProps<{
  t: Copy
  snapshot: GameSnapshot
  selectedSlot: number
  selectedInventoryItem: InventorySlot
  itemIcon: (itemId: string) => string
  itemName: (itemId: string) => string
}>()

defineEmits<{
  close: []
  'select-slot': [slot: number]
}>()
</script>

<template>
  <div class="modal-screen inventory-screen" @click.self="$emit('close')">
    <section class="inventory-panel" aria-modal="true" role="dialog" :aria-label="t.inventoryTitle">
      <img class="gui-frame" src="/Public/gui/pocket_inv/Sprites/Content/Power Hub/1.png" alt="">
      <div class="inventory-content">
        <header class="inventory-header">
          <div><p class="inventory-kicker">FIELD KIT · 12</p><h2>{{ t.inventoryTitle }}</h2></div>
          <GameButton class="asset-close" variant="icon" skin="close" :aria-label="t.inventoryClose" @click="$emit('close')" />
        </header>
        <div class="inventory-grid">
          <button v-for="(slot, index) in snapshot.inventory" :key="index" class="item-slot" :class="{ selected: selectedSlot === index, 'slot-occupied': slot }" :aria-label="slot ? itemName(slot.itemId) : t.emptySlot" :title="slot ? itemName(slot.itemId) : t.emptySlot" @click="$emit('select-slot', index)">
            <img class="slot-frame" src="/Public/gui/pocket_inv/Sprites/Content/Holders/3.png" alt="">
            <img v-if="slot" class="item-art" :src="itemIcon(slot.itemId)" alt="">
            <span v-if="slot" class="slot-quantity">{{ slot.quantity }}</span>
          </button>
        </div>
        <footer class="inventory-footer">
          <div class="selected-item"><img v-if="selectedInventoryItem" :src="itemIcon(selectedInventoryItem.itemId)" alt=""><span>{{ selectedInventoryItem ? itemName(selectedInventoryItem.itemId) : t.inventoryHint }}</span><strong v-if="selectedInventoryItem">×{{ selectedInventoryItem.quantity }}</strong></div>
          <span class="inventory-limit">{{ snapshot.inventory.filter(Boolean).length }} / {{ snapshot.inventory.length }}</span>
        </footer>
        <p class="inventory-help"><img src="/Public/gui/pocket_inv/Sprites/Content/UI Buttons/8.png" alt="X Select">{{ t.inventoryHint }}</p>
      </div>
    </section>
  </div>
</template>
