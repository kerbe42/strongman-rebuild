// Domain types for the progression engine. These describe the *shape* of the
// data files in /data and the user-state the engine consumes. The engine never
// invents numbers — everything numeric originates here or in user input.

export type WeekType = "build" | "deload" | "test";
export type Quarter = 1 | 2 | 3 | 4;
export type Dow = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type SessionKind = "lower" | "gpp_optional" | "press_upper" | "events" | "rest";

export interface LiftConfig {
  id: string;
  name: string;
  tm_q1_placeholder: number;
  /** Per-quarter suggestion deltas: [q2-q1, q3-q2, q4-q3]. */
  q_deltas: number[];
  build_increment: number;
  round_to: number;
  cap: number | null;
  /** Sandbag: load is flat across the quarter, does not ramp with build index. */
  flat_within_quarter?: boolean;
  /** KB swing etc.: load never progresses. */
  fixed?: boolean;
}

/**
 * User TM overrides. Per lift, four quarter slots [q1, q2, q3, q4]. A null (or
 * absent) slot falls back to the suggestion formula. Set during calibration
 * (Q1) and after each test week (Q2-Q4). Editing a slot recomputes all future
 * days that depend on it.
 */
export type TmOverrides = Record<string, Array<number | null>>;

/** One row in a day's session: an exercise with its computed prescription. */
export interface SessionItem {
  /** exercises.json id (for name, cues, safety, demo search). */
  exerciseId: string;
  name: string;
  /** Progression lift id whose target drives the load, if any. */
  liftId?: string;
  /** Number for straight sets, or a phrase for events ("Max distance"). */
  sets?: number | string;
  reps?: string;
  /** Computed working weight, or null when bodyweight / RPE-driven / N/A. */
  weightLb: number | null;
  rpeCap?: string;
  rest?: string;
  notes?: string;
  /** Verbatim safety string from exercises.json — rendered prominently. */
  safety?: string;
  cues?: string[];
  equipment?: string[];
  demoSearch?: string;
  /** Present when an equipment substitution is active (gear not yet owned). */
  substitutionNote?: string;
}

export interface DaySession {
  date: string;
  week: number;
  quarter: Quarter;
  weekType: WeekType;
  sessionKind: SessionKind;
  isCalibration: boolean;
  isTestWeek: boolean;
  title: string;
  items: SessionItem[];
  /** Recovery tasks on rest days (walk, water, creatine). */
  recovery?: string[];
}

/** The user-state slice the engine needs to generate sessions. */
export interface EngineState {
  tms?: TmOverrides;
  equipment?: { sandbag: boolean; axle: boolean };
}
