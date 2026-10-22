<script setup lang="ts">
import GameButton from './GameButton.vue'
import type { InventorySlot } from '../game/inventory'
import type { GameSnapshot } from '../game/adventure'
import type { Copy } from '../i18n'
import { ITEM_DETAILS } from '../game/survival'

const RPG_ITEM_ACTIONS = ['health_draught', 'mana_draught', 'weapon_upgrade', 'armor_upgrade', 'arcane_rune', 'iron_sword', 'arcane_staff']
const WEAPON_ITEMS = ['iron_sword', 'arcane_staff']

defineProps<{
  t: Copy
  snapshot: GameSnapshot
  selectedSlot: number
  selectedInventoryItem: InventorySlot
  itemIcon: (itemId: string) => string
  itemName: (itemId: string) => string
  equippedTool: string | null
}>()

defineEmits<{
  close: []
  'select-slot': [slot: number]
  'use-item': []
  'equip-tool': []
  'drop-item': []
}>()
</script>

<template>
  <div class="modal-screen inventory-screen" @click.self="$emit('close')">
    <section class="inventory-panel" aria-modal="true" role="dialog" :aria-label="t.inventoryTitle">
      <img class="gui-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/8 Shop/1.png" alt="">
      <div class="inventory-content">
        <header class="inventory-header">
          <div><p class="inventory-kicker">FIELD KIT · 12</p><h2>{{ t.inventoryTitle }}</h2></div>
          <GameButton class="asset-close" size="icon" skin="close" :aria-label="t.inventoryClose" @click="$emit('close')" />
        </header>
        <div class="inventory-grid">
          <button v-for="(slot, index) in snapshot.inventory" :key="index" class="item-slot" :class="{ selected: selectedSlot === index, 'slot-occupied': slot }" :aria-label="slot ? itemName(slot.itemId) : t.emptySlot" :title="slot ? itemName(slot.itemId) : t.emptySlot" @click="$emit('select-slot', index)">
            <img class="slot-frame" src="/Public/gui/paperUISystem/Sprites/Content/5 Holders/1.png" alt="">
            <img v-if="slot" class="item-art" :src="itemIcon(slot.itemId)" alt="">
            <span v-if="slot" class="slot-quantity">{{ slot.quantity }}</span>
          </button>
        </div>
        <footer class="inventory-footer">
          <div class="selected-item"><img v-if="selectedInventoryItem" :src="itemIcon(selectedInventoryItem.itemId)" alt=""><span>{{ selectedInventoryItem ? itemName(selectedInventoryItem.itemId) : t.inventoryHint }}</span><strong v-if="selectedInventoryItem">×{{ selectedInventoryItem.quantity }}</strong></div>
          <span class="inventory-limit">{{ snapshot.inventory.filter(Boolean).length }} / {{ snapshot.inventory.length }}</span>
        </footer>
        <div v-if="selectedInventoryItem" class="inventory-item-actions">
          <GameButton v-if="ITEM_DETAILS[selectedInventoryItem.itemId]?.food || ITEM_DETAILS[selectedInventoryItem.itemId]?.water || ITEM_DETAILS[selectedInventoryItem.itemId]?.energy || RPG_ITEM_ACTIONS.includes(selectedInventoryItem.itemId)" size="sm" variant="secondary" @click="$emit('use-item')">{{ WEAPON_ITEMS.includes(selectedInventoryItem.itemId) ? t.itemEquip : t.itemUse }}</GameButton>
          <GameButton v-if="selectedInventoryItem.itemId === 'axe_tool' || selectedInventoryItem.itemId === 'pickaxe_tool'" size="sm" variant="secondary" @click="$emit('equip-tool')">{{ equippedTool === selectedInventoryItem.itemId ? t.itemUnequip : t.itemEquip }}</GameButton>
          <GameButton size="sm" variant="secondary" @click="$emit('drop-item')">{{ t.itemDrop }}</GameButton>
          <span v-if="selectedInventoryItem.itemId === equippedTool || selectedInventoryItem.itemId === snapshot.rpg.player.equippedWeapon" class="equipped-tag">{{ t.itemEquipped }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
