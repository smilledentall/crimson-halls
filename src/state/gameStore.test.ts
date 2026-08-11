import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import type { WeaponId } from '../weapons/weapons.config'

const AMMO: Record<WeaponId, number> = {
  pistol: 0,
  shotgun: 8,
  rifle: 60,
  rocket: 6,
  chainsaw: 0,
}

describe('gameStore: dano, vida e munição', () => {
  beforeEach(() => {
    useGameStore.setState({
      health: 100,
      ammo: { ...AMMO },
      difficulty: 'normal',
      kills: 0,
    })
  })

  it('dano reduz a vida (dificuldade normal)', () => {
    useGameStore.getState().damage(20)
    expect(useGameStore.getState().health).toBe(80)
  })

  it('vida não fica negativa', () => {
    useGameStore.setState({ health: 10 })
    useGameStore.getState().damage(100)
    expect(useGameStore.getState().health).toBe(0)
  })

  it('dificuldade fácil reduz o dano recebido', () => {
    useGameStore.setState({ difficulty: 'easy' })
    useGameStore.getState().damage(20)
    expect(useGameStore.getState().health).toBe(88) // 20 * 0.6 = 12
  })

  it('dificuldade difícil aumenta o dano recebido', () => {
    useGameStore.setState({ difficulty: 'hard' })
    useGameStore.getState().damage(20)
    expect(useGameStore.getState().health).toBe(70) // 20 * 1.5 = 30
  })

  it('pickup de vida não passa do máximo', () => {
    useGameStore.setState({ health: 90 })
    useGameStore.getState().pickupHealth(25)
    expect(useGameStore.getState().health).toBe(100)
  })

  it('pickup de munição respeita a capacidade da arma', () => {
    useGameStore.setState({ ammo: { ...AMMO, shotgun: 6 } })
    useGameStore.getState().pickupAmmo('shotgun', 4)
    expect(useGameStore.getState().ammo.shotgun).toBe(8) // 6 + 4 capado em 8
  })

  it('dificuldade fácil dá mais munição nos pickups', () => {
    useGameStore.setState({ difficulty: 'easy', ammo: { ...AMMO, shotgun: 0 } })
    useGameStore.getState().pickupAmmo('shotgun', 4)
    expect(useGameStore.getState().ammo.shotgun).toBe(6) // 4 * 1.5
  })

  it('dificuldade difícil dá menos munição nos pickups', () => {
    useGameStore.setState({ difficulty: 'hard', ammo: { ...AMMO, shotgun: 0 } })
    useGameStore.getState().pickupAmmo('shotgun', 4)
    expect(useGameStore.getState().ammo.shotgun).toBe(2) // 4 * 0.6
  })

  it('spendAmmo não fica negativo', () => {
    useGameStore.setState({ ammo: { ...AMMO, rifle: 3 } })
    useGameStore.getState().spendAmmo('rifle', 5)
    expect(useGameStore.getState().ammo.rifle).toBe(0)
  })
})

describe('gameStore: progressão (moeda, upgrades, habilidades)', () => {
  beforeEach(() => {
    useGameStore.setState({
      currency: 0,
      weaponUpgrades: {},
      skillPoints: 0,
      skillUpgrades: {},
      health: 100,
      ammo: { ...AMMO },
    })
  })

  it('addCurrency soma e buyWeaponUpgrade gasta com custo crescente', () => {
    useGameStore.getState().addCurrency(100)
    expect(useGameStore.getState().currency).toBe(100)
    useGameStore.getState().buyWeaponUpgrade('shotgun') // custo 15
    expect(useGameStore.getState().currency).toBe(85)
    expect(useGameStore.getState().weaponUpgrades.shotgun).toBe(1)
    useGameStore.getState().buyWeaponUpgrade('shotgun') // custo 30
    expect(useGameStore.getState().currency).toBe(55)
    expect(useGameStore.getState().weaponUpgrades.shotgun).toBe(2)
  })

  it('não compra upgrade sem moeda suficiente', () => {
    useGameStore.getState().buyWeaponUpgrade('shotgun')
    expect(useGameStore.getState().weaponUpgrades.shotgun).toBeUndefined()
  })

  it('buySkillUpgrade gasta ponto de habilidade e respeita o máximo', () => {
    useGameStore.setState({ skillPoints: 5 })
    useGameStore.getState().buySkillUpgrade('maxHealth')
    expect(useGameStore.getState().skillPoints).toBe(4)
    expect(useGameStore.getState().skillUpgrades.maxHealth).toBe(1)
    useGameStore.setState({ skillUpgrades: { maxHealth: 3 }, skillPoints: 2 })
    useGameStore.getState().buySkillUpgrade('maxHealth')
    expect(useGameStore.getState().skillUpgrades.maxHealth).toBe(3) // no máximo
  })

  it('atributo Couraça reduz o dano recebido', () => {
    useGameStore.setState({ skillUpgrades: { damageReduction: 2 } })
    useGameStore.getState().damage(20) // 20 * 1 * (1 - 0.10) = 18
    expect(useGameStore.getState().health).toBe(82)
  })

  it('atributo Vitalidade aumenta a vida máxima do pickup de vida', () => {
    useGameStore.setState({ skillUpgrades: { maxHealth: 2 }, health: 100 })
    useGameStore.getState().pickupHealth(999)
    expect(useGameStore.getState().health).toBe(120) // 100 + 2*10
  })
})
