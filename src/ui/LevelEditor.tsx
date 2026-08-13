import { useEffect, useRef, useState } from 'react'
import type { DoorDefinition, LevelDefinition } from '../levels/LevelLoader'
import { LEVELS } from '../levels/levels'
import { useGameStore } from '../state/gameStore'

type EditorTool = 'wall' | 'floor' | 'player' | 'chaser' | 'shooter' | 'health' | 'ammo' | 'door' | 'cresset'

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
]

const CELL = 20
const DRAFT_KEY = 'crimson-halls-editor-draft'

interface Draft {
  id: string
  name: string
  grid: string[][]
  doorTargets: string[]
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

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Draft
    if (!Array.isArray(data.grid) || data.grid.length === 0 || !Array.isArray(data.grid[0]))
      return null
    return data
  } catch {
    return null
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
          label: doorTargets[index] || `Porta ${index + 1}`,
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
 * Editor de níveis 2D: grid clicável, exporta/importa no formato que o
 * LevelLoader consome ({ id, name, grid }) e permite testar o nível no jogo.
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
  const [rowsInput, setRowsInput] = useState(initialDraft?.grid.length ?? 12)
  const [colsInput, setColsInput] = useState(initialDraft?.grid[0].length ?? 20)
  const [grid, setGrid] = useState<string[][]>(initialDraft?.grid ?? makeGrid(12, 20))
  const [doorTargets, setDoorTargets] = useState<string[]>(initialDraft?.doorTargets ?? [])
  const [jsonText, setJsonText] = useState('')

  const definition: LevelDefinition = {
    id: levelId.trim() || 'level-custom',
    name: levelName.trim() || 'Novo Nível',
    grid: grid.map(row => row.join('')),
    doors: buildDoors(grid, doorTargets),
  }

  // Desenha o grid sempre que muda.
  useEffect(() => {
    drawGrid(grid, canvasRef.current)
  }, [grid])

  // Persiste o rascunho automaticamente (não perder trabalho ao recarregar).
  useEffect(() => {
    const draft: Draft = { id: levelId, name: levelName, grid, doorTargets }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // ignora
    }
  }, [levelId, levelName, grid, doorTargets])

  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const c = Math.floor((clientX - rect.left) / CELL)
    const r = Math.floor((clientY - rect.top) / CELL)
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return
    const border = r === 0 || c === 0 || r === grid.length - 1 || c === grid[0].length - 1
    const char = TOOL_CHAR[tool]
    setGrid(prev => {
      const next = prev.map(row => [...row])
      if (char === 'P') {
        for (let rr = 0; rr < next.length; rr++) {
          for (let cc = 0; cc < next[0].length; cc++) {
            if (next[rr][cc] === 'P') next[rr][cc] = '.'
          }
        }
      }
      next[r][c] = border ? '#' : char
      return next
    })
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
    setGrid(prev => {
      const next: string[][] = []
      for (let r = 0; r < rows; r++) {
        next.push([])
        for (let c = 0; c < cols; c++) {
          const inside = r < prev.length && c < prev[0].length
          const val = inside ? prev[r][c] : '.'
          next[r].push(r === 0 || c === 0 || r === rows - 1 || c === cols - 1 ? '#' : val)
        }
      }
      return next
    })
    setRowsInput(rows)
    setColsInput(cols)
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

  const importJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as LevelDefinition
      if (!Array.isArray(parsed.grid) || parsed.grid.length === 0) throw new Error('grid inválido')
      const parsedGrid = parsed.grid.map(row => row.split(''))
      setGrid(parsedGrid)
      setRowsInput(parsedGrid.length)
      setColsInput(parsedGrid[0].length)
      if (parsed.name) setLevelName(parsed.name)
      if (parsed.id) setLevelId(parsed.id)
      if (Array.isArray(parsed.doors)) {
        setDoorTargets(parsed.doors.map(door => door.targetLevelId ?? ''))
      }
    } catch {
      alert('JSON de nível inválido.')
    }
  }

  const loadBuiltin = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const index = Number(event.target.value)
    event.target.value = ''
    const level = LEVELS[index]
    if (!level) return
    setGrid(level.grid.map(row => row.split('')))
    setLevelName(level.name)
    setLevelId(level.id)
    setRowsInput(level.grid.length)
    setColsInput(level.grid[0].length)
    setDoorTargets((level.doors ?? []).map(door => door.targetLevelId ?? ''))
    setJsonText(JSON.stringify(level, null, 2))
  }

  const doorCells = doorCellsOf(grid)

  return (
    <div className="editor screen">
      <div className="editor-header">
        <h2 className="editor-title">Editor de Níveis</h2>
        <button className="menu-button editor-back" onClick={() => setPhase('menu')}>
          Voltar
        </button>
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
              {LEVELS.map((level, index) => (
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
                    value={doorTargets[index] ?? ''}
                    placeholder="id do nível destino"
                    onChange={event => {
                      const next = [...doorTargets]
                      next[index] = event.target.value
                      setDoorTargets(next)
                    }}
                  />
                </label>
              ))}
            </div>
          )}

          <textarea
            id="editor-json"
            className="editor-json"
            value={jsonText}
            onChange={event => setJsonText(event.target.value)}
            placeholder={
              'Cole aqui um JSON de nível (ou use "Copiar JSON") e depois clique em "Importar JSON".\n\n{"id":"level-custom","name":"Meu Nível","grid":["####","#P.#","#E.#","####"]}'
            }
          />
        </div>
      </div>
    </div>
  )
}
