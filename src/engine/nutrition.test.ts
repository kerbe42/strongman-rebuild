import { describe, expect, it } from "vitest";
import {
  dinnerRotationWeeklyAverage,
  findExcludedIngredients,
  fixedTemplateTotals,
  proteinTargetG,
  scanMealsForViolations,
} from "./nutrition";

describe("protein target = round(bodyweight * 0.8 / 5) * 5", () => {
  it("hits the verified invariant at 285 lb", () => {
    expect(proteinTargetG(285)).toBe(230);
  });

  it("rounds to the nearest 5 g for other bodyweights", () => {
    expect(proteinTargetG(200)).toBe(160);
    expect(proteinTargetG(250)).toBe(200);
    expect(proteinTargetG(300)).toBe(240);
  });
});

describe("fixed daily template (no dinner)", () => {
  it("sums to exactly 197 g protein / 2535 kcal", () => {
    expect(fixedTemplateTotals()).toEqual({ proteinG: 197, kcal: 2535 });
  });
});

describe("7-day dinner-rotation weekly average", () => {
  const avg = dinnerRotationWeeklyAverage();

  it("averages ~237 g protein/day (tolerance +/- 1 g)", () => {
    expect(Math.abs(avg.proteinG - 237)).toBeLessThanOrEqual(1);
  });

  it("averages ~3308 kcal/day (tolerance +/- 15 kcal)", () => {
    expect(Math.abs(avg.kcal - 3308)).toBeLessThanOrEqual(15);
  });
});

describe("meal compliance — no excluded ingredients in the shipped library", () => {
  it("the ingredient scanner actually catches excluded foods", () => {
    // Sanity check: the scanner is not a no-op.
    const hits = findExcludedIngredients("scrambled eggs with tofu and a side of beans");
    expect(hits).toContain("eggs");
    expect(hits).toContain("tofu");
    expect(hits).toContain("beans");
  });

  it("does not flag the planned pork-tenderloin exception", () => {
    expect(findExcludedIngredients("Pork tenderloin, cooked")).toEqual([]);
  });

  it("does not read explanatory note/prep fields (only real ingredients)", () => {
    // chicken_ranch_wrap's note mentions egg/anchovy as things being AVOIDED.
    const violations = scanMealsForViolations();
    expect(violations).toEqual([]);
  });
});
