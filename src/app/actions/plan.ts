"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gte, lt, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { actionContext } from "@/lib/context";
import { safe, UserError, str, isoDate } from "@/lib/form";
import { addDays, monthKey, sastInstant, todayISO, nowHHMM } from "@/lib/dates";
import { chooseTemplates, aggregateIngredients, SLOTS, type Slot } from "@/lib/meal-templates";
import { parseRand } from "@/lib/money";
import type { ActionResult } from "@/components/forms";
import { createRangePlan, entryFromTemplate, planAvoidPrefer } from "@/lib/plan-server";
import { daysBetween } from "@/lib/dates";

export async function generateWeek(fd: FormData) {
  const ctx = await actionContext("MEAL_PLAN");
  const start = isoDate.parse(str(fd, "weekStart"));
  const gentle = str(fd, "gentle") === "1";
  const { avoid, prefer } = await planAvoidPrefer(ctx.pregnancy);
  // Replace only entries that are still just "planned" — keep anything she's already marked.
  await db.delete(schema.mealPlanEntries).where(and(eq(schema.mealPlanEntries.pregnancyId, ctx.pregnancy.id),
    gte(schema.mealPlanEntries.date, start), lt(schema.mealPlanEntries.date, addDays(start, 7)), eq(schema.mealPlanEntries.status, "PLANNED")));
  const kept = await db.select().from(schema.mealPlanEntries).where(and(eq(schema.mealPlanEntries.pregnancyId, ctx.pregnancy.id),
    gte(schema.mealPlanEntries.date, start), lt(schema.mealPlanEntries.date, addDays(start, 7))));
  const rows = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(start, d);
    for (const slot of SLOTS) {
      if (kept.some((k) => k.date === date && k.mealType === slot)) continue;
      const opts = chooseTemplates({ slot, avoid, prefer, gentleOnly: gentle, dayIndex: d });
      if (opts[0]) rows.push(entryFromTemplate(ctx.pregnancy.id, { date, slot, key: opts[0].key }));
    }
  }
  if (rows.length) await db.insert(schema.mealPlanEntries).values(rows);
  revalidatePath("/planner");
  revalidatePath("/");
}

async function ownedEntry(id: string, pregnancyId: string) {
  const e = await db.query.mealPlanEntries.findFirst({ where: and(eq(schema.mealPlanEntries.id, id), eq(schema.mealPlanEntries.pregnancyId, pregnancyId)) });
  if (!e) throw new UserError("Meal not found.");
  return e;
}

export async function swapMeal(fd: FormData) {
  const ctx = await actionContext("MEAL_PLAN");
  const e = await ownedEntry(str(fd, "id"), ctx.pregnancy.id);
  const { avoid, prefer } = await planAvoidPrefer(ctx.pregnancy);
  const opts = chooseTemplates({ slot: e.mealType as Slot, avoid, prefer, gentleOnly: false, dayIndex: Math.floor(Math.random() * 7), exclude: e.templateKey ? [e.templateKey] : [] });
  const next = opts.find((o) => o.key !== e.templateKey);
  if (next) {
    const { pregnancyId: _p, date: _d, mealType: _m, ...v } = entryFromTemplate(ctx.pregnancy.id, { date: e.date, slot: e.mealType as Slot, key: next.key });
    await db.update(schema.mealPlanEntries).set({ ...v, status: "PLANNED" }).where(eq(schema.mealPlanEntries.id, e.id));
  }
  revalidatePath("/planner");
  revalidatePath("/");
}

export async function setMealStatus(fd: FormData) {
  const ctx = await actionContext("MEAL_PLAN");
  const e = await ownedEntry(str(fd, "id"), ctx.pregnancy.id);
  const status = z.enum(["PLANNED", "EATEN", "PARTIAL", "NOT_EATEN", "REPLACED", "NOT_TOLERATED"]).parse(str(fd, "status"));
  await db.update(schema.mealPlanEntries).set({ status }).where(eq(schema.mealPlanEntries.id, e.id));
  // Eaten / partly eaten / not tolerated also go into the food diary (if she has diary permission).
  if (["EATEN", "PARTIAL", "NOT_TOLERATED"].includes(status) && (ctx.isOwner || ctx.access.permissions.includes("LOG_FOR_ME"))) {
    const at = e.date === todayISO() ? sastInstant(e.date, nowHHMM()) : sastInstant(e.date, "12:00");
    await db.insert(schema.foodLogs).values({
      pregnancyId: ctx.pregnancy.id, loggedById: ctx.user.id, foodName: e.title, mealType: e.mealType, eatenAt: at, portionLabel: e.portion || "planned portion",
      amountEaten: status === "PARTIAL" ? "PARTIAL" : "FULL", tolerance: status === "NOT_TOLERATED" ? "POOR" : "GOOD", nauseaAfter: status === "NOT_TOLERATED",
      notes: "From meal plan",
    });
  }
  revalidatePath("/planner");
  revalidatePath("/");
  revalidatePath("/food");
}

export async function removeMeal(fd: FormData) {
  const ctx = await actionContext("MEAL_PLAN");
  await ownedEntry(str(fd, "id"), ctx.pregnancy.id);
  await db.delete(schema.mealPlanEntries).where(eq(schema.mealPlanEntries.id, str(fd, "id")));
  revalidatePath("/planner");
}

export async function repeatMeal(fd: FormData) {
  const ctx = await actionContext("MEAL_PLAN");
  const e = await ownedEntry(str(fd, "id"), ctx.pregnancy.id);
  const { id: _i, createdAt: _c, ...rest } = e;
  await db.insert(schema.mealPlanEntries).values({ ...rest, date: addDays(e.date, 1), status: "PLANNED" });
  revalidatePath("/planner");
}

export async function addCustomMeal(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext("MEAL_PLAN");
    const data = z.object({ date: isoDate, mealType: z.enum(["BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "SUPPER", "EVENING_SNACK"]), title: z.string().min(2, "Name the meal.").max(100) })
      .parse({ date: str(fd, "date"), mealType: str(fd, "mealType"), title: str(fd, "title") });
    await db.insert(schema.mealPlanEntries).values({ pregnancyId: ctx.pregnancy.id, ...data, portion: str(fd, "portion"), preparation: str(fd, "preparation"),
      alternative: str(fd, "alternative"), estCostCents: parseRand(str(fd, "cost")) ?? 0 });
    if (fd.get("saveFavourite")) await db.insert(schema.savedMeals).values({ pregnancyId: ctx.pregnancy.id, title: data.title, mealType: data.mealType, portion: str(fd, "portion"), preparation: str(fd, "preparation") });
    revalidatePath("/planner");
    return { ok: true, message: "Meal added to the plan." };
  });
}

export async function addSavedMeal(fd: FormData) {
  const ctx = await actionContext("MEAL_PLAN");
  const s = await db.query.savedMeals.findFirst({ where: and(eq(schema.savedMeals.id, str(fd, "id")), eq(schema.savedMeals.pregnancyId, ctx.pregnancy.id)) });
  if (!s) return;
  await db.insert(schema.mealPlanEntries).values({ pregnancyId: ctx.pregnancy.id, date: isoDate.parse(str(fd, "date")), mealType: s.mealType, title: s.title, portion: s.portion, preparation: s.preparation });
  revalidatePath("/planner");
}

export async function planToGroceries(fd: FormData) {
  const ctx = await actionContext("MEAL_PLAN");
  const start = isoDate.parse(str(fd, "weekStart"));
  const entries = await db.select({ key: schema.mealPlanEntries.templateKey }).from(schema.mealPlanEntries)
    .where(and(eq(schema.mealPlanEntries.pregnancyId, ctx.pregnancy.id), gte(schema.mealPlanEntries.date, start), lt(schema.mealPlanEntries.date, addDays(start, 7)),
      inArray(schema.mealPlanEntries.status, ["PLANNED", "EATEN", "PARTIAL"])));
  const list = aggregateIngredients(entries.map((e) => e.key).filter((k): k is string => !!k));
  const month = monthKey(start < todayISO() ? todayISO() : start);
  const existing = await db.select().from(schema.groceryItems).where(and(eq(schema.groceryItems.pregnancyId, ctx.pregnancy.id), eq(schema.groceryItems.month, month)));
  // Items already in the pantry stay flagged so they don't count toward cost; existing unpurchased plan items are replaced.
  const pantry = new Set(existing.filter((e) => e.inPantry).map((e) => e.name));
  await db.delete(schema.groceryItems).where(and(eq(schema.groceryItems.pregnancyId, ctx.pregnancy.id), eq(schema.groceryItems.month, month),
    eq(schema.groceryItems.fromMealPlan, true), eq(schema.groceryItems.purchased, false)));
  if (list.length) {
    await db.insert(schema.groceryItems).values(list.map((l) => ({
      pregnancyId: ctx.pregnancy.id, month, name: l.name, category: l.category, quantity: l.quantity, unit: l.unit, estCostCents: l.estCostCents,
      cadence: l.cadence, fromMealPlan: true, inPantry: pantry.has(l.name), notes: "Estimated price — update with the real price",
    })));
  }
  revalidatePath("/groceries");
  redirect(`/groceries?month=${month}&generated=1`);
}

/** Plan a whole range (e.g. 1–31 December): 3 meals + 2 snacks a day, plus weekly shopping lists. */
export async function planMonth(fd: FormData) {
  const ctx = await actionContext("MEAL_PLAN");
  const start = isoDate.parse(str(fd, "start"));
  const end = isoDate.parse(str(fd, "end"));
  const span = daysBetween(start, end);
  if (span < 0 || span > 62) throw new UserError("Please choose a plan of up to two months.");
  await createRangePlan(ctx.pregnancy, { start, end, gentle: str(fd, "gentle") === "1" });
  for (const p of ["/planner", "/groceries", "/"]) revalidatePath(p);
  redirect(`/planner?week=${start}&made=${start.slice(0, 7)}`);
}
