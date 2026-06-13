// Pure progression math. Given (lift, week, optional TM overrides) it returns
// the day's prescribed working weight deterministically. No React, no I/O.
//
// Rules (verified against data/test_vectors.json `engine_rules`):
//   q   = ceil(week / 13)
//   wq  = week - (q-1)*13
//   type: wq==13 -> test; wq in {4,8,12} -> deload; else build
//   k   = wq - (wq>4) - (wq>8)                      (build index, 1..9)
//   build  target = mround(TM[q] + (k-1)*increment, round_to), then cap
//   deload target = mround(TM[q] * 0.6, round_to)
//   sandbag (flat per quarter) = mround(TM[q], round_to)
//   TM[q] suggestion = TM[q-1] + q_deltas[q-2]      (user-overridable per slot)
import { getLift, TOTAL_WEEKS } from "./config";
import type { Quarter, TmOverrides, WeekType } from "./types";

/** Excel MROUND: round to nearest `multiple`, ties round up (away from zero). */
export function mround(value: number, multiple: number): number {
  if (multiple === 0) return value;
  // +0.5 then floor rounds halves up for the positive weights in this domain;
  // it is also robust to IEEE754 drift like 335*0.6 === 200.99999999999997.
  return Math.floor(value / multiple + 0.5) * multiple;
}

export function quarterOf(week: number): Quarter {
  return Math.ceil(week / 13) as Quarter;
}

export function weekInQuarter(week: number): number {
  return week - (quarterOf(week) - 1) * 13;
}

export function weekType(week: number): WeekType {
  const wq = weekInQuarter(week);
  if (wq === 13) return "test";
  if (wq === 4 || wq === 8 || wq === 12) return "deload";
  return "build";
}

/** Build index k (1..9 on build weeks). Defined by the spreadsheet formula. */
export function buildIndex(week: number): number {
  const wq = weekInQuarter(week);
  return wq - (wq > 4 ? 1 : 0) - (wq > 8 ? 1 : 0);
}

/**
 * Effective training max for a lift in a quarter. Honors a user override for
 * that quarter; otherwise chains the suggestion formula off the *effective*
 * prior-quarter TM, so editing an earlier quarter shifts later suggestions.
 */
export function resolveTM(liftId: string, quarter: number, overrides: TmOverrides = {}): number {
  const lift = getLift(liftId);
  const slot = overrides[liftId]?.[quarter - 1];
  if (slot != null) return slot;
  if (quarter <= 1) return lift.tm_q1_placeholder;
  const delta = lift.q_deltas[quarter - 2] ?? 0;
  return resolveTM(liftId, quarter - 1, overrides) + delta;
}

/**
 * Prescribed working weight for a lift on a given week.
 * Test weeks are RPE-driven (heavy single); this returns the quarter's top
 * build load as a reference, while the session layer renders "heavy single".
 */
export function targetWeight(liftId: string, week: number, overrides: TmOverrides = {}): number {
  const lift = getLift(liftId);
  const tm = resolveTM(liftId, quarterOf(week), overrides);
  const type = weekType(week);

  let raw: number;
  if (lift.flat_within_quarter) {
    raw = mround(tm, lift.round_to);
  } else if (type === "deload") {
    raw = mround(tm * 0.6, lift.round_to);
  } else {
    const k = Math.min(9, Math.max(1, buildIndex(week)));
    raw = mround(tm + (k - 1) * lift.build_increment, lift.round_to);
  }
  return lift.cap != null ? Math.min(raw, lift.cap) : raw;
}

/** One week on the projected climb: the prescribed working weight + context. */
export interface TrajectoryPoint {
  week: number;
  weight: number;
  type: WeekType;
  quarter: number;
}

/** Per-quarter summary: the training max and the quarter's top build set. */
export interface QuarterMilestone {
  quarter: number;
  tm: number;
  topBuildSet: number;
}

export interface LiftTrajectory {
  weekly: TrajectoryPoint[];
  quarters: QuarterMilestone[];
}

/**
 * The full 52-week projected climb for a lift: a per-week working-weight
 * series (for charting the staircase) plus a per-quarter summary. Honors saved
 * per-quarter TM overrides, so the projection redraws upward as the athlete
 * logs heavier test weeks.
 */
export function liftTrajectory(liftId: string, overrides: TmOverrides = {}): LiftTrajectory {
  const weekly: TrajectoryPoint[] = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    weekly.push({
      week,
      weight: targetWeight(liftId, week, overrides),
      type: weekType(week),
      quarter: quarterOf(week),
    });
  }

  const quarters: QuarterMilestone[] = [];
  for (let q = 1; q <= Math.ceil(TOTAL_WEEKS / 13); q++) {
    // The quarter's top build set is its last build week (wq 11, k=9).
    const topBuildWeek = (q - 1) * 13 + 11;
    quarters.push({
      quarter: q,
      tm: resolveTM(liftId, q, overrides),
      topBuildSet: targetWeight(liftId, topBuildWeek, overrides),
    });
  }

  return { weekly, quarters };
}

/** A warm-up set: a lighter ramp set done before the working sets. */
export interface WarmupSet {
  weight: number;
  reps: number;
}

// Percent-of-working-weight ramp, with fewer reps as the bar gets heavier.
const WARMUP_STEPS: ReadonlyArray<readonly [number, number]> = [
  [0.4, 5],
  [0.55, 4],
  [0.7, 3],
  [0.85, 2],
];

/**
 * Warm-up ramp leading up to a lift's working weight for the week. Rounds each
 * set to the nearest 10 lb (coarser than the working increment, so fewer plate
 * changes), drops any set that meets/exceeds the working weight, and collapses
 * duplicate weights — so light lifts naturally get fewer warm-up sets. Honors
 * saved TM overrides via the resolved working weight.
 */
export function warmupRamp(workingWeight: number, roundTo = 10): WarmupSet[] {
  const out: WarmupSet[] = [];
  let last = 0;
  for (const [pct, reps] of WARMUP_STEPS) {
    const weight = mround(workingWeight * pct, roundTo);
    if (weight <= 0 || weight >= workingWeight || weight <= last) continue;
    out.push({ weight, reps });
    last = weight;
  }
  return out;
}

export function warmupSets(liftId: string, week: number, overrides: TmOverrides = {}): WarmupSet[] {
  return warmupRamp(targetWeight(liftId, week, overrides));
}

/** A warm-up set with the actual per-side plate loadout for a bar lift. */
export interface PlatedWarmupSet extends WarmupSet {
  /** Plate denominations to put on EACH side, largest first. */
  perSide: number[];
}

/** Greedily break a per-side weight into plates (largest first). Assumes you
 * own enough of each pair; exact for the standard 45/25/10/5/2.5 set. */
function greedyPlates(perSide: number, plates: number[]): number[] {
  const out: number[] = [];
  let rem = perSide;
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (rem >= p - 1e-9) {
      out.push(p);
      rem -= p;
    }
  }
  return out;
}

/**
 * Warm-up ramp for a lift loaded on a real bar: each step snaps to a weight you
 * can actually load (bar + a symmetric pair of plates), rounding the per-side
 * load to the nearest 5 lb so you aren't fiddling with tiny plates, and carries
 * the per-side plate loadout for display. Skips anything at/below the empty bar
 * or at/above the working weight, and collapses duplicates.
 */
export function warmupRampPlated(
  workingWeight: number,
  barLb: number,
  plates: number[],
): PlatedWarmupSet[] {
  const out: PlatedWarmupSet[] = [];
  let last = 0;
  for (const [pct, reps] of WARMUP_STEPS) {
    const perSideRaw = (workingWeight * pct - barLb) / 2;
    if (perSideRaw <= 0) continue;
    const perSide = Math.round(perSideRaw / 5) * 5;
    if (perSide <= 0) continue;
    const weight = barLb + 2 * perSide;
    if (weight >= workingWeight || weight <= last) continue;
    out.push({ weight, reps, perSide: greedyPlates(perSide, plates) });
    last = weight;
  }
  return out;
}
