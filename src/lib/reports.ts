import "server-only";
import { and, asc, eq, gte, lt, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, daysBetween, todayISO } from "./dates";
import { foodLogsForRange, drinksForRange, symptomsForRange } from "./queries";

export function parseRange(sp: { range?: string; from?: string; to?: string }) {
  const today = todayISO();
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (sp.range === "custom" && valid(sp.from) && valid(sp.to) && sp.from! <= sp.to!) {
    const to = sp.to! > today ? today : sp.to!;
    const from = daysBetween(sp.from!, to) > 366 ? addDays(to, -366) : sp.from!;
    return { from, to, days: daysBetween(from, to) + 1, key: "custom" };
  }
  const days = sp.range === "30" ? 30 : 7;
  return { from: addDays(today, -(days - 1)), to: today, days, key: String(days) };
}

export async function reportData(pid: string, from: string, to: string) {
  const end = addDays(to, 1);
  const [foods, drinks, symptoms, appts, supps, groceries] = await Promise.all([
    foodLogsForRange(pid, from, end), drinksForRange(pid, from, end), symptomsForRange(pid, from, end),
    db.select().from(schema.appointments).where(eq(schema.appointments.pregnancyId, pid)).orderBy(asc(schema.appointments.startsAt)),
    db.select().from(schema.supplements).where(eq(schema.supplements.pregnancyId, pid)),
    db.select().from(schema.groceryItems).where(and(eq(schema.groceryItems.pregnancyId, pid), eq(schema.groceryItems.purchased, true), gte(schema.groceryItems.month, from.slice(0, 7)), lt(schema.groceryItems.month, addDays(end, 31).slice(0, 7)))),
  ]);
  const suppLogs = supps.length ? await db.select().from(schema.supplementLogs).where(and(inArray(schema.supplementLogs.supplementId, supps.map((s) => s.id)), gte(schema.supplementLogs.date, from), lt(schema.supplementLogs.date, end))) : [];
  return { foods, drinks, symptoms, appts, supps, suppLogs, groceries };
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "No records in this period\n";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
    // Neutralise spreadsheet formula injection.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n") + "\n";
}
