import { describe, expect, it } from "vitest";
import testVectors from "../../data/test_vectors.json";
import {
  buildIndex,
  liftTrajectory,
  mround,
  quarterOf,
  targetWeight,
  warmupRamp,
  warmupSets,
  weekInQuarter,
  weekType,
} from "./progression";

describe("mround (Excel MROUND — round to nearest multiple, ties round up)", () => {
  it("rounds to the nearest multiple", () => {
    expect(mround(189, 5)).toBe(190);
    expect(mround(201, 5)).toBe(200);
    expect(mround(100, 25)).toBe(100);
    expect(mround(112, 25)).toBe(100);
    expect(mround(113, 25)).toBe(125);
  });

  it("rounds ties up (away from zero), matching Excel", () => {
    expect(mround(2.5, 5)).toBe(5);
    expect(mround(7.5, 5)).toBe(10);
    expect(mround(12.5, 5)).toBe(15);
    expect(mround(112.5, 25)).toBe(125);
  });

  it("survives binary float drift on 0.6*TM deloads", () => {
    // 335 * 0.6 == 200.99999999999997 in IEEE754; must still land on 200.
    expect(mround(335 * 0.6, 5)).toBe(200);
    expect(mround(315 * 0.6, 5)).toBe(190);
  });
});

describe("quarter / week-in-quarter / week-type math", () => {
  it("maps week -> quarter via ceil(week/13)", () => {
    expect(quarterOf(1)).toBe(1);
    expect(quarterOf(13)).toBe(1);
    expect(quarterOf(14)).toBe(2);
    expect(quarterOf(26)).toBe(2);
    expect(quarterOf(27)).toBe(3);
    expect(quarterOf(39)).toBe(3);
    expect(quarterOf(40)).toBe(4);
    expect(quarterOf(52)).toBe(4);
  });

  it("maps week -> week-in-quarter (1..13)", () => {
    expect(weekInQuarter(1)).toBe(1);
    expect(weekInQuarter(13)).toBe(13);
    expect(weekInQuarter(14)).toBe(1);
    expect(weekInQuarter(26)).toBe(13);
    expect(weekInQuarter(40)).toBe(1);
  });

  it("classifies week type: test at wq13, deload at wq 4/8/12, else build", () => {
    expect(weekType(1)).toBe("build");
    expect(weekType(4)).toBe("deload");
    expect(weekType(8)).toBe("deload");
    expect(weekType(12)).toBe("deload");
    expect(weekType(13)).toBe("test");
    expect(weekType(26)).toBe("test");
    expect(weekType(39)).toBe("test");
    expect(weekType(52)).toBe("test");
    expect(weekType(5)).toBe("build");
  });

  it("computes build index k = wq - (wq>4) - (wq>8), valid 1..9 on build weeks", () => {
    expect(buildIndex(1)).toBe(1);
    expect(buildIndex(3)).toBe(3);
    expect(buildIndex(5)).toBe(4);
    expect(buildIndex(7)).toBe(6);
    expect(buildIndex(9)).toBe(7);
    expect(buildIndex(11)).toBe(9);
    // same pattern in later quarters
    expect(buildIndex(14)).toBe(1);
    expect(buildIndex(40)).toBe(1);
  });
});

describe("targetWeight reproduces every verified spreadsheet vector", () => {
  for (const v of testVectors.vectors) {
    const label = `week ${v.week} ${v.lift} (${v.week_type})${v.note ? " — " + v.note : ""}`;
    it(`= ${v.expected_lb} lb: ${label}`, () => {
      expect(targetWeight(v.lift, v.week)).toBe(v.expected_lb);
    });
  }
});

describe("cap and TM-override behaviour", () => {
  it("hard-caps DB-based lifts at 90 lb regardless of progression", () => {
    // suitcase_carry uncapped at wk11 k9 would be 120; cap holds it at 90.
    expect(targetWeight("suitcase_carry", 11)).toBe(90);
  });

  it("uses a per-quarter TM override when the user has set one", () => {
    // Override Q1 trap-bar TM to 405; wk1 k1 build => mround(405,5) = 405.
    const tms = { trap_bar_deadlift: [405, null, null, null] as (number | null)[] };
    expect(targetWeight("trap_bar_deadlift", 1, tms)).toBe(405);
  });

  it("chains later-quarter suggestions off an overridden earlier quarter", () => {
    // Override Q1 to 405; Q2 suggestion = 405 + q_delta[0] (20) = 425; wk14 k1 => 425.
    const tms = { trap_bar_deadlift: [405, null, null, null] as (number | null)[] };
    expect(targetWeight("trap_bar_deadlift", 14, tms)).toBe(425);
  });
});

describe("liftTrajectory — full 52-week projection for the trajectory view", () => {
  it("returns one weekly point per program week, each with weight/type/quarter", () => {
    const t = liftTrajectory("trap_bar_deadlift");
    expect(t.weekly).toHaveLength(52);
    // Week 1 is the calibrated TM itself.
    expect(t.weekly[0]).toEqual({ week: 1, weight: 315, type: "build", quarter: 1 });
    // Deload week 4 dips to 0.6*TM.
    expect(t.weekly[3]).toEqual({ week: 4, weight: 190, type: "deload", quarter: 1 });
    // Top build week (wq 11, +10/wk * 8) is the quarter's working peak.
    expect(t.weekly[10]).toEqual({ week: 11, weight: 395, type: "build", quarter: 1 });
    // Week 13 is the test week.
    expect(t.weekly[12]!.type).toBe("test");
    expect(t.weekly[12]!.quarter).toBe(1);
  });

  it("summarizes each quarter with its TM and top build set", () => {
    const t = liftTrajectory("trap_bar_deadlift");
    expect(t.quarters).toHaveLength(4);
    expect(t.quarters[0]).toEqual({ quarter: 1, tm: 315, topBuildSet: 395 });
    // 315 -> +20/+15/+10 quarter deltas; top build = TM + 80.
    expect(t.quarters[3]).toEqual({ quarter: 4, tm: 360, topBuildSet: 440 });
  });

  it("honors saved per-quarter TM overrides and redraws the whole climb", () => {
    const tms = { trap_bar_deadlift: [405, null, null, null] as (number | null)[] };
    const t = liftTrajectory("trap_bar_deadlift", tms);
    expect(t.weekly[0]!.weight).toBe(405);
    expect(t.quarters[0]!.tm).toBe(405);
    // Q2 suggestion chains off the override: 405 + 20 = 425.
    expect(t.quarters[1]!.tm).toBe(425);
  });

  it("respects hard caps and flat-within-quarter lifts", () => {
    // Suitcase carry caps at 90 even though raw progression would exceed it.
    const sc = liftTrajectory("suitcase_carry");
    expect(Math.max(...sc.weekly.map((p) => p.weight))).toBe(90);
    // Sandbag is flat within a quarter: every Q1 week is the same load.
    const sb = liftTrajectory("sandbag");
    const q1 = sb.weekly.filter((p) => p.quarter === 1).map((p) => p.weight);
    expect(new Set(q1).size).toBe(1);
  });
});

describe("warmupSets — ramp-up sets below the working weight", () => {
  it("warmupRamp builds straight from a working weight (what the card uses)", () => {
    expect(warmupRamp(315)).toEqual([
      { weight: 130, reps: 5 },
      { weight: 170, reps: 4 },
      { weight: 220, reps: 3 },
      { weight: 270, reps: 2 },
    ]);
    // Light weight collapses to fewer sets; zero/negative yields none.
    expect(warmupRamp(40)).toEqual([{ weight: 20, reps: 5 }, { weight: 30, reps: 3 }]);
    expect(warmupRamp(0)).toEqual([]);
  });

  it("ramps a heavy lift at 40/55/70/85% x 5/4/3/2, rounded to 10", () => {
    // Trap-bar wk1 working = 315.
    expect(warmupSets("trap_bar_deadlift", 1)).toEqual([
      { weight: 130, reps: 5 },
      { weight: 170, reps: 4 },
      { weight: 220, reps: 3 },
      { weight: 270, reps: 2 },
    ]);
  });

  it("collapses to fewer sets for light lifts (no duplicate weights)", () => {
    // DB split squat wk1 working = 40/hand -> 40%/55% both round to 20, dedup.
    expect(warmupSets("db_split_squat", 1)).toEqual([
      { weight: 20, reps: 5 },
      { weight: 30, reps: 3 },
    ]);
  });

  it("never meets or exceeds the working weight and is strictly increasing", () => {
    for (const id of ["trap_bar_deadlift", "smith_squat", "axle_dl_doh", "db_bench", "sandbag"]) {
      for (const week of [1, 6, 11, 40]) {
        const working = targetWeight(id, week);
        const ramp = warmupSets(id, week);
        for (let i = 0; i < ramp.length; i++) {
          expect(ramp[i]!.weight).toBeLessThan(working);
          if (i > 0) expect(ramp[i]!.weight).toBeGreaterThan(ramp[i - 1]!.weight);
        }
      }
    }
  });

  it("honors TM overrides via the resolved working weight", () => {
    // Q1 override 405 -> warmups computed from 405, not the 315 placeholder.
    const tms = { trap_bar_deadlift: [405, null, null, null] as (number | null)[] };
    const ramp = warmupSets("trap_bar_deadlift", 1, tms);
    expect(ramp[0]!.weight).toBe(160); // mround(405*0.4,10)
    expect(ramp.every((s) => s.weight < 405)).toBe(true);
  });
});
