// Calendar-date math anchored at UTC midnight. Dates are treated as pure
// calendar dates (YYYY-MM-DD) and always parsed at UTC midnight, so day offsets
// are stable regardless of the device timezone or DST.
import { START_DATE } from "./config";
import type { Dow } from "./types";

const DAY_MS = 86_400_000;
// JS getUTCDay: 0 = Sunday.
const DOW_NAMES: Dow[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toUTC(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

function fromUTC(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, n: number): string {
  return fromUTC(toUTC(iso) + n * DAY_MS);
}

export function dowOf(iso: string): Dow {
  return DOW_NAMES[new Date(toUTC(iso)).getUTCDay()]!;
}

export function dayIndexOf(iso: string): number {
  return Math.round((toUTC(iso) - toUTC(START_DATE)) / DAY_MS);
}

export function isoForDayIndex(i: number): string {
  return addDays(START_DATE, i);
}

/** The device's local calendar date as YYYY-MM-DD (the user's "today"). */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
