import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createWeapon } from './Weapon'
import type { WeaponContext } from './Weapon'
import { WEAPONS } from './weapons.config'
import type { WeaponId } from './weapons.config'
import { Enemy } from '../entities/Enemy'
import { ENEMY_TYPES } from '../entities/EnemyTypes'

type AmmoState = Record<WeaponId, number>

function makeContext(overrides: Partial<WeaponContext> = {}) {
  const ammo: AmmoState = { pistol: 0, shotgun: 8, rifle: 60, rocket: 6, chainsaw: 0 }
  const calls: {
    enemyHits: Enemy[]
    impacts: number
    rockets: Array<{ speed: number }>
  } = { enemyHits: [], impacts: 0, rockets: [] }

  const camera = new THREE.PerspectiveCamera(75, 1.6, 0.1, 500)
  camera.position.set(0, 0, 0)
  camera.lookAt(0, 0, -1)

  const ctx: WeaponContext = {
    camera,
    getTargets: () => [],
    getEnemies: () => [],
    getAmmo: id => ammo[id],
    spendAmmo: (id, amount) => {
      ammo[id] -= amount
    },
    onEnemyHit: enemy => {
      calls.enemyHits.push(enemy)
    },
    onImpact: () => {
      calls.impacts++
    },
    spawnRocket: (_origin, _direction, speed) => {
      calls.rockets.push({ speed })
    },
    ...overrides,
  }
  return { ctx, calls, ammo }
}

function press(weapon: { setTriggerHeld: (held: boolean) => void }) {
  weapon.setTriggerHeld(false)
  weapon.setTriggerHeld(true)
}

describe('armas', () => {
  it('cadência da pistola: um tiro por pressionar, respeitando o cooldown', () => {
    const { ctx } = makeContext()
    const weapon = createWeapon(WEAPONS.pistol, ctx)
    const cooldown = 1 / WEAPONS.pistol.fireRate + 0.001
    weapon.setTriggerHeld(true)
    weapon.update(0)
    expect(weapon.consumeShotEvent()).toBe('fired')
    weapon.update(cooldown)
    expect(weapon.consumeShotEvent()).toBeNull() // semi-auto: sem novo pressionar
    press(weapon)
    weapon.update(cooldown)
    expect(weapon.consumeShotEvent()).toBe('fired')
  })

  it('escopeta consome munição até esvaziar e então dispara "dry"', () => {
    const { ctx, calls, ammo } = makeContext()
    const weapon = createWeapon(WEAPONS.shotgun, ctx)
    const cooldown = 1 / WEAPONS.shotgun.fireRate + 0.001
    for (let i = 0; i < 8; i++) {
      press(weapon)
      weapon.update(cooldown)
      expect(weapon.consumeShotEvent()).toBe('fired')
    }
    expect(ammo.shotgun).toBe(0)
    expect(calls.enemyHits).toHaveLength(0) // sem alvos no raycast
    press(weapon)
    weapon.update(cooldown)
    expect(weapon.consumeShotEvent()).toBe('dry')
  })

  it('pistola tem munição infinita (capacidade 0)', () => {
    const { ctx } = makeContext()
    const weapon = createWeapon(WEAPONS.pistol, ctx)
    const cooldown = 1 / WEAPONS.pistol.fireRate + 0.001
    for (let i = 0; i < 20; i++) {
      press(weapon)
      weapon.update(cooldown)
      expect(weapon.consumeShotEvent()).toBe('fired')
    }
  })

  it('lançador de foguetes dispara um projétil com a velocidade configurada', () => {
    const { ctx, calls } = makeContext()
    const weapon = createWeapon(WEAPONS.rocket, ctx)
    weapon.setTriggerHeld(true)
    weapon.update(0)
    expect(weapon.consumeShotEvent()).toBe('fired')
    expect(calls.rockets).toHaveLength(1)
    expect(calls.rockets[0].speed).toBe(WEAPONS.rocket.projectileSpeed)
  })

  it('motosserra acerta inimigo dentro do alcance e do arco frontal', () => {
    const enemy = new Enemy(ENEMY_TYPES[0], 0, 0)
    enemy.mesh.position.set(0, 1, -1.5)
    const { ctx, calls } = makeContext({ getEnemies: () => [enemy] })
    const weapon = createWeapon(WEAPONS.chainsaw, ctx)
    weapon.setTriggerHeld(true)
    weapon.update(0)
    expect(weapon.consumeShotEvent()).toBe('fired')
    expect(calls.enemyHits).toContain(enemy)
  })

  it('motosserra não acerta inimigo atrás do jogador', () => {
    const enemy = new Enemy(ENEMY_TYPES[0], 0, 0)
    enemy.mesh.position.set(0, 1, 2) // atrás da câmera
    const { ctx, calls } = makeContext({ getEnemies: () => [enemy] })
    const weapon = createWeapon(WEAPONS.chainsaw, ctx)
    weapon.setTriggerHeld(true)
    weapon.update(0)
    expect(calls.enemyHits).toHaveLength(0)
  })
})
