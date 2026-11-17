import "server-only";
import { and, asc, desc, eq, gte, lt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, dayBounds, monthKey, todayISO, toISODate } from "./dates";
import { sumNutrients } from "./nutrition";

export async function foodLogsForRange(pid: string, fromIso: string, toIsoExclusive: string) {
  const { start } = dayBounds(fromIso);
  const { start: end } = dayBounds(toIsoExclusive);
  return db.select({ log: schema.foodLogs, food: schema.foods })
    .from(schema.foodLogs).leftJoin(schema.foods, eq(schema.foods.id, schema.foodLogs.foodId))
    .where(and(eq(schema.foodLogs.pregnancyId, pid), gte(schema.foodLogs.eatenAt, start), lt(schema.foodLogs.eatenAt, end)))
    .orderBy(asc(schema.foodLogs.eatenAt));
}

export async function drinksForRange(pid: string, fromIso: string, toIsoExclusive: string) {
  return db.select().from(schema.drinkLogs)
    .where(and(eq(schema.drinkLogs.pregnancyId, pid), gte(schema.drinkLogs.drankAt, dayBounds(fromIso).start), lt(schema.drinkLogs.drankAt, dayBounds(toIsoExclusive).start)))
    .orderBy(asc(schema.drinkLogs.drankAt));
}

export async function symptomsForRange(pid: string, fromIso: string, toIsoExclusive: string) {
  return db.select().from(schema.symptomLogs)
    .where(and(eq(schema.symptomLogs.pregnancyId, pid), gte(schema.symptomLogs.loggedAt, dayBounds(fromIso).start), lt(schema.symptomLogs.loggedAt, dayBounds(toIsoExclusive).start)))
    .orderBy(asc(schema.symptomLogs.loggedAt));
}

export function nutrientsFor(rows: Awaited<ReturnType<typeof foodLogsForRange>>) {
  return sumNutrients(rows.map((r) => ({
    grams: r.log.grams ?? (r.food ? r.food.servingGrams : null), amountEaten: r.log.amountEaten,
    food: r.food,
  })));
}

/** Food tolerance lists built only from what she actually logged. */
export async function toleranceLists(pid: string) {
  const rows = await db.select({ name: schema.foodLogs.foodName, tol: schema.foodLogs.tolerance, vom: schema.foodLogs.vomitedAfter, nau: schema.foodLogs.nauseaAfter, at: schema.foodLogs.eatenAt })
    .from(schema.foodLogs).where(eq(schema.foodLogs.pregnancyId, pid)).orderBy(desc(schema.foodLogs.eatenAt)).limit(500);
  const map = new Map<string, { name: string; good: number; bad: number; last: Date }>();
  for (const r of rows) {
    const k = r.name.trim().toLowerCase();
    const m = map.get(k) ?? { name: r.name, good: 0, bad: 0, last: r.at };
    if (r.tol === "POOR" || r.vom || r.nau) m.bad++; else if (r.tol === "GOOD") m.good++;
    map.set(k, m);
  }
  const all = [...map.values()];
  return {
    tolerated: all.filter((m) => m.good > m.bad).sort((a, b) => b.good - a.good),
    notTolerated: all.filter((m) => m.bad > 0 && m.bad >= m.good).sort((a, b) => b.bad - a.bad),
  };
}

export async function nextAppointment(pid: string) {
  return db.query.appointments.findFirst({
    where: and(eq(schema.appointments.pregnancyId, pid), gte(schema.appointments.startsAt, new Date())),
    orderBy: asc(schema.appointments.startsAt),
  });
}

export async function planForDay(pid: string, iso: string) {
  return db.select().from(schema.mealPlanEntries).where(and(eq(schema.mealPlanEntries.pregnancyId, pid), eq(schema.mealPlanEntries.date, iso)));
}

export async function groceriesForMonth(pid: string, month = monthKey(todayISO())) {
  return db.select().from(schema.groceryItems).where(and(eq(schema.groceryItems.pregnancyId, pid), eq(schema.groceryItems.month, month))).orderBy(asc(schema.groceryItems.category), asc(schema.groceryItems.name));
}

export async function openSupportRequests(pid: string) {
  return db.select().from(schema.supportRequests).where(and(eq(schema.supportRequests.pregnancyId, pid), isNull(schema.supportRequests.doneAt))).orderBy(desc(schema.supportRequests.createdAt));
}

/** Per-day series for charts over the last `days` days. */
export async function dailySeries(pid: string, days: number) {
  const end = addDays(todayISO(), 1);
  const start = addDays(end, -days);
  const [foods, drinks, symptoms, checkIns] = await Promise.all([
    foodLogsForRange(pid, start, end), drinksForRange(pid, start, end), symptomsForRange(pid, start, end),
    db.select().from(schema.checkIns).where(and(eq(schema.checkIns.pregnancyId, pid), gte(schema.checkIns.date, start))),
  ]);
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const f = foods.filter((r) => toISODate(r.log.eatenAt) === d);
    const dr = drinks.filter((r) => toISODate(r.drankAt) === d);
    const s = symptoms.filter((r) => toISODate(r.loggedAt) === d);
    const sev = s.map((x) => x.nauseaSeverity).filter((x): x is number => x != null);
    const ci = checkIns.filter((c) => c.date === d);
    const ciSev = ci.map((c) => c.nauseaSeverity).filter((x): x is number => x != null);
    const allSev = [...sev, ...ciSev];
    out.push({
      date: d,
      label: new Date(d + "T12:00:00Z").toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" }),
      meals: f.length,
      groups: new Set(f.map((r) => r.food?.category).filter(Boolean)).size,
      consumed: dr.reduce((a, x) => a + x.consumedMl, 0),
      keptDown: dr.reduce((a, x) => a + (x.retention === "KEPT_DOWN" ? x.consumedMl : x.retention === "PARTLY" ? Math.round(x.consumedMl / 2) : 0), 0),
      vomits: s.reduce((a, x) => a + x.vomitCount, 0),
      nausea: allSev.length ? Math.max(...allSev) : null,
    });
  }
  return out;
}

/** Fluids "kept down" uses half for PARTLY — stated wherever it's shown. */
export function fluidTotals(drinks: { consumedMl: number; retention: string }[]) {
  const consumed = drinks.reduce((a, d) => a + d.consumedMl, 0);
  const kept = drinks.reduce((a, d) => a + (d.retention === "KEPT_DOWN" ? d.consumedMl : d.retention === "PARTLY" ? Math.round(d.consumedMl / 2) : 0), 0);
  return { consumed, kept, notKeptCount: drinks.filter((d) => d.retention === "NOT_KEPT_DOWN").length };
}
