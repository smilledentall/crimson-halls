import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { Engine } from './core/Engine'
import { useGameStore } from './state/gameStore'
import { WEAPON_ORDER } from './weapons/weapons.config'

// Log de depuração (etapa de validação): mostra mudanças de estado no console.
useGameStore.subscribe((state, prev) => {
  const changed: string[] = []
  if (state.phase !== prev.phase) changed.push(`phase=${state.phase}`)
  if (state.health !== prev.health) changed.push(`health=${state.health}`)
  if (state.currentWeaponId !== prev.currentWeaponId)
    changed.push(`weapon=${state.currentWeaponId}`)
  if (state.kills !== prev.kills) changed.push(`kills=${state.kills}`)
  for (const id of WEAPON_ORDER) {
    if (state.ammo[id] !== prev.ammo[id]) changed.push(`ammo.${id}=${state.ammo[id]}`)
  }
  if (changed.length > 0) console.log('[store]', changed.join(', '))
})

const engine = new Engine()
const container = document.getElementById('root')

// Acesso direto ao editor via hash: /#editor
if (window.location.hash === '#editor') useGameStore.getState().setPhase('editor')

if (container) {
  createRoot(container).render(createElement(App, { engine }))
}
