// The single versioned object persisted to localStorage (SPEC section 4).
// Everything the user accumulates lives here; it is the unit of export/import.

export interface Settings {
  bodyweightLb: number; // drives the protein target
  kcalTarget: number | null; // null until the user measures maintenance — never invented
  equipment: { sandbag: boolean; axle: boolean }; // gates substitutions
  pinnedDemos: Record<string, string>; // exerciseId -> user-supplied video URL
  unitsDisplay: "lb";
  mealsPerDay: 1 | 2; // how many meals/day the user eats (drives the per-meal protein goal)
}

/** Sparse, per-day deltas layered on top of generated plan output. */
export interface ExerciseOverride {
  weightLb?: number;
  sets?: number;
  reps?: string;
  swapToExerciseId?: string;
}
export interface DayOverride {
  skipped?: boolean;
  skipReason?: string;
  exercises?: Record<string, ExerciseOverride>; // keyed by exerciseId
}

/** A logged working set (actuals, never the plan). */
export interface SetLog {
  exerciseId: string;
  set: number;
  weightLb: number | null;
  reps: number | null;
  rpe: number | null;
  note?: string;
}

export interface MealEntry {
  mealId: string; // a meals.json id, or "custom"
  name?: string; // for custom entries
  multiplier: number; // 0.5x - 2x, scales macros linearly
  proteinG: number; // resolved macros for this entry (already scaled)
  kcal: number;
}

export interface DailyChecks {
  waterL: number;
  creatine: boolean;
  flareProtocol: boolean;
}

export interface BodyweightEntry {
  date: string; // ISO
  lb: number;
}

export interface AppState {
  version: 1;
  settings: Settings;
  tms: Record<string, Array<number | null>>; // liftId -> [q1,q2,q3,q4]
  overrides: Record<string, DayOverride>; // isoDate -> override
  trainingLog: Record<string, SetLog[]>; // isoDate -> sets
  mealLog: Record<string, MealEntry[]>; // isoDate -> meals
  dailyChecks: Record<string, DailyChecks>; // isoDate -> checks
  bodyweightLog: BodyweightEntry[];
}

export type ImportResult = { ok: true; state: AppState } | { ok: false; error: string };
