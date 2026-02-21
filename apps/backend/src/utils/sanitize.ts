export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

export function stripSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[],
): Omit<T, string> {
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}
