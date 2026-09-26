// Production entry point: one process serves the built frontend (dist/) and the API on PORT.
// Usage: npm run build   (once, and after every update)   then   npm start
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(join(root, 'dist', 'index.html'))) {
  console.error('dist/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

process.env.NODE_ENV = 'production';
await import('../server/index.js');
