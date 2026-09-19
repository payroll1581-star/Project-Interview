import 'dotenv/config';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { db } from './db.js';
import authRoutes from './routes/auth.js';
import candidatesRoutes from './routes/candidates.js';
import interviewsRoutes from './routes/interviews.js';
import usersRoutes from './routes/users.js';
import evaluationTemplateRoutes from './routes/evaluation-template.js';
import activityLogRoutes from './routes/activity-log.js';

export const app = express();
app.use(helmet());

// Same-origin only by default (the Vite dev proxy makes browser requests same-origin,
// so no cross-origin access needs to be granted). Set CORS_ORIGIN to a comma-separated
// allowlist if the frontend is ever deployed on a different origin than this API.
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false, credentials: true }));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/evaluation-template', evaluationTemplateRoutes);
app.use('/api/activity-log', activityLogRoutes);

// In production, serve the built frontend (npm run build's dist/) from this same process/port,
// so one container can host both instead of needing separate frontend hosting + CORS setup.
// Dev is unaffected: NODE_ENV isn't 'production' there, and the Vite dev server handles the
// frontend on its own port (proxying /api/* to this server) instead.
if (process.env.NODE_ENV === 'production') {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const distDir = join(__dirname, '..', 'dist');
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(join(distDir, 'index.html'));
    });
  }
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Tests import `app` directly (via supertest) without wanting a real port bound.
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT ?? 3001;
  const server = app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
