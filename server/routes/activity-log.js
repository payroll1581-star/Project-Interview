import { Router } from 'express';
import { db } from '../db.js';
import { serializeActivityLogEntry } from '../lib/serialize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const listRecent = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 200');

router.use(requireAuth, requireRole('admin'));

router.get('/', (req, res) => {
  res.json(listRecent.all().map(serializeActivityLogEntry));
});

export default router;
