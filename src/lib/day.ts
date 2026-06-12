// Bridges the pure engine session with the user's stored per-day overrides.
// Overrides are deltas layered on top of generated output — the engine session
// is never mutated (SPEC section 3 / non-negotiable rule).
import { getExercise, sessionFor, type DaySession, type SessionItem } from "../engine";
import type { AppState, DayOverride, ExerciseOverride } from "../store/types";

/** A session item plus the original engine exerciseId. After a swap the
 *  `exerciseId` becomes the swapped-to id, but `originExerciseId` stays the id
 *  the override is keyed under — the Plan editor must use it for lookup/patch. */
export interface ResolvedItem extends SessionItem {
  originExerciseId: string;
}

export interface ResolvedSession extends Omit<DaySession, "items"> {
  items: ResolvedItem[];
  skipped: boolean;
  skipReason?: string;
}

export function engineStateOf(state: AppState) {
  return { tms: state.tms, equipment: state.settings.equipment };
}

function applyItemOverride(item: SessionItem, o: ExerciseOverride | undefined): SessionItem {
  if (!o) return item;
  const next: SessionItem = { ...item };
  if (o.swapToExerciseId) {
    const lib = getExercise(o.swapToExerciseId);
    next.exerciseId = o.swapToExerciseId;
    next.name = lib?.name ?? o.swapToExerciseId;
    next.safety = lib?.safety;
    next.cues = lib?.cues;
    next.equipment = lib?.equipment;
    next.demoSearch = lib?.demo_search;
    next.substitutionNote = "Swapped in for this day only.";
  }
  if (o.weightLb != null) next.weightLb = o.weightLb;
  if (o.sets != null) next.sets = o.sets;
  if (o.reps != null) next.reps = o.reps;
  return next;
}

export function resolveSession(date: string, state: AppState): ResolvedSession | null {
  const session = sessionFor(date, engineStateOf(state));
  if (!session) return null;
  const ov: DayOverride | undefined = state.overrides[date];
  const items: ResolvedItem[] = session.items.map((it) => {
    const originExerciseId = it.exerciseId;
    const applied = ov ? applyItemOverride(it, ov.exercises?.[originExerciseId]) : it;
    return { ...applied, originExerciseId };
  });
  return {
    ...session,
    items,
    skipped: Boolean(ov?.skipped),
    ...(ov?.skipReason ? { skipReason: ov.skipReason } : {}),
  };
}
