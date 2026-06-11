// Versioned localStorage persistence + JSON export/import. This is the backup
// and the phone<->desktop sync mechanism (no server in v1), so it ships from
// day one. Import validates the version and shape and refuses to silently
// merge a corrupt or foreign file.
import { DEFAULT_BODYWEIGHT_LB } from "../engine/config";
import { todayISO } from "../engine/dates";
import type { AppState, ImportResult } from "./types";

export const STORAGE_KEY = "strongman.v1";
export const SCHEMA_VERSION = 1 as const;

export function defaultState(): AppState {
  return {
    version: SCHEMA_VERSION,
    settings: {
      bodyweightLb: DEFAULT_BODYWEIGHT_LB,
      kcalTarget: null,
      equipment: { sandbag: false, axle: false },
      pinnedDemos: {},
      unitsDisplay: "lb",
    },
    tms: {},
    overrides: {},
    trainingLog: {},
    mealLog: {},
    dailyChecks: {},
    bodyweightLog: [],
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Structural validation of a parsed candidate. Returns null if valid. */
function validationError(data: unknown): string | null {
  if (!isPlainObject(data)) return "Backup is not an object.";
  if (data.version !== SCHEMA_VERSION) return `Unsupported backup version: ${String(data.version)}.`;
  if (!isPlainObject(data.settings)) return "Missing or invalid settings.";
  const kcal = (data.settings as Record<string, unknown>).kcalTarget;
  if (kcal !== null && typeof kcal !== "number") return "Invalid kcalTarget.";
  for (const key of ["tms", "overrides", "trainingLog", "mealLog", "dailyChecks"]) {
    if (!isPlainObject(data[key])) return `Missing or invalid "${key}".`;
  }
  if (!Array.isArray(data.bodyweightLog)) return "Missing or invalid bodyweightLog.";
  return null;
}

export function loadState(): AppState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return defaultState();
  }
  if (!raw) return defaultState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validationError(parsed) !== null) return defaultState();
    // Fill any newly-added top-level slices that an older save may lack.
    return { ...defaultState(), ...(parsed as AppState) };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full / unavailable — non-fatal; the app keeps working in memory */
  }
}

export function exportState(state: AppState, now: Date = new Date()): { filename: string; json: string } {
  return {
    filename: `strongman-backup-${todayISO(now)}.json`,
    json: JSON.stringify(state, null, 2),
  };
}

export function importState(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const error = validationError(parsed);
  if (error !== null) return { ok: false, error };
  // Merge over a default so optional slices are always present, then replace.
  return { ok: true, state: { ...defaultState(), ...(parsed as AppState) } };
}
