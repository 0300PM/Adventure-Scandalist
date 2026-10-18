import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const selectedAssets = [
  'Tiled/Tiled_map.png',
  'Tiled/Tiled_animation_32px.png',
  'Characters/Character_1/Idle.png',
  'Characters/Character_1/Walk.png',
  'png_assets/cave_rocks/cave_rock5.png',
  'png_assets/middle_lane_rocks1/middle_lane_rock1_5.png',
  'png_assets/snowy_rocks1/snowy_rock5.png',
  'png_assets/canyon_rocks/canyon_rock5.png',
  'gui/paperUISystem/Sprites/Book Desk/1.png',
  'gui/paperUISystem/Sprites/Book Desk/2.png',
  'gui/paperUISystem/Sprites/Book Desk/4.png',
  'gui/pocket_inv/Sprites/Content/Power Hub/1.png',
  'gui/pocket_inv/Sprites/Content/Holders/3.png',
  'gui/pocket_inv/Sprites/Content/Holders/10.png',
  'gui/pocket_inv/Sprites/Content/Items/0.png',
  'gui/pocket_inv/Sprites/Content/Items/1.png',
  'gui/pocket_inv/Sprites/Content/UI Buttons/0.png',
  'gui/pocket_inv/Sprites/Content/UI Buttons/5.png',
  'gui/pocket_inv/Sprites/Content/UI Buttons/6.png',
  'gui/pocket_inv/Sprites/Content/UI Buttons/8.png',
  'gui/pocket_inv/Sprites/Content/UI Buttons/10.png',
  'gui/pocket_inv/Sprites/Content/Compass/0.png',
  'gui/pocket_inv/Sprites/Content/Progress Bars/0.png',
]

const copyGameAssets = (): Plugin => ({
  name: 'copy-selected-game-assets',
  closeBundle() {
    for (const asset of selectedAssets) {
      const destination = resolve('dist/Public', asset)
      mkdirSync(dirname(destination), { recursive: true })
      copyFileSync(resolve('Public', asset), destination)
    }
  },
})

export default defineConfig({
  publicDir: false,
  plugins: [vue(), tailwindcss(), copyGameAssets()],
  server: { host: '0.0.0.0', allowedHosts: true },
  build: { chunkSizeWarningLimit: 1600 },
})
