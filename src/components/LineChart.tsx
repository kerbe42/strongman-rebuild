export interface Point {
  label: string;
  value: number;
}

/** Minimal dependency-free SVG line chart. Responsive via viewBox. */
export function LineChart({
  data,
  unit = "",
  targetLine,
}: {
  data: Point[];
  unit?: string;
  targetLine?: number;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No data yet.</p>;
  }

  const W = 320;
  const H = 130;
  const pad = 10;
  const values = data.map((d) => d.value);
  if (targetLine != null) values.push(targetLine);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = data.length;

  const x = (i: number) => (n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - 2 * pad));
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);

  const linePts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const last = data[data.length - 1]!;
  const first = data[0]!;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="trend chart">
        {targetLine != null && (
          <line
            x1={pad}
            x2={W - pad}
            y1={y(targetLine)}
            y2={y(targetLine)}
            stroke="#475569"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        )}
        {data.length > 1 && (
          <polyline
            points={linePts}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.value)} r={n > 30 ? 1.5 : 3} fill="#60a5fa" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>
          {first.label}: <span className="text-slate-300">{Math.round(first.value)}{unit}</span>
        </span>
        <span>
          {last.label}: <span className="text-slate-300">{Math.round(last.value)}{unit}</span>
        </span>
      </div>
    </div>
  );
}
