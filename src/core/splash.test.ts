import { describe, expect, it } from 'vitest'
import { computeSplashDamage, splashFalloff } from './splash'

describe('splash (dano de área)', () => {
  it('falloff é 1 no centro, 0 fora do raio', () => {
    expect(splashFalloff(0, 4.5)).toBe(1)
    expect(splashFalloff(2.25, 4.5)).toBeCloseTo(0.5)
    expect(splashFalloff(4.5, 4.5)).toBe(0)
    expect(splashFalloff(5, 4.5)).toBe(0)
  })

  it('dano diminui com a distância', () => {
    expect(computeSplashDamage(0, 4.5, 60)).toBe(60)
    expect(computeSplashDamage(2.25, 4.5, 60)).toBe(30)
    expect(computeSplashDamage(4.5, 4.5, 60)).toBe(0)
  })

  it('fator do jogador (self-splash) reduz o dano', () => {
    expect(computeSplashDamage(0, 4.5, 60, 0.6)).toBe(36)
    expect(computeSplashDamage(4.5, 4.5, 60, 0.6)).toBe(0)
  })
})
