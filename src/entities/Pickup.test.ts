import { describe, expect, it } from 'vitest'
import { Pickup } from './Pickup'

describe('Pickup', () => {
  it('flutua sobre o chão do seu andar (floorY)', () => {
    const p = new Pickup({
      kind: 'health',
      x: 0,
      z: 0,
      floorId: 'floor-2',
      floorY: 5,
    })
    expect(p.definition.floorId).toBe('floor-2')
    expect(p.mesh.position.y).toBeCloseTo(5.55, 5)
  })

  it('sem floorY flutua a 0.55 (andar único/legado)', () => {
    const p = new Pickup({ kind: 'ammo', x: 0, z: 0 })
    expect(p.mesh.position.y).toBeCloseTo(0.55, 5)
  })

  it('o bob mantém a base no chão do andar', () => {
    const p = new Pickup({ kind: 'currency', x: 0, z: 0, floorY: 3 })
    p.update(0.5)
    expect(p.mesh.position.y).toBeGreaterThan(3.4)
    expect(p.mesh.position.y).toBeLessThan(3.7)
  })
})