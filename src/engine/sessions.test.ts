import { describe, expect, it } from "vitest";
import { weekDays } from "./calendar";
import { sessionFor } from "./sessions";
import type { Dow } from "./types";

function dateFor(week: number, dow: Dow): string {
  const d = weekDays(week).find((x) => x.dow === dow);
  if (!d) throw new Error(`no ${dow} in week ${week}`);
  return d.date;
}
const OWNED = { equipment: { sandbag: true, axle: true } };
const ids = (s: ReturnType<typeof sessionFor>) => (s ? s.items.map((i) => i.exerciseId) : []);

describe("sessionFor — structural", () => {
  it("returns null outside the plan window", () => {
    expect(sessionFor("2026-06-14")).toBeNull();
    expect(sessionFor("2027-06-14")).toBeNull();
  });

  it("renders rest days as recovery, not training", () => {
    const s = sessionFor(dateFor(1, "thu"))!;
    expect(s.sessionKind).toBe("rest");
    expect(s.items).toHaveLength(0);
    expect(s.recovery && s.recovery.length).toBeGreaterThan(0);
    expect(s.recovery!.join(" ").toLowerCase()).toMatch(/walk|water/);
  });
});

describe("build lower day (week 1, calibration)", () => {
  const s = sessionFor(dateFor(1, "mon"), OWNED)!;

  it("leads with the trap-bar deadlift at the computed weight + mains scheme", () => {
    const main = s.items[0]!;
    expect(main.exerciseId).toBe("trap_bar_deadlift");
    expect(main.weightLb).toBe(315);
    expect(main.sets).toBe(4);
    expect(main.reps).toBe("5");
    expect(main.rpeCap).toBe("7");
  });

  it("flags week 1 as calibration", () => {
    expect(s.isCalibration).toBe(true);
  });
});

describe("equipment substitutions (gated on owned flags)", () => {
  it("subs Smith squat for the sandbag squat until the bag is owned", () => {
    const without = sessionFor(dateFor(1, "mon"), { equipment: { sandbag: false, axle: true } })!;
    const bag = without.items.find((i) => i.exerciseId === "sandbag_bear_hug_squat")!;
    expect(bag.substitutionNote).toBeTruthy();
    expect(bag.substitutionNote!.toLowerCase()).toContain("smith");

    const owned = sessionFor(dateFor(1, "mon"), OWNED)!;
    const bag2 = owned.items.find((i) => i.exerciseId === "sandbag_bear_hug_squat")!;
    expect(bag2.substitutionNote).toBeUndefined();
  });

  it("subs DB clean & press for the axle press until the axle is owned", () => {
    const without = sessionFor(dateFor(1, "wed"), { equipment: { sandbag: true, axle: false } })!;
    const press = without.items.find((i) => i.exerciseId === "axle_clean_strict_press")!;
    expect(press.substitutionNote).toBeTruthy();
    expect(press.substitutionNote!.toLowerCase()).toMatch(/db|dumbbell/);
  });
});

describe("press block expansion by quarter/k", () => {
  it("Q1 k1-3: single strict press, 5x3 @ RPE 7, at the computed load", () => {
    const s = sessionFor(dateFor(1, "wed"), OWNED)!;
    const presses = s.items.filter((i) =>
      ["axle_clean_strict_press", "axle_push_press"].includes(i.exerciseId),
    );
    expect(presses).toHaveLength(1);
    expect(presses[0]!.exerciseId).toBe("axle_clean_strict_press");
    expect(presses[0]!.sets).toBe(5);
    expect(presses[0]!.reps).toBe("3");
    expect(presses[0]!.weightLb).toBe(105);
  });

  it("thereafter: strict + push press, both at the same strict-target load", () => {
    const s = sessionFor(dateFor(5, "wed"), OWNED)!; // q1 k4
    const presses = s.items.filter((i) =>
      ["axle_clean_strict_press", "axle_push_press"].includes(i.exerciseId),
    );
    expect(presses.map((p) => p.exerciseId)).toEqual(["axle_clean_strict_press", "axle_push_press"]);
    expect(presses[0]!.weightLb).toBe(120);
    expect(presses[1]!.weightLb).toBe(120); // push press uses same load as strict target
  });
});

describe("week-5 gate on sandbag-over-bar (calendar invariant #5)", () => {
  it("absent on build Saturdays before week 5", () => {
    expect(ids(sessionFor(dateFor(1, "sat"), OWNED))).not.toContain("sandbag_over_bar");
  });

  it("present on build Saturdays from week 5 on, at the flat sandbag load", () => {
    const s = sessionFor(dateFor(5, "sat"), OWNED)!;
    const sob = s.items.find((i) => i.exerciseId === "sandbag_over_bar");
    expect(sob).toBeTruthy();
    expect(sob!.weightLb).toBe(100); // sandbag Q1 flat
  });

  it("never on deload Saturdays (week 8 is a deload week)", () => {
    expect(ids(sessionFor(dateFor(8, "sat"), OWNED))).not.toContain("sandbag_over_bar");
  });
});

describe("deload variant", () => {
  it("lower deload day uses 0.6*TM and the deload rep scheme", () => {
    const s = sessionFor(dateFor(4, "mon"), OWNED)!; // wq4 deload
    expect(s.weekType).toBe("deload");
    const main = s.items[0]!;
    expect(main.exerciseId).toBe("trap_bar_deadlift");
    expect(main.weightLb).toBe(190); // mround(315*0.6,5)
    expect(main.sets).toBe(3);
    expect(main.reps).toBe("5");
  });

  it("events deload day skips the high-risk pulls (shoulder / over-bar / axle DOH)", () => {
    const got = ids(sessionFor(dateFor(8, "sat"), OWNED));
    expect(got).not.toContain("sandbag_to_shoulder");
    expect(got).not.toContain("sandbag_over_bar");
    expect(got).not.toContain("axle_deadlift_doh");
    expect(got).toContain("farmers_carry_trap_bar"); // carries stay
  });
});

describe("test week", () => {
  it("Monday is a heavy single (no prescribed weight), with a TM-update prompt", () => {
    const s = sessionFor(dateFor(13, "mon"), OWNED)!;
    expect(s.isTestWeek).toBe(true);
    const main = s.items[0]!;
    expect(main.exerciseId).toBe("trap_bar_deadlift");
    expect(main.weightLb).toBeNull();
    expect(String(main.sets).toLowerCase()).toContain("single");
    expect((main.notes ?? "").toLowerCase()).toMatch(/tm|next quarter|update/);
  });

  it("non-event test-week days are rest", () => {
    const s = sessionFor(dateFor(13, "tue"), OWNED)!;
    expect(s.items).toHaveLength(0);
  });
});

describe("safety strings render verbatim from exercises.json", () => {
  const s = sessionFor(dateFor(5, "sat"), OWNED)!;

  it("keeps the strapless-axle rule exactly", () => {
    const axle = s.items.find((i) => i.exerciseId === "axle_deadlift_doh")!;
    expect(axle.safety).toBe("Strapless permanently — this slot IS the grip training.");
  });

  it("keeps the never-curl-the-bag rule exactly", () => {
    const bag = s.items.find((i) => i.exerciseId === "sandbag_to_shoulder")!;
    expect(bag.safety).toBe(
      "NEVER reverse-curl the bag up. Lap, hug, hips. This rule is non-negotiable — it is the biceps-tear mechanism.",
    );
  });
});
