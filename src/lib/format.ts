const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
}

/** "Mon, Jun 15" (weekday derived at UTC midnight to avoid TZ drift). */
export function formatDate(iso: string): string {
  const { y, m, d } = parts(iso);
  const wd = WDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
  return `${wd}, ${MONTHS[m - 1]} ${d}`;
}

/** "Jun 15, 2026" */
export function formatDateLong(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatWeight(lb: number | null): string {
  return lb == null ? "—" : `${lb} lb`;
}
