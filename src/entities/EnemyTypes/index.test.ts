import { describe, expect, it } from 'vitest'
import { ENEMY_TYPES } from './index'

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
})