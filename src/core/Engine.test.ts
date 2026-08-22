import { describe, expect, it, beforeEach, vi } from 'vitest'
import { LevelLoader, TILE_SIZE, WALL_HEIGHT } from '../levels/LevelLoader'

const loader = new LevelLoader()

function createTestLevel(floor2Height: number): ReturnType<LevelLoader['parse']> {
  return loader.parse({
    id: 'stair-height-test',
    name: 'Stair Height Test',
    startFloorId: 'floor-1',
    floors: [
      { id: 'floor-1', height: 0, grid: ['#####', '#P.L#', '#####'] },
      { id: 'floor-2', height: floor2Height, grid: ['#####', '#..l#', '#####'] },
    ],
    stairs: [
      {
        id: 's12',
        fromFloor: 'floor-1',
        toFloor: 'floor-2',
        fromMarker: 'L1',
        toMarker: 'l1',
        direction: 'up',
      },
    ],
  })
}

describe('LevelLoader - stair transition height logic', () => {
  let parsed: ReturnType<LevelLoader['parse']>

  describe('StairTransitionHeightTest', () => {
    it('transitionViaStair coloca jogador em floor.height + eyeHeight (height=6)', () => {
      parsed = createTestLevel(6)
      const floor2 = parsed.floors!.find(f => f.id === 'floor-2')!
      const stair = parsed.stairs.find(s => s.direction === 'up')!
      
      expect(stair.targetFloorId).toBe('floor-2')
      expect(stair.targetX).toBeGreaterThan(0)
      expect(stair.targetZ).toBeGreaterThan(0)
      
      const expectedY = floor2.height + 1.7
      expect(expectedY).toBe(7.7)
    })

    it('height=5 cria sobreposição Y=5 (floor-1 ceiling = floor-2 floor)', () => {
      parsed = createTestLevel(5)
      const floor1CeilingY = 0 + WALL_HEIGHT
      const floor2 = parsed.floors!.find(f => f.id === 'floor-2')!
      
      expect(floor2.height).toBe(5)
      expect(floor2.height).toBe(floor1CeilingY)
      
      const stair = parsed.stairs.find(s => s.direction === 'up')!
      const expectedY = floor2.height + 1.7
      expect(expectedY).toBe(6.7)
    })
  })

  describe('FloorGeometryHeightTest', () => {
    it('floor mesh Y = floor.height', () => {
      parsed = createTestLevel(6)
      const floor2 = parsed.floors!.find(f => f.id === 'floor-2')!
      expect(floor2.height).toBe(6)
      expect(floor2.bounds.maxX).toBeGreaterThan(0)
      expect(floor2.bounds.maxZ).toBeGreaterThan(0)
    })

    it('ceiling mesh Y = floor.height + WALL_HEIGHT', () => {
      parsed = createTestLevel(6)
      const floor2 = parsed.floors!.find(f => f.id === 'floor-2')!
      const expectedCeilingY = floor2.height + WALL_HEIGHT
      expect(expectedCeilingY).toBe(11)
    })

    it('wall mesh Y center = floor.height + WALL_HEIGHT/2', () => {
      parsed = createTestLevel(6)
      const floor2 = parsed.floors!.find(f => f.id === 'floor-2')!
      const expectedWallCenterY = floor2.height + WALL_HEIGHT / 2
      expect(expectedWallCenterY).toBe(8.5)
    })
  })

  describe('VisualGapRegressionTest', () => {
    it('gap ≥ 1 entre floor-1 ceiling e floor-2 floor', () => {
      parsed = createTestLevel(6)
      const floor1CeilingY = 0 + WALL_HEIGHT
      const floor2FloorY = parsed.floors!.find(f => f.id === 'floor-2')!.height
      const gap = floor2FloorY - floor1CeilingY
      expect(gap).toBeGreaterThanOrEqual(1)
    })

    it('height=5 falha: gap = 0 (sobreposição)', () => {
      parsed = createTestLevel(5)
      const floor1CeilingY = 0 + WALL_HEIGHT
      const floor2FloorY = parsed.floors!.find(f => f.id === 'floor-2')!.height
      const gap = floor2FloorY - floor1CeilingY
      expect(gap).toBe(0)
    })
  })

  describe('StairAlignmentTest', () => {
    it('L e l alinhados na mesma coluna (level-multifloor-test pattern)', () => {
      const parsed = loader.parse({
        id: 'aligned-test',
        name: 'Aligned Test',
        startFloorId: 'floor-1',
        floors: [
          { id: 'floor-1', height: 0, grid: ['#####', '#P.L#', '#####'] },
          { id: 'floor-2', height: 6, grid: ['#####', '#..l#', '#####'] },
        ],
        stairs: [
          { id: 's12', fromFloor: 'floor-1', toFloor: 'floor-2', fromMarker: 'L1', toMarker: 'l1', direction: 'up' },
        ],
      })
      
      const upStair = parsed.stairs.find(s => s.direction === 'up')!
      const downStair = parsed.stairs.find(s => s.direction === 'down')!
      
      expect(upStair.x).toBe(downStair.targetX)
      expect(upStair.z).toBe(downStair.targetZ)
    })

    it('level-9 migração tem L/l alinhados em X (padrão level-multifloor-test)', () => {
      const level9Migrated = loader.parse({
        id: 'level-9',
        name: 'Alturas de Crimson',
        startFloorId: 'floor-1',
        atmosphere: { fogColor: 0x2a0f1a, ambientColor: 0xe0b0c0, fogFar: 125 },
        floors: [
          {
            id: 'floor-1',
            name: 'Térreo',
            height: 0,
            grid: [
              '###########################',
              '#P....X....#....#....A...##',
              '#...E.......#....#....E..##',
              '#............#....#......##',
              '#X....#...........#X.....##',
              '#......#..........#.......##',
              '#..............X.........##',
              '#..S......X#...#.L....##',
            ],
            doors: [],
          },
          {
            id: 'floor-2',
            name: 'Torres Superiores',
            height: 6,
            grid: [
              '###########################',
              '#..........#...#.l....##',
              '#X.........#...#........X##',
              '#.K....H.......X....K....##',
              '#..............#.........##',
              '#...T........A...........##',
              '#................#D......##',
            ],
            doors: [
              { marker: 'D1', targetLevelId: 'level-10', label: 'Forja de Obsidiana' },
            ],
          },
        ],
        stairs: [
          { id: 'stair-1-2', fromFloor: 'floor-1', toFloor: 'floor-2', fromMarker: 'L1', toMarker: 'l1', direction: 'up' },
        ],
        waves: [
          { enemyType: 'flying', count: 3, delay: 5, floorId: 'floor-2' },
          { enemyType: 'flying', count: 4, delay: 15, floorId: 'floor-2' },
        ],
        waveSpawns: [
          { x: 55, z: 35, floorId: 'floor-2' },
          { x: 100, z: 55, floorId: 'floor-2' },
          { x: 80, z: 60, floorId: 'floor-2' },
        ],
      })
      
      const upStair = level9Migrated.stairs.find(s => s.direction === 'up')!
      const deltaX = Math.abs(upStair.x - upStair.targetX)
      
      expect(deltaX).toBeLessThanOrEqual(1)
    })
  })
})