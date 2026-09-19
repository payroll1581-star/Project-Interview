import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { generateId } from './lib/ids.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// DB_PATH lets tests point at an isolated ':memory:' database instead of the real dev DB.
const dbPath = process.env.DB_PATH ?? join(__dirname, 'data', 'app.db');

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

function ensureColumn(table, column, definition) {
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('users', 'position', 'TEXT');
ensureColumn('interviews', 'eval_interviewer_signature', 'TEXT');
ensureColumn('interviews', 'eval_interviewer_position', 'TEXT');

// Default, admin-editable evaluation template — seeded once if empty. Purely placeholder
// content: 3 sections, 20 criteria total (20 * 5 = 100 points), meant to be renamed/replaced
// via the Evaluation Criteria admin page.
const DEFAULT_TEMPLATE = [
  {
    name: 'Professional Competency',
    criteria: [
      'Job Knowledge / Working Experience',
      'Leadership Skill / Problem Solving',
      'People Management / Teamwork',
      'Language Skill (English / Japanese)',
      'Education Background',
      'Company / Product Knowledge',
      'Suitability for Required Position',
    ],
  },
  {
    name: 'Personal Attributes',
    criteria: [
      'Personality & Appearance',
      'Communication Skill',
      'Working Attitude / Self Motivation',
      'Confidence & Composure',
      'Adaptability',
      'Integrity & Honesty',
      'Time Management',
    ],
  },
  {
    name: 'Job Fit & Motivation',
    criteria: [
      'Understanding of Role Responsibilities',
      'Career Goals Alignment',
      'Availability / Notice Period',
      'Motivation for Applying',
      'Salary Expectation Fit',
      'Overall Impression',
    ],
  },
];

const sectionCount = db.prepare('SELECT COUNT(*) AS count FROM evaluation_sections').get().count;
if (sectionCount === 0) {
  const insertSection = db.prepare(
    'INSERT INTO evaluation_sections (id, name, sort_order) VALUES (?, ?, ?)',
  );
  const insertCriterion = db.prepare(
    'INSERT INTO evaluation_criteria (id, section_id, name, sort_order) VALUES (?, ?, ?, ?)',
  );
  const seedTemplate = db.transaction(() => {
    DEFAULT_TEMPLATE.forEach((section, sectionIndex) => {
      const sectionId = generateId('sec');
      insertSection.run(sectionId, section.name, sectionIndex);
      section.criteria.forEach((name, criterionIndex) => {
        insertCriterion.run(generateId('crit'), sectionId, name, criterionIndex);
      });
    });
  });
  seedTemplate();
}

// One-time backfill: interviews completed under the old fixed 10-criteria model stored their
// scores as flat eval_* columns on `interviews`. Migrate those into evaluation_scores under a
// "Legacy Evaluation" section so all evaluations, old and new, read from one place. Only
// relevant for a database that still has those old columns (a fresh install never will).
const LEGACY_CRITERIA_COLUMNS = [
  ['eval_job_knowledge', 'Job Knowledge / Working Experience'],
  ['eval_leadership', 'Leadership skill / Problem Solving'],
  ['eval_people_management', 'People Management / Teamwork'],
  ['eval_personality_appearance', 'Personality & Appearance'],
  ['eval_communication_skill', 'Communication Skill'],
  ['eval_working_attitude', 'Working Attitude / Self Motivation'],
  ['eval_language_skill', 'Language Skill (English / Japanese)'],
  ['eval_education_background', 'Education Background'],
  ['eval_suitability', 'Suitability for required position'],
  ['eval_company_knowledge', 'Company / Product Knowledge'],
];

const scoresCount = db.prepare('SELECT COUNT(*) AS count FROM evaluation_scores').get().count;
const hasLegacyColumns = LEGACY_CRITERIA_COLUMNS.every(([col]) => hasColumn('interviews', col));

if (scoresCount === 0 && hasLegacyColumns) {
  const legacyColumnList = LEGACY_CRITERIA_COLUMNS.map(([col]) => col).join(', ');
  const legacyRows = db
    .prepare(`SELECT id, ${legacyColumnList} FROM interviews WHERE eval_total IS NOT NULL`)
    .all();

  if (legacyRows.length > 0) {
    const insertScore = db.prepare(
      `INSERT INTO evaluation_scores (interview_id, sort_order, section_name, criterion_name, score)
       VALUES (?, ?, 'Legacy Evaluation', ?, ?)`,
    );
    const migrateLegacy = db.transaction(() => {
      for (const row of legacyRows) {
        LEGACY_CRITERIA_COLUMNS.forEach(([col, label], index) => {
          const score = row[col];
          if (score !== null && score !== undefined) {
            insertScore.run(row.id, index, label, score);
          }
        });
      }
    });
    migrateLegacy();
  }
}
