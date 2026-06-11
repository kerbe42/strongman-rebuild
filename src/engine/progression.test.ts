import { describe, expect, it } from "vitest";
import testVectors from "../../data/test_vectors.json";
import {
  buildIndex,
  mround,
  quarterOf,
  targetWeight,
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
