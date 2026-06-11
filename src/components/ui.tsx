import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { WeekType } from "../engine";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h2>
  );
}

const WEEK_TYPE_CLASS: Record<WeekType, string> = {
  build: "bg-build/20 text-blue-300 ring-build/40",
  deload: "bg-deload/20 text-teal-300 ring-deload/40",
  test: "bg-test/20 text-amber-300 ring-test/40",
};

export function WeekTypeBadge({ type }: { type: WeekType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${WEEK_TYPE_CLASS[type]}`}
    >
      {type}
    </span>
  );
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "amber" }) {
  const cls =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
      : "bg-slate-800 text-slate-300 ring-slate-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  label,
  unit,
  unknownMax = false,
}: {
  value: number;
  max: number | null;
  label: string;
  unit: string;
  unknownMax?: boolean;
}) {
  const pct = max && max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        <span className="tabular-nums text-slate-400">
          {Math.round(value)}
          {unknownMax || max == null ? (
            <span className="text-slate-500"> {unit} · target not set</span>
          ) : (
            <>
              {" / "}
              {Math.round(max)} {unit}
            </>
          )}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${
            unknownMax || max == null ? "bg-slate-600" : pct >= 100 ? "bg-emerald-500" : "bg-blue-500"
          }`}
          style={{ width: `${unknownMax || max == null ? Math.min(100, value > 0 ? 8 : 0) : pct}%` }}
        />
      </div>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const base =
    "tap inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-40 disabled:active:scale-100";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700",
    ghost: "bg-transparent text-slate-300 hover:bg-slate-800",
    danger: "bg-red-600/90 text-white hover:bg-red-500",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200">
      <span aria-hidden className="select-none">
        ⚠
      </span>
      <span>{children}</span>
    </p>
  );
}

export function NotSet({ children = "Not set" }: { children?: ReactNode }) {
  return <span className="italic text-slate-500">{children}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center">
      <p className="text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
