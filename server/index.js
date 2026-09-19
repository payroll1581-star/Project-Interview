import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import './db.js';
import authRoutes from './routes/auth.js';
import candidatesRoutes from './routes/candidates.js';
import interviewsRoutes from './routes/interviews.js';
import usersRoutes from './routes/users.js';
import evaluationTemplateRoutes from './routes/evaluation-template.js';
import activityLogRoutes from './routes/activity-log.js';

const app = express();
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

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
