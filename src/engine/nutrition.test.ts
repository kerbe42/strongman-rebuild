import { describe, expect, it } from "vitest";
import {
  BIG_MEALS_GROUP,
  bigMeals,
  dinnerForDow,
  dinnerRotationWeeklyAverage,
  findExcludedIngredients,
  fixedTemplateMeals,
  fixedTemplateTotals,
  mealRecipes,
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

describe("meal recipes — ingredients, amounts, prep", () => {
  const recipes = mealRecipes();

  it("exposes every ingredient with its amount and macros", () => {
    const anchor = recipes.find((m) => m.id === "anchor_bowl")!;
    expect(anchor.items).toHaveLength(5);
    const yogurt = anchor.items[0]!;
    expect(yogurt.food).toContain("Greek yogurt");
    expect(yogurt.amount).toBeTruthy();
    expect(yogurt.p).toBe(38);
    expect(yogurt.kcal).toBe(220);
  });

  it("folds the shared fixed sides into each dinner plate (and the items sum to the plate total)", () => {
    const thigh = recipes.find((m) => m.id === "dinner_thigh")!;
    // protein source + 3 fixed sides (potatoes, salad, cherries)
    expect(thigh.items).toHaveLength(4);
    const pSum = thigh.items.reduce((a, it) => a + (it.p ?? 0), 0);
    const kSum = thigh.items.reduce((a, it) => a + (it.kcal ?? 0), 0);
    expect(pSum).toBe(thigh.proteinG); // 39
    expect(kSum).toBe(thigh.kcal); // 780
  });

  it("carries prep instructions where the data provides them", () => {
    const oats = recipes.find((m) => m.id === "protein_oats")!;
    expect(oats.prep).toBe("Cook oats in milk, stir whey in off heat.");
  });
});

describe("big meals — 1-to-2-a-day, hit ~230 g cleanly", () => {
  const big = bigMeals();

  it("exposes the big-meal set with tags + flesh oz", () => {
    expect(big.length).toBeGreaterThanOrEqual(6);
    expect(big.every((m) => m.group === BIG_MEALS_GROUP)).toBe(true);
    expect(new Set(big.map((m) => m.tag))).toEqual(new Set(["dairy", "flesh", "omad"]));
    const omad = big.find((m) => m.tag === "omad")!;
    expect(omad.fleshOz).toBe(8);
  });

  it("each big meal's ingredients sum exactly to its stated macros", () => {
    for (const m of big) {
      const p = m.items.reduce((a, it) => a + (it.p ?? 0), 0);
      const k = m.items.reduce((a, it) => a + (it.kcal ?? 0), 0);
      expect(p).toBe(m.proteinG);
      expect(k).toBe(m.kcal);
    }
  });

  it("a dairy + flesh pair clears the 230 g target within the 8 oz flesh cap", () => {
    const dairy = big.filter((m) => m.tag === "dairy");
    const flesh = big.filter((m) => m.tag === "flesh");
    // best dairy + best flesh pairing
    const best = Math.max(...dairy.map((d) => d.proteinG)) + Math.max(...flesh.map((f) => f.proteinG));
    expect(best).toBeGreaterThanOrEqual(230);
    // each flesh meal stays within the 8 oz/day cap on its own
    expect(flesh.every((f) => (f.fleshOz ?? 0) <= 8)).toBe(true);
  });

  it("an OMAD plate hits the target in one meal", () => {
    const omad = big.find((m) => m.tag === "omad")!;
    expect(omad.proteinG).toBeGreaterThanOrEqual(230);
  });
});

describe("daily plan helpers", () => {
  it("returns the 5 fixed-template meals (the default day)", () => {
    const t = fixedTemplateMeals();
    expect(t).toHaveLength(5);
    expect(t.map((m) => m.id)).toContain("anchor_bowl");
    expect(t.map((m) => m.id)).toContain("double_whey");
  });

  it("maps each day-of-week to its rotation dinner", () => {
    expect(dinnerForDow("mon")!.id).toBe("dinner_thigh");
    expect(dinnerForDow("wed")!.id).toBe("dinner_pork");
    expect(dinnerForDow("sat")!.id).toBe("dinner_turkey");
    expect(dinnerForDow("sun")!.id).toBe("dinner_haddock");
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
