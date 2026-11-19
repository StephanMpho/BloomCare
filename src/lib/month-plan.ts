// Builds a meal plan for a date range (e.g. all of December) and the weekly shopping
// trips that go with it. Pure and DB-free so it can be unit-tested.
import { addDays, daysBetween } from "./dates";
import { aggregateIngredients, chooseTemplates, GROCERY_CATALOGUE, type Slot } from "./meal-templates";

/** 3 meals + 2 snacks: the structure agreed for the monthly plan. */
export const PLAN_SLOTS: Slot[] = ["BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "SUPPER"];

export type PlannedMeal = { date: string; slot: Slot; key: string };

export function rangeDays(start: string, end: string): string[] {
  const n = daysBetween(start, end) + 1;
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(start, i));
}

/**
 * Same transparent rules as the weekly planner (skip foods she didn't tolerate or listed as
 * triggers, prefer foods that sat well, gentle-only on hard days), plus variety:
 * a slot doesn't repeat yesterday's meal, and lunch and supper differ on the same day.
 * `keep` lists date+slot pairs she has already marked, which are left alone.
 */
export function buildRangePlan(opts: {
  start: string; end: string; avoid: string[]; prefer: string[]; gentle: boolean; keep?: { date: string; slot: string }[];
}): PlannedMeal[] {
  const out: PlannedMeal[] = [];
  const lastBySlot = new Map<Slot, string>();
  rangeDays(opts.start, opts.end).forEach((date, dayIndex) => {
    const todays: string[] = [];
    for (const slot of PLAN_SLOTS) {
      const exclude = [lastBySlot.get(slot), ...todays].filter((k): k is string => !!k);
      const pick = chooseTemplates({ slot, avoid: opts.avoid, prefer: opts.prefer, gentleOnly: opts.gentle, dayIndex, exclude })[0];
      if (!pick) continue;
      lastBySlot.set(slot, pick.key);
      todays.push(pick.key);
      if (opts.keep?.some((k) => k.date === date && k.slot === slot)) continue;
      out.push({ date, slot, key: pick.key });
    }
  });
  return out;
}

export type ShoppingTrip = { date: string; from: string; to: string; label: string };

/** One shopping trip per 7 days, starting on the plan's first day; the last covers what's left. */
export function shoppingTrips(start: string, end: string): ShoppingTrip[] {
  const trips: ShoppingTrip[] = [];
  for (let from = start; daysBetween(from, end) >= 0; from = addDays(from, 7)) {
    const weekEnd = addDays(from, 6);
    const to = daysBetween(weekEnd, end) < 0 ? end : weekEnd; // the last trip stops at the plan's end
    trips.push({ date: from, from, to, label: `Shop ${trips.length + 1}` });
  }
  return trips;
}

export type TripItem = ReturnType<typeof aggregateIngredients>[number] & { shopDate: string };

/**
 * Fresh (weekly) items are bought on the trip for the week they're eaten.
 * Long-lasting (monthly) items for the whole range go on the first trip.
 */
export function shoppingListForPlan(plan: PlannedMeal[], trips: ShoppingTrip[]): TripItem[] {
  if (!trips.length) return [];
  const monthly = aggregateIngredients(plan.map((p) => p.key))
    .filter((i) => GROCERY_CATALOGUE[i.item].cadence === "MONTHLY")
    .map((i) => ({ ...i, shopDate: trips[0].date }));
  const weekly = trips.flatMap((t) =>
    aggregateIngredients(plan.filter((p) => p.date >= t.from && p.date <= t.to).map((p) => p.key))
      .filter((i) => GROCERY_CATALOGUE[i.item].cadence === "WEEKLY")
      .map((i) => ({ ...i, shopDate: t.date })));
  return [...monthly, ...weekly];
}
