import { describe, expect, it } from 'vitest'
import { collectNearbyItem, type Collectible } from './collectibles'
import { Inventory } from './inventory'

const createPickup = (id: string, x: number, itemId = 'memory-echo'): Collectible => ({
  id,
  itemId,
  x,
  y: 50,
  quantity: 1,
  maxStack: 99,
  collected: false,
})

describe('inventory', () => {
  it('stacks matching items and preserves slot capacity', () => {
    const inventory = new Inventory(3)

    expect(inventory.add('memory-echo', 2)).toBe(2)
    expect(inventory.add('memory-echo', 1)).toBe(1)
    expect(inventory.snapshot()).toEqual([{ itemId: 'memory-echo', quantity: 3 }, null, null])
  })

  it('supports unique non-stackable items in separate slots', () => {
    const inventory = new Inventory(2)

    expect(inventory.add('bronze-key', 1, 1)).toBe(1)
    expect(inventory.add('bronze-key', 1, 1)).toBe(1)
    expect(inventory.snapshot()).toEqual([
      { itemId: 'bronze-key', quantity: 1 },
      { itemId: 'bronze-key', quantity: 1 },
    ])
  })

  it('rejects full-stack overflow without partially adding it', () => {
    const inventory = new Inventory(1)
    inventory.add('memory-echo', 2, 2)

    expect(inventory.canAdd('memory-echo', 1, 2)).toBe(false)
    expect(inventory.add('memory-echo', 1, 2)).toBe(0)
    expect(inventory.count('memory-echo')).toBe(2)
  })

  it('removes items atomically and frees empty slots', () => {
    const inventory = new Inventory(2)
    inventory.add('memory-echo', 3, 2)

    expect(inventory.remove('memory-echo', 4)).toBe(false)
    expect(inventory.count('memory-echo')).toBe(3)
    expect(inventory.remove('memory-echo', 3)).toBe(true)
    expect(inventory.snapshot()).toEqual([null, null])
  })

  it('restores validated inventory snapshots', () => {
    const inventory = new Inventory(2)
    inventory.restore([{ itemId: 'memory-echo', quantity: 2 }, null])
    expect(inventory.count('memory-echo')).toBe(2)
    expect(inventory.snapshot()).toEqual([{ itemId: 'memory-echo', quantity: 2 }, null])
    expect(() => inventory.restore([{ itemId: 'twig', quantity: 0 }, null])).toThrow(RangeError)
    expect(() => inventory.restore([null])).toThrow(RangeError)
  })

  it('rejects invalid capacities and item stacks', () => {
    expect(() => new Inventory(0)).toThrow(RangeError)
    const inventory = new Inventory(2)

    expect(inventory.add('', 1)).toBe(0)
    expect(inventory.add('twig', 0)).toBe(0)
    expect(inventory.add('twig', 1.5)).toBe(0)
    expect(inventory.add('twig', 1, 0)).toBe(0)
  })
})

describe('collectible items', () => {
  it('collects the nearest item in range and adds it to the inventory', () => {
    const inventory = new Inventory(4)
    const items = [createPickup('far', 68), createPickup('near', 55)]
    const collected = collectNearbyItem({ x: 50, y: 50 }, items, 20, inventory)

    expect(collected?.id).toBe('near')
    expect(inventory.count('memory-echo')).toBe(1)
    expect(items[1].collected).toBe(true)
    expect(items[0].collected).toBe(false)
  })

  it('leaves an item available when the inventory has no room', () => {
    const inventory = new Inventory(1)
    inventory.add('old-key')
    const item = createPickup('echo', 50)

    expect(collectNearbyItem({ x: 50, y: 50 }, [item], 10, inventory)).toBeNull()
    expect(item.collected).toBe(false)
  })

  it('does not collect items beyond the interaction radius or more than once', () => {
    const inventory = new Inventory(2)
    const item = createPickup('echo', 70)

    expect(collectNearbyItem({ x: 50, y: 50 }, [item], 10, inventory)).toBeNull()
    item.x = 50
    expect(collectNearbyItem({ x: 50, y: 50 }, [item], 10, inventory)).toBe(item)
    expect(collectNearbyItem({ x: 50, y: 50 }, [item], 10, inventory)).toBeNull()
    expect(inventory.count('memory-echo')).toBe(1)
  })
})
