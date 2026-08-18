import { LevelLoader } from '../src/levels/LevelLoader';
import { ALL_LEVELS } from '../src/levels/levels';

const loader = new LevelLoader();

const targetIds = ['level-1', 'level-4', 'level-4b-secret', 'level-5'];
for (const lvl of ALL_LEVELS) {
  if (!targetIds.includes(lvl.id)) continue;
  const parsed = loader.parse(lvl);
  const doors = parsed.doors.length;
  const cressets = parsed.cressets.length;
  let gridX = 0;
  for (const row of lvl.grid) {
    for (const ch of row) if (ch === 'X') gridX++;
  }
  console.log(`${lvl.id}: doors=${doors}, gridX=${gridX}, total cressets=${cressets} (+${cressets - gridX} from doors)`);
  parsed.doors.forEach((d, i) => console.log(`  D${i+1}: (${d.x.toFixed(1)},${d.z.toFixed(1)}) rot=${d.rotationY.toFixed(2)}`));
  parsed.cressets.forEach(cr => {
    const nearDoor = parsed.doors.some(d => Math.hypot(cr.x - d.x, cr.z - d.z) < 4);
    if (nearDoor) console.log(`  flanking: (${cr.x.toFixed(1)},${cr.z.toFixed(1)}) mounted=${cr.mounted}`);
  });
}