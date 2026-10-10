export const MRF_MAX_BYTES = 5 * 1024 * 1024;

// Returns an error message, or null when the file is an acceptable PDF (the server re-checks the bytes).
export function validateMrfFile(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) return 'Only PDF files are allowed.';
  if (file.size > MRF_MAX_BYTES) return 'File must be 5MB or smaller.';
  return null;
}
