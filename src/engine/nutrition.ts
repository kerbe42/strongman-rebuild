// Nutrition math + dietary-compliance scanning. Macro numbers come only from
// data/meals.json; the protein formula and exclusion lists come from
// data/plan_config.json. Nothing is invented (CLAUDE.md hard rule).
import meals from "../../data/meals.json";
import planConfig from "../../data/plan_config.json";
import { DOW_ORDER } from "./config";

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

export interface CatalogMeal {
  id: string;
  name: string;
  proteinG: number;
  kcal: number;
  group: string;
}

/** Flat, selectable meal list for the Meals tracker. Dinner plates already
 *  include their fixed sides (the protein_g/kcal on each rotation entry). */
export function mealCatalog(): CatalogMeal[] {
  const out: CatalogMeal[] = [];
  for (const m of MEALS.fixed_template) {
    out.push({ id: m.id, name: m.name, proteinG: m.protein_g, kcal: m.kcal, group: "Fixed template" });
  }
  for (const d of MEALS.dinner_rotation) {
    out.push({ id: d.id, name: d.name, proteinG: d.protein_g, kcal: d.kcal, group: "Dinner plates" });
  }
  for (const m of MEALS.super_meals_extra) {
    out.push({ id: m.id, name: m.name, proteinG: m.protein_g, kcal: m.kcal, group: "Extra super meals" });
  }
  return out;
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
