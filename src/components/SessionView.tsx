import type { ResolvedSession } from "../lib/day";
import { ExerciseCard } from "./ExerciseCard";
import { Button, Card, EmptyState } from "./ui";

export function SessionView({
  session,
  date,
  onUnskip,
}: {
  session: ResolvedSession;
  date: string;
  onUnskip?: () => void;
}) {
  if (session.skipped) {
    return (
      <Card className="p-4">
        <p className="font-semibold text-amber-300">Skipped</p>
        {session.skipReason && <p className="mt-1 text-sm text-slate-400">{session.skipReason}</p>}
        {onUnskip && (
          <Button variant="secondary" className="mt-3 h-10" onClick={onUnskip}>
            Un-skip
          </Button>
        )}
      </Card>
    );
  }

  if (session.items.length === 0 && session.recovery) {
    return (
      <Card className="p-4">
        <p className="font-semibold text-slate-200">Recovery</p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
          {session.recovery.map((task, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-slate-500">
                ·
              </span>
              {task}
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  if (session.items.length === 0) {
    return <EmptyState title="No session scheduled for this day." />;
  }

  return (
    <div className="space-y-3">
      {session.items.map((item, i) => (
        // Key by date so the card remounts (and re-seeds its log inputs) when
        // navigating between days — prevents stale rows leaking across dates.
        <ExerciseCard key={`${date}-${item.exerciseId}-${i}`} item={item} date={date} />
      ))}
    </div>
  );
}
