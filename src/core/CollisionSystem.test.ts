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

  describe('multi-andar (floorId)', () => {
    const FLOOR_1: WallAABB = { minX: 10, maxX: 12, minZ: 0, maxZ: 20, floorId: 'f1' }
    const FLOOR_2: WallAABB = { minX: 14, maxX: 16, minZ: 0, maxZ: 20, floorId: 'f2' }

    function makeFloors(): CollisionSystem {
      const system = new CollisionSystem()
      system.setWalls([FLOOR_1, FLOOR_2])
      return system
    }

    it('isBlocked usa o andar ativo (setCurrentFloor)', () => {
      const system = makeFloors()
      system.setCurrentFloor('f1')
      expect(system.isBlocked(11, 5, 0.35)).toBe(true)
      expect(system.isBlocked(15, 5, 0.35)).toBe(false)
      system.setCurrentFloor('f2')
      expect(system.isBlocked(11, 5, 0.35)).toBe(false)
      expect(system.isBlocked(15, 5, 0.35)).toBe(true)
    })

    it('isBlocked aceita floorId explícito (independente do andar ativo)', () => {
      const system = makeFloors()
      system.setCurrentFloor('f2')
      expect(system.isBlocked(11, 5, 0.35, 'f1')).toBe(true)
      expect(system.isBlocked(15, 5, 0.35, 'f1')).toBe(false)
      expect(system.isBlocked(11, 5, 0.35, 'f2')).toBe(false)
    })

    it('hasClearLine usa floorId explícito', () => {
      const system = makeFloors()
      // Parede da f1 bloqueia o segmento em f1; em f2 o mesmo segmento é livre.
      expect(system.hasClearLine(3, 5, 13, 5, 'f1')).toBe(false)
      expect(system.hasClearLine(3, 5, 13, 5, 'f2')).toBe(true)
    })

    it('resolvePosition desliza nas paredes do floorId informado', () => {
      const system = makeFloors()
      // Andando +X em z=5: em f1 para na face da parede f1 (x=10).
      let pos = { x: 5, z: 5 }
      for (let i = 0; i < 100; i++) pos = system.resolvePosition(pos, { x: 0.3, z: 0 }, 0.35, 'f1')
      expect(Math.abs(pos.x - (10 - 0.35 - 0.001))).toBeLessThan(0.01)
      // Em f2 a mesma caminhada para na parede de f2 (x=14), não na de f1.
      let pos2 = { x: 5, z: 5 }
      for (let i = 0; i < 100; i++) pos2 = system.resolvePosition(pos2, { x: 0.3, z: 0 }, 0.35, 'f2')
      expect(Math.abs(pos2.x - (14 - 0.35 - 0.001))).toBeLessThan(0.01)
    })
  })
})
