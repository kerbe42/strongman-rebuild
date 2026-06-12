// Nutrition math + dietary-compliance scanning. Macro numbers come only from
// data/meals.json; the protein formula and exclusion lists come from
// data/plan_config.json. Nothing is invented (CLAUDE.md hard rule).
import meals from "../../data/meals.json";
import planConfig from "../../data/plan_config.json";
import { DOW_ORDER } from "./config";
import type { Dow } from "./types";

interface Ingredient {
  food: string;
  amount?: string;
  p?: number;
  kcal?: number;
}
interface TemplateMeal {
  id: string;
  name: string;
  protein_g: number;
  kcal: number;
  items: Ingredient[];
  prep?: string;
  note?: string;
}
interface DinnerPlate {
  id: string;
  name: string;
  protein_g: number;
  kcal: number;
  protein_source: Ingredient;
  default_days: string[];
}
interface MealsData {
  fixed_template: TemplateMeal[];
  dinner_rotation: DinnerPlate[];
  dinner_fixed_sides: { protein_g: number; kcal: number; items: Ingredient[] };
  super_meals_extra: TemplateMeal[];
}

const MEALS = meals as unknown as MealsData;

/** protein_g/day target = round(bodyweight_lb * 0.8 / 5) * 5. */
export function proteinTargetG(bodyweightLb: number): number {
  return Math.round((bodyweightLb * 0.8) / 5) * 5;
}

export interface RecipeItem {
  food: string;
  amount?: string;
  p?: number;
  kcal?: number;
}

/** A selectable meal with its full ingredient breakdown + prep — "what it is
 *  and what to make". Dinner plates fold in the shared fixed sides. */
export interface MealRecipe {
  id: string;
  name: string;
  group: string;
  proteinG: number;
  kcal: number;
  items: RecipeItem[];
  prep?: string;
  note?: string;
}

export interface CatalogMeal {
  id: string;
  name: string;
  proteinG: number;
  kcal: number;
  group: string;
}

const DINNER_SIDES_NOTE = "Every dinner plate includes the fixed sides listed above.";

export function mealRecipes(): MealRecipe[] {
  const out: MealRecipe[] = [];
  for (const m of MEALS.fixed_template) {
    out.push({
      id: m.id,
      name: m.name,
      group: "Fixed template",
      proteinG: m.protein_g,
      kcal: m.kcal,
      items: m.items,
      prep: m.prep,
      note: m.note,
    });
  }
  for (const d of MEALS.dinner_rotation) {
    out.push({
      id: d.id,
      name: d.name,
      group: "Dinner plates",
      proteinG: d.protein_g,
      kcal: d.kcal,
      // protein source + the shared sides = the full plate (sums to the total).
      items: [d.protein_source, ...MEALS.dinner_fixed_sides.items],
      note: DINNER_SIDES_NOTE,
    });
  }
  for (const m of MEALS.super_meals_extra) {
    out.push({
      id: m.id,
      name: m.name,
      group: "Extra super meals",
      proteinG: m.protein_g,
      kcal: m.kcal,
      items: m.items,
      prep: m.prep,
      note: m.note,
    });
  }
  return out;
}

/** The 5 fixed-template meals — the planned default day (197 g / 2535 kcal). */
export function fixedTemplateMeals(): MealRecipe[] {
  return mealRecipes().filter((m) => m.group === "Fixed template");
}

/** The rotation dinner planned for a given day of week. */
export function dinnerForDow(dow: Dow): MealRecipe | null {
  const plate = MEALS.dinner_rotation.find((d) => d.default_days.includes(dow));
  if (!plate) return null;
  return mealRecipes().find((m) => m.id === plate.id) ?? null;
}

/** Flat, selectable meal list (names + totals only) for the add-list. */
export function mealCatalog(): CatalogMeal[] {
  return mealRecipes().map((m) => ({
    id: m.id,
    name: m.name,
    proteinG: m.proteinG,
    kcal: m.kcal,
    group: m.group,
  }));
}

/** The fixed daily template (everything except dinner). Verified 197 g / 2535 kcal. */
export function fixedTemplateTotals(): { proteinG: number; kcal: number } {
  let proteinG = 0;
  let kcal = 0;
  for (const m of MEALS.fixed_template) {
    proteinG += m.protein_g;
    kcal += m.kcal;
  }
  return { proteinG, kcal };
}

/**
 * Average day across the 7-day dinner rotation (fixed template + that day's
 * dinner plate, which already includes the fixed sides). Verified ~237 g /
 * ~3308 kcal.
 */
export function dinnerRotationWeeklyAverage(): { proteinG: number; kcal: number } {
  const ft = fixedTemplateTotals();
  const byDow = new Map<string, DinnerPlate>();
  for (const d of MEALS.dinner_rotation) {
    for (const day of d.default_days) byDow.set(day, d);
  }
  let pSum = 0;
  let kSum = 0;
  for (const dow of DOW_ORDER) {
    const dinner = byDow.get(dow);
    if (!dinner) throw new Error(`Dinner rotation has no plate for ${dow}`);
    pSum += ft.proteinG + dinner.protein_g;
    kSum += ft.kcal + dinner.kcal;
  }
  return { proteinG: pSum / 7, kcal: kSum / 7 };
}

// --- dietary compliance -----------------------------------------------------

function buildBannedTokens(): string[] {
  const rules = planConfig.dietary_rules;
  const tokens = new Set<string>();
  for (const entry of [...rules.excluded_user, ...rules.excluded_gout]) {
    // entries can be compound, e.g. "all legumes: beans, lentils, ..." or
    // "meat gravies/stocks" — split into individual ingredient tokens.
    for (const piece of entry.toLowerCase().split(/[:,/]/)) {
      const token = piece.trim().replace(/^all\s+/, "");
      if (token) tokens.add(token);
    }
  }
  return [...tokens];
}

const BANNED_TOKENS = buildBannedTokens();

/** Which excluded ingredients (if any) a piece of text names. Used for the
 *  meals scan and the custom-meal soft warning. */
export function findExcludedIngredients(text: string): string[] {
  const hay = text.toLowerCase();
  return BANNED_TOKENS.filter((token) => hay.includes(token));
}

export interface MealViolation {
  where: string;
  food: string;
  matched: string[];
}

/** Walk every *ingredient* in the library (not notes/prep) against the
 *  excluded lists. Must return [] for the shipped data. */
export function scanMealsForViolations(): MealViolation[] {
  const violations: MealViolation[] = [];
  const check = (where: string, food: string) => {
    const matched = findExcludedIngredients(food);
    if (matched.length) violations.push({ where, food, matched });
  };
  for (const m of MEALS.fixed_template) for (const it of m.items) check(m.name, it.food);
  for (const d of MEALS.dinner_rotation) check(d.name, d.protein_source.food);
  for (const it of MEALS.dinner_fixed_sides.items) check("Dinner sides", it.food);
  for (const m of MEALS.super_meals_extra) for (const it of m.items) check(m.name, it.food);
  return violations;
}
