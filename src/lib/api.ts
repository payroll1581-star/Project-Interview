// Two transports, same API:
//  - Inside the Apps Script web app (HtmlService page) google.script.run is available: call the server
//    function apiCall() directly. No CORS, no redirects, no URL needed.
//  - Anywhere else (npm run dev against a deployed script) fall back to fetch() on VITE_GAS_URL.
// Either way GAS can't read an Authorization header or set status codes, so the verb, token and
// body travel in one JSON envelope and the status comes back inside it.

const GAS_URL = import.meta.env.VITE_GAS_URL as string | undefined;
const TOKEN_KEY = 'ims_token';

let memoryToken: string | null = null;

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Storage blocked (private mode / third-party iframe): the in-memory token still works for this tab.
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface Envelope<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  code?: string;
}

// GAS can't read an Authorization header or answer CORS preflights, so every call is a POST with
// Content-Type text/plain (a "simple request": no preflight) and the real verb + token in the body.
interface GoogleScriptRun {
  withSuccessHandler(fn: (result: string) => void): GoogleScriptRun;
  withFailureHandler(fn: (error: Error) => void): GoogleScriptRun;
  apiCall(json: string): void;
}

function scriptRun(): GoogleScriptRun | undefined {
  return (globalThis as { google?: { script?: { run?: GoogleScriptRun } } }).google?.script?.run;
}

async function send(envelope: string): Promise<Envelope<unknown> | null> {
  const run = scriptRun();
  if (run) {
    const text = await new Promise<string>((resolve, reject) => {
      run.withSuccessHandler(resolve).withFailureHandler(reject).apiCall(envelope);
    });
    return JSON.parse(text) as Envelope<unknown>;
  }
  if (!GAS_URL) throw new ApiError('VITE_GAS_URL is not set.', 0);
  // text/plain is a CORS "simple request": no preflight, which GAS cannot answer.
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: envelope,
    redirect: 'follow',
  });
  return (await res.json().catch(() => null)) as Envelope<unknown> | null;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let payload: Envelope<T> | null;
  try {
    payload = (await send(JSON.stringify({ method, path, token: getToken(), body }))) as Envelope<T> | null;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  }
  if (!payload) throw new ApiError('Unexpected response from the server.', 502);
  if (!payload.ok) {
    throw new ApiError(payload.error ?? 'Request failed.', payload.status, payload.code);
  }
  return (payload.data ?? undefined) as T;
}

function readAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// GAS has no multipart support: files travel as base64 JSON {filename, mimeType, dataBase64}.
export async function fileToPayload(file: File) {
  if (file.size > 5 * 1024 * 1024) throw new ApiError('File too large (max 5MB).', 400);
  return { filename: file.name, mimeType: file.type, dataBase64: await readAsBase64(file) };
}

// Keeps the FormData call shape: the first File in the form data is the upload.
async function upload<T>(path: string, formData: FormData): Promise<T> {
  const file = Array.from(formData.values()).find((v): v is File => v instanceof File);
  if (!file) throw new ApiError('No file selected.', 400);
  return request<T>('POST', path, await fileToPayload(file));
}

// Resumes are now Google Drive links (external <a href>), so nothing is downloaded through the API.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function downloadBlob(_path: string): Promise<Blob> {
  throw new ApiError('Direct downloads are not supported; resumes open from Google Drive.', 501);
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload,
  downloadBlob,
};
