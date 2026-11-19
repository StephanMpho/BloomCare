import "server-only";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { monthKey } from "./dates";
import { PRICE_SOURCE_NOTE, templateByKey } from "./meal-templates";
import { buildRangePlan, rangeDays, shoppingListForPlan, shoppingTrips, type PlannedMeal } from "./month-plan";

type Preg = { id: string; toleratedAtStart: string; nauseaTriggers: string };

/** Foods to avoid (didn't sit well, made her sick, listed as triggers) and to prefer (sat well). */
export async function planAvoidPrefer(p: Preg) {
  const logs = await db.select({ name: schema.foodLogs.foodName, tol: schema.foodLogs.tolerance, vom: schema.foodLogs.vomitedAfter })
    .from(schema.foodLogs).where(eq(schema.foodLogs.pregnancyId, p.id));
  const plans = await db.select({ title: schema.mealPlanEntries.title })
    .from(schema.mealPlanEntries).where(and(eq(schema.mealPlanEntries.pregnancyId, p.id), eq(schema.mealPlanEntries.status, "NOT_TOLERATED")));
  const avoid = [...logs.filter((l) => l.tol === "POOR" || l.vom).map((l) => l.name), ...plans.map((x) => x.title), ...p.nauseaTriggers.split(",")];
  const prefer = [...logs.filter((l) => l.tol === "GOOD" && !l.vom).map((l) => l.name), ...p.toleratedAtStart.split(",")];
  return { avoid: avoid.map((s) => s.trim()).filter(Boolean), prefer: prefer.map((s) => s.trim()).filter(Boolean) };
}

export function entryFromTemplate(pregnancyId: string, m: PlannedMeal) {
  const t = templateByKey(m.key)!;
  return { pregnancyId, date: m.date, mealType: m.slot, templateKey: t.key, title: t.title, portion: t.portion, preparation: t.preparation,
    nutrients: t.nutrients, alternative: t.alternative, safetyNote: t.safetyNote ?? "", estCostCents: t.estCostCents };
}

/**
 * Plans every day from start to end (3 meals + 2 snacks) and writes the matching weekly
 * shopping lists. Meals she has already marked (eaten, not tolerated, ...) and items already
 * bought are kept; only untouched "planned" meals and unbought plan items are replaced.
 */
export async function createRangePlan(p: Preg, opts: { start: string; end: string; gentle: boolean }) {
  const { avoid, prefer } = await planAvoidPrefer(p);
  const inRange = and(eq(schema.mealPlanEntries.pregnancyId, p.id), gte(schema.mealPlanEntries.date, opts.start), lte(schema.mealPlanEntries.date, opts.end));

  return db.transaction(async (tx) => {
    await tx.delete(schema.mealPlanEntries).where(and(inRange, eq(schema.mealPlanEntries.status, "PLANNED")));
    const kept = await tx.select({ date: schema.mealPlanEntries.date, slot: schema.mealPlanEntries.mealType }).from(schema.mealPlanEntries).where(inRange);
    const plan = buildRangePlan({ ...opts, avoid, prefer, keep: kept });
    if (plan.length) await tx.insert(schema.mealPlanEntries).values(plan.map((m) => entryFromTemplate(p.id, m)));

    // Shopping lists: one per week, from the full plan (including kept meals that came from templates).
    const allKeys = await tx.select({ date: schema.mealPlanEntries.date, slot: schema.mealPlanEntries.mealType, key: schema.mealPlanEntries.templateKey })
      .from(schema.mealPlanEntries).where(and(inRange, inArray(schema.mealPlanEntries.status, ["PLANNED", "EATEN", "PARTIAL"])));
    const full = allKeys.filter((r): r is { date: string; slot: PlannedMeal["slot"]; key: string } => !!r.key && r.slot !== "DRINKS");
    const trips = shoppingTrips(opts.start, opts.end);
    const items = shoppingListForPlan(full, trips);
    const months = [...new Set(rangeDays(opts.start, opts.end).map(monthKey))];

    const existing = await tx.select().from(schema.groceryItems).where(and(eq(schema.groceryItems.pregnancyId, p.id), inArray(schema.groceryItems.month, months)));
    const pantry = new Set(existing.filter((e) => e.inPantry).map((e) => e.name));
    await tx.delete(schema.groceryItems).where(and(eq(schema.groceryItems.pregnancyId, p.id), inArray(schema.groceryItems.month, months),
      eq(schema.groceryItems.fromMealPlan, true), eq(schema.groceryItems.purchased, false)));
    if (items.length) {
      await tx.insert(schema.groceryItems).values(items.map((l) => ({
        pregnancyId: p.id, month: monthKey(l.shopDate), shopDate: l.shopDate, name: l.name, category: l.category, quantity: l.quantity, unit: l.unit,
        estCostCents: l.estCostCents, cadence: l.cadence, fromMealPlan: true, inPantry: pantry.has(l.name), notes: PRICE_SOURCE_NOTE[l.source],
      })));
    }
    const mealCost = plan.reduce((a, m) => a + (templateByKey(m.key)?.estCostCents ?? 0), 0);
    const shopCost = items.reduce((a, i) => a + (pantry.has(i.name) ? 0 : i.estCostCents), 0);
    return { meals: plan.length, kept: kept.length, trips: trips.length, items: items.length, mealCost, shopCost };
  });
}
