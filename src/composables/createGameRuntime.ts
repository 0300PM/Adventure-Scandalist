import type { AdventureGame, GameCallbacks } from '../game/adventure'
import type { Atmosphere } from '../game/atmosphere'

export type GameRuntime = {
  game: AdventureGame
  destroy: () => void
}

export const createGameRuntime = async (
  gameHost: HTMLElement,
  atmosphereHost: HTMLElement,
  callbacks: GameCallbacks,
): Promise<GameRuntime> => {
  const [{ createAdventureGame }, { createAtmosphere }] = await Promise.all([
    import('../game/adventure'),
    import('../game/atmosphere'),
  ])
  const game = createAdventureGame(gameHost, callbacks)
  let atmosphere: Atmosphere | null = null
  let destroyed = false
  void createAtmosphere(atmosphereHost).then((layer) => {
    if (destroyed) layer.destroy()
    else atmosphere = layer
  }).catch(() => { atmosphere = null })
  return {
    game,
    destroy: () => {
      destroyed = true
      game.destroy()
      atmosphere?.destroy()
    },
  }
}
