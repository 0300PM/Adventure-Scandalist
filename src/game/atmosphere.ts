import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js'
import { gsap } from 'gsap'

export type Atmosphere = { destroy: () => void }

export const createAtmosphere = async (host: HTMLElement): Promise<Atmosphere> => {
  const app = new Application()
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: false, resolution: window.devicePixelRatio || 1, autoDensity: true })
  host.appendChild(app.canvas)
  const atlas = await Assets.load<Texture>('/Public/Tiled/Tiled_animation_32px.png')
  const campfire = new Sprite(new Texture({ source: atlas.source, frame: new Rectangle(0, 32, 32, 32) }))
  campfire.anchor.set(0.5, 0.86)
  campfire.eventMode = 'none'
  app.stage.addChild(campfire)

  const rescale = () => {
    const scaleX = app.screen.width / 800
    const scaleY = app.screen.height / 640
    campfire.position.set(602 * scaleX, 161 * scaleY)
    campfire.scale.set(scaleX * 0.8, scaleY * 0.8)
  }
  const resize = () => rescale()
  app.renderer.on('resize', resize)
  rescale()

  const flicker = gsap.timeline({ repeat: -1, yoyo: true })
  flicker.to(campfire, { alpha: 0.72, duration: 0.42, ease: 'sine.inOut' }).to(campfire, { alpha: 1, duration: 0.36, ease: 'sine.inOut' })
  const frames = [0, 32, 64, 96, 128].map((x) => new Texture({ source: atlas.source, frame: new Rectangle(x, 32, 32, 32) }))
  let frameIndex = 0
  let elapsed = 0
  const ticker = (ticker: { deltaMS: number }) => {
    elapsed += ticker.deltaMS
    if (elapsed >= 110) {
      elapsed %= 110
      frameIndex = (frameIndex + 1) % frames.length
      campfire.texture = frames[frameIndex]
    }
  }
  app.ticker.add(ticker)

  return {
    destroy: () => {
      flicker.kill()
      app.ticker.remove(ticker)
      app.renderer.off('resize', resize)
      app.destroy(true)
      frames.forEach((frame) => frame.destroy(false))
      atlas.destroy(false)
    },
  }
}
