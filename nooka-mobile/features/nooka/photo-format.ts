const BACKEND_STILL_TYPES = new Set(['image/jpeg', 'image/png']);

export function requiresJpegNormalization(contentType?: string, fileName?: string): boolean {
  const normalizedType = contentType?.toLowerCase();
  if (normalizedType && BACKEND_STILL_TYPES.has(normalizedType)) return false;

  const extension = fileName?.split('.').pop()?.toLowerCase();
  return extension !== 'jpg' && extension !== 'jpeg' && extension !== 'png';
}
