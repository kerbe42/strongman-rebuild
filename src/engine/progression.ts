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
import { getLift } from "./config";
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
