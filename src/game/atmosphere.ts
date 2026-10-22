import { Application, Assets, Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import { gsap } from 'gsap'
import { BEACH_FIRE, CAMP } from './world'
import type { CameraView } from './adventure'

export type Atmosphere = { destroy: () => void; setQuality: (quality: 'low' | 'medium' | 'high') => void }

type Fire = {
  sprite: Sprite
  x: number
  y: number
  frames: Texture[]
  frameIndex: number
  elapsed: number
  scale: number
}

type Cloud = {
  sprite: Graphics
  x: number
  y: number
  width: number
  height: number
  direction: number
  phase: number
}

const CAMPFIRE_ROW = 64
const BEACHFIRE_ROW = 32
const FIRE_SCALE = 0.9
const CLOUD_SEEDS = [
  { x: 5, y: 132, width: 104, height: 46, direction: -1 },
  { x: 116, y: 88, width: 96, height: 42, direction: -1 },
  { x: 264, y: 79, width: 108, height: 48, direction: -1 },
  { x: 430, y: 77, width: 88, height: 40, direction: -1 },
  { x: 594, y: 90, width: 110, height: 46, direction: -1 },
  { x: 786, y: 142, width: 100, height: 44, direction: 1 },
  { x: 793, y: 296, width: 106, height: 46, direction: 1 },
  { x: 780, y: 464, width: 102, height: 44, direction: 1 },
  { x: 710, y: 557, width: 106, height: 46, direction: 1 },
  { x: 568, y: 584, width: 98, height: 42, direction: 1 },
  { x: 399, y: 593, width: 108, height: 46, direction: 1 },
  { x: 226, y: 590, width: 100, height: 43, direction: 1 },
  { x: 80, y: 557, width: 106, height: 46, direction: 1 },
  { x: 13, y: 438, width: 102, height: 44, direction: -1 },
  { x: 7, y: 280, width: 94, height: 42, direction: -1 },
]

export const createAtmosphere = async (host: HTMLElement, getCameraView: () => CameraView, initialQuality: 'low' | 'medium' | 'high' = 'high'): Promise<Atmosphere> => {
  const app = new Application()
  const resolutionFor = (quality: 'low' | 'medium' | 'high') => quality === 'low' ? 1 : Math.min(quality === 'medium' ? 1.25 : 1.75, window.devicePixelRatio || 1)
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: false, resolution: resolutionFor(initialQuality), autoDensity: true })
  host.appendChild(app.canvas)

  const atlas = await Assets.load<Texture>('/Public/Tiled/Tiled_animation_32px.png')
  const framesFor = (row: number) =>
    [0, 32, 64, 96, 128].map((x) => new Texture({ source: atlas.source, frame: new Rectangle(x, row, 32, 32) }))

  const makeFire = (x: number, y: number, row: number): Fire => {
    const frames = framesFor(row)
    const sprite = new Sprite(frames[0])
    sprite.anchor.set(0.5, 0.82)
    sprite.eventMode = 'none'
    app.stage.addChild(sprite)
    return { sprite, x, y, frames, frameIndex: 0, elapsed: Math.random() * 110, scale: FIRE_SCALE }
  }

  const makeCloud = (seed: typeof CLOUD_SEEDS[number], index: number): Cloud => {
    const sprite = new Graphics()
    const color = index % 3 === 0 ? 0xf0f3e9 : 0xe1ece9
    const alpha = 0.54
    sprite.ellipse(0, seed.height * 0.18, seed.width * 0.48, seed.height * 0.29).fill({ color, alpha })
    sprite.circle(-seed.width * 0.23, 0, seed.height * 0.31).fill({ color, alpha })
    sprite.circle(-seed.width * 0.03, -seed.height * 0.12, seed.height * 0.4).fill({ color, alpha })
    sprite.circle(seed.width * 0.2, seed.height * 0.02, seed.height * 0.34).fill({ color, alpha })
    sprite.circle(seed.width * 0.37, seed.height * 0.12, seed.height * 0.23).fill({ color, alpha })
    sprite.eventMode = 'none'
    app.stage.addChild(sprite)
    return { sprite, x: seed.x, y: seed.y, width: seed.width, height: seed.height, direction: seed.direction, phase: index * 0.76 }
  }

  const fires: Fire[] = [
    makeFire(CAMP.x, CAMP.y + 6, CAMPFIRE_ROW),
    makeFire(BEACH_FIRE.x, BEACH_FIRE.y + 6, BEACHFIRE_ROW),
  ]
  const clouds = CLOUD_SEEDS.map(makeCloud)

  const embers = Array.from({ length: 18 }, (_, index) => {
    const fire = fires[index % 2]
    const dot = new Sprite(Texture.WHITE)
    dot.tint = index % 2 === 0 ? 0xffc36b : 0xff9a4a
    dot.alpha = 0.8
    dot.visible = false
    app.stage.addChild(dot)
    return { fire, dot, phase: Math.random(), speed: 0.35 + Math.random() * 0.4, drift: (Math.random() - 0.5) * 22 }
  })

  let emberLimit = initialQuality === 'low' ? 0 : initialQuality === 'medium' ? 8 : 18
  const setQuality = (quality: 'low' | 'medium' | 'high') => {
    emberLimit = quality === 'low' ? 0 : quality === 'medium' ? 8 : 18
    app.renderer.resolution = resolutionFor(quality)
    app.renderer.resize(host.clientWidth, host.clientHeight)
  }
  let view = getCameraView()
  let scaleX = 1
  let scaleY = 1
  const cloudScatter = { value: view.portUnlocked ? 1 : 0 }
  let portUnlocked = Boolean(view.portUnlocked)
  let scatterTween: ReturnType<typeof gsap.to> | null = null

  const syncView = () => {
    const next = getCameraView()
    if (next.width > 0 && next.height > 0) view = next
    if (Boolean(view.portUnlocked) !== portUnlocked) {
      portUnlocked = Boolean(view.portUnlocked)
      scatterTween?.kill()
      scatterTween = gsap.to(cloudScatter, { value: portUnlocked ? 1 : 0, duration: 3.6, ease: 'power2.out' })
    }
    scaleX = app.screen.width / view.width
    scaleY = app.screen.height / view.height
  }

  const place = (fire: Fire) => {
    fire.sprite.position.set((fire.x - view.x) * scaleX, (fire.y - view.y) * scaleY)
    fire.sprite.scale.set(scaleX * fire.scale, scaleY * fire.scale)
  }

  const flicker = gsap.timeline({ repeat: -1, yoyo: true })
  flicker
    .to(fires.map((fire) => fire.sprite), { alpha: 0.78, duration: 0.42, ease: 'sine.inOut' })
    .to(fires.map((fire) => fire.sprite), { alpha: 1, duration: 0.36, ease: 'sine.inOut' })

  const ticker = (tickerInstance: { deltaMS: number }) => {
    syncView()
    for (const fire of fires) {
      place(fire)
      fire.elapsed += tickerInstance.deltaMS
      if (fire.elapsed >= 110) {
        fire.elapsed %= 110
        fire.frameIndex = (fire.frameIndex + 1) % fire.frames.length
        fire.sprite.texture = fire.frames[fire.frameIndex]
      }
    }

    clouds.forEach((cloud) => {
      cloud.phase += tickerInstance.deltaMS / 1000
      const wave = Math.sin(cloud.phase * 0.28) * 3
      const drift = cloud.direction * cloudScatter.value * cloud.width * 1.4
      cloud.sprite.position.set((cloud.x + wave + drift - view.x) * scaleX, (cloud.y + Math.cos(cloud.phase * 0.22) * 2 - view.y + cloudScatter.value * Math.sign(cloud.y - 320) * 12) * scaleY)
      cloud.sprite.scale.set(scaleX, scaleY)
      cloud.sprite.alpha = 1 - cloudScatter.value * 0.72
    })

    embers.forEach((ember, index) => {
      if (index >= emberLimit) {
        ember.dot.visible = false
        return
      }
      ember.phase += (tickerInstance.deltaMS / 1000) * ember.speed * 0.55
      if (ember.phase > 1) ember.phase -= 1
      const { fire, dot } = ember
      const rise = ember.phase * 74 * scaleY * fire.scale
      dot.visible = ember.phase < 0.86
      dot.alpha = Math.max(0, 1 - ember.phase) * 0.9
      dot.position.set(
        (fire.x - view.x) * scaleX + ember.drift * ember.phase * scaleX,
        (fire.y - 8 - view.y) * scaleY - rise,
      )
      const size = Math.max(1.6, scaleX * 1.4)
      dot.width = size
      dot.height = size
    })
  }
  app.ticker.add(ticker)

  return {
    setQuality,
    destroy: () => {
      flicker.kill()
      scatterTween?.kill()
      app.ticker.remove(ticker)
      app.destroy(true)
      clouds.forEach((cloud) => cloud.sprite.destroy())
      fires.forEach((fire) => fire.frames.forEach((frame) => frame.destroy(false)))
      atlas.destroy(false)
    },
  }
}
