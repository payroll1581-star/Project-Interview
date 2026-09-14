import express from 'express';
import './db.js';
import authRoutes from './routes/auth.js';
import candidatesRoutes from './routes/candidates.js';
import interviewsRoutes from './routes/interviews.js';
import usersRoutes from './routes/users.js';
import evaluationTemplateRoutes from './routes/evaluation-template.js';

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/evaluation-template', evaluationTemplateRoutes);

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
