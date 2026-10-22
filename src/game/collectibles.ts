import { Inventory } from './inventory'
import type { Point } from './core'
import type { WorldRegion } from './world'

export type Collectible = {
  id: string
  region?: WorldRegion
  itemId: string
  x: number
  y: number
  quantity: number
  maxStack: number
  collected: boolean
  requiredTool?: 'axe_tool' | 'pickaxe_tool'
  unlockAfter?: 'stone-axe' | 'lean-to' | 'stone-pick' | 'hammer'
}

export const collectNearbyItem = (
  position: Point,
  collectibles: Collectible[],
  radius: number,
  inventory: Inventory,
  quantityFor: (collectible: Collectible) => number = (collectible) => collectible.quantity,
): Collectible | null => {
  const nearest = collectibles.reduce<Collectible | null>((selected, collectible) => {
    if (collectible.collected) return selected
    const distance = Math.hypot(position.x - collectible.x, position.y - collectible.y)
    if (distance > radius) return selected
    if (!selected || distance < Math.hypot(position.x - selected.x, position.y - selected.y)) return collectible
    return selected
  }, null)

  if (!nearest) return null
  const quantity = quantityFor(nearest)
  if (inventory.add(nearest.itemId, quantity, nearest.maxStack) !== quantity) return null
  nearest.collected = true
  return nearest
}
