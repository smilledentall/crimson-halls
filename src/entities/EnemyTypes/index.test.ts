import { describe, expect, it } from 'vitest'
import { ENEMY_TYPES, createEnemy } from './index'

const speedById = (id: string): number =>
  ENEMY_TYPES.find(t => t.id === id)?.speed ?? -1

describe('EnemyTypes', () => {
  it('mantém a diferenciação relativa de velocidade (chaser > tanque)', () => {
    expect(speedById('chaser')).toBeGreaterThan(speedById('tank'))
    expect(speedById('kamikaze')).toBeGreaterThan(speedById('chaser'))
    expect(speedById('shooter')).toBeGreaterThan(speedById('tank'))
    expect(speedById('boss')).toBeGreaterThan(speedById('tank'))
  })

  it('velocidade base ficou mais alta que antes (tensão maior)', () => {
    expect(speedById('chaser')).toBeGreaterThanOrEqual(4.5)
    expect(speedById('kamikaze')).toBeGreaterThanOrEqual(6)
    expect(speedById('tank')).toBeGreaterThanOrEqual(1.8)
  })

  it('setFloorHeight posiciona o corpo na altura do andar', () => {
    const enemy = createEnemy(ENEMY_TYPES[0], 3, 4, 1, {}, 'floor-2')
    expect(enemy.floorId).toBe('floor-2')
    expect(enemy.mesh.position.y).toBe(0) // nasce no chão antes do ajuste
    enemy.setFloorHeight(5)
    expect(enemy.mesh.position.y).toBe(5) // sobre a laje do andar 2
  })

  it('createEnemy sem floorId usa andar único (legado)', () => {
    const enemy = createEnemy(ENEMY_TYPES[0], 0, 0)
    expect(enemy.floorId).toBe('')
  })
})