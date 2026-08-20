import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  DoorDefinition,
  LevelDefinition,
  StairDefinition,
} from '../levels/LevelLoader'
import { humanizeLevelId } from '../levels/LevelLoader'
import { ALL_LEVELS } from '../levels/levels'
import { autoPairStairs, type StairFloor } from '../levels/stairPairing'
import { useGameStore } from '../state/gameStore'

type EditorTool =
  | 'wall'
  | 'floor'
  | 'player'
  | 'chaser'
  | 'shooter'
  | 'health'
  | 'ammo'
  | 'door'
  | 'cresset'
  | 'pillar'
  | 'stairUp'
  | 'stairDown'

const TOOL_CHAR: Record<EditorTool, string> = {
  wall: '#',
  floor: '.',
  player: 'P',
  chaser: 'E',
  shooter: 'S',
  health: 'H',
  ammo: 'A',
  door: 'D',
  cresset: 'X',
  pillar: 'O',
  stairUp: 'L',
  stairDown: 'l',
}

const TOOLS: Array<{ id: EditorTool; char: string; label: string; color: string }> = [
  { id: 'wall', char: '#', label: 'Parede', color: '#8a5a5e' },
  { id: 'floor', char: '.', label: 'Chão', color: '#777' },
  { id: 'player', char: 'P', label: 'Jogador', color: '#ffffff' },
  { id: 'chaser', char: 'E', label: 'Perseguidor', color: '#e2364a' },
  { id: 'shooter', char: 'S', label: 'Atirador', color: '#ff9f43' },
  { id: 'health', char: 'H', label: 'Vida', color: '#2ee07a' },
  { id: 'ammo', char: 'A', label: 'Munição', color: '#ffd24a' },
  { id: 'door', char: 'D', label: 'Porta', color: '#35e0c0' },
  { id: 'cresset', char: 'X', label: 'Cresset (luz)', color: '#ffb04a' },
  { id: 'pillar', char: 'O', label: 'Pilar (quebra visão)', color: '#9b8f7e' },
  { id: 'stairUp', char: 'L', label: 'Escada subir', color: '#4fc3ff' },
  { id: 'stairDown', char: 'l', label: 'Escada descer', color: '#b98cff' },
]

const CELL = 20
const DRAFT_KEY = 'crimson-halls-editor-draft'

/** Um andar no rascunho v2 do editor. */
interface FloorDraft {
  id: string
  name: string
  height: number
  grid: string[][]
  doorTargets: string[]
}

/** Rascunho v2 (multi-andar). A mesma chave de localStorage do v1. */
interface Draft {
  id: string
  name: string
  floors: FloorDraft[]
  stairs: StairDefinition[]
  startFloorId: string
}

function makeGrid(rows: number, cols: number): string[][] {
  const grid: string[][] = []
  for (let r = 0; r < rows; r++) {
    const row: string[] = []
    for (let c = 0; c < cols; c++) {
      const border = r === 0 || c === 0 || r === rows - 1 || c === cols - 1
      row.push(border ? '#' : '.')
    }
    grid.push(row)
  }
  return grid
}

/** Normaliza um grid vindo de JSON (string[][] ou string[] de linhas). */
function normalizeGrid(grid: unknown): string[][] {
  if (!Array.isArray(grid) || grid.length === 0) return []
  const rows = grid.map(row =>
    Array.isArray(row)
      ? row.map(cell => String(cell))
      : typeof row === 'string'
        ? (row as string).split('')
        : [],
  )
  if (rows.some(row => row.length === 0)) return []
  return rows
}

/** Carrega o rascunho; migra o formato v1 (grid raiz) para v2 (floors) em memória. */
function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data) return null

    // Draft v2: já tem floors.
    if (Array.isArray(data.floors) && data.floors.length > 0) {
      const floors: FloorDraft[] = data.floors
        .map((floor: Partial<FloorDraft>) => ({
          id: String(floor.id ?? 'floor-1'),
          name: String(floor.name ?? 'Andar 1'),
          height: Number(floor.height) || 0,
          grid: normalizeGrid(floor.grid),
          doorTargets: Array.isArray(floor.doorTargets)
            ? floor.doorTargets.map(String)
            : [],
        }))
        .filter((floor: FloorDraft) => floor.grid.length > 0)
      if (floors.length === 0) return null
      return {
        id: String(data.id ?? 'level-custom'),
        name: String(data.name ?? 'Nível Customizado'),
        floors,
        stairs: autoPairStairs(floors.map(toStairFloor)),
        startFloorId: floors.some((floor: FloorDraft) => floor.id === data.startFloorId)
          ? String(data.startFloorId)
          : floors[0].id,
      }
    }

    // Draft v1 (grid raiz): migra para um único andar.
    const grid = normalizeGrid(data.grid)
    if (grid.length === 0) return null
    const floor: FloorDraft = {
      id: 'floor-1',
      name: 'Andar 1',
      height: 0,
      grid,
      doorTargets: Array.isArray(data.doorTargets) ? data.doorTargets.map(String) : [],
    }
    return {
      id: String(data.id ?? 'level-custom'),
      name: String(data.name ?? 'Nível Customizado'),
      floors: [floor],
      stairs: [],
      startFloorId: floor.id,
    }
  } catch {
    return null
  }
}

function toStairFloor(floor: FloorDraft): StairFloor {
  return {
    id: floor.id,
    height: floor.height,
    grid: floor.grid.map(row => row.join('')),
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value) || min))
}

/** Gera as portas a partir das células 'D' do grid (D1, D2... em ordem de varredura). */
function buildDoors(grid: string[][], doorTargets: string[]): DoorDefinition[] {
  const doors: DoorDefinition[] = []
  let index = 0
  for (const row of grid) {
    for (const char of row) {
      if (char === 'D') {
        doors.push({
          marker: `D${index + 1}`,
          targetLevelId: doorTargets[index] ?? '',
          label: doorTargets[index] ? humanizeLevelId(doorTargets[index]) : `Porta ${index + 1}`,
        })
        index++
      }
    }
  }
  return doors
}

/** Células do grid que são portas, em ordem de varredura (para a UI de targets). */
function doorCellsOf(grid: string[][]): Array<{ r: number; c: number }> {
  const cells: Array<{ r: number; c: number }> = []
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 'D') cells.push({ r, c })
    }
  }
  return cells
}

/** Número do marcador ('L1' → 1, 'l2' → 2). 0 se malformado. */
function markerNumber(marker: string): number {
  const match = /^[Ll](\d+)$/.exec(marker)
  return match ? Number(match[1]) : 0
}

/** Remove o n-ésimo marcador (ordem de varredura) de um grid, virando chão. */
function clearNthMarker(grid: string[][], char: 'L' | 'l', n: number): string[][] {
  let count = 0
  return grid.map(row =>
    row.map(cell => {
      if (cell === char) {
        count++
        return count === n ? '.' : cell
      }
      return cell
    }),
  )
}

/** Célula do n-ésimo marcador (ordem de varredura), ou null se não existir. */
function markerCell(
  grid: string[][],
  char: 'L' | 'l',
  n: number,
): { r: number; c: number } | null {
  let count = 0
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === char) {
        count++
        if (count === n) return { r, c }
      }
    }
  }
  return null
}

/** Próximo id de andar único (floor-1, floor-2...). */
function nextFloorId(floors: FloorDraft[]): string {
  let max = 0
  for (const floor of floors) {
    const match = /^floor-(\d+)$/.exec(floor.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `floor-${max + 1}`
}

function drawGrid(grid: string[][], canvas: HTMLCanvasElement | null): void {
  if (!canvas) return
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  canvas.width = cols * CELL
  canvas.height = rows * CELL
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const markerColors: Record<string, string> = {
    P: '#ffffff',
    E: '#e2364a',
    S: '#ff9f43',
    H: '#2ee07a',
    A: '#ffd24a',
    D: '#35e0c0',
    X: '#ffb04a',
    L: '#4fc3ff',
    l: '#b98cff',
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r]?.[c] ?? '.'
      ctx.fillStyle = ch === '#' ? '#5a2a2e' : '#140a0c'
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL)
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.strokeRect(c * CELL + 0.5, r * CELL + 0.5, CELL, CELL)
      if (ch !== '#' && ch !== '.') {
        ctx.fillStyle = markerColors[ch] ?? '#cccccc'
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(ch, c * CELL + CELL / 2, r * CELL + CELL / 2)
      }
    }
  }
}

/**
 * Editor de níveis 2D (multi-andar, §6 do plano): abas de andares, ferramentas
 * de escada L/l com auto-correspondência, painel de escadas e export/import
 * com compatibilidade legada (1 andar sem escadas → formato antigo).
 */
export function LevelEditor() {
  const setPhase = useGameStore(state => state.setPhase)
  const playCustomLevel = useGameStore(state => state.playCustomLevel)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paintingRef = useRef(false)

  const [initialDraft] = useState(loadDraft)
  const [tool, setTool] = useState<EditorTool>('wall')
  const [levelName, setLevelName] = useState(initialDraft?.name ?? 'Nível Customizado')
  const [levelId, setLevelId] = useState(initialDraft?.id ?? 'level-custom')
  const [floors, setFloors] = useState<FloorDraft[]>(
    initialDraft?.floors ?? [
      { id: 'floor-1', name: 'Andar 1', height: 0, grid: makeGrid(12, 20), doorTargets: [] },
    ],
  )
  const [activeFloorIndex, setActiveFloorIndex] = useState(0)
  const [startFloorId, setStartFloorId] = useState(initialDraft?.startFloorId ?? 'floor-1')
  const [rowsInput, setRowsInput] = useState(initialDraft?.floors[0].grid.length ?? 12)
  const [colsInput, setColsInput] = useState(initialDraft?.floors[0].grid[0].length ?? 20)
  const [jsonText, setJsonText] = useState('')

  const activeFloor = floors[activeFloorIndex] ?? floors[0]

  // Escadas sempre derivadas dos marcadores L/l dos grids (auto-correspondência).
  const stairs = useMemo(
    () => autoPairStairs(floors.map(toStairFloor)),
    [floors],
  )

  const effectiveStartFloorId = floors.some(floor => floor.id === startFloorId)
    ? startFloorId
    : floors[0].id

  // Multi-andar: >1 andar, alguma escada ou algum marcador L/l presente
  // (preservar marcadores soltos em vez de perdê-los no formato legado).
  const multiFloor =
    floors.length > 1 ||
    stairs.length > 0 ||
    floors.some(floor => floor.grid.some(row => row.includes('L') || row.includes('l')))

  const definition: LevelDefinition = (() => {
    const id = levelId.trim() || 'level-custom'
    const name = levelName.trim() || 'Novo Nível'
    if (multiFloor) {
      return {
        id,
        name,
        floors: floors.map(floor => ({
          id: floor.id,
          name: floor.name.trim() || humanizeLevelId(floor.id),
          height: floor.height,
          grid: floor.grid.map(row => row.join('')),
          doors: buildDoors(floor.grid, floor.doorTargets),
        })),
        stairs,
        startFloorId: effectiveStartFloorId,
      }
    }
    return {
      id,
      name,
      grid: floors[0].grid.map(row => row.join('')),
      doors: buildDoors(floors[0].grid, floors[0].doorTargets),
    }
  })()

  // Desenha o grid do andar ativo sempre que muda.
  useEffect(() => {
    drawGrid(activeFloor.grid, canvasRef.current)
  }, [activeFloor])

  // Persiste o rascunho automaticamente (não perder trabalho ao recarregar).
  useEffect(() => {
    const draft: Draft = {
      id: levelId,
      name: levelName,
      floors,
      stairs,
      startFloorId: effectiveStartFloorId,
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // ignora
    }
  }, [levelId, levelName, floors, stairs, effectiveStartFloorId])

  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const c = Math.floor((clientX - rect.left) / CELL)
    const r = Math.floor((clientY - rect.top) / CELL)
    setFloors(prev =>
      prev.map((floor, index) => {
        if (index !== activeFloorIndex) return floor
        if (r < 0 || c < 0 || r >= floor.grid.length || c >= floor.grid[0].length) return floor
        const border =
          r === 0 || c === 0 || r === floor.grid.length - 1 || c === floor.grid[0].length - 1
        const char = TOOL_CHAR[tool]
        const next = floor.grid.map(row => [...row])
        if (char === 'P') {
          for (let rr = 0; rr < next.length; rr++) {
            for (let cc = 0; cc < next[0].length; cc++) {
              if (next[rr][cc] === 'P') next[rr][cc] = '.'
            }
          }
        }
        next[r][c] = border ? '#' : char
        return { ...floor, grid: next }
      }),
    )
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    paintingRef.current = true
    paintAt(event.clientX, event.clientY)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (paintingRef.current) paintAt(event.clientX, event.clientY)
  }

  const stopPainting = () => {
    paintingRef.current = false
  }

  const resize = () => {
    const rows = clampInt(rowsInput, 3, 60)
    const cols = clampInt(colsInput, 3, 80)
    setFloors(prev =>
      prev.map((floor, index) => {
        if (index !== activeFloorIndex) return floor
        const next: string[][] = []
        for (let r = 0; r < rows; r++) {
          next.push([])
          for (let c = 0; c < cols; c++) {
            const inside = r < floor.grid.length && c < floor.grid[0].length
            const val = inside ? floor.grid[r][c] : '.'
            next[r].push(r === 0 || c === 0 || r === rows - 1 || c === cols - 1 ? '#' : val)
          }
        }
        return { ...floor, grid: next }
      }),
    )
    setRowsInput(rows)
    setColsInput(cols)
  }

  const addFloor = () => {
    const template = floors[activeFloorIndex] ?? floors[floors.length - 1]
    const newFloor: FloorDraft = {
      id: nextFloorId(floors),
      name: `Andar ${floors.length + 1}`,
      height: Math.max(0, ...floors.map(floor => floor.height)) + 5,
      grid: template ? template.grid.map(row => [...row]) : makeGrid(12, 20),
      doorTargets: template ? [...template.doorTargets] : [],
    }
    setFloors([...floors, newFloor])
    setActiveFloorIndex(floors.length)
  }

  const removeFloor = () => {
    if (floors.length <= 1) return
    const removed = floors[activeFloorIndex]
    if (!window.confirm(`Remover o andar "${removed.name}"?`)) return
    const next = floors.filter((_, index) => index !== activeFloorIndex)
    setFloors(next)
    setActiveFloorIndex(Math.max(0, activeFloorIndex - 1))
    if (startFloorId === removed.id) setStartFloorId(next[0].id)
  }

  const updateFloor = (
    patch: Partial<Pick<FloorDraft, 'id' | 'name' | 'height'>>,
  ) => {
    const oldId = activeFloor.id
    setFloors(prev =>
      prev.map((floor, index) =>
        index === activeFloorIndex ? { ...floor, ...patch } : floor,
      ),
    )
    if (patch.id && patch.id !== oldId && startFloorId === oldId) {
      setStartFloorId(patch.id)
    }
  }

  const updateDoorTarget = (index: number, value: string) => {
    setFloors(prev =>
      prev.map((floor, floorIndex) => {
        if (floorIndex !== activeFloorIndex) return floor
        const next = [...floor.doorTargets]
        next[index] = value
        return { ...floor, doorTargets: next }
      }),
    )
  }

  /** Remove uma escada apagando os marcadores L (origem) e l (destino). */
  const removeStair = (stair: StairDefinition) => {
    const fromN = markerNumber(stair.fromMarker)
    const toN = markerNumber(stair.toMarker)
    setFloors(prev =>
      prev.map(floor => {
        if (floor.id === stair.fromFloor) {
          return { ...floor, grid: clearNthMarker(floor.grid, 'L', fromN) }
        }
        if (floor.id === stair.toFloor) {
          return { ...floor, grid: clearNthMarker(floor.grid, 'l', toN) }
        }
        return floor
      }),
    )
  }

  const toJson = () => JSON.stringify(definition, null, 2)

  const copyJson = async () => {
    const json = jsonText || toJson()
    if (jsonText === '') setJsonText(json)
    try {
      await navigator.clipboard.writeText(json)
    } catch {
      const textarea = document.getElementById('editor-json') as HTMLTextAreaElement | null
      textarea?.select()
    }
  }

  const downloadJson = () => {
    const json = jsonText || toJson()
    if (jsonText === '') setJsonText(json)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${definition.id || 'level'}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  /** Aplica uma LevelDefinition (import de JSON ou nível embutido) ao rascunho. */
  const applyDefinition = (def: LevelDefinition) => {
    if (def.name) setLevelName(def.name)
    if (def.id) setLevelId(def.id)
    if (def.floors && def.floors.length > 0) {
      const next: FloorDraft[] = def.floors.map(floor => ({
        id: floor.id,
        name: floor.name ?? humanizeLevelId(floor.id),
        height: floor.height,
        grid: normalizeGrid(floor.grid),
        doorTargets: (floor.doors ?? []).map(door => door.targetLevelId ?? ''),
      }))
      if (next.some(floor => floor.grid.length === 0)) throw new Error('grid inválido')
      setFloors(next)
      setStartFloorId(
        def.startFloorId && next.some(floor => floor.id === def.startFloorId)
          ? def.startFloorId
          : next[0].id,
      )
      setActiveFloorIndex(0)
      setRowsInput(next[0].grid.length)
      setColsInput(next[0].grid[0].length)
      return
    }
    if (!Array.isArray(def.grid) || def.grid.length === 0) throw new Error('grid inválido')
    const grid = normalizeGrid(def.grid)
    const single: FloorDraft = {
      id: 'floor-1',
      name: 'Andar 1',
      height: 0,
      grid,
      doorTargets: (def.doors ?? []).map(door => door.targetLevelId ?? ''),
    }
    setFloors([single])
    setStartFloorId(single.id)
    setActiveFloorIndex(0)
    setRowsInput(grid.length)
    setColsInput(grid[0].length)
  }

  const importJson = () => {
    try {
      applyDefinition(JSON.parse(jsonText) as LevelDefinition)
    } catch {
      alert('JSON de nível inválido.')
    }
  }

  const loadBuiltin = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const index = Number(event.target.value)
    event.target.value = ''
    const level = ALL_LEVELS[index]
    if (!level) return
    applyDefinition(level)
    setJsonText(JSON.stringify(level, null, 2))
  }

  const doorCells = doorCellsOf(activeFloor.grid)

  return (
    <div className="editor screen">
      <div className="editor-header">
        <h2 className="editor-title">Editor de Níveis</h2>
        <button className="menu-button editor-back" onClick={() => setPhase('menu')}>
          Voltar
        </button>
      </div>

      <div className="editor-floor-tabs">
        {floors.map((floor, index) => (
          <button
            key={floor.id}
            className={`editor-floor-tab${index === activeFloorIndex ? ' active' : ''}`}
            onClick={() => setActiveFloorIndex(index)}
          >
            {floor.name} ({floor.height})
          </button>
        ))}
        <button className="menu-button editor-floor-add" onClick={addFloor}>
          + Andar
        </button>
        {floors.length > 1 && (
          <button className="menu-button editor-floor-remove" onClick={removeFloor}>
            Remover andar
          </button>
        )}
      </div>

      <div className="editor-floor-fields">
        <label className="editor-field">
          ID do andar
          <input value={activeFloor.id} onChange={event => updateFloor({ id: event.target.value })} />
        </label>
        <label className="editor-field">
          Nome do andar
          <input value={activeFloor.name} onChange={event => updateFloor({ name: event.target.value })} />
        </label>
        <label className="editor-field">
          Altura (Y)
          <input
            type="number"
            min={0}
            step="any"
            value={activeFloor.height}
            onChange={event => updateFloor({ height: Number(event.target.value) || 0 })}
          />
        </label>
        <label className="editor-field">
          Andar inicial
          <select
            className="editor-select"
            value={effectiveStartFloorId}
            onChange={event => setStartFloorId(event.target.value)}
          >
            {floors.map(floor => (
              <option key={floor.id} value={floor.id}>
                {floor.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="editor-tools">
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`tool-button${tool === t.id ? ' active' : ''}`}
            style={{ borderColor: t.color, color: t.color }}
            onClick={() => setTool(t.id)}
          >
            <span className="tool-char">{t.char}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="editor-controls">
        <label className="editor-field">
          Nome
          <input value={levelName} onChange={event => setLevelName(event.target.value)} />
        </label>
        <label className="editor-field">
          ID
          <input value={levelId} onChange={event => setLevelId(event.target.value)} />
        </label>
        <label className="editor-field">
          Linhas
          <input
            type="number"
            min={3}
            max={60}
            value={rowsInput}
            onChange={event => setRowsInput(Number(event.target.value))}
          />
        </label>
        <label className="editor-field">
          Colunas
          <input
            type="number"
            min={3}
            max={80}
            value={colsInput}
            onChange={event => setColsInput(Number(event.target.value))}
          />
        </label>
        <button className="menu-button" onClick={resize}>
          Redimensionar
        </button>
        <button className="menu-button primary" onClick={() => playCustomLevel(definition)}>
          Testar no jogo
        </button>
      </div>

      <div className="editor-main">
        <div className="editor-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="editor-canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopPainting}
            onPointerLeave={stopPainting}
          />
        </div>
        <div className="editor-side">
          <div className="editor-json-actions">
            <button className="menu-button" onClick={copyJson}>
              Copiar JSON
            </button>
            <button className="menu-button" onClick={downloadJson}>
              Baixar .json
            </button>
            <select className="editor-select" defaultValue="" onChange={loadBuiltin}>
              <option value="">Carregar nível existente…</option>
              {ALL_LEVELS.map((level, index) => (
                <option key={level.id} value={index}>
                  {level.name}
                </option>
              ))}
            </select>
            <button className="menu-button" onClick={importJson}>
              Importar JSON
            </button>
          </div>

          {doorCells.length > 0 && (
            <div className="editor-door-list">
              <span className="editor-door-title">Portas ({doorCells.length})</span>
              {doorCells.map((cell, index) => (
                <label key={index} className="editor-door-row">
                  <span>
                    D{index + 1} ({cell.r},{cell.c}) →
                  </span>
                  <input
                    value={activeFloor.doorTargets[index] ?? ''}
                    placeholder="id do nível destino"
                    onChange={event => updateDoorTarget(index, event.target.value)}
                  />
                </label>
              ))}
            </div>
          )}

          {stairs.length > 0 && (
            <div className="editor-stair-list">
              <span className="editor-stair-title">Escadas ({stairs.length})</span>
              {stairs.map(stair => {
                const fromFloor = floors.find(floor => floor.id === stair.fromFloor)
                const toFloor = floors.find(floor => floor.id === stair.toFloor)
                const fromCell = fromFloor
                  ? markerCell(fromFloor.grid, 'L', markerNumber(stair.fromMarker))
                  : null
                const toCell = toFloor
                  ? markerCell(toFloor.grid, 'l', markerNumber(stair.toMarker))
                  : null
                return (
                  <div key={stair.id} className="editor-stair-row">
                    <span>
                      {stair.fromMarker} {stair.fromFloor}
                      {fromCell ? ` (${fromCell.r},${fromCell.c})` : ''} → {stair.toFloor}
                      {toCell ? ` (${toCell.r},${toCell.c})` : ''} ({stair.direction})
                    </span>
                    <button className="menu-button" onClick={() => removeStair(stair)}>
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <textarea
            id="editor-json"
            className="editor-json"
            value={jsonText}
            onChange={event => setJsonText(event.target.value)}
            placeholder={
              'Cole aqui um JSON de nível (ou use "Copiar JSON") e depois clique em "Importar JSON".\n\n{"id":"level-custom","name":"Meu Nível","grid":["####","#P.#","#E.#","####"]}\n\nMulti-andar: {"id":"meu-nivel","name":"Torre","startFloorId":"floor-1","stairs":[],"floors":[{"id":"floor-1","name":"Térreo","height":0,"grid":["####","#P.L#","####"]},{"id":"floor-2","name":"Topo","height":5,"grid":["####","#..l#","####"]}]}'
            }
          />
        </div>
      </div>
    </div>
  )
}