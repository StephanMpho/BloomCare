// Date helpers. Calendar dates are handled as "YYYY-MM-DD" strings in the
// Africa/Johannesburg time zone (SAST, UTC+2, no daylight saving).
export const TZ = "Africa/Johannesburg";
const DAY_MS = 86_400_000;

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function toISODate(d: Date): string {
  return todayISO(d);
}

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY_MS);
}

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * DAY_MS).toISOString().slice(0, 10);
}

/** Start/end instants (UTC) of a SAST calendar day. */
export function dayBounds(iso: string): { start: Date; end: Date } {
  const start = new Date(iso + "T00:00:00+02:00");
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Monday of the week containing the date. */
export function weekStart(iso: string): string {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay(); // 0 = Sun
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-ZA", { ...opts, timeZone: "UTC" });
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
}

export function formatDateTime(d: Date) {
  return d.toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
}

/** Current SAST time as HH:MM. */
export function nowHHMM(now: Date = new Date()) {
  return formatTime(now);
}

/** Combine a SAST date + HH:MM into an instant. */
export function sastInstant(dateISO: string, hhmm: string): Date {
  return new Date(`${dateISO}T${hhmm}:00+02:00`);
}

export function greetingFor(now: Date = new Date()) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now));
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
