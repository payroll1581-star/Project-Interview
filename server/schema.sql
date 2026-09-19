CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'interviewer')),
  position TEXT
);

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  position TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Applied', 'Screening', 'Interview Scheduled', 'Offer', 'Rejected')),
  resume_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Phone', 'Technical', 'Onsite', 'Final')),
  status TEXT NOT NULL CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')) DEFAULT 'Scheduled',
  location TEXT,
  notes TEXT,
  eval_total INTEGER,
  eval_result TEXT CHECK (eval_result IN ('Hire', 'Compare', 'Reject')),
  eval_notes TEXT,
  eval_interviewer_signature TEXT,
  eval_interviewer_position TEXT
);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(date);

CREATE TABLE IF NOT EXISTS evaluation_sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES evaluation_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_section ON evaluation_criteria(section_id);

CREATE TABLE IF NOT EXISTS evaluation_scores (
  interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  section_name TEXT NOT NULL,
  criterion_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  PRIMARY KEY (interview_id, sort_order)
);

CREATE TABLE IF NOT EXISTS interview_interviewers (
  interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (interview_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_interview_interviewers_user ON interview_interviewers(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

-- actor_name/entity_label are denormalized snapshots so history stays readable
-- after the acting user or the affected record is later deleted.
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_label TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
