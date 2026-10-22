<script setup lang="ts">
import { computed } from 'vue'
import GameButton from './GameButton.vue'
import type { GameSnapshot } from '../game/adventure'
import type { Copy, Language } from '../i18n'
import { getDayCycle, type DayPhase, type SurvivalNeeds } from '../game/survival'
import { conditionTier, hungerTier, staminaRatio } from '../game/vitals'

const props = defineProps<{
  t: Copy
  language: Language
  started: boolean
  snapshot: GameSnapshot
  survival: SurvivalNeeds
  inventoryOpen: boolean
  chronicleOpen: boolean
  actionsOpen: boolean
}>()

defineEmits<{
  'cycle-language': []
  'toggle-inventory': []
  'toggle-chronicle': []
  'open-craft': []
  'open-tasks': []
  'toggle-pause': []
  'open-rpg': []
  'toggle-actions': []
}>()

const phaseLabels: Record<DayPhase, keyof Copy> = {
  dawn: 'phaseDawn',
  day: 'phaseDay',
  dusk: 'phaseDusk',
  night: 'phaseNight',
}

const health = computed(() => props.snapshot.rpg.player.health / props.snapshot.rpg.player.maxHealth)
const stamina = computed(() => staminaRatio(props.snapshot.rpg.player.stamina, props.snapshot.rpg.player.maxStamina))
const condition = computed(() => conditionTier(props.snapshot.rpg.player.health, props.snapshot.rpg.player.maxHealth))
const hunger = computed(() => hungerTier(props.survival.hunger))
const hungerLabel = computed(() => ({
  sated: props.t.hungerSated,
  steady: props.t.hungerSteady,
  hungry: props.t.hungerHungry,
  starving: props.t.hungerStarving,
}[hunger.value]))
</script>

<template>
  <header class="game-hud">
    <div class="hud-left">
      <section class="quest-card">
        <img class="gui-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/6 Player HUD/1.png" alt="">
        <div class="quest-content">
          <div class="quest-overline"><span>{{ t.objective }}</span><span class="quest-status">{{ started ? t.active : t.ready }}</span></div>
          <h2>{{ snapshot.region === 'continent' ? (snapshot.memories === snapshot.totalEchoes ? t.continentReturn : t.continentQuest) : (snapshot.memories === snapshot.totalEchoes ? t.return : t.quest) }}</h2>
          <p>{{ snapshot.region === 'continent' ? t.continentIntro : (snapshot.memories === snapshot.totalEchoes ? t.findFire : t.discover) }}</p>
          <div class="quest-progress">
            <div class="memory-pips" :aria-label="t.progress">
              <span v-for="index in snapshot.totalEchoes" :key="index" class="memory-pip" :class="{ found: snapshot.memories >= index }">
                <img class="holder-art" src="/Public/gui/paperUISystem/Sprites/Content/5 Holders/1.png" alt="">
                <img v-if="snapshot.memories >= index" class="pip-item" src="/Public/gui/paperUISystem/Sprites/Content/1 Items/1.png" alt="">
              </span>
            </div>
            <span class="inventory-count">{{ snapshot.memories }} <small>{{ t.counter }}</small></span>
          </div>
        </div>
      </section>
    </div>
    <div class="hud-topline">
      <span class="day-cycle" :aria-label="`${t.dayLabel} ${getDayCycle(survival.elapsedSeconds).day} · ${t[phaseLabels[getDayCycle(survival.elapsedSeconds).phase]]} · ${getDayCycle(survival.elapsedSeconds).time}`">
        <img class="day-cycle-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/3 Item Holder/1.png" alt="">
        <span class="day-cycle-body">
          <img class="day-cycle-icon" :src="getDayCycle(survival.elapsedSeconds).phase === 'night' ? '/Public/gui/paperUISystem/Sprites/Day & Night Cycle/Full/4 Night/1.png' : '/Public/gui/paperUISystem/Sprites/Content/7 Day & Night Cycle/16.png'" alt="">
          <span class="day-cycle-copy"><small>{{ t.dayLabel }} {{ getDayCycle(survival.elapsedSeconds).day }} · {{ t[phaseLabels[getDayCycle(survival.elapsedSeconds).phase]] }}</small><strong>{{ getDayCycle(survival.elapsedSeconds).time }}</strong></span>
        </span>
      </span>
      <span class="map-label"><img src="/Public/gui/paperUISystem/Sprites/Content/2 Icons/1.png" alt="">{{ snapshot.region === 'continent' ? t.continentName : t.map }}</span>
    </div>
    <div class="hud-actions">
      <div v-if="actionsOpen" class="hud-action-panel">
        <div class="hud-tools">
          <GameButton class="language-button" size="icon" :aria-label="t.locale" @click="$emit('cycle-language')">{{ language.toUpperCase() }}</GameButton>
          <GameButton class="chronicle-toggle" size="icon" :aria-label="chronicleOpen ? t.chronicleClose : t.chronicleOpen" @click="$emit('toggle-chronicle')"><img src="/Public/gui/paperUISystem/Sprites/Content/2 Icons/1.png" alt=""></GameButton>
          <GameButton class="tasks-toggle" size="icon" :aria-label="t.survivalTasks" @click="$emit('open-tasks')"><img src="/Public/gui/paperUISystem/Sprites/Content/2 Icons/12.png" alt=""></GameButton>
          <GameButton class="craft-toggle" size="icon" :aria-label="t.survivalCraft" @click="$emit('open-craft')"><img src="/Public/gui/paperUISystem/Sprites/Content/2 Icons/4.png" alt=""></GameButton>
          <GameButton v-if="started" class="rpg-toggle" size="icon" :aria-label="t.rpgTitle" @click="$emit('open-rpg')">✦</GameButton>
          <GameButton v-if="started && !snapshot.completed" class="inventory-toggle" size="icon" :aria-label="inventoryOpen ? t.inventoryClose : t.inventoryToggle" @click="$emit('toggle-inventory')"><img src="/Public/gui/paperUISystem/Sprites/Content/2 Icons/9.png" alt=""></GameButton>
          <GameButton v-if="started && !snapshot.completed" class="pause-button" size="icon" :aria-label="t.pause" @click="$emit('toggle-pause')"><img src="/Public/gui/paperUISystem/Sprites/Content/2 Icons/3.png" alt=""></GameButton>
        </div>
      </div>
      <GameButton class="hud-actions-tab" size="icon" :aria-label="actionsOpen ? t.hideHudActions : t.showHudActions" :aria-expanded="actionsOpen" @click="$emit('toggle-actions')">{{ actionsOpen ? '›' : '‹' }}</GameButton>
    </div>
    <div class="vitals" :class="[`vitals--${condition}`, `vitals--${hunger}`]" :aria-label="t.vitalsTitle">
      <img class="gui-frame" src="/Public/gui/paperUISystem/Sprites/Paper UI Pack/Plain/6 Player HUD/1.png" alt="">
      <div class="vitals-body">
        <div class="vital vital-health" :class="{ 'is-low': health <= 0.35, 'is-critical': health <= 0.2 }"><span>{{ t.health }}<em>{{ Math.round(health * 100) }}%</em></span><div class="vital-track"><i :style="{ width: `${health * 100}%` }"></i></div></div>
        <div class="vital vital-stamina" :class="{ 'is-low': stamina <= 0.25, 'is-critical': stamina <= 0.001 }"><span>{{ t.stamina }}<em>{{ Math.round(stamina * 100) }}%</em></span><div class="vital-track"><i :style="{ width: `${stamina * 100}%` }"></i></div></div>
        <div class="vital vital-hunger" :class="{ 'is-low': hunger === 'hungry' || hunger === 'starving' }"><span>{{ t.hunger }}<em>{{ hungerLabel }}</em></span><div class="vital-track"><i :style="{ width: `${survival.hunger}%` }"></i></div></div>
      </div>
    </div>
    <div v-if="health <= 0.15 && health > 0" class="critical-health-vignette" aria-hidden="true"></div>
  </header>
</template>
