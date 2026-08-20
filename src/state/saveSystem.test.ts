import { describe, expect, it } from 'vitest'
import { clearSave, hasSave, loadGame, saveGame, saveProgress } from './saveSystem'
import type { WeaponId } from '../weapons/weapons.config'

const AMMO: Record<WeaponId, number> = {
  pistol: 0,
  shotgun: 8,
  rifle: 60,
  rocket: 6,
  chainsaw: 0,
}

describe('saveSystem', () => {
  it('salva e carrega um checkpoint com progressão', () => {
    expect(hasSave()).toBe(false)
    saveGame({
      levelId: 'level-2b-secret',
      health: 77,
      ammo: AMMO,
      kills: 12,
      difficulty: 'hard',
      currency: 42,
      weaponUpgrades: { pistol: 0, shotgun: 1, rifle: 0, rocket: 0, chainsaw: 0 },
      skillPoints: 2,
      skillUpgrades: { maxHealth: 1 },
    })
    expect(hasSave()).toBe(true)
    const save = loadGame()
    expect(save).not.toBeNull()
    expect(save?.levelId).toBe('level-2b-secret')
    expect(save?.health).toBe(77)
    expect(save?.currency).toBe(42)
    expect(save?.weaponUpgrades.shotgun).toBe(1)
    expect(save?.skillPoints).toBe(2)
    expect(save?.skillUpgrades.maxHealth).toBe(1)
  })

  it('saveProgress atualiza a progressão mantendo o checkpoint', () => {
    saveGame({
      levelId: 'level-2',
      health: 50,
      ammo: AMMO,
      kills: 5,
      difficulty: 'normal',
      currency: 10,
      weaponUpgrades: {},
      skillPoints: 1,
      skillUpgrades: {},
    })
    saveProgress({
      currency: 27,
      weaponUpgrades: { pistol: 0, shotgun: 0, rifle: 0, rocket: 0, chainsaw: 0 },
      skillPoints: 2,
      skillUpgrades: { speed: 1 },
    })
    const save = loadGame()
    expect(save?.levelId).toBe('level-2') // checkpoint preservado
    expect(save?.health).toBe(50)
    expect(save?.currency).toBe(27) // progresso atualizado
    expect(save?.skillPoints).toBe(2)
    expect(save?.skillUpgrades.speed).toBe(1)
  })

  it('rejeita versão incompatível', () => {
    localStorage.setItem(
      'crimson-halls-save-v1',
      JSON.stringify({ version: 0, levelId: 'level-1', health: 100, ammo: AMMO, kills: 0 }),
    )
    expect(loadGame()).toBeNull()
  })

  it('rejeita nível inexistente', () => {
    localStorage.setItem(
      'crimson-halls-save-v1',
      JSON.stringify({ version: 3, levelId: 'level-99', health: 100, ammo: AMMO, kills: 0 }),
    )
    expect(loadGame()).toBeNull()
  })

  it('rejeita JSON corrompido', () => {
    localStorage.setItem('crimson-halls-save-v1', '{corrompido')
    expect(loadGame()).toBeNull()
  })

  it('sem save retorna null', () => {
    expect(loadGame()).toBeNull()
  })

  it('migra saves antigos (versão 1, índice) com progressão default', () => {
    localStorage.setItem(
      'crimson-halls-save-v1',
      JSON.stringify({ version: 1, levelIndex: 3, health: 50, ammo: AMMO, kills: 7 }),
    )
    const save = loadGame()
    expect(save?.levelId).toBe('level-4')
    expect(save?.currency).toBe(0)
    expect(save?.skillPoints).toBe(0)
    expect(save?.version).toBe(4)
  })

  it('migra saves versão 2 mantendo campos existentes', () => {
    localStorage.setItem(
      'crimson-halls-save-v1',
      JSON.stringify({
        version: 2,
        levelId: 'level-3',
        health: 60,
        ammo: AMMO,
        kills: 3,
        difficulty: 'easy',
      }),
    )
    const save = loadGame()
    expect(save?.levelId).toBe('level-3')
    expect(save?.difficulty).toBe('easy')
    expect(save?.currency).toBe(0)
    expect(save?.version).toBe(4)
  })

  it('clearSave remove o checkpoint e a progressão', () => {
    saveGame({
      levelId: 'level-1',
      health: 100,
      ammo: AMMO,
      kills: 0,
      difficulty: 'easy',
      currency: 30,
      weaponUpgrades: {},
      skillPoints: 0,
      skillUpgrades: {},
    })
    clearSave()
    expect(hasSave()).toBe(false)
  })

  it('round-trip com floorId presente (checkpoint multi-andar)', () => {
    saveGame({
      levelId: 'level-multifloor-test',
      floorId: 'floor-2',
      health: 60,
      ammo: AMMO,
      kills: 4,
      difficulty: 'normal',
      currency: 5,
      weaponUpgrades: {},
      skillPoints: 1,
      skillUpgrades: {},
    })
    const save = loadGame()
    expect(save?.levelId).toBe('level-multifloor-test')
    expect(save?.floorId).toBe('floor-2')
    expect(save?.version).toBe(4)
  })

  it('round-trip sem floorId (nível legado omite o campo)', () => {
    saveGame({
      levelId: 'level-1',
      floorId: '',
      health: 100,
      ammo: AMMO,
      kills: 0,
      difficulty: 'normal',
      currency: 0,
      weaponUpgrades: {},
      skillPoints: 0,
      skillUpgrades: {},
    })
    const save = loadGame()
    expect(save?.levelId).toBe('level-1')
    expect(save?.floorId).toBeUndefined()
  })

  it('migra save v3 → v4: sem floorId, campos preservados', () => {
    localStorage.setItem(
      'crimson-halls-save-v1',
      JSON.stringify({
        version: 3,
        levelId: 'level-2b-secret',
        floorId: 'floor-2', // v3 desconhece o campo; deve ser descartado na migração
        health: 80,
        ammo: AMMO,
        kills: 9,
        difficulty: 'hard',
        currency: 25,
        weaponUpgrades: { shotgun: 2 },
        skillPoints: 1,
        skillUpgrades: { maxHealth: 1 },
      }),
    )
    const save = loadGame()
    expect(save?.version).toBe(4)
    expect(save?.levelId).toBe('level-2b-secret')
    expect(save?.health).toBe(80)
    expect(save?.currency).toBe(25)
    expect(save?.floorId).toBeUndefined() // migração ignora o campo inexistente
  })

  it('migra save v3 → v4: floorId ausente de verdade (save antigo de jogador)', () => {
    localStorage.setItem(
      'crimson-halls-save-v1',
      JSON.stringify({
        version: 3,
        levelId: 'level-1',
        health: 100,
        ammo: AMMO,
        kills: 0,
        difficulty: 'normal',
        currency: 0,
        weaponUpgrades: {},
        skillPoints: 0,
        skillUpgrades: {},
      }),
    )
    const save = loadGame()
    expect(save?.version).toBe(4)
    expect(save?.floorId).toBeUndefined()
    expect(save?.levelId).toBe('level-1')
  })
})
