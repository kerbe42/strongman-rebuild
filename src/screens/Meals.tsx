import { useMemo, useState } from "react";
import {
  FLARE_PROTOCOL_SWAP,
  findExcludedIngredients,
  mealCatalog,
  proteinTargetG,
  todayISO,
} from "../engine";
import { DailyChecks } from "../components/DailyChecks";
import { Button, Card, ProgressBar, SafetyNote, SectionTitle } from "../components/ui";
import { parseNum } from "../lib/num";
import { useStore } from "../store/StoreProvider";
import type { MealEntry } from "../store/types";

const MULTIPLIERS = [0.5, 0.75, 1, 1.5, 2];

export function Meals() {
  const { state, setMealLog } = useStore();
  const date = todayISO();
  const meals = state.mealLog[date] ?? [];
  const flareOn = state.dailyChecks[date]?.flareProtocol ?? false;

  const totals = meals.reduce(
    (acc, m) => ({ proteinG: acc.proteinG + m.proteinG, kcal: acc.kcal + m.kcal }),
    { proteinG: 0, kcal: 0 },
  );
  const proteinTarget = proteinTargetG(state.settings.bodyweightLb);

  function addMeal(entry: MealEntry) {
    setMealLog(date, [...meals, entry]);
  }
  function removeMeal(index: number) {
    setMealLog(
      date,
      meals.filter((_, i) => i !== index),
    );
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

      <section>
        <SectionTitle>Today's meals</SectionTitle>
        {meals.length === 0 ? (
          <Card className="p-4 text-sm text-slate-500">Nothing logged yet.</Card>
        ) : (
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
        )}
      </section>

      <AddFromLibrary onAdd={addMeal} />
      <CustomMeal onAdd={addMeal} />
    </div>
  );
}

function AddFromLibrary({ onAdd }: { onAdd: (e: MealEntry) => void }) {
  const catalog = useMemo(() => mealCatalog(), []);
  const groups = useMemo(() => [...new Set(catalog.map((m) => m.group))], [catalog]);
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        className="flex w-full items-center justify-between px-1 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400"
        onClick={() => setOpen((o) => !o)}
      >
        Add from library
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group} className="p-2">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase text-slate-500">{group}</p>
              <div className="divide-y divide-slate-800">
                {catalog
                  .filter((m) => m.group === group)
                  .map((m) => (
                    <CatalogRow key={m.id} meal={m} onAdd={onAdd} />
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function CatalogRow({
  meal,
  onAdd,
}: {
  meal: { id: string; name: string; proteinG: number; kcal: number };
  onAdd: (e: MealEntry) => void;
}) {
  const [mult, setMult] = useState(1);
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-200">{meal.name}</p>
        <p className="text-xs text-slate-500">
          {Math.round(meal.proteinG * mult)} g · {Math.round(meal.kcal * mult)} kcal
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={mult}
          onChange={(e) => setMult(Number(e.target.value))}
          className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-1 text-sm text-slate-200 focus:outline-none"
          aria-label="portion"
        >
          {MULTIPLIERS.map((x) => (
            <option key={x} value={x}>
              {x}×
            </option>
          ))}
        </select>
        <Button
          className="h-10"
          onClick={() =>
            onAdd({
              mealId: meal.id,
              name: meal.name,
              multiplier: mult,
              proteinG: Math.round(meal.proteinG * mult),
              kcal: Math.round(meal.kcal * mult),
            })
          }
        >
          Add
        </Button>
      </div>
    </div>
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
