import { Inventory } from './inventory'
import type { Point } from './core'

export type Collectible = {
  id: string
  itemId: string
  x: number
  y: number
  quantity: number
  maxStack: number
  collected: boolean
}

export const collectNearbyItem = (
  position: Point,
  collectibles: Collectible[],
  radius: number,
  inventory: Inventory,
): Collectible | null => {
  const nearest = collectibles.reduce<Collectible | null>((selected, collectible) => {
    if (collectible.collected) return selected
    const distance = Math.hypot(position.x - collectible.x, position.y - collectible.y)
    if (distance > radius) return selected
    if (!selected || distance < Math.hypot(position.x - selected.x, position.y - selected.y)) return collectible
    return selected
  }, null)

  if (!nearest || inventory.add(nearest.itemId, nearest.quantity, nearest.maxStack) !== nearest.quantity) return null
  nearest.collected = true
  return nearest
}
