// Builds the React app as one self-contained HTML file and drops it into the Apps Script project.
//   npm run build:gas   ->   ../GAS/webapp/Index.html   (override with GAS_WEBAPP_DIR)
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, process.env.GAS_WEBAPP_DIR ?? '../GAS/webapp');
const tmpDir = resolve(root, 'dist-gas');

execSync(`npx tsc -b && npx vite build --mode gas --outDir "${tmpDir}" --emptyOutDir`, { cwd: root, stdio: 'inherit' });

const built = resolve(tmpDir, 'index.html');
if (!existsSync(built)) throw new Error('vite did not produce index.html');
mkdirSync(outDir, { recursive: true });
copyFileSync(built, resolve(outDir, 'Index.html'));
rmSync(tmpDir, { recursive: true, force: true });

const kb = Math.round(statSync(resolve(outDir, 'Index.html')).size / 1024);
console.log(`\nWrote ${resolve(outDir, 'Index.html')} (${kb} KB)`);
