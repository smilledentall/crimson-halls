import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // O Three.js é o grosso do bundle; separá-lo mantém o cache dos assets
    // estáveis quando o código do jogo muda.
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three') || id.includes('three/examples/jsm')) return 'three'
          return undefined
        },
      },
    },
  },
})
