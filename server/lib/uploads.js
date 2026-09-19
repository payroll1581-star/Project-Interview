import multer from 'multer';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateId } from './ids.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// The Windows-specific default only makes sense on win32 -- on Linux (Docker/CI)
// it isn't an absolute path at all, so it'd resolve to a relative dir under cwd
// and fall outside the Dockerfile's volume-mounted server/data/. Fall back to the
// original in-project location there instead.
const DEFAULT_RESUMES_DIR =
  process.platform === 'win32'
    ? 'C:\\Users\\Asus\\OneDrive\\Desktop\\Rasume'
    : join(__dirname, '..', 'data', 'uploads', 'resumes');

// Tests write real files to disk (unlike DB_PATH=':memory:', there's no in-memory
// filesystem) -- keep them out of whatever real resume folder is configured.
export const RESUMES_DIR =
  process.env.NODE_ENV === 'test'
    ? join(tmpdir(), 'int-claude-test-uploads', 'resumes')
    : process.env.RESUME_UPLOAD_DIR || DEFAULT_RESUMES_DIR;
if (!existsSync(RESUMES_DIR)) mkdirSync(RESUMES_DIR, { recursive: true });

const ALLOWED_RESUME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.diskStorage({
  destination: RESUMES_DIR,
  filename: (req, file, cb) => cb(null, `${generateId('resume')}${extname(file.originalname)}`),
});

export const uploadResume = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_RESUME_TYPES.has(file.mimetype)),
});
