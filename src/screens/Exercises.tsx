import { useState } from "react";
import { allExercises, demoSearchUrl, type ExerciseLib } from "../engine";
import { Button, Card, Pill, SafetyNote } from "../components/ui";
import { useStore } from "../store/StoreProvider";

export function Exercises() {
  const [query, setQuery] = useState("");
  const list = allExercises().filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.type.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-50">Exercise library</h1>
      <input
        placeholder="Search lifts…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
      />
      <div className="space-y-3">
        {list.map((ex) => (
          <ExerciseEntry key={ex.id} ex={ex} />
        ))}
        {list.length === 0 && <p className="text-sm text-slate-500">No matches.</p>}
      </div>
    </div>
  );
}

function ExerciseEntry({ ex }: { ex: ExerciseLib }) {
  const { state, setPinnedDemo } = useStore();
  const pinned = state.settings.pinnedDemos[ex.id];
  const [editingPin, setEditingPin] = useState(false);
  const [url, setUrl] = useState(pinned ?? "");

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-100">{ex.name}</h3>
        <Pill>{ex.type}</Pill>
      </div>

      {ex.safety && <SafetyNote>{ex.safety}</SafetyNote>}

      {ex.cues.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-300">
          {ex.cues.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}

      {ex.note && <p className="mt-2 text-sm text-slate-400">{ex.note}</p>}
      {ex.substitution && (
        <p className="mt-2 rounded-lg bg-slate-800/70 px-3 py-2 text-sm text-slate-300">↻ {ex.substitution}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ex.equipment.map((e) => (
          <Pill key={e}>{e}</Pill>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <a
          href={pinned ?? demoSearchUrl(ex.demo_search)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-400 hover:text-blue-300"
        >
          ▶ Watch demo{pinned ? " (pinned)" : ""}
        </a>
        <button
          className="text-slate-400 hover:text-slate-200"
          onClick={() => {
            setUrl(pinned ?? "");
            setEditingPin((v) => !v);
          }}
        >
          {pinned ? "Edit pin" : "Pin a video"}
        </button>
      </div>

      {editingPin && (
        <div className="mt-2 flex gap-2">
          <input
            placeholder="https://youtu.be/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
          <Button
            className="h-10"
            onClick={() => {
              setPinnedDemo(ex.id, url.trim() || null);
              setEditingPin(false);
            }}
          >
            Save
          </Button>
          {pinned && (
            <Button
              variant="ghost"
              className="h-10"
              onClick={() => {
                setPinnedDemo(ex.id, null);
                setEditingPin(false);
              }}
            >
              Unpin
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
