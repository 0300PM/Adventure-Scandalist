// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GameButton from './GameButton.vue'
import LoreModal from './LoreModal.vue'
import StoryModal from './StoryModal.vue'
import GameHud from './GameHud.vue'
import ToolToolbar from './ToolToolbar.vue'
import MainMenu from './MainMenu.vue'
import PauseModal from './PauseModal.vue'
import EndingModal from './EndingModal.vue'
import InventoryModal from './InventoryModal.vue'
import RpgModal from './RpgModal.vue'
import { DEFAULT_KEYBINDS, emptySessions } from '../game/sessions'
import { copy } from '../i18n'
import { findLoreEntry, LORE_ENTRIES } from '../game/lore'
import type { GameSnapshot } from '../game/adventure'
import { createSurvivalNeeds, RECIPES } from '../game/survival'
import { createRpgState } from '../game/rpg'

const t = copy.pl

describe('GameButton', () => {
  it('renders one shared pattern for main buttons and black small buttons', () => {
    const main = mount(GameButton, { props: { wide: true }, slots: { default: 'Nowa gra' } })
    expect(main.classes()).toContain('game-button--md')
    expect(main.classes()).toContain('game-button--primary')
    expect(main.text()).toBe('Nowa gra')

    const small = mount(GameButton, { props: { size: 'sm' }, slots: { default: 'Usuń' } })
    expect(small.classes()).toContain('game-button--sm')
    expect(small.classes()).not.toContain('game-button--md')

    const icon = mount(GameButton, { props: { size: 'icon', ariaLabel: 'Pauza' }, slots: { default: 'Ⅱ' } })
    expect(icon.classes()).toContain('game-button--icon')
    expect(icon.attributes('aria-label')).toBe('Pauza')
  })

  it('uses a clear close mark and emits clicks', async () => {
    const close = mount(GameButton, { props: { size: 'icon', skin: 'close' } })
    expect(close.find('.game-button__close-mark').text()).toBe('×')
    expect(close.classes()).toContain('game-button--icon')

    const button = mount(GameButton, { slots: { default: 'Dalej' } })
    await button.trigger('click')
    expect(button.emitted('click')).toHaveLength(1)
  })
})

describe('LoreModal', () => {
  it('shows sealed entries until they are discovered', () => {
    const locked = mount(LoreModal, { props: { t, language: 'pl', discovered: [] } })
    expect(locked.text()).toContain(t.chronicleLocked)
    expect(locked.text()).not.toContain('Obóz Północny')

    const unlocked = mount(LoreModal, {
      props: { t, language: 'pl', discovered: LORE_ENTRIES.map((entry) => entry.id) },
    })
    expect(unlocked.text()).toContain('Obóz Północny')
    expect(unlocked.find('.lore-footer').text()).toContain(t.chronicleComplete)
  })

  it('opens an entry body on click and switches categories', async () => {
    const wrapper = mount(LoreModal, {
      props: { t, language: 'pl', discovered: ['place-camp', 'echo-oak'] },
    })
    const firstEntry = wrapper.find('.lore-entry-head')
    await firstEntry.trigger('click')
    expect(wrapper.text()).toContain('północnym cyplu')

    const tabs = wrapper.findAll('.lore-tabs .game-button')
    expect(tabs.length).toBe(5)
    await tabs[2].trigger('click')
    expect(wrapper.text()).toContain('Echo Dębu')
  })
})

describe('StoryModal', () => {
  it('renders the lore entry in the active language and closes', async () => {
    const entry = findLoreEntry('echo-flame')
    expect(entry).toBeTruthy()
    const wrapper = mount(StoryModal, {
      props: {
        t,
        language: 'pl',
        entry: entry!,
        itemIcon: '/Public/icon.png',
        itemName: 'Echo pamięci',
      },
    })
    expect(wrapper.text()).toContain(entry!.title.pl)
    expect(wrapper.text()).toContain(entry!.body.pl)
    await wrapper.find('.game-button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('GameHud', () => {
  it('shows echo progress, chronicle and inventory controls', async () => {
    const snapshot: GameSnapshot = {
      memories: 2,
      totalEchoes: 3,
      nearPickup: null,
      nearCamp: false,
      completed: false,
      region: 'shore',
      inventory: Array.from({ length: 12 }, () => null),
      position: { x: 376, y: 328 },
      collected: ['shore-echo', 'oak-echo'],
      discovered: ['place-camp'],
      survival: createSurvivalNeeds(),
      equippedTool: null,
      droppedItems: [],
      nearbyNpc: null,
      rpg: createRpgState(),
    }
    const wrapper = mount(GameHud, {
      props: { t, language: 'pl', started: true, snapshot, survival: snapshot.survival, inventoryOpen: false, chronicleOpen: false, actionsOpen: true },
    })
    expect(wrapper.findAll('.memory-pip.found')).toHaveLength(2)
    expect(wrapper.find('.hud-brand').exists()).toBe(false)
    expect(wrapper.find('.progress-art').exists()).toBe(false)
    expect(wrapper.find('.quest-card .gui-frame').exists()).toBe(true)
    expect(wrapper.findAll('.vitals .vital')).toHaveLength(3)
    expect(wrapper.find('.vital-health').exists()).toBe(true)
    expect(wrapper.find('.vital-stamina').exists()).toBe(true)
    expect(wrapper.find('.vital-hunger').exists()).toBe(true)
    expect(wrapper.find('.vital-mana').exists()).toBe(false)
    expect(wrapper.find('.vitals').classes()).toContain('vitals--sated')
    expect(wrapper.find('.chronicle-toggle').exists()).toBe(true)
    expect(wrapper.find('.chronicle-toggle').text()).toBe('')
    expect(wrapper.find('.chronicle-toggle img').exists()).toBe(true)
    expect(wrapper.find('.inventory-toggle').exists()).toBe(true)
    expect(wrapper.find('.day-cycle').text()).toContain('08:00')
    expect(wrapper.find('.day-cycle-frame').attributes('src')).toContain('3%20Item%20Holder')
    expect(wrapper.find('.day-cycle-icon').attributes('src')).toContain('Content/7 Day & Night Cycle')
    expect(wrapper.find('.vitals-body').exists()).toBe(true)
    await wrapper.find('.chronicle-toggle').trigger('click')
    expect(wrapper.emitted('toggle-chronicle')).toHaveLength(1)
    expect(wrapper.find('.zoom-controls').exists()).toBe(false)
  })
})

describe('RpgModal', () => {
  it('shows remembered dialogue, accepted quests and combat controls', async () => {
    const rpg = createRpgState()
    rpg.social.choices.tala = 'share-herbs'
    rpg.social.acceptedQuests.push('herbal-aid')
    rpg.social.questProgress['herbal-aid'] = 2
    const props = {
      t,
      language: 'pl' as const,
      mode: 'dialogue' as const,
      npcId: 'tala',
      rpg,
      inventory: Array.from({ length: 12 }, () => null),
      recipes: RECIPES,
      region: 'shore' as const,
      day: 0,
      position: { x: 304, y: 510 },
      itemIcon: (itemId: string) => `/icon/${itemId}.png`,
      itemName: (itemId: string) => itemId,
      recipeStatus: () => 'crafted' as const,
    }
    const dialogue = mount(RpgModal, { props })
    expect(dialogue.text()).toContain(t.rememberedChoice)
    expect(dialogue.text()).toContain('2 / 3')
    await dialogue.findAll('.dialogue-choices .game-button')[1].trigger('click')
    expect(dialogue.emitted('dialogue')).toHaveLength(1)

    const combat = mount(RpgModal, { props: { ...props, mode: 'combat' as const, npcId: null } })
    await combat.find('.combat-actions .game-button').trigger('click')
    expect(combat.emitted('attack')?.[0]).toEqual(['melee'])
  })
})

describe('ToolToolbar', () => {
  it('shows harvesting tools, marks the equipped tool and disables tools not in the pack', async () => {
    const wrapper = mount(ToolToolbar, {
      props: {
        t,
        inventory: [{ itemId: 'axe_tool', quantity: 1 }, null],
        equippedTool: 'axe_tool',
        itemIcon: (itemId: string) => `/icons/${itemId}.png`,
        itemName: (itemId: string) => itemId,
      },
    })
    const tools = wrapper.findAll('.tool-slot')
    expect(tools).toHaveLength(2)
    expect(tools[0].attributes('aria-pressed')).toBe('true')
    expect(tools[0].find('img').attributes('src')).toBe('/icons/axe_tool.png')
    expect(tools[1].attributes('disabled')).toBeDefined()
    await tools[0].trigger('click')
    expect(wrapper.emitted('equip')?.[0]).toEqual(['axe_tool'])
  })
})

describe('shared button pattern across screens', () => {
  const menu = () => mount(MainMenu, {
    props: {
      t,
      language: 'pl',
      sessions: emptySessions(),
      gameReady: true,
      canContinue: false,
      fullscreenActive: false,
      graphicsQuality: 'high',
      shadows: true,
      zoom: 1,
      keybinds: { ...DEFAULT_KEYBINDS },
    },
  })

  it('uses GameButton for every menu action and keeps one md pattern', async () => {
    const wrapper = menu()
    const actions = wrapper.findAll('.menu-actions .game-button')
    expect(actions).toHaveLength(4)
    for (const action of actions) {
      expect(action.classes()).toContain('game-button')
      expect(action.classes()).toContain('game-button--md')
      expect(action.classes()).toContain('game-button--wide')
    }
    expect(wrapper.find('.menu-language').classes()).toContain('game-button--icon')
    expect(wrapper.find('.menu-controls').exists()).toBe(false)

    await wrapper.find('.menu-actions .game-button').trigger('click')
    expect(wrapper.findAll('.session-card')).toHaveLength(3)
    expect(wrapper.find('.menu-back').classes()).toContain('game-button--md')
  })

  it('exposes language and graphics settings while keeping zoom scroll-only', async () => {
    const wrapper = menu()
    await wrapper.findAll('.menu-actions .game-button')[2].trigger('click')
    const rows = wrapper.findAll('.settings-view .setting-row')
    expect(rows).toHaveLength(7)
    await rows[2].find('button').trigger('click')
    await rows[3].find('button').trigger('click')
    expect(rows[4].text()).toContain('100%')
    expect(rows[4].find('button').exists()).toBe(false)
    expect(wrapper.emitted('cycle-graphics-quality')).toHaveLength(1)
    expect(wrapper.emitted('toggle-shadows')).toHaveLength(1)
    expect(wrapper.emitted('zoom-by')).toBeUndefined()
  })

  it('captures a replacement key in the settings controls page', async () => {
    const wrapper = menu()
    await wrapper.findAll('.menu-actions .game-button')[2].trigger('click')
    await wrapper.findAll('.settings-view .setting-row')[5].find('button').trigger('click')
    await wrapper.find('.keybind-view .keybind-row button').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true, cancelable: true }))
    expect(wrapper.emitted('set-keybind')?.[0]).toEqual(['moveUp', 'Z'])
    wrapper.unmount()
  })

  it('keeps pause and ending actions on the same pattern', () => {
    const pause = mount(PauseModal, { props: { t } })
    expect(pause.findAll('.game-button')).toHaveLength(2)
    for (const button of pause.findAll('.game-button')) {
      expect(button.classes()).toContain('game-button--md')
      expect(button.classes()).toContain('game-button--wide')
    }

    const ending = mount(EndingModal, { props: { t, relicFound: true, region: 'shore' } })
    expect(ending.findAll('.ending-actions .game-button')).toHaveLength(3)
    expect(ending.text()).toContain(t.epilogueRelic)
    expect(ending.text()).toContain(t.boatReward)
    ending.findAll('.ending-actions .game-button')[0].trigger('click')
    expect(ending.emitted('sail')).toHaveLength(1)
  })

  it('keeps the inventory close control black and small', () => {
    const wrapper = mount(InventoryModal, {
      props: {
        t,
        snapshot: {
          memories: 0,
          totalEchoes: 3,
          nearPickup: null,
          nearCamp: false,
          completed: false,
          region: 'shore',
          inventory: Array.from({ length: 12 }, () => null),
          position: { x: 376, y: 328 },
          collected: [],
          discovered: [],
          survival: createSurvivalNeeds(),
          equippedTool: null,
          droppedItems: [],
          nearbyNpc: null,
          rpg: createRpgState(),
        },
        selectedSlot: 0,
        selectedInventoryItem: null,
        itemIcon: (itemId: string) => `/icon/${itemId}.png`,
        itemName: (itemId: string) => itemId,
        equippedTool: null,
      },
    })
    const close = wrapper.find('.asset-close')
    expect(close.classes()).toContain('game-button--icon')
    expect(close.classes()).toContain('game-button--close')
    expect(wrapper.findAll('.item-slot')).toHaveLength(12)
    expect(wrapper.find('.inventory-help').exists()).toBe(false)
  })
})
