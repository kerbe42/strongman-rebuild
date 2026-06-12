import { useEffect, useState } from "react";
import {
  allExercises,
  buildCalendar,
  type PlanDay,
  type WeekType,
} from "../engine";
import { SessionView } from "../components/SessionView";
import { Button, Card, Pill, SectionTitle, WeekTypeBadge } from "../components/ui";
import { resolveSession } from "../lib/day";
import { formatDate } from "../lib/format";
import { parseNum } from "../lib/num";
import { useRoute } from "../lib/router";
import { useStore } from "../store/StoreProvider";
import type { DayOverride, ExerciseOverride } from "../store/types";

const CELL_TONE: Record<WeekType, string> = {
  build: "bg-build/25 text-blue-200",
  deload: "bg-deload/25 text-teal-200",
  test: "bg-test/30 text-amber-200",
};

export function Plan({ param }: { param?: string }) {
  if (param) return <DayDetail date={param} />;
  return <Calendar />;
}

function Calendar() {
  const [, navigate] = useRoute();
  const cal = buildCalendar();
  const weeks: PlanDay[][] = [];
  for (let w = 1; w <= 52; w++) weeks.push(cal.filter((d) => d.week === w));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50">Plan</h1>
        <div className="flex gap-2 text-[11px]">
          <Legend tone="build" label="build" />
          <Legend tone="deload" label="deload" />
          <Legend tone="test" label="test" />
        </div>
      </div>

      {[1, 2, 3, 4].map((q) => (
        <section key={q}>
          <SectionTitle>Quarter {q}</SectionTitle>
          <Card className="space-y-1 p-2">
            {weeks
              .filter((days) => days[0]!.quarter === q)
              .map((days) => {
                const wk = days[0]!.week;
                const type = days[0]!.weekType;
                return (
                  <div key={wk} className="flex items-center gap-2">
                    <div className="flex w-12 shrink-0 items-center gap-1">
                      <span className="text-xs tabular-nums text-slate-500">W{wk}</span>
                    </div>
                    <div className="grid flex-1 grid-cols-7 gap-1">
                      {days.map((d) => (
                        <button
                          key={d.date}
                          onClick={() => navigate("plan", d.date)}
                          className={`flex h-9 flex-col items-center justify-center rounded-md text-[10px] leading-none ${
                            d.sessionKind === "rest"
                              ? "bg-slate-800/60 text-slate-500"
                              : CELL_TONE[d.weekType]
                          }`}
                          title={`${formatDate(d.date)} · ${d.sessionKind}`}
                        >
                          <span className="font-semibold uppercase">{d.dow.slice(0, 1)}</span>
                          <span className="opacity-70">{d.date.slice(8)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="w-12 shrink-0 text-right">
                      {type !== "build" && (
                        <span className="text-[10px] uppercase text-slate-500">{type}</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </Card>
        </section>
      ))}
    </div>
  );
}

function Legend({ tone, label }: { tone: WeekType; label: string }) {
  const dot = { build: "bg-build", deload: "bg-deload", test: "bg-test" }[tone];
  return (
    <span className="flex items-center gap-1 text-slate-400">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function DayDetail({ date }: { date: string }) {
  const [, navigate] = useRoute();
  const { state, setOverride } = useStore();
  const session = resolveSession(date, state);

  if (!session) {
    return (
      <div className="space-y-4">
        <BackBtn onClick={() => navigate("plan")} />
        <Card className="p-4 text-slate-400">That date is outside the 52-week plan.</Card>
      </div>
    );
  }

  const ov = state.overrides[date] ?? {};

  function patchExercise(exerciseId: string, patch: Partial<ExerciseOverride>) {
    const current = state.overrides[date] ?? {};
    const exercises = { ...(current.exercises ?? {}) };
    const merged: ExerciseOverride = { ...exercises[exerciseId], ...patch };
    // strip empties
    (Object.keys(merged) as Array<keyof ExerciseOverride>).forEach((k) => {
      const val = merged[k];
      if (val == null || val === "") delete merged[k];
    });
    if (Object.keys(merged).length === 0) delete exercises[exerciseId];
    else exercises[exerciseId] = merged;
    commit({ ...current, exercises });
  }

  function commit(next: DayOverride) {
    const empty = !next.skipped && Object.keys(next.exercises ?? {}).length === 0;
    setOverride(date, empty ? null : next);
  }

  return (
    <div className="space-y-4">
      <BackBtn onClick={() => navigate("plan")} />

      <header>
        <p className="text-sm text-slate-400">{formatDate(date)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-50">
            Week {session.week} · Q{session.quarter}
          </h1>
          <WeekTypeBadge type={session.weekType} />
          {session.isCalibration && <Pill tone="amber">Calibration</Pill>}
          {session.isTestWeek && <Pill tone="amber">Test week</Pill>}
        </div>
      </header>

      <Card className="p-4">
        <label className="tap flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200">Skip this day</span>
          <input
            type="checkbox"
            checked={Boolean(ov.skipped)}
            onChange={(e) => commit({ ...ov, skipped: e.target.checked })}
            className="h-5 w-5 accent-red-500"
          />
        </label>
        {ov.skipped && (
          <input
            placeholder="Reason (optional)"
            value={ov.skipReason ?? ""}
            onChange={(e) => commit({ ...ov, skipped: true, skipReason: e.target.value })}
            className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        )}
      </Card>

      {!ov.skipped && session.items.length > 0 && (
        <section>
          <SectionTitle>Per-day overrides (deltas only)</SectionTitle>
          <div className="space-y-3">
            {session.items.map((item, i) => {
              const o = ov.exercises?.[item.originExerciseId];
              return (
                <Card key={`${item.originExerciseId}-${i}`} className="p-4">
                  <p className="font-semibold text-slate-100">{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Plan: {item.sets ?? "—"}
                    {item.reps ? ` × ${item.reps}` : ""}
                    {item.weightLb != null ? ` @ ${item.weightLb} lb` : ""}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <OverrideInput
                      label="weight"
                      value={o?.weightLb}
                      placeholder={item.weightLb?.toString() ?? "—"}
                      onCommit={(v) => patchExercise(item.originExerciseId, { weightLb: v ?? undefined })}
                    />
                    <OverrideInput
                      label="sets"
                      value={o?.sets}
                      placeholder={typeof item.sets === "number" ? String(item.sets) : "—"}
                      onCommit={(v) => patchExercise(item.originExerciseId, { sets: v ?? undefined })}
                    />
                    <OverrideText
                      label="reps"
                      value={o?.reps}
                      placeholder={item.reps ?? "—"}
                      onCommit={(v) => patchExercise(item.originExerciseId, { reps: v || undefined })}
                    />
                  </div>
                  <div className="mt-2">
                    <label className="text-xs text-slate-500">Swap exercise</label>
                    <select
                      value={o?.swapToExerciseId ?? ""}
                      onChange={(e) =>
                        patchExercise(item.originExerciseId, {
                          swapToExerciseId: e.target.value || undefined,
                        })
                      }
                      className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">— keep {item.name} —</option>
                      {allExercises().map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {o && Object.keys(o).length > 0 && (
                    <button
                      className="mt-2 text-xs text-slate-500 hover:text-slate-300"
                      onClick={() => patchExercise(item.originExerciseId, {
                        weightLb: undefined,
                        sets: undefined,
                        reps: undefined,
                        swapToExerciseId: undefined,
                      })}
                    >
                      Reset this exercise to plan
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Session preview</SectionTitle>
        <SessionView session={session} date={date} onUnskip={() => commit({ ...ov, skipped: false })} />
      </section>
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" className="h-10 px-2" onClick={onClick}>
      ‹ Calendar
    </Button>
  );
}

function OverrideInput({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  placeholder: string;
  onCommit: (v: number | null) => void;
}) {
  const [local, setLocal] = useState(value == null ? "" : String(value));
  useEffect(() => {
    setLocal(value == null ? "" : String(value));
  }, [value]);
  return (
    <div>
      <label className="text-[10px] uppercase text-slate-500">{label}</label>
      <input
        inputMode="numeric"
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onCommit(parseNum(local))}
        className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-center text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

function OverrideText({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);
  return (
    <div>
      <label className="text-[10px] uppercase text-slate-500">{label}</label>
      <input
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onCommit(local.trim())}
        className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-center text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}
