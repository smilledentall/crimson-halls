import fs from 'fs';
import path from 'path';

const levelsDir = path.join(process.cwd(), 'src/levels/levels');
const files = ['level-7.ts', 'level-10.ts', 'level-11.ts', 'level-12.ts', 'level-13.ts', 'level-14.ts', 'level-15.ts'];

for (const file of files) {
  const content = fs.readFileSync(path.join(levelsDir, file), 'utf-8');
  const gridMatch = content.match(/grid:\s*\[([\s\S]*?)\n\s*\]/);
  if (!gridMatch) continue;
  const gridText = gridMatch[1];
  const lines = gridText.split('\n')
    .map(l => l.trim().replace(/^['"`]/, '').replace(/['"`],?$/, ''))
    .filter(l => l.length > 0);
  if (lines.length === 0) continue;
  console.log(`\n=== ${file} ===`);
  console.log(`Rows: ${lines.length}`);
  lines.forEach((line, i) => {
    console.log(`  Row ${i}: len=${line.length} | ${line}`);
  });
  const cols = lines[0].length;
  const consistent = lines.every(l => l.length === cols);
  console.log(`  Cols: ${cols} | Consistent: ${consistent}`);
}