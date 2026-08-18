import fs from 'fs'
import path from 'path'

// Flood-fill do spawn (P) contando marcadores alcançáveis/inacessíveis.
// Uso: npx tsx scripts/check-floodfill.mjs level-7 level-9 ...
const levelsDir = path.join(process.cwd(), 'src/levels/levels')
const targets = process.argv.slice(2)

for (const id of targets) {
  const file = `${id}.ts`
  const content = fs.readFileSync(path.join(levelsDir, file), 'utf-8')
  const gridMatch = content.match(/grid:\s*\[([\s\S]*?)\n\s*\]/)
  if (!gridMatch) {
    console.log(`${id}: SEM GRID`)
    continue
  }
  const lines = gridMatch[1]
    .split('\n')
    .map(l => l.trim().replace(/^['"`]/, '').replace(/['"`],?$/, ''))
    .filter(l => l.length > 0)
  const grid = lines.map(l => l.split(''))
  const rows = grid.length
  const cols = grid[0].length

  let start = null
  const markers = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c]
      if (ch === 'P') start = [r, c]
      else if ('ESKTHADVCBNXlL'.includes(ch)) markers.push([r, c, ch])
    }
  }

  if (!start) {
    console.log(`${id}: SEM SPAWN (P)`)
    continue
  }

  const visited = new Set()
  const queue = [[start[0], start[1]]]
  visited.add(`${start[0]},${start[1]}`)
  while (queue.length > 0) {
    const [r, c] = queue.shift()
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
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
  const consistent = lines.every(l => l.length === cols)
  const minLen = Math.min(...lines.map(l => l.length))
  const maxLen = Math.max(...lines.map(l => l.length))
  console.log(
    `${id}: ${rows}x${cols} cols | consistent=${consistent} (min ${minLen}/max ${maxLen}) | ` +
      (unreachable.length === 0
        ? 'TODOS os marcadores alcançáveis'
        : `INACESSÁVEIS: ${unreachable.map(([r, c, ch]) => `${ch}@(${r},${c})`).join(', ')}`),
  )
}