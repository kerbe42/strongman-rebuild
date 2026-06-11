import { CREATINE_G, WATER_RANGE_L } from "../engine";
import { useStore } from "../store/StoreProvider";
import { Card } from "./ui";

const WATER_MIN = WATER_RANGE_L[0] ?? 3.5;

export function DailyChecks({ date, showFlare = false }: { date: string; showFlare?: boolean }) {
  const { state, setDailyChecks } = useStore();
  const checks = state.dailyChecks[date] ?? { waterL: 0, creatine: false, flareProtocol: false };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">
            Water{" "}
            <span className={checks.waterL >= WATER_MIN ? "text-emerald-400" : "text-slate-400"}>
              {checks.waterL.toFixed(1)} / {WATER_MIN}–{WATER_RANGE_L[1] ?? 4} L
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Stepper
            onMinus={() => setDailyChecks(date, { waterL: Math.max(0, checks.waterL - 0.5) })}
            onPlus={() => setDailyChecks(date, { waterL: checks.waterL + 0.5 })}
          />
        </div>
      </div>

      <label className="tap mt-1 flex cursor-pointer items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">Creatine ({CREATINE_G} g)</span>
        <Toggle
          on={checks.creatine}
          onClick={() => setDailyChecks(date, { creatine: !checks.creatine })}
        />
      </label>

      {showFlare && (
        <label className="tap flex cursor-pointer items-center justify-between border-t border-slate-800 pt-1">
          <span className="text-sm font-semibold text-amber-300">Flare protocol</span>
          <Toggle
            on={checks.flareProtocol}
            onClick={() => setDailyChecks(date, { flareProtocol: !checks.flareProtocol })}
          />
        </label>
      )}
    </Card>
  );
}

function Stepper({ onMinus, onPlus }: { onMinus: () => void; onPlus: () => void }) {
  const btn =
    "flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-lg font-bold text-slate-100 active:scale-95";
  return (
    <>
      <button className={btn} onClick={onMinus} aria-label="less water">
        −
      </button>
      <button className={btn} onClick={onPlus} aria-label="more water">
        +
      </button>
    </>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-slate-700"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}
