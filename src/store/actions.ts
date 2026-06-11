// Pure, immutable state mutators. The React provider wires these to component
// state + persistence; keeping the logic pure makes it unit-testable.
import type {
  AppState,
  BodyweightEntry,
  DailyChecks,
  DayOverride,
  MealEntry,
  Settings,
  SetLog,
} from "./types";

const EMPTY_CHECKS: DailyChecks = { waterL: 0, creatine: false, flareProtocol: false };

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  return { ...state, settings: { ...state.settings, ...patch } };
}

export function setTM(
  state: AppState,
  liftId: string,
  quarter: number,
  value: number | null,
): AppState {
  const current = state.tms[liftId] ?? [null, null, null, null];
  const next = current.slice() as Array<number | null>;
  next[quarter - 1] = value;
  return { ...state, tms: { ...state.tms, [liftId]: next } };
}

export function setOverride(state: AppState, date: string, override: DayOverride | null): AppState {
  const overrides = { ...state.overrides };
  if (override === null) delete overrides[date];
  else overrides[date] = override;
  return { ...state, overrides };
}

export function setTrainingLog(state: AppState, date: string, logs: SetLog[]): AppState {
  const trainingLog = { ...state.trainingLog };
  if (logs.length === 0) delete trainingLog[date];
  else trainingLog[date] = logs;
  return { ...state, trainingLog };
}

export function setMealLog(state: AppState, date: string, meals: MealEntry[]): AppState {
  const mealLog = { ...state.mealLog };
  if (meals.length === 0) delete mealLog[date];
  else mealLog[date] = meals;
  return { ...state, mealLog };
}

export function setDailyChecks(
  state: AppState,
  date: string,
  patch: Partial<DailyChecks>,
): AppState {
  const existing = state.dailyChecks[date] ?? EMPTY_CHECKS;
  return {
    ...state,
    dailyChecks: { ...state.dailyChecks, [date]: { ...existing, ...patch } },
  };
}

export function addBodyweight(state: AppState, entry: BodyweightEntry): AppState {
  const log = state.bodyweightLog.filter((e) => e.date !== entry.date);
  log.push(entry);
  log.sort((a, b) => a.date.localeCompare(b.date));
  return { ...state, bodyweightLog: log };
}

export function setPinnedDemo(state: AppState, exerciseId: string, url: string | null): AppState {
  const pinnedDemos = { ...state.settings.pinnedDemos };
  if (url === null || url.trim() === "") delete pinnedDemos[exerciseId];
  else pinnedDemos[exerciseId] = url.trim();
  return { ...state, settings: { ...state.settings, pinnedDemos } };
}
