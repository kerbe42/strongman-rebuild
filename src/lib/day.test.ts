import { describe, expect, it } from "vitest";
import { defaultState } from "../store/store";
import { resolveSession } from "./day";

const MON_WK1 = "2026-06-15";

describe("resolveSession — engine output + per-day override deltas", () => {
  it("returns null outside the plan", () => {
    expect(resolveSession("2025-01-01", defaultState())).toBeNull();
  });

  it("returns the unmodified session when there is no override", () => {
    const s = resolveSession(MON_WK1, defaultState())!;
    expect(s.items[0]!.exerciseId).toBe("trap_bar_deadlift");
    expect(s.items[0]!.weightLb).toBe(315);
    expect(s.skipped).toBe(false);
  });

  it("applies a per-exercise weight/sets/reps delta without touching the engine", () => {
    const state = defaultState();
    state.overrides[MON_WK1] = {
      exercises: { trap_bar_deadlift: { weightLb: 300, sets: 5, reps: "3" } },
    };
    const s = resolveSession(MON_WK1, state)!;
    const main = s.items[0]!;
    expect(main.weightLb).toBe(300);
    expect(main.sets).toBe(5);
    expect(main.reps).toBe("3");
    // engine output itself is unchanged — a fresh resolve with no override is still 315
    expect(resolveSession(MON_WK1, defaultState())!.items[0]!.weightLb).toBe(315);
  });

  it("marks a skipped day", () => {
    const state = defaultState();
    state.overrides[MON_WK1] = { skipped: true, skipReason: "back tweak" };
    const s = resolveSession(MON_WK1, state)!;
    expect(s.skipped).toBe(true);
    expect(s.skipReason).toBe("back tweak");
  });

  it("swaps an exercise, carrying the new exercise's safety string", () => {
    const state = defaultState();
    state.overrides[MON_WK1] = {
      exercises: { trap_bar_deadlift: { swapToExerciseId: "axle_deadlift_doh" } },
    };
    const s = resolveSession(MON_WK1, state)!;
    expect(s.items[0]!.exerciseId).toBe("axle_deadlift_doh");
    expect(s.items[0]!.safety).toBe("Strapless permanently — this slot IS the grip training.");
  });
});
