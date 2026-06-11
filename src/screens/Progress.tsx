import { useMemo, useState } from "react";
import {
  allLifts,
  dayForDate,
  getExercise,
  proteinTargetG,
  resolveTM,
  todayISO,
} from "../engine";
import { LineChart, type Point } from "../components/LineChart";
import { Button, Card, SectionTitle } from "../components/ui";
import { useRoute } from "../lib/router";
import { useStore } from "../store/StoreProvider";

export function Progress() {
  const { state, addBodyweight } = useStore();
  const [, navigate] = useRoute();
  const [bw, setBw] = useState("");

  const bodyweightSeries: Point[] = state.bodyweightLog.map((e) => ({
    label: e.date.slice(5),
    value: e.lb,
  }));

  const loggedExercises = useMemo(() => {
    const set = new Set<string>();
    for (const sets of Object.values(state.trainingLog)) {
      for (const s of sets) if (s.weightLb != null) set.add(s.exerciseId);
    }
    return [...set];
  }, [state.trainingLog]);

  const [sel, setSel] = useState("");
  const activeExercise = sel || loggedExercises[0] || "";

  const topSetSeries: Point[] = useMemo(() => {
    if (!activeExercise) return [];
    const pts: Point[] = [];
    for (const date of Object.keys(state.trainingLog).sort()) {
      const sets = (state.trainingLog[date] ?? []).filter(
        (s) => s.exerciseId === activeExercise && s.weightLb != null,
      );
      if (sets.length === 0) continue;
      pts.push({ label: date.slice(5), value: Math.max(...sets.map((s) => s.weightLb as number)) });
    }
    return pts;
  }, [state.trainingLog, activeExercise]);

  const proteinSeries: Point[] = useMemo(() => {
    const byWeek = new Map<number, { sum: number; days: number }>();
    for (const [date, meals] of Object.entries(state.mealLog)) {
      const d = dayForDate(date);
      if (!d) continue;
      const p = meals.reduce((a, m) => a + m.proteinG, 0);
      const cur = byWeek.get(d.week) ?? { sum: 0, days: 0 };
      byWeek.set(d.week, { sum: cur.sum + p, days: cur.days + 1 });
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([w, v]) => ({ label: `W${w}`, value: v.sum / v.days }));
  }, [state.mealLog]);

  const proteinTarget = proteinTargetG(state.settings.bodyweightLb);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Progress</h1>

      <section>
        <SectionTitle>Bodyweight</SectionTitle>
        <Card className="space-y-3 p-4">
          <LineChart data={bodyweightSeries} unit=" lb" />
          <div className="flex gap-2">
            <input
              inputMode="decimal"
              placeholder="Today's bodyweight (lb)"
              value={bw}
              onChange={(e) => setBw(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
            <Button
              className="h-11"
              disabled={bw.trim() === ""}
              onClick={() => {
                addBodyweight({ date: todayISO(), lb: Number(bw) });
                setBw("");
              }}
            >
              Log
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Top set over time</SectionTitle>
        <Card className="space-y-3 p-4">
          {loggedExercises.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              Log some training sets and they'll chart here.
            </p>
          ) : (
            <>
              <select
                value={activeExercise}
                onChange={(e) => setSel(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 focus:outline-none"
              >
                {loggedExercises.map((id) => (
                  <option key={id} value={id}>
                    {getExercise(id)?.name ?? id}
                  </option>
                ))}
              </select>
              <LineChart data={topSetSeries} unit=" lb" />
            </>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Weekly protein average</SectionTitle>
        <Card className="p-4">
          <LineChart data={proteinSeries} unit=" g" targetLine={proteinTarget} />
          {proteinSeries.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">Dashed line = {proteinTarget} g target.</p>
          )}
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>Training-max progression</SectionTitle>
          <button className="pb-2 text-xs text-blue-400" onClick={() => navigate("settings")}>
            Edit in Settings ›
          </button>
        </div>
        <Card className="divide-y divide-slate-800">
          {allLifts().map((lift) => (
            <div key={lift.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 truncate text-sm text-slate-200">{lift.name}</span>
              <div className="flex shrink-0 gap-1">
                {[1, 2, 3, 4].map((q) => {
                  const confirmed = state.tms[lift.id]?.[q - 1] != null;
                  return (
                    <span
                      key={q}
                      title={confirmed ? "confirmed" : "suggested"}
                      className={`w-12 rounded px-1 py-0.5 text-center text-xs tabular-nums ${
                        confirmed ? "bg-blue-600/30 text-blue-200" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {resolveTM(lift.id, q, state.tms)}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
        <p className="px-1 pt-1 text-[11px] text-slate-500">
          Blue = confirmed · grey = suggested (test-week results pre-fill the next quarter).
        </p>
      </section>
    </div>
  );
}
