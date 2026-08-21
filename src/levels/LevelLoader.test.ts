import { describe, expect, it } from 'vitest'
import { LevelLoader, TILE_SIZE, computeDoorPlacement, resolveSpawnFloorId } from './LevelLoader'
import { ALL_LEVELS } from './levels'
import { levelMultiFloorTest } from './levels/level-multifloor-test'
import { autoPairStairs } from './stairPairing'
import { LIGHTING_CONFIG } from '../core/lighting.config'

const loader = new LevelLoader()

/** Flood-fill de um grid: confere que todos os marcadores são alcançáveis. */
function checkGridConnectivity(grid: string[], label: string, expectSpawn: boolean): void {
  const rows = grid.length
  const cols = grid[0].length
  let start: [number, number] | null = null
  const markers: Array<[number, number]> = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c]
      if (ch === 'P') start = [r, c]
      else if ('ESKTHADVCBNX'.includes(ch)) markers.push([r, c])
    }
  }
  if (expectSpawn) expect(start, `${label} tem spawn`).not.toBeNull()

  // Origem do flood-fill: o spawn ou a primeira célula aberta (andar sem P).
  const origin: [number, number] | null = start ?? (() => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] !== '#') return [r, c]
      }
    }
    return null
  })()
  if (!origin) return

  const visited = new Set<string>()
  const queue: Array<[number, number]> = [origin]
  visited.add(origin.join(','))
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
      if (grid[nr][nc] === '#') continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      visited.add(key)
      queue.push([nr, nc])
    }
  }
  const unreachable = markers.filter(([r, c]) => !visited.has(`${r},${c}`))
  expect(unreachable, `${label} sem marcadores inalcançáveis`).toHaveLength(0)
}

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
    expect(parsed.cressets[0].decay).toBe(LIGHTING_CONFIG.torchDecay)
    expect(parsed.cressets[0].flameHeight).toBe(LIGHTING_CONFIG.torchFlameHeight)
    expect(parsed.cressets[0].lightHeight).toBe(LIGHTING_CONFIG.torchLightHeight)
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
      if (level.floors && level.floors.length > 0) {
        // Multi-andar: conectividade por andar (o teste isolado não tem portas).
        level.floors.forEach((floor, index) => {
          checkGridConnectivity(
            floor.grid,
            `${level.id}/${floor.id}`,
            floor.id === level.startFloorId || index === 0,
          )
        })
      } else {
        checkGridConnectivity(level.grid ?? [], level.id, true)
      }
    }
  })

  it('parseia nível multi-andar: paredes com floorId, spawn do andar inicial', () => {
    const parsed = loader.parse({
      id: 't',
      name: 'T',
      startFloorId: 'f2',
      floors: [
        { id: 'f1', name: 'Térreo', height: 0, grid: ['###', '#.#', '###'] },
        { id: 'f2', name: 'Superior', height: 5, grid: ['###', '#P#', '###'] },
      ],
    })
    expect(parsed.floors).toHaveLength(2)
    expect(parsed.startFloorId).toBe('f2')
    expect(parsed.floors![1].height).toBe(5)
    // Paredes de ambos os andares carregam o floorId correto.
    expect(parsed.walls.filter(w => w.floorId === 'f1')).toHaveLength(8)
    expect(parsed.walls.filter(w => w.floorId === 'f2')).toHaveLength(8)
    // Spawn vem do andar inicial (f2).
    expect(parsed.playerSpawn.x).toBe(9)
    expect(parsed.playerSpawn.z).toBe(9)
  })

  it('andar único com floors (um só andar) equivale ao legado', () => {
    const multi = loader.parse({
      id: 't',
      name: 'T',
      floors: [{ id: 'f1', height: 0, grid: ['###', '#P#', '###'] }],
    })
    const legacy = loader.parse({ id: 't', name: 'T', grid: ['###', '#P#', '###'] })
    expect(multi.walls).toHaveLength(legacy.walls.length)
    expect(multi.playerSpawn).toEqual(legacy.playerSpawn)
    expect(multi.startFloorId).toBe('f1')
  })

  it('parseia escadas: entradas de ida e volta nos andares corretos', () => {
    const parsed = loader.parse({
      id: 't',
      name: 'T',
      startFloorId: 'f1',
      floors: [
        { id: 'f1', height: 0, grid: ['#####', '#P.L#', '#####'] },
        { id: 'f2', height: 5, grid: ['#####', '#..l#', '#####'] },
      ],
      stairs: [
        {
          id: 's12',
          fromFloor: 'f1',
          toFloor: 'f2',
          fromMarker: 'L1',
          toMarker: 'l1',
          direction: 'up',
        },
      ],
    })
    expect(parsed.stairs).toHaveLength(2)
    const up = parsed.stairs.find(s => s.direction === 'up')!
    const down = parsed.stairs.find(s => s.direction === 'down')!
    expect(up.floorId).toBe('f1')
    expect(up.targetFloorId).toBe('f2')
    expect(down.floorId).toBe('f2')
    expect(down.targetFloorId).toBe('f1')
    // Posição no centro da célula: L e l em (1,3).
    expect(up.x).toBe(3 * TILE_SIZE + TILE_SIZE / 2)
    expect(up.targetX).toBe(3 * TILE_SIZE + TILE_SIZE / 2)
    expect(down.x).toBe(up.targetX)
    // Escadas distribuídas nos andares correspondentes.
    expect(parsed.floors![0].stairs).toHaveLength(1)
    expect(parsed.floors![1].stairs).toHaveLength(1)
  })

  it('parseia pickups multi-andar com floorId e floorY (H/A/C)', () => {
    const parsed = loader.parse({
      id: 't',
      name: 'T',
      floors: [
        { id: 'f1', height: 0, grid: ['#####', '#H.A#', '#####'] },
        { id: 'f2', height: 5, grid: ['#####', '#.C.#', '#####'] },
      ],
    })
    expect(parsed.pickups).toHaveLength(3)
    const health = parsed.pickups.find(p => p.kind === 'health')!
    const ammo = parsed.pickups.find(p => p.kind === 'ammo')!
    const currency = parsed.pickups.find(p => p.kind === 'currency')!
    expect(health.floorId).toBe('f1')
    expect(health.floorY).toBe(0)
    expect(ammo.floorId).toBe('f1')
    expect(ammo.floorY).toBe(0)
    expect(currency.floorId).toBe('f2')
    expect(currency.floorY).toBe(5)
    // Centro da célula: H em (1,1), A em (1,3) no térreo; C em (1,2) no 2º.
    expect(health.x).toBe(TILE_SIZE + TILE_SIZE / 2)
    expect(ammo.x).toBe(3 * TILE_SIZE + TILE_SIZE / 2)
    expect(currency.x).toBe(2 * TILE_SIZE + TILE_SIZE / 2)
  })

  it('nível de teste multi-andar: 2 andares, escada de ida e volta, spawn no térreo', () => {
    const parsed = loader.parse(levelMultiFloorTest)
    expect(parsed.floors).toHaveLength(2)
    expect(parsed.startFloorId).toBe('floor-1')
    expect(parsed.stairs).toHaveLength(2)
    expect(parsed.stairs.filter(s => s.direction === 'up')[0].targetFloorId).toBe('floor-2')
    expect(parsed.stairs.filter(s => s.direction === 'down')[0].targetFloorId).toBe('floor-1')
    expect(parsed.playerSpawn.yaw).toBe(0)
    // TESTE TEMPORÁRIO (§8): um inimigo por andar, cada um com o floorId certo.
    expect(parsed.enemySpawns).toHaveLength(2)
    expect(parsed.enemySpawns.filter(s => s.floorId === 'floor-1')).toHaveLength(1)
    expect(parsed.enemySpawns.filter(s => s.floorId === 'floor-2')).toHaveLength(1)
    // TESTE TEMPORÁRIO (§12): tochas (X) só no andar superior e notas (N) em
    // cada andar — cada um com floorId/floorY.
    expect(parsed.cressets).toHaveLength(3)
    expect(parsed.cressets.every(c => c.floorId === 'floor-2')).toBe(true)
    expect(parsed.cressets.every(c => c.floorY === 5)).toBe(true)
    expect(parsed.notes).toHaveLength(2)
    expect(parsed.notes.filter(n => n.floorId === 'floor-1')).toHaveLength(1)
    expect(parsed.notes.filter(n => n.floorId === 'floor-2')).toHaveLength(1)
  })

  it('parseia cressets e notas multi-andar com floorId e floorY', () => {
    const parsed = loader.parse({
      id: 't',
      name: 'T',
      floors: [
        { id: 'f1', height: 0, grid: ['#####', '#N..#', '#...X#', '#####'] },
        { id: 'f2', height: 5, grid: ['#####', '#X..#', '#...N#', '#####'] },
      ],
    })
    // Um cresset em cada andar, com floorId/floorY corretos.
    expect(parsed.cressets).toHaveLength(2)
    const f1C = parsed.cressets.find(c => c.floorId === 'f1')!
    const f2C = parsed.cressets.find(c => c.floorId === 'f2')!
    expect(f1C).toBeDefined()
    expect(f2C).toBeDefined()
    expect(f1C.floorY).toBe(0)
    expect(f2C.floorY).toBe(5)
    // Junto à parede => montado (mounted) e deslocado para a parede.
    expect(f1C.mounted).toBe(true)
    expect(f2C.mounted).toBe(true)
    expect(f1C.x).toBeGreaterThan(0)
    // Calibração central da tocha preservada (nunca sobrescrita por andar).
    expect(f2C.color).toBe(LIGHTING_CONFIG.torchColor)
    expect(f2C.intensity).toBe(LIGHTING_CONFIG.torchIntensity)
    expect(f2C.distance).toBe(LIGHTING_CONFIG.torchDistance)
    expect(f2C.decay).toBe(LIGHTING_CONFIG.torchDecay)
    expect(f2C.flameHeight).toBe(LIGHTING_CONFIG.torchFlameHeight)
    expect(f2C.lightHeight).toBe(LIGHTING_CONFIG.torchLightHeight)
    // Uma nota por andar, com floorId; posição no centro da célula.
    expect(parsed.notes).toHaveLength(2)
    expect(parsed.notes.filter(n => n.floorId === 'f1')).toHaveLength(1)
    expect(parsed.notes.filter(n => n.floorId === 'f2')).toHaveLength(1)
    expect(parsed.notes[0].x).toBe(TILE_SIZE + TILE_SIZE / 2)
  })

  it('escadas geradas pelo editor (autoPairStairs) são consumidas pelo LevelLoader', () => {
    const floors = [
      { id: 'floor-1', name: 'Térreo', height: 0, grid: ['#P...L#', '######'] },
      { id: 'floor-2', name: 'Topo', height: 5, grid: ['#...l.#', '######'] },
    ]
    const definition = {
      id: 'editor-multi',
      name: 'Editor Multi',
      floors,
      stairs: autoPairStairs(floors.map(f => ({ id: f.id, height: f.height, grid: f.grid }))),
      startFloorId: 'floor-1',
    }
    const parsed = loader.parse(definition)
    // Ida + volta: L no térreo (subir) e l no topo (descer).
    expect(parsed.stairs).toHaveLength(2)
    const up = parsed.stairs.find(s => s.direction === 'up')!
    const down = parsed.stairs.find(s => s.direction === 'down')!
    expect(up.floorId).toBe('floor-1')
    expect(up.targetFloorId).toBe('floor-2')
    expect(down.floorId).toBe('floor-2')
    expect(down.targetFloorId).toBe('floor-1')
    // Centro da célula do marcador: L em (0,5) → x = 5*6+3 = 33; l em (0,4) → 27.
    expect(up.x).toBe(5 * TILE_SIZE + TILE_SIZE / 2)
    expect(up.targetX).toBe(4 * TILE_SIZE + TILE_SIZE / 2)
  })

  it('parseia todos os níveis (campanha + secretos + ramificações) sem erro', () => {
    for (const level of ALL_LEVELS) {
      const parsed = loader.parse(level)
      expect(parsed.id).toBe(level.id)
      expect(parsed.walls.length).toBeGreaterThan(0)
    }
  })

  it('todo cresset (X) do grid gera exatamente uma luz embutida na mesma posição; portas ganham cressets flanqueadores', () => {
    for (const level of ALL_LEVELS) {
      const parsed = loader.parse(level)
      // Em multi-andar, cada cresset é validado contra o grid do SEU andar;
      // no legado, contra o grid raiz.
      const gridsByFloor: Array<{ floorId: string; rows: string[] }> =
        level.floors && level.floors.length > 0
          ? level.floors.map(floor => ({ floorId: floor.id, rows: floor.grid }))
          : [{ floorId: '', rows: level.grid ?? [] }]
      for (const { floorId, rows } of gridsByFloor) {
        // Conta X no grid (cressets manuais) e portas do andar.
        const gridX: Array<[number, number]> = []
        const gridDoors: Array<[number, number]> = []
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < rows[r].length; c++) {
            if (rows[r][c] === 'X') gridX.push([c, r])
            if (rows[r][c] === 'D') gridDoors.push([c, r])
          }
        }
        const floorCressets = parsed.cressets.filter(c => (c.floorId ?? '') === floorId)
        // Total de cressets do andar deve ser >= X manuais (pois portas adicionam flanqueadores)
        expect(
          floorCressets.length,
          `nível ${level.id} andar '${floorId}': cressets (${floorCressets.length}) devem ser >= X manuais (${gridX.length})`,
        ).toBeGreaterThanOrEqual(gridX.length)
        // Validação detalhada: cada cresset de X está na célula X; cressets de porta estão perto de portas
        for (const cresset of floorCressets) {
          const inXCell = gridX.some(
            ([c, r]) =>
              cresset.x >= c * TILE_SIZE &&
              cresset.x <= c * TILE_SIZE + TILE_SIZE &&
              cresset.z >= r * TILE_SIZE &&
              cresset.z <= r * TILE_SIZE + TILE_SIZE,
          )
          const nearDoor = gridDoors.some(
            ([c, r]) => {
              const doorCx = c * TILE_SIZE + TILE_SIZE / 2
              const doorCz = r * TILE_SIZE + TILE_SIZE / 2
              const dist = Math.hypot(cresset.x - doorCx, cresset.z - doorCz)
              return dist < 4 // cresset flanqueador a ~2.5m do centro da porta
            }
          )
          expect(inXCell || nearDoor, `nível ${level.id}: cresset em (${cresset.x},${cresset.z}) deve estar em X ou perto de porta`).toBe(true)
          // Calibração oficial da tocha: ÚNICA e central (sem override por nível).
          expect(cresset.color).toBe(LIGHTING_CONFIG.torchColor)
          expect(cresset.intensity).toBe(LIGHTING_CONFIG.torchIntensity)
          expect(cresset.distance).toBe(LIGHTING_CONFIG.torchDistance)
          expect(cresset.decay).toBe(LIGHTING_CONFIG.torchDecay)
          expect(cresset.flameHeight).toBe(LIGHTING_CONFIG.torchFlameHeight)
          expect(cresset.lightHeight).toBe(LIGHTING_CONFIG.torchLightHeight)
        }
      }
    }
  })
})

describe('computeDoorPlacement — regra sistemática de posicionamento de porta', () => {
  const T = 6 // TILE_SIZE
  const off = 0.05 // DOOR_WALL_OFFSET

  /** Helper: cria grid vazio com paredes nas posições dadas. */
  function makeGrid(rows: number, cols: number, walls: Array<[number, number]>): string[] {
    const grid = Array.from({ length: rows }, () => Array(cols).fill('.'))
    for (const [r, c] of walls) grid[r][c] = '#'
    return grid.map(row => row.join(''))
  }

  it('parede única de um lado (acima) → porta encosta na face sul, olha para sul', () => {
    // Grid 3x3: parede acima do centro
    const grid = makeGrid(3, 3, [[0, 1]])
    // Porta em (1,1), parede em (0,1) = acima
    const res = computeDoorPlacement(grid, 1, 1)
    expect(res.chosenWall).toBe('above')
    expect(res.x).toBeCloseTo(1 * T + T/2) // centro em X
    expect(res.z).toBeCloseTo(1 * T + off) // rente à face sul da parede acima
    expect(res.rotationY).toBeCloseTo(0) // olha para sul (+Z)
  })

  it('parede única de um lado (abaixo) → porta encosta na face norte, olha para norte', () => {
    const grid = makeGrid(3, 3, [[2, 1]])
    const res = computeDoorPlacement(grid, 1, 1)
    expect(res.chosenWall).toBe('below')
    expect(res.x).toBeCloseTo(1 * T + T/2)
    expect(res.z).toBeCloseTo(1 * T + T - off)
    expect(res.rotationY).toBeCloseTo(Math.PI) // olha para norte (-Z)
  })

  it('parede única de um lado (esquerda) → porta encosta na face leste, olha para leste', () => {
    const grid = makeGrid(3, 3, [[1, 0]])
    const res = computeDoorPlacement(grid, 1, 1)
    expect(res.chosenWall).toBe('left')
    expect(res.x).toBeCloseTo(1 * T + off)
    expect(res.z).toBeCloseTo(1 * T + T/2)
    expect(res.rotationY).toBeCloseTo(Math.PI/2) // olha para leste (+X)
  })

  it('parede única de um lado (direita) → porta encosta na face oeste, olha para oeste', () => {
    const grid = makeGrid(3, 3, [[1, 2]])
    const res = computeDoorPlacement(grid, 1, 1)
    expect(res.chosenWall).toBe('right')
    expect(res.x).toBeCloseTo(1 * T + T - off)
    expect(res.z).toBeCloseTo(1 * T + T/2)
    expect(res.rotationY).toBeCloseTo(-Math.PI/2) // olha para oeste (-X)
  })

  it('canto: duas paredes perpendiculares (acima + direita), lado aberto na direita → escolhe direita', () => {
    // Parede acima (0,1) e à direita (1,2)
    // Lado oposto à direita (1,2) é (1,3) = fora do grid = não '#', logo aberto
    // Lado oposto acima (0,1) é (-1,1) = fora do grid = não '#', logo aberto
    // Ambos têm lado aberto → prioridade S→N→E→O escolhe 'above' (prioridade 1)
    // Mas na prática, grid 3x3: acima é borda, direita é borda. Vamos testar com espaço interno.
    const grid = [
      '###', // row 0
      '#D#', // row 1: porta em (1,1), parede em (0,1)=acima, (1,2)=direita
      '...', // row 2: espaço aberto abaixo
    ]
    // Porta em (1,1): above=#, right=#, below=., left=#
    // Lado oposto 'above' = (-1,1) = OOB → não '#' = aberto
    // Lado oposto 'right' = (1,2) = '#' = FECHADO
    // Então só 'above' tem lado aberto → escolhe above
    const res = computeDoorPlacement(grid, 1, 1)
    expect(res.chosenWall).toBe('above')
    expect(res.rotationY).toBeCloseTo(0)
  })

  it('canto real: level-4b-secret D1 em (1,12) — acima=#, direita=#, ambos fechados → prioridade escolhe above', () => {
    // Grid do level-4b-secret (linhas 0-7, colunas 0-13)
    const grid = [
      '##############', // 0
      '#P...H....E.D#', // 1: D em col 12, above=# (row 0), right=# (col 13), below=., left=.
      '#XK..........#', // 2
      '#....S.......#', // 3
      '#........A..X#', // 4
      '#..A....C....#', // 5
      '#X..N.......T#', // 6
      '##############', // 7
    ]
    const res = computeDoorPlacement(grid, 1, 12)
    // above=#, right=#, below='.' (sem parede), left='.' (sem parede)
    // Candidatas com parede: above, right
    // Lado oposto 'above' = row 0 col 12 = '#' → FECHADO
    // Lado oposto 'right' = row 1 col 13 = '#' → FECHADO
    // Nenhuma tem lado aberto → fallback prioridade S→N→E→O entre as que têm parede:
    // above (prio 1) vs right (prio 2) → escolhe 'above'
    expect(res.chosenWall).toBe('above')
    expect(res.rotationY).toBeCloseTo(0) // olha para sul
    // Posição: face sul da parede acima (row 1 * TILE_SIZE + off)
    expect(res.x).toBeCloseTo(12 * T + T/2)
    expect(res.z).toBeCloseTo(1 * T + off)
  })

  it('canto real: level-1b-secret D1 em (1,10) — acima=#, direita=#, ambos fechados → prioridade escolhe above', () => {
    const grid = [
      '############', // 0
      '#P........D#', // 1: D em col 10, above=#, right=#, below=., left=.
      '#XH........#', // 2
      '#....K..N.A#', // 3
      '#..E...C..H#', // 4
      '#X.........#', // 5
      '#....E....X#', // 6
      '############', // 7
    ]
    const res = computeDoorPlacement(grid, 1, 10)
    // above=#, right=#, below='.' (sem parede), left='.' (sem parede)
    // Lado oposto above = row 0 = '#', right = col 11 = '#'
    // Nenhuma aberta → prioridade entre above (1) e right (2) → above
    expect(res.chosenWall).toBe('above')
    expect(res.rotationY).toBeCloseTo(0)
    expect(res.x).toBeCloseTo(10 * T + T/2)
    expect(res.z).toBeCloseTo(1 * T + off)
  })

  it('corredor estreito N-S: duas paredes opostas (esquerda + direita), prioridade E→O escolhe right', () => {
    const grid = [
      '#.#', // row 0
      '#D#', // row 1: porta em (1,1), left=#, right=#
      '#.#', // row 2
    ]
    const res = computeDoorPlacement(grid, 1, 1)
    // above=., below=., left=#, right=#
    // Lados opostos: left = col 0 = '#', right = col 2 = '#'
    // Ambos FECHADOS (paredes do corredor) → fallback prioridade entre left (3) e right (2) → right
    expect(res.chosenWall).toBe('right')
    expect(res.rotationY).toBeCloseTo(-Math.PI/2)
  })

  it('sem parede adjacente → porta centralizada olhando para sul (caso flutuante)', () => {
    const grid = makeGrid(3, 3, [])
    const res = computeDoorPlacement(grid, 1, 1)
    expect(res.chosenWall).toBe('none')
    expect(res.x).toBeCloseTo(1 * T + T/2)
    expect(res.z).toBeCloseTo(1 * T + T/2)
    expect(res.rotationY).toBeCloseTo(0)
  })

  it('level-5 D1 em (1,6) — corredor vertical (acima=#, abaixo=#), prioridade escolhe below', () => {
    const grid = [
      '##############################', // 0
      '#P....D....X.........X.......#', // 1: D em col 6, above=#, below=#
      '#.....###........###.........#', // 2
      '#............................#', // 3
      '#........#...................#', // 4
      '#............B......#........#', // 5
      '#.......###........###......H#', // 6
      '#..A.....................V...#', // 7
      '#................###.........#', // 8
      '#...........D..X.............#', // 9
      '#..............#.............#', // 10
      '#X...........................#', // 11
      '#..H......D............#.....#', // 12
      '#.........................X..#', // 13
      '##############################', // 14
    ]
    const res = computeDoorPlacement(grid, 1, 6)
    // above=#, below=#, left=., right=.
    // Lado oposto above = row 0 col 6 = '#', below = row 2 col 6 = '#'
    // Ambos FECHADOS → cai no fallback de prioridade: below (prio 0)
    expect(res.chosenWall).toBe('below')
    expect(res.rotationY).toBeCloseTo(Math.PI)
    expect(res.x).toBeCloseTo(6 * T + T/2)
    expect(res.z).toBeCloseTo(1 * T + T - off)
  })
})

describe('resolveSpawnFloorId (§7 fallback em cascata)', () => {
  const def = {
    id: 't',
    name: 'T',
    startFloorId: 'f1',
    floors: [
      { id: 'f1', height: 0, grid: ['###', '#P#', '###'] },
      { id: 'f2', height: 5, grid: ['###', '#.#', '###'] },
    ],
  }

  it('usa o floorId salvo quando ele existe no nível', () => {
    expect(resolveSpawnFloorId(def, 'f2')).toBe('f2')
    expect(resolveSpawnFloorId(def, 'f1')).toBe('f1')
  })

  it('floorId salvo inválido cai para startFloorId', () => {
    expect(resolveSpawnFloorId(def, 'floor-99')).toBe('f1')
  })

  it('sem floorId salvo usa startFloorId', () => {
    expect(resolveSpawnFloorId(def)).toBe('f1')
    expect(resolveSpawnFloorId(def, undefined)).toBe('f1')
  })

  it('startFloorId ausente cai para o andar com marcador P', () => {
    expect(resolveSpawnFloorId({ ...def, startFloorId: undefined })).toBe('f1')
  })

  it('sem P em nenhum andar cai para floors[0]', () => {
    const noP = {
      ...def,
      startFloorId: undefined,
      floors: [
        { id: 'a', height: 0, grid: ['###', '#.#', '###'] },
        { id: 'b', height: 5, grid: ['###', '#.#', '###'] },
      ],
    }
    expect(resolveSpawnFloorId(noP)).toBe('a')
  })

  it('startFloorId inválido cai para o andar com P', () => {
    expect(resolveSpawnFloorId({ ...def, startFloorId: 'nao-existe' })).toBe('f1')
  })

  it('nível legado (sem floors) retorna andar único ""', () => {
    expect(resolveSpawnFloorId({ id: 't', name: 'T', grid: ['###', '#P#', '###'] }, 'f1')).toBe('')
  })
})
