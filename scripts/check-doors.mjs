import fs from 'fs'
import path from 'path'

// Verifica cada porta (D) do grid: se toca parede ('#') em pelo menos um lado.
// Uso: npx tsx scripts/check-doors.mjs level-7 level-9 ...
const levelsDir = path.join(process.cwd(), 'src/levels/levels')
const targets = process.argv.slice(2)

for (const id of targets) {
  const content = fs.readFileSync(path.join(levelsDir, `${id}.ts`), 'utf-8')
  const gridMatch = content.match(/grid:\s*\[([\s\S]*?)\n\s*\]/)
  if (!gridMatch) continue
  const lines = gridMatch[1]
    .split('\n')
    .map(l => l.trim().replace(/^['"`]/, '').replace(/['"`],?$/, ''))
    .filter(l => l.length > 0)
  const grid = lines.map(l => l.split(''))
  const doors = []
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 'D') doors.push([r, c])
    }
  }
  const results = doors.map(([r, c]) => {
    const left = grid[r][c - 1] ?? null
    const right = grid[r][c + 1] ?? null
    const up = grid[r - 1]?.[c] ?? null
    const down = grid[r + 1]?.[c] ?? null
    const touching = [left, right, up, down].includes('#')
    return `D@(${r},${c}) left=${left} right=${right} up=${up} down=${down} ${touching ? 'OK' : 'FLUTUANTE'}`
  })
  console.log(`\n=== ${id} (${doors.length} porta(s)) ===`)
  for (const res of results) console.log('  ' + res)
}