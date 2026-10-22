import type { AdventureGame, GameCallbacks, GameGraphicsSettings } from '../game/adventure'
import type { Atmosphere } from '../game/atmosphere'
import { DEFAULT_KEYBINDS, type GameKeybinds } from '../game/sessions'

export type GameRuntime = {
  game: AdventureGame
  setGraphicsSettings: (settings: GameGraphicsSettings) => void
  setKeybinds: (keybinds: GameKeybinds) => void
  destroy: () => void
}

export const createGameRuntime = async (
  gameHost: HTMLElement,
  atmosphereHost: HTMLElement,
  callbacks: GameCallbacks,
  initialSettings: GameGraphicsSettings = { quality: 'high', shadows: true },
  initialKeybinds: GameKeybinds = DEFAULT_KEYBINDS,
): Promise<GameRuntime> => {
  const [{ createAdventureGame }, { createAtmosphere }] = await Promise.all([
    import('../game/adventure'),
    import('../game/atmosphere'),
  ])
  let settings = { ...initialSettings }
  const game = createAdventureGame(gameHost, callbacks, settings, initialKeybinds)
  let atmosphere: Atmosphere | null = null
  let destroyed = false
  void createAtmosphere(atmosphereHost, () => game.cameraView(), settings.quality).then((layer) => {
    if (destroyed) layer.destroy()
    else {
      atmosphere = layer
      atmosphere.setQuality(settings.quality)
    }
  }).catch(() => { atmosphere = null })
  return {
    game,
    setGraphicsSettings: (nextSettings) => {
      settings = { ...nextSettings }
      game.setGraphicsSettings(settings)
      atmosphere?.setQuality(settings.quality)
    },
    setKeybinds: (keybinds) => game.setKeybinds(keybinds),
    destroy: () => {
      destroyed = true
      game.destroy()
      atmosphere?.destroy()
    },
  }
}
