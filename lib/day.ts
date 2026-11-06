// Day boundaries for "day off" are calculated in IST (UTC+5:30).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function istDate(offsetDays = 0): string {
  return new Date(Date.now() + IST_OFFSET_MS + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** Parses "", "today", "tomorrow" or "YYYY-MM-DD" into a YYYY-MM-DD date (IST). Returns null if invalid or in the past. */
export function parseDayOffArg(arg: string): string | null {
  const a = arg.trim().toLowerCase();
  if (a === "" || a === "today") return istDate(0);
  if (a === "tomorrow") return istDate(1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a)) return null;
  const d = new Date(`${a}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== a) return null;
  return a < istDate(0) ? null : a;
}
