// Typed access to the domain data files. These JSON files are the source of
// truth (CLAUDE.md): the engine reads training/nutrition numbers from here, it
// does not re-derive them.
import exercisesData from "../../data/exercises.json";
import planConfig from "../../data/plan_config.json";
import type { Dow, LiftConfig, SessionKind } from "./types";

export interface ExerciseLib {
  id: string;
  name: string;
  type: string;
  equipment: string[];
  cues: string[];
  safety?: string;
  substitution?: string;
  note?: string;
  demo_search: string;
}

export const PLAN = planConfig;
export const START_DATE: string = planConfig.start_date; // "2026-06-15" (a Monday)
export const TOTAL_WEEKS: number = planConfig.weeks; // 52
export const DEFAULT_BODYWEIGHT_LB: number = planConfig.athlete.bodyweight_lb; // 285
export const WATER_RANGE_L: number[] = planConfig.athlete.water_l_per_day; // [3.5, 4.0]
export const CREATINE_G: number = planConfig.athlete.creatine_g_per_day; // 10
export const SANDBAG_OVER_BAR_FROM_WEEK: number =
  planConfig.rep_schemes.sandbag_over_bar_starts_week; // 5
export const LOADING = planConfig.loading as {
  trap_bar_lb: number;
  /** Total plates owned of each size (loads symmetrically → per side = count/2). */
  plates: Array<{ lb: number; count: number }>;
  plate_aware_lifts: string[];
};

const LIFTS = planConfig.lifts as unknown as LiftConfig[];
const liftsById = new Map<string, LiftConfig>(LIFTS.map((l) => [l.id, l]));

export function getLift(id: string): LiftConfig {
  const lift = liftsById.get(id);
  if (!lift) throw new Error(`Unknown lift id: ${id}`);
  return lift;
}

export function hasLift(id: string): boolean {
  return liftsById.has(id);
}

export function allLifts(): LiftConfig[] {
  return LIFTS;
}

/** Day-of-week -> session kind, from the weekly_schedule. */
export function sessionKindForDow(dow: Dow): SessionKind {
  return planConfig.weekly_schedule[dow] as SessionKind;
}

export const DOW_ORDER: Dow[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// --- exercise library -------------------------------------------------------

const EXERCISES = exercisesData.exercises as unknown as ExerciseLib[];
const exercisesById = new Map<string, ExerciseLib>(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): ExerciseLib | undefined {
  return exercisesById.get(id);
}

export function allExercises(): ExerciseLib[] {
  return EXERCISES;
}

/** YouTube search URL for an exercise's demo_search string (no hardcoded IDs). */
export function demoSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export const REP_SCHEMES = planConfig.rep_schemes;
export const DIETARY_RULES = planConfig.dietary_rules;
export const FLARE_PROTOCOL_SWAP: string = planConfig.dietary_rules.flare_protocol_swap;
