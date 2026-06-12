/**
 * Parse user input into a number, or null. Never returns NaN — any non-finite
 * or non-numeric input becomes null, so garbage like "12kg" or "8-10" is never
 * persisted as a weight/rep/TM (which would render "NaN lb" and break charts).
 */
export function parseNum(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
