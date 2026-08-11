/**
 * Setup de testes (node): polyfill mínimo de localStorage, usado por
 * saveSystem/settings. Em ambiente real o navegador fornece a API.
 */
import { beforeEach } from 'vitest'

const memoryStore = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => (memoryStore.has(key) ? memoryStore.get(key)! : null),
    setItem: (key: string, value: string) => {
      memoryStore.set(key, String(value))
    },
    removeItem: (key: string) => {
      memoryStore.delete(key)
    },
    clear: () => {
      memoryStore.clear()
    },
    get length() {
      return memoryStore.size
    },
  },
  configurable: true,
})

// Limpa o armazenamento entre os testes.
beforeEach(() => {
  memoryStore.clear()
})
