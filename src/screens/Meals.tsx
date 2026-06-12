import { useMemo, useState } from "react";
import {
  FLARE_PROTOCOL_SWAP,
  bigMeals,
  dinnerForDow,
  dowOf,
  findExcludedIngredients,
  fixedTemplateMeals,
  mealRecipes,
  proteinTargetG,
  todayISO,
  type MealRecipe,
} from "../engine";
import { DailyChecks } from "../components/DailyChecks";
import { Button, Card, ProgressBar, SafetyNote, SectionTitle } from "../components/ui";
import { parseNum } from "../lib/num";
import { useStore } from "../store/StoreProvider";
import type { MealEntry } from "../store/types";

const MULTIPLIERS = [0.5, 0.75, 1, 1.5, 2];

function entryFor(recipe: MealRecipe, mult: number): MealEntry {
  return {
    mealId: recipe.id,
    name: recipe.name,
    multiplier: mult,
    proteinG: Math.round(recipe.proteinG * mult),
    kcal: Math.round(recipe.kcal * mult),
  };
}

export function Meals() {
  const { state, setMealLog, updateSettings } = useStore();
  const date = todayISO();
  const meals = state.mealLog[date] ?? [];
  const flareOn = state.dailyChecks[date]?.flareProtocol ?? false;

  const totals = meals.reduce(
    (acc, m) => ({ proteinG: acc.proteinG + m.proteinG, kcal: acc.kcal + m.kcal }),
    { proteinG: 0, kcal: 0 },
  );
  const proteinTarget = proteinTargetG(state.settings.bodyweightLb);

  const template = useMemo(() => fixedTemplateMeals(), []);
  const bigMealList = useMemo(() => bigMeals(), []);
  const tonightsDinner = useMemo(() => dinnerForDow(dowOf(date)), [date]);
  const templateTotals = template.reduce(
    (a, m) => ({ p: a.p + m.proteinG, k: a.k + m.kcal }),
    { p: 0, k: 0 },
  );

  function addMeal(entry: MealEntry) {
    setMealLog(date, [...meals, entry]);
  }
  function removeMeal(index: number) {
    setMealLog(
      date,
      meals.filter((_, i) => i !== index),
    );
  }
  function logTemplate() {
    setMealLog(date, [...meals, ...template.map((m) => entryFor(m, 1))]);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-50">Meals</h1>

      <Card className="space-y-4 p-4">
        <ProgressBar label="Protein" value={totals.proteinG} max={proteinTarget} unit="g" />
        <ProgressBar
          label="Calories"
          value={totals.kcal}
          max={state.settings.kcalTarget}
          unit="kcal"
          unknownMax={state.settings.kcalTarget == null}
        />
        {state.settings.kcalTarget == null && (
          <p className="text-xs text-slate-500">
            kcal target is unset — measure maintenance from a normal week, then set it in Settings.
          </p>
        )}
      </Card>

      <DailyChecks date={date} showFlare />
      {flareOn && (
        <Card className="border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">Flare protocol active — day flagged</p>
          <p className="mt-1 text-sm text-slate-300">{FLARE_PROTOCOL_SWAP}</p>
        </Card>
      )}

      {meals.length > 0 && (
        <section>
          <SectionTitle>Today's meals</SectionTitle>
          <Card className="divide-y divide-slate-800">
            {meals.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-200">
                    {m.name ?? m.mealId}
                    {m.multiplier !== 1 && <span className="text-slate-500"> ×{m.multiplier}</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {m.proteinG} g · {m.kcal} kcal
                  </p>
                </div>
                <button
                  className="shrink-0 text-slate-500 hover:text-red-400"
                  onClick={() => removeMeal(i)}
                  aria-label="remove meal"
                >
                  ✕
                </button>
              </div>
            ))}
          </Card>
        </section>
      )}

      <BigMealsSection
        meals={bigMealList}
        mealsPerDay={state.settings.mealsPerDay}
        proteinTarget={proteinTarget}
        onAdd={addMeal}
        onSetMealsPerDay={(n) => updateSettings({ mealsPerDay: n })}
      />

      <section>
        <SectionTitle>Or the 6-small-meal standard day</SectionTitle>
        <p className="px-1 pb-2 text-xs text-slate-500">
          Your standard day is these five, every day ({templateTotals.p} g / {templateTotals.k} kcal),
          plus tonight's dinner. Tap any meal to see its ingredients and how to build it.
        </p>
        <div className="mb-2">
          <Button className="h-11 w-full" variant="secondary" onClick={logTemplate}>
            Log the standard day ({templateTotals.p} g · {templateTotals.k} kcal)
          </Button>
        </div>
        <div className="space-y-2">
          {template.map((r) => (
            <MealCard key={r.id} recipe={r} onAdd={addMeal} />
          ))}
        </div>

        {tonightsDinner && (
          <>
            <p className="px-1 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tonight's dinner
            </p>
            <MealCard recipe={tonightsDinner} onAdd={addMeal} />
          </>
        )}
      </section>

      <BrowseLibrary onAdd={addMeal} />
      <CustomMeal onAdd={addMeal} />
    </div>
  );
}

function BigMealsSection({
  meals,
  mealsPerDay,
  proteinTarget,
  onAdd,
  onSetMealsPerDay,
}: {
  meals: MealRecipe[];
  mealsPerDay: number;
  proteinTarget: number;
  onAdd: (e: MealEntry) => void;
  onSetMealsPerDay: (n: 1 | 2) => void;
}) {
  const perMeal = Math.round(proteinTarget / mealsPerDay / 5) * 5;
  const groups: { tag: string; label: string }[] = [
    { tag: "dairy", label: "Dairy-forward (no flesh)" },
    { tag: "flesh", label: "With flesh (uses your 8 oz/day)" },
    { tag: "omad", label: "One meal (OMAD — a full day in one)" },
  ];
  return (
    <section>
      <SectionTitle>Big meals — 1 or 2 a day</SectionTitle>
      <Card className="mb-2 space-y-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-200">Meals today</span>
          <div className="flex gap-1">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => onSetMealsPerDay(n)}
                className={`tap h-9 w-11 rounded-lg text-sm font-bold ${
                  mealsPerDay === n ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-300">
          Target <span className="font-semibold text-slate-100">{proteinTarget} g</span> protein ·{" "}
          {mealsPerDay} meal{mealsPerDay > 1 ? "s" : ""} → ~
          <span className="font-semibold text-slate-100">{perMeal} g</span> each.
        </p>
        <p className="text-xs text-slate-500">
          Pair one dairy + one flesh meal for a 2-meal day — that keeps you under the 8 oz/day flesh
          cap. Tap a meal for the recipe.
        </p>
      </Card>
      {groups.map((g) => {
        const items = meals.filter((m) => m.tag === g.tag);
        if (items.length === 0) return null;
        return (
          <div key={g.tag} className="mt-3">
            <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {g.label}
            </p>
            <div className="space-y-2">
              {items.map((m) => (
                <MealCard key={m.id} recipe={m} onAdd={onAdd} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function RecipeDetail({ recipe }: { recipe: MealRecipe }) {
  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <ul className="space-y-1.5 text-sm">
        {recipe.items.map((it, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="text-slate-200">
              {it.food}
              {it.amount ? <span className="text-slate-500"> — {it.amount}</span> : null}
            </span>
            <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-slate-500">
              {it.p != null ? `${it.p} g` : ""}
              {it.kcal != null ? `${it.p != null ? " · " : ""}${it.kcal} kcal` : ""}
            </span>
          </li>
        ))}
      </ul>
      {recipe.prep && (
        <p className="mt-2 text-sm text-slate-300">
          <span className="font-semibold text-slate-400">Prep: </span>
          {recipe.prep}
        </p>
      )}
      {recipe.note && <p className="mt-1.5 text-xs italic text-slate-500">{recipe.note}</p>}
    </div>
  );
}

function MealCard({
  recipe,
  onAdd,
  withMultiplier = false,
}: {
  recipe: MealRecipe;
  onAdd: (e: MealEntry) => void;
  withMultiplier?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mult, setMult] = useState(1);
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <p className="truncate text-sm font-medium text-slate-100">
            {recipe.name} <span className="text-slate-500">{open ? "▾" : "▸"}</span>
          </p>
          <p className="text-xs text-slate-500">
            {Math.round(recipe.proteinG * mult)} g · {Math.round(recipe.kcal * mult)} kcal
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {withMultiplier && (
            <select
              value={mult}
              onChange={(e) => setMult(Number(e.target.value))}
              className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-1 text-sm text-slate-200 focus:outline-none"
              aria-label="portion"
            >
              {MULTIPLIERS.map((x) => (
                <option key={x} value={x}>
                  {x}×
                </option>
              ))}
            </select>
          )}
          <Button className="h-9" onClick={() => onAdd(entryFor(recipe, mult))}>
            Add
          </Button>
        </div>
      </div>
      {open && <RecipeDetail recipe={recipe} />}
    </Card>
  );
}

function BrowseLibrary({ onAdd }: { onAdd: (e: MealEntry) => void }) {
  const recipes = useMemo(() => mealRecipes(), []);
  const groups = useMemo(() => [...new Set(recipes.map((m) => m.group))], [recipes]);
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        className="flex w-full items-center justify-between px-1 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400"
        onClick={() => setOpen((o) => !o)}
      >
        Browse all meals (recipes + portions)
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase text-slate-500">{group}</p>
              <div className="space-y-2">
                {recipes
                  .filter((m) => m.group === group)
                  .map((m) => (
                    <MealCard key={m.id} recipe={m} onAdd={onAdd} withMultiplier />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CustomMeal({ onAdd }: { onAdd: (e: MealEntry) => void }) {
  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [kcal, setKcal] = useState("");
  const warnings = name.trim() ? findExcludedIngredients(name) : [];

  return (
    <section>
      <SectionTitle>Custom meal</SectionTitle>
      <Card className="space-y-3 p-4">
        <input
          placeholder="Name (e.g. Tuna sandwich)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            placeholder="protein g"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
          <input
            inputMode="numeric"
            placeholder="kcal"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        {warnings.length > 0 && (
          <SafetyNote>
            Heads up — this names an excluded ingredient ({warnings.join(", ")}). Eggs, all legumes,
            and high-purine flesh are off the plan.
          </SafetyNote>
        )}
        <Button
          className="h-11 w-full"
          disabled={name.trim() === "" || (protein.trim() === "" && kcal.trim() === "")}
          onClick={() => {
            onAdd({
              mealId: "custom",
              name: name.trim(),
              multiplier: 1,
              proteinG: parseNum(protein) ?? 0,
              kcal: parseNum(kcal) ?? 0,
            });
            setName("");
            setProtein("");
            setKcal("");
          }}
        >
          Add custom meal
        </Button>
      </Card>
    </section>
  );
}
