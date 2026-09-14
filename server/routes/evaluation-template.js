import { Router } from 'express';
import { db } from '../db.js';
import { generateId } from '../lib/ids.js';
import { serializeEvaluationSection } from '../lib/serialize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const listSections = db.prepare('SELECT * FROM evaluation_sections ORDER BY sort_order');
const listCriteriaForSection = db.prepare(
  'SELECT * FROM evaluation_criteria WHERE section_id = ? ORDER BY sort_order',
);
const getSection = db.prepare('SELECT * FROM evaluation_sections WHERE id = ?');
const getCriterion = db.prepare('SELECT * FROM evaluation_criteria WHERE id = ?');
const maxSectionOrder = db.prepare(
  'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM evaluation_sections',
);
const maxCriterionOrder = db.prepare(
  'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM evaluation_criteria WHERE section_id = ?',
);
const insertSection = db.prepare(
  'INSERT INTO evaluation_sections (id, name, sort_order) VALUES (?, ?, ?)',
);
const insertCriterion = db.prepare(
  'INSERT INTO evaluation_criteria (id, section_id, name, sort_order) VALUES (?, ?, ?, ?)',
);
const updateSectionName = db.prepare('UPDATE evaluation_sections SET name = ? WHERE id = ?');
const updateCriterionName = db.prepare('UPDATE evaluation_criteria SET name = ? WHERE id = ?');
const deleteSection = db.prepare('DELETE FROM evaluation_sections WHERE id = ?');
const deleteCriterion = db.prepare('DELETE FROM evaluation_criteria WHERE id = ?');

function loadTemplate() {
  return listSections.all().map((section) =>
    serializeEvaluationSection(section, listCriteriaForSection.all(section.id)),
  );
}

router.use(requireAuth);

router.get('/', (req, res) => {
  res.json(loadTemplate());
});

router.post('/sections', requireRole('admin'), (req, res) => {
  const { name } = req.body ?? {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required.' });
  }
  const sortOrder = maxSectionOrder.get().maxOrder + 1;
  insertSection.run(generateId('sec'), name.trim(), sortOrder);
  res.status(201).json(loadTemplate());
});

router.patch('/sections/:id', requireRole('admin'), (req, res) => {
  const existing = getSection.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Section not found.' });
  }
  const { name } = req.body ?? {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required.' });
  }
  updateSectionName.run(name.trim(), req.params.id);
  res.json(loadTemplate());
});

router.delete('/sections/:id', requireRole('admin'), (req, res) => {
  const existing = getSection.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Section not found.' });
  }
  deleteSection.run(req.params.id);
  res.json(loadTemplate());
});

router.post('/criteria', requireRole('admin'), (req, res) => {
  const { sectionId, name } = req.body ?? {};
  if (!sectionId || !name || !name.trim()) {
    return res.status(400).json({ error: 'sectionId and name are required.' });
  }
  if (!getSection.get(sectionId)) {
    return res.status(404).json({ error: 'Section not found.' });
  }
  const sortOrder = maxCriterionOrder.get(sectionId).maxOrder + 1;
  insertCriterion.run(generateId('crit'), sectionId, name.trim(), sortOrder);
  res.status(201).json(loadTemplate());
});

router.patch('/criteria/:id', requireRole('admin'), (req, res) => {
  const existing = getCriterion.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Criterion not found.' });
  }
  const { name } = req.body ?? {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required.' });
  }
  updateCriterionName.run(name.trim(), req.params.id);
  res.json(loadTemplate());
});

router.delete('/criteria/:id', requireRole('admin'), (req, res) => {
  const existing = getCriterion.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Criterion not found.' });
  }
  deleteCriterion.run(req.params.id);
  res.json(loadTemplate());
});

export default router;
