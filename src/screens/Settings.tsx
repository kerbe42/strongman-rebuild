import { useRef, useState, type ReactNode } from "react";
import { allLifts, proteinTargetG, resolveTM } from "../engine";
import { Button, Card, NotSet, Pill, SectionTitle } from "../components/ui";
import { useStore } from "../store/StoreProvider";

export function Settings() {
  const { state, updateSettings, exportBackup, importBackup, resetAll } = useStore();
  const s = state.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Settings</h1>

      <section>
        <SectionTitle>Athlete</SectionTitle>
        <Card className="space-y-4 p-4">
          <Field label="Bodyweight (lb)" hint={`Protein target: ${proteinTargetG(s.bodyweightLb)} g/day`}>
            <NumberBox
              value={s.bodyweightLb}
              onCommit={(v) => updateSettings({ bodyweightLb: v ?? s.bodyweightLb })}
            />
          </Field>
          <Field
            label="Daily kcal target"
            hint="Stays unset until you measure maintenance from a normal eating week."
          >
            <div className="flex items-center gap-2">
              <NumberBox
                value={s.kcalTarget}
                placeholder="unset"
                onCommit={(v) => updateSettings({ kcalTarget: v })}
              />
              {s.kcalTarget != null && (
                <Button variant="ghost" className="h-11" onClick={() => updateSettings({ kcalTarget: null })}>
                  Clear
                </Button>
              )}
            </div>
          </Field>
        </Card>
      </section>

      <section>
        <SectionTitle>Equipment owned (gates substitutions)</SectionTitle>
        <Card className="p-2">
          <ToggleRow
            label="Sandbag"
            sub="Until owned: Smith-machine squat substitution"
            on={s.equipment.sandbag}
            onClick={() => updateSettings({ equipment: { ...s.equipment, sandbag: !s.equipment.sandbag } })}
          />
          <ToggleRow
            label="Axle"
            sub="Until owned: DB clean & press substitution"
            on={s.equipment.axle}
            onClick={() => updateSettings({ equipment: { ...s.equipment, axle: !s.equipment.axle } })}
          />
        </Card>
      </section>

      <section>
        <SectionTitle>Training maxes (Inputs sheet)</SectionTitle>
        <p className="px-1 pb-2 text-xs text-slate-500">
          Placeholders are estimates. Confirm each Q1 during calibration week; Q2–Q4 pre-fill as
          suggestions and become editable after each test week.
        </p>
        <TMTable />
      </section>

      <section>
        <SectionTitle>Backup & data</SectionTitle>
        <Card className="space-y-3 p-4">
          <p className="text-sm text-slate-400">
            Data lives in this browser only. Export to back up or move to another device; import to
            restore.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="h-11" onClick={exportBackup}>
              Export JSON
            </Button>
            <Button variant="secondary" className="h-11" onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const res = importBackup(text);
                setMsg(res.ok ? "Backup imported." : `Import failed: ${res.error}`);
                e.target.value = "";
              }}
            />
          </div>
          {msg && <p className="text-sm text-slate-300">{msg}</p>}
        </Card>
      </section>

      <section>
        <SectionTitle>Danger zone</SectionTitle>
        <Card className="space-y-3 p-4">
          {!confirmReset ? (
            <Button variant="danger" className="h-11" onClick={() => setConfirmReset(true)}>
              Reset all data
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-300">
                This erases every log, override, and TM in this browser. Export first if unsure.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  className="h-11"
                  onClick={() => {
                    resetAll();
                    setConfirmReset(false);
                    setMsg("All data reset.");
                  }}
                >
                  Yes, erase everything
                </Button>
                <Button variant="ghost" className="h-11" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      <p className="pt-2 text-center text-xs text-slate-600">
        Strongman Rebuild · 52-week block · all data on-device
      </p>
    </div>
  );
}

function TMTable() {
  const { state, setTM } = useStore();
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[1fr_repeat(4,3.5rem)] items-center gap-1 border-b border-slate-800 px-3 py-2 text-xs font-semibold text-slate-400">
        <span>Lift</span>
        <span className="text-center">Q1</span>
        <span className="text-center">Q2</span>
        <span className="text-center">Q3</span>
        <span className="text-center">Q4</span>
      </div>
      <div className="divide-y divide-slate-800">
        {allLifts().map((lift) => {
          const slots = state.tms[lift.id] ?? [null, null, null, null];
          return (
            <div
              key={lift.id}
              className="grid grid-cols-[1fr_repeat(4,3.5rem)] items-center gap-1 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-200">{lift.name}</p>
                {lift.cap != null && <span className="text-[10px] text-slate-500">cap {lift.cap}</span>}
              </div>
              {[1, 2, 3, 4].map((q) => {
                const override = slots[q - 1];
                const effective = resolveTM(lift.id, q, state.tms);
                return (
                  <input
                    key={q}
                    inputMode="numeric"
                    value={override ?? ""}
                    placeholder={String(effective)}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setTM(lift.id, q, v === "" ? null : Number(v));
                    }}
                    className={`h-10 w-full rounded-md border text-center text-sm tabular-nums focus:outline-none ${
                      override != null
                        ? "border-blue-600 bg-slate-950 text-slate-100"
                        : "border-slate-800 bg-slate-900 text-slate-500"
                    }`}
                    title={override != null ? "Confirmed" : "Placeholder (suggested)"}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="px-3 py-2 text-[11px] text-slate-500">
        <span className="text-slate-400">Solid</span> = confirmed · <span className="italic">grey</span> ={" "}
        placeholder/suggested (clear a box to revert).
      </p>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-sm font-medium text-slate-200">{label}</label>
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function NumberBox({
  value,
  onCommit,
  placeholder,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value == null ? "" : String(value));
  return (
    <input
      inputMode="numeric"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const t = local.trim();
        onCommit(t === "" ? null : Number(t));
      }}
      className="h-11 w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
    />
  );
}

function ToggleRow({
  label,
  sub,
  on,
  onClick,
}: {
  label: string;
  sub: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button className="tap flex w-full items-center justify-between rounded-xl px-3 text-left" onClick={onClick}>
      <span>
        <span className="block text-sm font-semibold text-slate-100">{label}</span>
        <span className="block text-xs text-slate-500">{sub}</span>
      </span>
      <span className="flex items-center gap-2">
        {on ? <Pill>owned</Pill> : <NotSet>not owned</NotSet>}
        <span
          className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-slate-700"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </span>
      </span>
    </button>
  );
}
