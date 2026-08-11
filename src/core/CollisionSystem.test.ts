import { describe, expect, it } from 'vitest'
import { CollisionSystem, type WallAABB } from './CollisionSystem'

const WALLS: WallAABB[] = [
  { minX: 10, maxX: 12, minZ: 0, maxZ: 20 },
  { minX: 0, maxX: 20, minZ: 10, maxZ: 12 },
  { minX: 0, maxX: 20, minZ: 0, maxZ: 2 },
  { minX: 0, maxX: 2, minZ: 0, maxZ: 20 },
]

function makeSystem(): CollisionSystem {
  const system = new CollisionSystem()
  system.setWalls(WALLS)
  return system
}

describe('CollisionSystem', () => {
  it('detecta colisão de círculo contra parede', () => {
    const system = makeSystem()
    expect(system.isBlocked(11, 5, 0.35)).toBe(true) // dentro da parede X
    expect(system.isBlocked(5, 11, 0.35)).toBe(true) // dentro da parede Z
    expect(system.isBlocked(9.7, 5, 0.35)).toBe(true) // a 0.3 da face X (< raio)
    expect(system.isBlocked(5, 5, 0.35)).toBe(false) // centro livre
  })

  it('bloqueia movimento de frente em X e encosta rente à parede', () => {
    const system = makeSystem()
    let pos = { x: 5, z: 5 }
    for (let i = 0; i < 100; i++) pos = system.resolvePosition(pos, { x: 0.3, z: 0 }, 0.35)
    expect(pos.x).toBeLessThan(10)
    expect(Math.abs(pos.x - (10 - 0.35 - 0.001))).toBeLessThan(0.01)
    expect(system.isBlocked(pos.x, pos.z, 0.35)).toBe(false)
  })

  it('bloqueia movimento de frente em Z', () => {
    const system = makeSystem()
    let pos = { x: 5, z: 5 }
    for (let i = 0; i < 100; i++) pos = system.resolvePosition(pos, { x: 0, z: 0.3 }, 0.35)
    expect(pos.z).toBeLessThan(10)
    expect(system.isBlocked(pos.x, pos.z, 0.35)).toBe(false)
  })

  it('não corta a quina ao andar na diagonal', () => {
    const system = makeSystem()
    let pos = { x: 8.2, z: 8.2 }
    for (let i = 0; i < 100; i++) pos = system.resolvePosition(pos, { x: 0.3, z: 0.3 }, 0.35)
    expect(system.isBlocked(pos.x, pos.z, 0.35)).toBe(false)
  })

  it('caminhada aleatória longa nunca termina dentro de parede', () => {
    const system = makeSystem()
    let pos = { x: 8, z: 8 }
    for (let i = 0; i < 10000; i++) {
      const dx = (Math.random() - 0.5) * 0.6
      const dz = (Math.random() - 0.5) * 0.6
      pos = system.resolvePosition(pos, { x: dx, z: dz }, 0.35)
      expect(system.isBlocked(pos.x, pos.z, 0.35)).toBe(false)
    }
  })

  it('slide paralelo à parede continua seguro', () => {
    const system = makeSystem()
    let pos = { x: 9.64, z: 3 }
    for (let i = 0; i < 5000; i++) pos = system.resolvePosition(pos, { x: 0.2, z: 0.2 }, 0.35)
    expect(system.isBlocked(pos.x, pos.z, 0.35)).toBe(false)
  })

  it('linha de visão é bloqueada por parede', () => {
    const system = makeSystem()
    expect(system.hasClearLine(3, 3, 9, 5)).toBe(true)
    expect(system.hasClearLine(3, 3, 15, 5)).toBe(false) // atravessa parede X
    expect(system.hasClearLine(3, 3, 5, 15)).toBe(false) // atravessa parede Z
  })
})
