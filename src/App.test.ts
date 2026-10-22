// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from './App.vue'
import { copy } from './i18n'
import { ECHO_TOTAL, SPAWN } from './game/world'
import type { GameCallbacks, GameSnapshot } from './game/adventure'
import type { InventorySlot } from './game/inventory'
import { createSurvivalNeeds, RECIPES } from './game/survival'
import { createRpgState } from './game/rpg'

const runtime: { callbacks: GameCallbacks | null } = { callbacks: null }

const emptyInventory = (): InventorySlot[] => Array.from({ length: 12 }, () => null)

const snapshot = (overrides: Partial<GameSnapshot> = {}): GameSnapshot => ({
  memories: 0,
  totalEchoes: ECHO_TOTAL,
  nearPickup: null,
  nearCamp: false,
  completed: false,
  region: 'shore',
  inventory: emptyInventory(),
  position: { ...SPAWN },
  collected: [],
  discovered: [],
  survival: createSurvivalNeeds(),
  equippedTool: null,
  droppedItems: [],
  nearbyNpc: null,
  rpg: createRpgState(),
  ...overrides,
})

vi.mock('./composables/createGameRuntime', () => ({
  createGameRuntime: async (_gameHost: HTMLElement, _atmosphereHost: HTMLElement, callbacks: GameCallbacks) => {
    runtime.callbacks = callbacks
    return {
      game: {
        start: vi.fn(),
        direction: vi.fn(),
        interact: vi.fn(),
        reset: vi.fn(),
        restore: vi.fn(),
        sailToContinent: vi.fn(() => {
          runtime.callbacks?.onSnapshot(snapshot({ region: 'continent' }))
          return true
        }),
        craft: vi.fn(() => 'crafted'),
        useItem: vi.fn(() => true),
        equipTool: vi.fn(),
        restAtCamp: vi.fn(() => true),
        meleeAttack: vi.fn(() => true),
        rangedAttack: vi.fn(() => true),
        dodge: vi.fn(() => true),
        chooseNpcDialogue: vi.fn(() => true),
        tradeWithNpc: vi.fn(() => true),
        unlockCharacterSkill: vi.fn(() => true),
        cameraView: () => ({ x: 0, y: 0, width: 800, height: 640 }),
        setGraphicsSettings: vi.fn(),
        setKeybinds: vi.fn(),
        setZoom: vi.fn((value: number) => value),
        destroy: vi.fn(),
      },
      setGraphicsSettings: vi.fn(),
      setKeybinds: vi.fn(),
      destroy: vi.fn(),
    }
  },
}))

vi.mock('./game/saveStore', () => ({
  createGameSaveStore: async () => ({
    loadSessions: () => [null, null, null],
    loadPreferences: () => ({ language: 'pl' as const }),
    saveSessions: async () => {},
    savePreferences: async () => {},
    exportJson: () => '{}',
    importJson: async () => ({ sessions: [null, null, null], preferences: { language: 'pl' as const } }),
    close: async () => {},
  }),
}))

let wrapper: VueWrapper | null = null

const mountApp = async () => {
  wrapper = mount(App, { attachTo: document.body })
  await flushPromises()
  await nextTick()
  runtime.callbacks?.onReady()
  runtime.callbacks?.onSnapshot(snapshot())
  await nextTick()
  return wrapper
}

beforeEach(() => {
  runtime.callbacks = null
  localStorage.clear()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('game shell', () => {
  it('boots into the menu and starts a new session from the first slot', async () => {
    const app = await mountApp()
    expect(app.find('.menu-board').exists()).toBe(true)

    await app.find('.menu-actions .game-button').trigger('click')
    await nextTick()
    const startButton = app.find('.session-actions .game-button')
    expect(startButton.exists()).toBe(true)
    await startButton.trigger('click')
    await nextTick()

    expect(app.find('.menu-board').exists()).toBe(false)
    expect(app.find('.game-hud').exists()).toBe(true)
    expect(app.find('.control-hint').exists()).toBe(false)
    expect(app.find('.hud-brand').exists()).toBe(false)
    expect(app.find('.game-hud').text()).not.toContain(copy.pl.title)
    expect(app.find('.game-hud').text()).toContain(copy.pl.objective)
  })

  it('sails to the next region from the chapter-one reward', async () => {
    const app = await mountApp()
    runtime.callbacks?.onSnapshot(snapshot({ completed: true, memories: 3 }))
    await nextTick()
    expect(app.find('.ending-card').exists()).toBe(true)
    await app.find('.ending-actions .game-button').trigger('click')
    await nextTick()
    expect(app.find('.ending-card').exists()).toBe(false)
    expect(app.find('.game-hud').text()).toContain(copy.pl.continentName)
    expect(app.find('.map-stage').classes()).toContain('continent-mode')
  })

  it('collapses and expands the vertical HUD actions with Tab without closing the current view', async () => {
    const app = await mountApp()
    await app.find('.menu-actions .game-button').trigger('click')
    await app.find('.session-actions .game-button').trigger('click')
    await nextTick()

    expect(app.find('.hud-action-panel').exists()).toBe(true)
    expect(app.findAll('.hud-tools .game-button').length).toBeGreaterThan(2)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    await nextTick()
    expect(app.find('.hud-action-panel').exists()).toBe(false)
    expect(app.find('.hud-actions-tab').exists()).toBe(true)
    expect(app.find('.game-hud').exists()).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    await nextTick()
    expect(app.find('.hud-action-panel').exists()).toBe(true)
    await app.find('.hud-actions-tab').trigger('click')
    await nextTick()
    expect(app.find('.hud-action-panel').exists()).toBe(false)
  })

  it('keeps the quick toolbar available and cycles open panels with Q and E', async () => {
    const app = await mountApp()
    await app.find('.menu-actions .game-button').trigger('click')
    await app.find('.session-actions .game-button').trigger('click')
    await nextTick()

    expect(app.findAll('.tool-toolbar .tool-slot')).toHaveLength(2)
    await app.find('.inventory-toggle').trigger('click')
    expect(app.find('.inventory-screen').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true }))
    await nextTick()
    expect(app.find('.lore-screen').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true }))
    await nextTick()
    expect(app.find('.survival-screen').exists()).toBe(true)
    expect(app.find('.crafting-board').exists()).toBe(true)
    expect(app.findAll('.recipe-card')).toHaveLength(RECIPES.length)
    expect(RECIPES.length).toBeGreaterThan(16)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true }))
    await nextTick()
    expect(app.find('.objective-list').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true }))
    await nextTick()
    expect(app.find('.crafting-board').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true }))
    await nextTick()
    expect(app.find('.lore-screen').exists()).toBe(true)
  })

  it('opens the RPG panel from the HUD and switches to the skill tree', async () => {
    const app = await mountApp()
    await app.find('.menu-actions .game-button').trigger('click')
    await nextTick()
    await app.find('.session-actions .game-button').trigger('click')
    await nextTick()
    await app.find('.rpg-toggle').trigger('click')
    await nextTick()
    expect(app.find('.rpg-screen').exists()).toBe(true)
    expect(app.text()).toContain(copy.pl.health)
    await app.findAll('.rpg-tabs .game-button')[1].trigger('click')
    await nextTick()
    expect(app.text()).toContain(copy.pl.skillTree)
  })

  it('announces chronicle discoveries in the active language', async () => {
    const app = await mountApp()
    await app.find('.menu-actions .game-button').trigger('click')
    await app.find('.session-actions .game-button').trigger('click')
    await nextTick()

    runtime.callbacks?.onDiscover('place-camp')
    await nextTick()
    expect(app.find('.toast-message').text()).toContain(copy.pl.loreUnlocked)
    expect(app.find('.toast-message').text()).toContain('Obóz Północny')
  })

  it('opens the chronicle over the ending card and restores the epilogue afterwards', async () => {
    const app = await mountApp()
    await app.find('.menu-actions .game-button').trigger('click')
    await app.find('.session-actions .game-button').trigger('click')
    await nextTick()

    runtime.callbacks?.onSnapshot(snapshot({
      completed: true,
      memories: ECHO_TOTAL,
      discovered: ['place-camp', 'history-name'],
    }))
    await nextTick()
    expect(app.find('.ending-card').exists()).toBe(true)

    const actions = app.findAll('.ending-actions .game-button')
    expect(actions).toHaveLength(3)
    await actions[2].trigger('click')
    await nextTick()
    expect(app.find('.lore-panel').exists()).toBe(true)
    expect(app.find('.ending-card').exists()).toBe(false)

    await app.find('.lore-header .game-button').trigger('click')
    await nextTick()
    expect(app.find('.lore-panel').exists()).toBe(false)
    expect(app.find('.ending-card').exists()).toBe(true)
  })
})
