import {
  START_DATE,
  dayForDate,
  dayIndexOf,
  getLift,
  isoForDayIndex,
  quarterOf,
  todayISO,
} from "../engine";
import { DailyChecks } from "../components/DailyChecks";
import { SessionView } from "../components/SessionView";
import { Button, Card, Pill, WeekTypeBadge } from "../components/ui";
import { resolveSession } from "../lib/day";
import { formatDate, formatWeight } from "../lib/format";
import { useStore } from "../store/StoreProvider";

export function Today() {
  const today = todayISO();
  const planDay = dayForDate(today);

  // Before the plan begins, preview Day 1; after it ends, celebrate.
  if (!planDay) {
    const idx = dayIndexOf(today);
    if (idx < 0) {
      const daysUntil = -idx;
      return (
        <div className="space-y-4">
          <Header date={isoForDayIndex(0)} />
          <Card className="p-4">
            <p className="text-slate-200">
              Plan starts <span className="font-semibold">{formatDate(START_DATE)}</span> —{" "}
              {daysUntil} {daysUntil === 1 ? "day" : "days"} out.
            </p>
            <p className="mt-1 text-sm text-slate-400">Here's Day 1 so you can prep.</p>
          </Card>
          <DaySession date={isoForDayIndex(0)} />
        </div>
      );
    }
    return (
      <Card className="mt-6 p-6 text-center">
        <p className="text-lg font-semibold text-slate-100">Plan complete 🎉</p>
        <p className="mt-1 text-sm text-slate-400">52 weeks done. Review Progress, then set the next block.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Header date={today} />
      <DailyChecks date={today} />
      <DaySession date={today} />
    </div>
  );
}

function Header({ date }: { date: string }) {
  const day = dayForDate(date);
  return (
    <header>
      <p className="text-sm text-slate-400">{formatDate(date)}</p>
      {day && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-50">
            Week {day.week} <span className="text-slate-500">·</span> Q{day.quarter}
          </h1>
          <WeekTypeBadge type={day.weekType} />
          {day.isCalibration && <Pill tone="amber">Calibration</Pill>}
          {day.isTestWeek && <Pill tone="amber">Test week</Pill>}
        </div>
      )}
    </header>
  );
}

function DaySession({ date }: { date: string }) {
  const { state } = useStore();
  const session = resolveSession(date, state);
  if (!session) return null;

  return (
    <div className="space-y-4">
      <SessionView session={session} date={date} />
      {session.isCalibration && <CalibrationActions date={date} />}
    </div>
  );
}

function CalibrationActions({ date }: { date: string }) {
  const { state, setTM } = useStore();
  const session = resolveSession(date, state);
  if (!session) return null;

  // Offer to save the logged top set of any main lift as its Q1 TM.
  const cards = session.items
    .filter((it) => it.liftId)
    .map((it) => {
      const logged = (state.trainingLog[date] ?? []).filter((s) => s.exerciseId === it.exerciseId);
      const top = logged.reduce<number | null>(
        (max, s) => (s.weightLb != null && (max == null || s.weightLb > max) ? s.weightLb : max),
        null,
      );
      if (top == null || !it.liftId) return null;
      const lift = getLift(it.liftId);
      const current = state.tms[it.liftId]?.[0] ?? null;
      const alreadySet = current === top;
      return (
        <Card key={it.exerciseId} className="border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-slate-300">
            Calibration: your top {lift.name} set was{" "}
            <span className="font-semibold text-slate-100">{formatWeight(top)}</span>.
          </p>
          <Button
            variant={alreadySet ? "ghost" : "primary"}
            disabled={alreadySet}
            className="mt-2 h-10"
            onClick={() => it.liftId && setTM(it.liftId, quarterOf(session.week), top)}
          >
            {alreadySet ? `Saved as Q${session.quarter} TM ✓` : `Save ${formatWeight(top)} as Q${session.quarter} TM`}
          </Button>
        </Card>
      );
    })
    .filter(Boolean);

  if (cards.length === 0) return null;
  return <div className="space-y-3">{cards}</div>;
}
