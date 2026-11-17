"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { actionContext } from "@/lib/context";
import { safe, str, bool, numOrNull } from "@/lib/form";
import { parseRand } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import type { ActionResult } from "@/components/forms";

const month = z.string().regex(/^\d{4}-\d{2}$/);

function refresh() { revalidatePath("/groceries"); revalidatePath("/"); revalidatePath("/partner"); }

export async function addGrocery(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext("GROCERIES");
    const name = z.string().min(1, "What's the item?").max(100).parse(str(fd, "name"));
    await db.insert(schema.groceryItems).values({
      pregnancyId: ctx.pregnancy.id, month: month.parse(str(fd, "month")), name, category: str(fd, "category") || "Other",
      quantity: numOrNull(fd, "quantity") ?? 1, unit: str(fd, "unit") || "item", estCostCents: parseRand(str(fd, "est")) ?? 0,
      store: str(fd, "store"), cadence: str(fd, "cadence") === "MONTHLY" ? "MONTHLY" : "WEEKLY", notes: str(fd, "notes"),
      inPantry: bool(fd, "inPantry"),
    });
    refresh();
    return { ok: true, message: `${name} added.` };
  });
}

async function owned(id: string, pid: string) {
  const r = await db.query.groceryItems.findFirst({ where: and(eq(schema.groceryItems.id, id), eq(schema.groceryItems.pregnancyId, pid)) });
  if (!r) throw new Error("Item not found.");
  return r;
}

export async function updateGrocery(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext("GROCERIES");
    const item = await owned(str(fd, "id"), ctx.pregnancy.id);
    const purchased = bool(fd, "purchased");
    await db.update(schema.groceryItems).set({
      actualCostCents: parseRand(str(fd, "actual")), store: str(fd, "store"), purchased,
      purchaseDate: purchased ? (str(fd, "purchaseDate") || item.purchaseDate || todayISO()) : null,
      expiryDate: str(fd, "expiryDate") || null, inPantry: bool(fd, "inPantry"), estCostCents: parseRand(str(fd, "est")) ?? item.estCostCents,
    }).where(eq(schema.groceryItems.id, item.id));
    refresh();
    return { ok: true, message: "Updated." };
  });
}

export async function toggleGrocery(fd: FormData) {
  const ctx = await actionContext("GROCERIES");
  const item = await owned(str(fd, "id"), ctx.pregnancy.id);
  const field = str(fd, "field");
  if (field === "purchased") {
    await db.update(schema.groceryItems).set({ purchased: !item.purchased, purchaseDate: !item.purchased ? todayISO() : null }).where(eq(schema.groceryItems.id, item.id));
  } else if (field === "inPantry") {
    await db.update(schema.groceryItems).set({ inPantry: !item.inPantry }).where(eq(schema.groceryItems.id, item.id));
  }
  refresh();
}

export async function deleteGrocery(fd: FormData) {
  const ctx = await actionContext("GROCERIES");
  await owned(str(fd, "id"), ctx.pregnancy.id);
  await db.delete(schema.groceryItems).where(eq(schema.groceryItems.id, str(fd, "id")));
  refresh();
}

export async function setBudget(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext();
    if (!ctx.isOwner) throw new Error("Only she can change the budget.");
    const cents = parseRand(str(fd, "budget"));
    if (cents == null || cents < 0) return { error: "Enter an amount in rand." };
    await db.update(schema.pregnancies).set({ monthlyBudgetCents: cents }).where(eq(schema.pregnancies.id, ctx.pregnancy.id));
    refresh();
    return { ok: true, message: "Budget updated." };
  });
}
