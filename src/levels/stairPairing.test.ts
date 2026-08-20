import { describe, expect, it } from 'vitest'
import { autoPairStairs, type StairFloor } from './stairPairing'

function floor(id: string, height: number, grid: string[]): StairFloor {
  return { id, height, grid }
}

describe('autoPairStairs', () => {
  it('pareia 1 L do andar baixo com 1 l do andar alto (subir)', () => {
    const stairs = autoPairStairs([
      floor('floor-1', 0, ['#P..', '...L', '####']),
      floor('floor-2', 5, ['####', '...l', '....']),
    ])
    expect(stairs).toHaveLength(1)
    expect(stairs[0]).toMatchObject({
      fromFloor: 'floor-1',
      toFloor: 'floor-2',
      fromMarker: 'L1',
      toMarker: 'l1',
      direction: 'up',
    })
  })

  it('múltiplas escadas no mesmo andar pareiam por ordem (L1↔l1, L2↔l2)', () => {
    const stairs = autoPairStairs([
      floor('floor-1', 0, ['#L..', '...L', '####']),
      floor('floor-2', 5, ['####', '...l', '...l']),
    ])
    expect(stairs).toHaveLength(2)
    expect(stairs.map(s => s.fromMarker)).toEqual(['L1', 'L2'])
    expect(stairs.map(s => s.toMarker)).toEqual(['l1', 'l2'])
    expect(stairs.map(s => s.id)).toEqual(['floor-1-floor-2-1', 'floor-1-floor-2-2'])
  })

  it('número desigual: sobras de L ficam sem par (2 L vs 1 l)', () => {
    const stairs = autoPairStairs([
      floor('floor-1', 0, ['#L..', '...L', '####']),
      floor('floor-2', 5, ['####', '...l', '....']),
    ])
    expect(stairs).toHaveLength(1)
    expect(stairs[0].fromMarker).toBe('L1')
  })

  it('número desigual: sobras de l ficam sem par (1 L vs 2 l)', () => {
    const stairs = autoPairStairs([
      floor('floor-1', 0, ['#L..', '....', '####']),
      floor('floor-2', 5, ['####', '...l', '...l']),
    ])
    expect(stairs).toHaveLength(1)
    expect(stairs[0]).toMatchObject({ fromMarker: 'L1', toMarker: 'l1' })
  })

  it('remoção/repintura do marcador: sem L não gera escada', () => {
    const withStair = autoPairStairs([
      floor('floor-1', 0, ['#L..', '....', '####']),
      floor('floor-2', 5, ['####', '...l', '....']),
    ])
    expect(withStair).toHaveLength(1)
    // Repintura: L vira chão (removido).
    const withoutStair = autoPairStairs([
      floor('floor-1', 0, ['#...', '....', '####']),
      floor('floor-2', 5, ['####', '...l', '....']),
    ])
    expect(withoutStair).toHaveLength(0)
  })

  it('cadeia A→B→C: pareia vizinhos sem escada fantasma A→C', () => {
    const stairs = autoPairStairs([
      floor('floor-1', 0, ['#L..', '....', '####']),
      floor('floor-2', 5, ['####', '...l', '...L']),
      floor('floor-3', 10, ['####', '...l', '....']),
    ])
    expect(stairs).toHaveLength(2)
    expect(stairs.map(s => `${s.fromFloor}->${s.toFloor}`)).toEqual([
      'floor-1->floor-2',
      'floor-2->floor-3',
    ])
  })

  it('vão: andar do meio sem escada é pulado (L2 vai ao 3º andar)', () => {
    const stairs = autoPairStairs([
      floor('floor-1', 0, ['#L..', '...L', '####']),
      floor('floor-2', 5, ['####', '....', '....']),
      floor('floor-3', 10, ['####', '...l', '...l']),
    ])
    expect(stairs).toHaveLength(2)
    expect(stairs.map(s => s.toFloor)).toEqual(['floor-3', 'floor-3'])
    expect(stairs.map(s => s.toMarker)).toEqual(['l1', 'l2'])
  })

  it('andares de mesma altura não pareiam (não há subida)', () => {
    const stairs = autoPairStairs([
      floor('floor-1', 0, ['#L..', '....', '####']),
      floor('floor-2', 0, ['####', '...l', '....']),
    ])
    expect(stairs).toHaveLength(0)
  })

  it('L no andar mais alto (sem l abaixo) fica sem par', () => {
    const stairs = autoPairStairs([
      floor('floor-1', 0, ['#...', '....', '####']),
      floor('floor-2', 5, ['####', '...l', '...L']),
    ])
    expect(stairs).toHaveLength(0)
  })

  it('é determinístico (mesma entrada → mesmo resultado)', () => {
    const floors = [
      floor('floor-1', 0, ['#L..', '...L', '####']),
      floor('floor-2', 5, ['####', '...l', '...l']),
    ]
    expect(autoPairStairs(floors)).toEqual(autoPairStairs(floors))
  })
})