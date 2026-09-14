import bcrypt from 'bcryptjs';
import { db } from './db.js';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n, hour) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Repeats a 10-value scoring pattern twice to fill the 20-criterion default template.
function repeatPattern(pattern) {
  return [...pattern, ...pattern];
}

const users = [
  { id: 'admin', name: 'Admin', email: 'admin@example.com', password: 'admin123', role: 'admin' },
  { id: 'u1', name: 'Priya Nair', email: 'priya.nair@example.com', password: 'interview123', role: 'interviewer', position: 'Senior Software Engineer' },
  { id: 'u2', name: 'Daniel Cho', email: 'daniel.cho@example.com', password: 'interview123', role: 'interviewer', position: 'Engineering Manager' },
  { id: 'u3', name: 'Sam Osei', email: 'sam.osei@example.com', password: 'interview123', role: 'interviewer', position: 'QA Lead' },
  { id: 'u4', name: 'Hana Suzuki', email: 'hana.suzuki@example.com', password: 'interview123', role: 'interviewer', position: 'Product Designer' },
];

const candidates = [
  { id: 'c1', name: 'Ava Thompson', email: 'ava.thompson@example.com', phone: '(555) 012-3344', position: 'Frontend Engineer', status: 'Interview Scheduled', resumeUrl: 'https://example.com/resumes/ava-thompson.pdf', notes: 'Strong React background, referred by internal team.', createdAt: daysAgo(28) },
  { id: 'c2', name: 'Liam Chen', email: 'liam.chen@example.com', phone: '(555) 234-9981', position: 'Backend Engineer', status: 'Screening', createdAt: daysAgo(21) },
  { id: 'c3', name: 'Sofia Ramirez', email: 'sofia.ramirez@example.com', phone: '(555) 445-1123', position: 'Product Designer', status: 'Offer', resumeUrl: 'https://example.com/resumes/sofia-ramirez.pdf', notes: 'Excellent portfolio, offer extended after final round.', createdAt: daysAgo(25) },
  { id: 'c4', name: 'Noah Patel', email: 'noah.patel@example.com', phone: '(555) 667-2290', position: 'Data Analyst', status: 'Applied', createdAt: daysAgo(4) },
  { id: 'c5', name: 'Emma Johansson', email: 'emma.johansson@example.com', phone: '(555) 778-3312', position: 'Backend Engineer', status: 'Interview Scheduled', createdAt: daysAgo(15) },
  { id: 'c6', name: 'Mateo Silva', email: 'mateo.silva@example.com', phone: '(555) 889-4423', position: 'DevOps Engineer', status: 'Rejected', notes: 'Not enough production Kubernetes experience.', createdAt: daysAgo(30) },
  { id: 'c7', name: 'Grace Kim', email: 'grace.kim@example.com', phone: '(555) 990-5534', position: 'Frontend Engineer', status: 'Screening', createdAt: daysAgo(9) },
  { id: 'c8', name: 'Ethan Walker', email: 'ethan.walker@example.com', phone: '(555) 101-6645', position: 'Product Manager', status: 'Applied', createdAt: daysAgo(2) },
  { id: 'c9', name: 'Isabella Rossi', email: 'isabella.rossi@example.com', phone: '(555) 212-7756', position: 'QA Engineer', status: 'Interview Scheduled', createdAt: daysAgo(12) },
  { id: 'c10', name: 'Lucas Müller', email: 'lucas.mueller@example.com', phone: '(555) 323-8867', position: 'Data Analyst', status: 'Offer', createdAt: daysAgo(19) },
  { id: 'c11', name: 'Chloe Dubois', email: 'chloe.dubois@example.com', phone: '(555) 434-9978', position: 'Product Designer', status: 'Rejected', createdAt: daysAgo(27) },
  { id: 'c12', name: 'Ryan O’Connor', email: 'ryan.oconnor@example.com', phone: '(555) 545-1189', position: 'Backend Engineer', status: 'Applied', createdAt: daysAgo(1) },
];

const interviews = [
  { id: 'i1', candidateId: 'c1', interviewerIds: ['u1'], date: daysFromNow(1, 14), durationMinutes: 45, type: 'Technical', status: 'Scheduled', location: 'https://meet.example.com/ava-tech' },
  { id: 'i2', candidateId: 'c5', interviewerIds: ['u2', 'u1'], date: daysFromNow(2, 10), durationMinutes: 60, type: 'Technical', status: 'Scheduled', location: 'https://meet.example.com/emma-tech' },
  { id: 'i3', candidateId: 'c9', interviewerIds: ['u3'], date: daysFromNow(3, 11), durationMinutes: 30, type: 'Phone', status: 'Scheduled' },
  { id: 'i4', candidateId: 'c3', interviewerIds: ['u4'], date: daysFromNow(-6, 15), durationMinutes: 60, type: 'Final', status: 'Completed', scores: repeatPattern([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]), notes: 'Great presentation, moving to offer.' },
  { id: 'i5', candidateId: 'c10', interviewerIds: ['u2'], date: daysFromNow(-10, 13), durationMinutes: 45, type: 'Onsite', status: 'Completed', scores: repeatPattern([4, 4, 4, 4, 4, 4, 4, 4, 4, 4]), notes: 'Solid SQL skills, offer extended.' },
  { id: 'i6', candidateId: 'c6', interviewerIds: ['u3'], date: daysFromNow(-15, 9), durationMinutes: 45, type: 'Technical', status: 'Completed', scores: repeatPattern([2, 1, 2, 2, 3, 1, 2, 2, 1, 2]), notes: 'Rejected after technical round.' },
  { id: 'i7', candidateId: 'c11', interviewerIds: ['u4'], date: daysFromNow(-3, 16), durationMinutes: 30, type: 'Phone', status: 'Cancelled', notes: 'Candidate withdrew.' },
  { id: 'i8', candidateId: 'c1', interviewerIds: ['u4'], date: daysFromNow(-8, 10), durationMinutes: 30, type: 'Phone', status: 'Completed', scores: repeatPattern([3, 4, 4, 4, 5, 4, 3, 4, 4, 3]), notes: 'Good communication, advanced to technical round.' },
  { id: 'i9', candidateId: 'c5', interviewerIds: ['u3'], date: daysFromNow(6, 9), durationMinutes: 45, type: 'Onsite', status: 'Scheduled', location: 'HQ - Room 4B' },
];

const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
if (userCount > 0) {
  console.log('Database already seeded — skipping (delete server/data/app.db to reseed from scratch).');
  process.exit(0);
}

const insertUser = db.prepare(
  `INSERT INTO users (id, name, email, password_hash, role, position)
   VALUES (@id, @name, @email, @passwordHash, @role, @position)`,
);
const insertCandidate = db.prepare(
  `INSERT INTO candidates (id, name, email, phone, position, status, resume_url, notes, created_at)
   VALUES (@id, @name, @email, @phone, @position, @status, @resumeUrl, @notes, @createdAt)`,
);
const insertInterview = db.prepare(
  `INSERT INTO interviews (
     id, candidate_id, date, duration_minutes, type, status, location, notes,
     eval_total, eval_result, eval_notes
   ) VALUES (
     @id, @candidateId, @date, @durationMinutes, @type, @status, @location, @notes,
     @evalTotal, @evalResult, @evalNotes
   )`,
);
const insertInterviewer = db.prepare(
  'INSERT INTO interview_interviewers (interview_id, user_id) VALUES (?, ?)',
);
const insertScore = db.prepare(
  `INSERT INTO evaluation_scores (interview_id, sort_order, section_name, criterion_name, score)
   VALUES (?, ?, ?, ?, ?)`,
);

// Read the default template that db.js already seeded, in display order, so sample
// evaluations can be attached to it by position.
const templateCriteria = db
  .prepare(
    `SELECT evaluation_criteria.name AS criterion_name, evaluation_sections.name AS section_name
     FROM evaluation_criteria
     JOIN evaluation_sections ON evaluation_sections.id = evaluation_criteria.section_id
     ORDER BY evaluation_sections.sort_order, evaluation_criteria.sort_order`,
  )
  .all();

function computeResult(totalScore, maxScore) {
  const ratio = totalScore / maxScore;
  if (ratio >= 0.72) return 'Hire';
  if (ratio >= 0.6) return 'Compare';
  return 'Reject';
}

const seed = db.transaction(() => {
  for (const user of users) {
    insertUser.run({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: bcrypt.hashSync(user.password, 10),
      role: user.role,
      position: user.position ?? null,
    });
  }

  for (const candidate of candidates) {
    insertCandidate.run({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      position: candidate.position,
      status: candidate.status,
      resumeUrl: candidate.resumeUrl ?? null,
      notes: candidate.notes ?? null,
      createdAt: candidate.createdAt,
    });
  }

  for (const interview of interviews) {
    const scores = interview.scores;
    const totalScore = scores ? scores.reduce((sum, s) => sum + s, 0) : null;
    const maxScore = scores ? scores.length * 5 : null;
    insertInterview.run({
      id: interview.id,
      candidateId: interview.candidateId,
      date: interview.date,
      durationMinutes: interview.durationMinutes,
      type: interview.type,
      status: interview.status,
      location: interview.location ?? null,
      notes: scores ? null : (interview.notes ?? null),
      evalTotal: totalScore,
      evalResult: scores ? computeResult(totalScore, maxScore) : null,
      evalNotes: scores ? (interview.notes ?? null) : null,
    });
    for (const interviewerId of interview.interviewerIds) {
      insertInterviewer.run(interview.id, interviewerId);
    }
    if (scores) {
      scores.forEach((score, index) => {
        const criterion = templateCriteria[index];
        insertScore.run(interview.id, index, criterion.section_name, criterion.criterion_name, score);
      });
    }
  }
});

seed();
console.log(`Seeded ${users.length} users, ${candidates.length} candidates, ${interviews.length} interviews.`);
