import { useState } from "react";
import { demoSearchUrl, warmupRamp, type SessionItem } from "../engine";
import { useStore } from "../store/StoreProvider";
import type { SetLog } from "../store/types";
import { formatWeight } from "../lib/format";
import { parseNum } from "../lib/num";
import { Button, Card, Pill, SafetyNote } from "./ui";

function numericReps(reps: string | undefined): string {
  if (!reps) return "";
  const m = reps.match(/^\d+/);
  return m ? m[0] : "";
}

interface Row {
  set: number;
  weight: string;
  reps: string;
  rpe: string;
}

export function ExerciseCard({ item, date }: { item: SessionItem; date: string }) {
  const { state, setTrainingLog, setPinnedDemo } = useStore();
  const [open, setOpen] = useState(false);
  const [showCues, setShowCues] = useState(false);

  const logged = (state.trainingLog[date] ?? []).filter((s) => s.exerciseId === item.exerciseId);
  const isLogged = logged.length > 0;
  const setCount = typeof item.sets === "number" ? item.sets : 1;

  function blankRows(): Row[] {
    return Array.from({ length: setCount }, (_, i) => ({
      set: i + 1,
      weight: item.weightLb?.toString() ?? "",
      reps: numericReps(item.reps),
      rpe: "",
    }));
  }

  // This card is keyed by date in SessionView, so it remounts (and re-seeds)
  // when the user navigates to a different day — no stale cross-date rows.
  const [rows, setRows] = useState<Row[]>(() =>
    logged.length > 0
      ? logged.map((s) => ({
          set: s.set,
          weight: s.weightLb?.toString() ?? "",
          reps: s.reps?.toString() ?? "",
          rpe: s.rpe?.toString() ?? "",
        }))
      : blankRows(),
  );

  const pinnedUrl = (state.settings.pinnedDemos ?? {})[item.exerciseId];
  const demoUrl = pinnedUrl ?? (item.demoSearch ? demoSearchUrl(item.demoSearch) : null);

  // Warm-up ramp up to the working weight (every weighted lift). Empty for
  // bodyweight / RPE-driven (test-week single) / no-load items.
  const warmups = item.weightLb != null ? warmupRamp(item.weightLb) : [];

  function save() {
    const next: SetLog[] = rows
      .map((r) => ({
        exerciseId: item.exerciseId,
        set: r.set,
        weightLb: parseNum(r.weight),
        reps: parseNum(r.reps),
        rpe: parseNum(r.rpe),
      }))
      .filter((s) => s.weightLb != null || s.reps != null || s.rpe != null);
    const others = (state.trainingLog[date] ?? []).filter((s) => s.exerciseId !== item.exerciseId);
    setTrainingLog(date, [...others, ...next]);
    setOpen(false);
  }

  function clearLog() {
    const others = (state.trainingLog[date] ?? []).filter((s) => s.exerciseId !== item.exerciseId);
    setTrainingLog(date, others);
    setRows(blankRows()); // don't resurrect the cleared log on re-open
    setOpen(false);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isLogged && <span className="text-emerald-400">✓</span>}
            <h3 className="truncate font-semibold text-slate-100">{item.name}</h3>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">
            {item.sets != null && (
              <span className="text-slate-300">
                {item.sets}
                {item.reps ? ` × ${item.reps}` : ""}
              </span>
            )}
            {item.weightLb != null && (
              <span className="ml-1 font-semibold text-slate-100">@ {formatWeight(item.weightLb)}</span>
            )}
            {item.weightLb != null && <span className="text-slate-500"> (working sets)</span>}
          </p>
          {warmups.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              <span className="text-slate-400">Warm-up first:</span>{" "}
              {warmups.map((w, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-slate-600"> · </span>}
                  {formatWeight(w.weight)} × {w.reps}
                </span>
              ))}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.rpeCap && <Pill>RPE {item.rpeCap}</Pill>}
            {item.rest && <Pill>rest {item.rest}</Pill>}
            {item.equipment?.map((e) => (
              <Pill key={e}>{e}</Pill>
            ))}
          </div>
        </div>
        <Button variant={open ? "secondary" : "primary"} className="h-10 shrink-0" onClick={() => setOpen((o) => !o)}>
          {isLogged ? "Edit" : "Log"}
        </Button>
      </div>

      {item.substitutionNote && (
        <p className="mt-2 rounded-lg bg-slate-800/70 px-3 py-2 text-sm text-slate-300">
          ↻ {item.substitutionNote}
        </p>
      )}
      {item.notes && <p className="mt-2 text-sm text-slate-400">{item.notes}</p>}
      {item.safety && <SafetyNote>{item.safety}</SafetyNote>}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {item.cues && item.cues.length > 0 && (
          <button className="text-blue-400 hover:text-blue-300" onClick={() => setShowCues((c) => !c)}>
            {showCues ? "Hide cues" : "Cues"}
          </button>
        )}
        {demoUrl && (
          <a className="text-blue-400 hover:text-blue-300" href={demoUrl} target="_blank" rel="noopener noreferrer">
            Watch demo ↗{pinnedUrl ? " (pinned)" : ""}
          </a>
        )}
      </div>
      {showCues && item.cues && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-400">
          {item.cues.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-3 border-t border-slate-800 pt-3">
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-slate-500">Set {r.set}</span>
                <LogInput
                  placeholder="lb"
                  value={r.weight}
                  onChange={(v) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, weight: v } : x)))}
                />
                <LogInput
                  placeholder="reps"
                  value={r.reps}
                  onChange={(v) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, reps: v } : x)))}
                />
                <LogInput
                  placeholder="RPE"
                  value={r.rpe}
                  onChange={(v) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, rpe: v } : x)))}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button className="h-10 flex-1" onClick={save}>
              Save log
            </Button>
            {isLogged && (
              <Button variant="ghost" className="h-10" onClick={clearLog}>
                Clear
              </Button>
            )}
          </div>
          {pinnedUrl && (
            <button
              className="mt-2 text-xs text-slate-500 hover:text-slate-300"
              onClick={() => setPinnedDemo(item.exerciseId, null)}
            >
              Unpin demo video
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function LogInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 text-center text-base text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
    />
  );
}
