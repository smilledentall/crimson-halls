import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, DIFFICULTY_ORDER, isValidDifficulty } from './difficulty.config'

describe('difficulty.config', () => {
  it('tem as 3 dificuldades em ordem crescente de desafio', () => {
    expect(DIFFICULTY_ORDER).toEqual(['easy', 'normal', 'hard'])
  })

  it('fácil é mais acessível que normal, que é mais acessível que difícil', () => {
    const { easy, normal, hard } = DIFFICULTIES
    expect(easy.playerDamageReceived).toBeLessThan(normal.playerDamageReceived)
    expect(normal.playerDamageReceived).toBeLessThan(hard.playerDamageReceived)
    expect(easy.enemyHealth).toBeLessThan(normal.enemyHealth)
    expect(normal.enemyHealth).toBeLessThan(hard.enemyHealth)
    expect(easy.pickupAmmoMultiplier).toBeGreaterThan(normal.pickupAmmoMultiplier)
    expect(normal.pickupAmmoMultiplier).toBeGreaterThan(hard.pickupAmmoMultiplier)
    // Velocidade: fácil mais lento que normal, que é mais lento que difícil.
    expect(easy.enemySpeedMultiplier).toBeLessThan(normal.enemySpeedMultiplier)
    expect(normal.enemySpeedMultiplier).toBeLessThan(hard.enemySpeedMultiplier)
    expect(hard.enemySpeedMultiplier).toBeGreaterThanOrEqual(1.2)
  })

  it('valida valores de dificuldade', () => {
    expect(isValidDifficulty('easy')).toBe(true)
    expect(isValidDifficulty('hard')).toBe(true)
    expect(isValidDifficulty('impossible')).toBe(false)
    expect(isValidDifficulty(undefined)).toBe(false)
  })

  it('multiplicadores de dano/vida/munição/ondas estão sanos', () => {
    for (const id of DIFFICULTY_ORDER) {
      const config = DIFFICULTIES[id]
      expect(config.playerDamageReceived).toBeGreaterThan(0)
      expect(config.enemyHealth).toBeGreaterThan(0)
      expect(config.pickupAmmoMultiplier).toBeGreaterThan(0)
      expect(config.waveIntervalMultiplier).toBeGreaterThan(0)
    }
  })
})
