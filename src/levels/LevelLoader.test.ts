import { describe, expect, it } from 'vitest'
import { LevelLoader, TILE_SIZE } from './LevelLoader'
import { ALL_LEVELS } from './levels'
import { LIGHTING_CONFIG } from '../core/lighting.config'

const loader = new LevelLoader()

describe('LevelLoader', () => {
  it('parseia grid: paredes, jogador, inimigos, pickups e cressets com luz embutida', () => {
    const parsed = loader.parse({
      id: 'teste',
      name: 'Teste',
      grid: ['######', '#P.E.#', '#K.S.#', '#H.X.#', '#A.T.#', '######'],
    })
    expect(parsed.walls).toHaveLength(20) // borda de um grid 6x6
    expect(parsed.playerSpawn.x).toBeGreaterThan(0)
    expect(parsed.playerSpawn.z).toBeGreaterThan(0)
    expect(parsed.enemySpawns.map(s => s.enemyType).sort()).toEqual([
      'chaser',
      'kamikaze',
      'shooter',
      'tank',
    ])
    expect(parsed.pickups.map(p => p.kind).sort()).toEqual(['ammo', 'health'])
    // 'X' agora é a única fonte de tocha: 1 cresset = 1 luz embutida.
    expect(parsed.cressets).toHaveLength(1)
    expect(parsed.cressets[0].color).toBe(LIGHTING_CONFIG.torchColor)
    expect(parsed.cressets[0].intensity).toBe(LIGHTING_CONFIG.torchIntensity)
    expect(parsed.cressets[0].distance).toBe(LIGHTING_CONFIG.torchDistance)
    expect(parsed.cressets[0].flameHeight).toBe(LIGHTING_CONFIG.torchFlameHeight)
  })

  it('repassa ondas e pontos de spawn de onda', () => {
    const parsed = loader.parse({
      id: 't',
      name: 'T',
      grid: ['###', '#P#', '###'],
      waves: [{ enemyType: 'chaser', count: 2, delay: 3 }],
      waveSpawns: [{ x: 10, z: 10 }],
    })
    expect(parsed.waves).toEqual([{ enemyType: 'chaser', count: 2, delay: 3 }])
    expect(parsed.waveSpawns).toEqual([{ x: 10, z: 10 }])
  })

  it('parseia portas: marcadores D1, D2... com target por configuração', () => {
    const parsed = loader.parse({
      id: 't',
      name: 'T',
      grid: ['#######', '#P.D..#', '#..D..#', '#######'],
      doors: [
        { marker: 'D1', targetLevelId: 'level-2', label: 'Principal' },
        { marker: 'D2', targetLevelId: 'level-2b-secret', label: 'Secreta' },
      ],
    })
    expect(parsed.doors).toHaveLength(2)
    expect(parsed.doors[0].marker).toBe('D1')
    expect(parsed.doors[0].targetLevelId).toBe('level-2')
    expect(parsed.doors[0].label).toBe('Principal')
    expect(parsed.doors[1].marker).toBe('D2')
    expect(parsed.doors[1].targetLevelId).toBe('level-2b-secret')
    // Posição no centro da célula.
    expect(parsed.doors[0].x).toBeGreaterThan(0)
    expect(parsed.doors[0].z).toBeGreaterThan(0)
  })

  it('porta sem configuração vira inerte (target vazio)', () => {
    const parsed = loader.parse({
      id: 't',
      name: 'T',
      grid: ['###', '#P#', '##D'],
      doors: [],
    })
    expect(parsed.doors).toHaveLength(1)
    expect(parsed.doors[0].targetLevelId).toBe('')
  })

  it('todas as células com marcador ficam no centro da célula', () => {
    const parsed = loader.parse({
      id: 't',
      name: 'T',
      grid: ['###', '#P#', '###'],
    })
    // P na célula (1,1): centro em x = 1*6 + 3 = 9
    expect(parsed.playerSpawn.x).toBe(9)
    expect(parsed.playerSpawn.z).toBe(9)
  })

  it('todos os níveis (campanha + secretos + ramificações) são conectados (flood-fill do spawn)', () => {
    for (const level of ALL_LEVELS) {
      const rows = level.grid.length
      const cols = level.grid[0].length
      let start: [number, number] | null = null
      const markers: Array<[number, number]> = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ch = level.grid[r][c]
          if (ch === 'P') start = [r, c]
          else if ('ESKTHADVCBNX'.includes(ch)) markers.push([r, c])
        }
      }
      expect(start, `nível ${level.id} tem spawn`).not.toBeNull()

      const visited = new Set<string>()
      const queue: Array<[number, number]> = [start!]
      visited.add(start!.join(','))
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nr = r + dr
          const nc = c + dc
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue
          if (level.grid[nr][nc] === '#') continue
          const key = `${nr},${nc}`
          if (visited.has(key)) continue
          visited.add(key)
          queue.push([nr, nc])
        }
      }
      const unreachable = markers.filter(([r, c]) => !visited.has(`${r},${c}`))
      expect(unreachable, `nível ${level.id} sem marcadores inalcançáveis`).toHaveLength(0)
    }
  })

  it('parseia todos os níveis (campanha + secretos + ramificações) sem erro', () => {
    for (const level of ALL_LEVELS) {
      const parsed = loader.parse(level)
      expect(parsed.id).toBe(level.id)
      expect(parsed.walls.length).toBeGreaterThan(0)
    }
  })

  it('todo cresset (X) do grid gera exatamente uma luz embutida na mesma posição', () => {
    for (const level of ALL_LEVELS) {
      const parsed = loader.parse(level)
      const gridX: Array<[number, number]> = []
      for (let r = 0; r < level.grid.length; r++) {
        for (let c = 0; c < level.grid[r].length; c++) {
          if (level.grid[r][c] === 'X') gridX.push([c, r])
        }
      }
      expect(parsed.cressets.length, `nível ${level.id}: 1 X = 1 cresset`).toBe(
        gridX.length,
      )
      for (const cresset of parsed.cressets) {
        // Posição = centro da célula X correspondente.
        expect(
          gridX.some(
            ([c, r]) => cresset.x === c * TILE_SIZE + TILE_SIZE / 2 && cresset.z === r * TILE_SIZE + TILE_SIZE / 2,
          ),
          `nível ${level.id}: cresset em (${cresset.x},${cresset.z}) tem célula X`,
        ).toBe(true)
        // Luz embutida calibrada.
        expect(cresset.color).toBe(LIGHTING_CONFIG.torchColor)
        expect(cresset.intensity).toBe(LIGHTING_CONFIG.torchIntensity)
        expect(cresset.distance).toBe(LIGHTING_CONFIG.torchDistance)
        expect(cresset.flameHeight).toBe(LIGHTING_CONFIG.torchFlameHeight)
      }
    }
  })
})
