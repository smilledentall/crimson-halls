import { describe, expect, it } from 'vitest'
import { CollisionSystem } from './CollisionSystem'
import { findSpawnPosition } from './spawnPosition'

function makeSystem(): CollisionSystem {
  const system = new CollisionSystem()
  system.setWalls([{ minX: 0, maxX: 1, minZ: 0, maxZ: 6 }])
  return system
}

describe('findSpawnPosition', () => {
  it('retorna posição dentro do anel de 2-4 m ao redor do marcador', () => {
    const system = makeSystem()
    for (let i = 0; i < 50; i++) {
      const pos = findSpawnPosition(6, 3, 0.6, system, [], 20)
      const dist = Math.hypot(pos.x - 6, pos.z - 3)
      expect(dist).toBeGreaterThanOrEqual(1.9)
      expect(dist).toBeLessThanOrEqual(4.1)
      expect(system.isBlocked(pos.x, pos.z, 0.6)).toBe(false)
    }
  })

  it('mantém separação mínima de 1.8 m entre inimigos do mesmo grupo', () => {
    const system = makeSystem()
    const occupants = [{ x: 8, z: 4, radius: 0.6 }]
    for (let i = 0; i < 50; i++) {
      const pos = findSpawnPosition(6, 3, 0.6, system, occupants, 20)
      const gap = Math.hypot(pos.x - 8, pos.z - 4)
      expect(gap).toBeGreaterThanOrEqual(1.8)
      expect(system.isBlocked(pos.x, pos.z, 0.6)).toBe(false)
    }
  })

  it('cai no ponto do marcador quando tudo está bloqueado', () => {
    const system = new CollisionSystem()
    system.setWalls([{ minX: 0, maxX: 100, minZ: 0, maxZ: 100 }])
    const pos = findSpawnPosition(50, 50, 0.6, system, [], 12)
    expect(pos.x).toBe(50)
    expect(pos.z).toBe(50)
  })
})