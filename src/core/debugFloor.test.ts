import { describe, expect, it } from 'vitest'
import { canDebugFloorSwitch, DEBUG_MULTIFLOOR_LEVEL_ID } from './debugFloor'

describe('canDebugFloorSwitch (tecla F)', () => {
  it('nível de campanha normal (sem floors) nunca libera F', () => {
    expect(canDebugFloorSwitch('level-1', 0)).toBe(false)
    expect(canDebugFloorSwitch('level-13', 0)).toBe(false)
  })

  it('qualquer nível que não seja o de teste isolado não libera F, mesmo com vários andares', () => {
    expect(canDebugFloorSwitch('level-custom', 2)).toBe(false)
    expect(canDebugFloorSwitch('level-1', 2)).toBe(false)
    expect(canDebugFloorSwitch('', 2)).toBe(false)
  })

  it('o nível de teste multi-andar libera F somente com mais de 1 andar', () => {
    expect(canDebugFloorSwitch(DEBUG_MULTIFLOOR_LEVEL_ID, 2)).toBe(true)
    expect(canDebugFloorSwitch(DEBUG_MULTIFLOOR_LEVEL_ID, 1)).toBe(false)
    expect(canDebugFloorSwitch(DEBUG_MULTIFLOOR_LEVEL_ID, 0)).toBe(false)
  })
})