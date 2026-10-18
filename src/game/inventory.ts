export type ItemStack = { itemId: string; quantity: number }
export type InventorySlot = ItemStack | null

export class Inventory {
  readonly capacity: number
  private slots: InventorySlot[]

  constructor(capacity = 12) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Inventory capacity must be a positive integer')
    this.capacity = capacity
    this.slots = Array.from({ length: capacity }, () => null)
  }

  canAdd(itemId: string, quantity = 1, maxStack = 99): boolean {
    if (!itemId.trim() || !Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(maxStack) || maxStack < 1) return false
    const stackCapacity = this.slots.reduce((total, slot) =>
      total + (slot?.itemId === itemId ? Math.max(0, maxStack - slot.quantity) : 0), 0)
    const emptyCapacity = this.slots.filter((slot) => slot === null).length * maxStack
    return stackCapacity + emptyCapacity >= quantity
  }

  add(itemId: string, quantity = 1, maxStack = 99): number {
    if (!this.canAdd(itemId, quantity, maxStack)) return 0

    let remaining = quantity
    for (const slot of this.slots) {
      if (!slot || slot.itemId !== itemId || slot.quantity >= maxStack) continue
      const added = Math.min(maxStack - slot.quantity, remaining)
      slot.quantity += added
      remaining -= added
      if (remaining === 0) return quantity
    }

    for (let index = 0; index < this.slots.length && remaining > 0; index += 1) {
      if (this.slots[index]) continue
      const added = Math.min(maxStack, remaining)
      this.slots[index] = { itemId, quantity: added }
      remaining -= added
    }

    return quantity
  }

  remove(itemId: string, quantity = 1): boolean {
    if (!Number.isInteger(quantity) || quantity < 1 || this.count(itemId) < quantity) return false

    let remaining = quantity
    for (let index = this.slots.length - 1; index >= 0 && remaining > 0; index -= 1) {
      const slot = this.slots[index]
      if (!slot || slot.itemId !== itemId) continue
      const removed = Math.min(slot.quantity, remaining)
      slot.quantity -= removed
      remaining -= removed
      if (slot.quantity === 0) this.slots[index] = null
    }

    return true
  }

  count(itemId: string): number {
    return this.slots.reduce((total, slot) => total + (slot?.itemId === itemId ? slot.quantity : 0), 0)
  }

  clear(): void {
    this.slots.fill(null)
  }

  restore(slots: InventorySlot[]): void {
    if (slots.length !== this.capacity || slots.some((slot) => slot !== null && (
      !slot.itemId.trim() || !Number.isInteger(slot.quantity) || slot.quantity < 1
    ))) throw new RangeError('Inventory snapshot is invalid')
    this.slots = slots.map((slot) => slot && { ...slot })
  }

  snapshot(): InventorySlot[] {
    return this.slots.map((slot) => slot && { ...slot })
  }
}
