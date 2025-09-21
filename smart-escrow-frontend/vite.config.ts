import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  optimizeDeps: {
    exclude: ['@meshsdk/core', '@meshsdk/react'],
    include: ['lodash', 'bech32']
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: [
      {
        find: /^lodash\/(.+)\.js$/,
        replacement: 'lodash/$1'
      },
      {
        find: 'buffer',
        replacement: 'buffer'
      }
    ]
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/bech32/, /lodash/]
    }
  }
})
