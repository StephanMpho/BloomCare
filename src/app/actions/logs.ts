"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { actionContext, audit } from "@/lib/context";
import { safe, UserError, str, bool, intOrNull, numOrNull, isoDate, hhmm } from "@/lib/form";
import { sastInstant, todayISO } from "@/lib/dates";
import { evaluateSymptoms } from "@/lib/safety";
import { INITIAL_ALERT } from "@/lib/safety-status";
import type { ActionResult } from "@/components/forms";

const mealTypes = ["BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "SUPPER", "EVENING_SNACK", "DRINKS"] as const;

function refresh() {
  for (const p of ["/", "/food", "/symptoms", "/hydration", "/partner", "/reports"]) revalidatePath(p);
}

async function ownedFoodLog(id: string, pregnancyId: string) {
  const row = await db.query.foodLogs.findFirst({ where: and(eq(schema.foodLogs.id, id), eq(schema.foodLogs.pregnancyId, pregnancyId)) });
  if (!row) throw new UserError("That entry wasn't found.");
  return row;
}

export async function saveFoodLog(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext("LOG_FOR_ME");
    const id = str(fd, "id");
    const data = z.object({
      date: isoDate, time: hhmm, mealType: z.enum(mealTypes), foodName: z.string().min(1, "Please choose or type a food.").max(120),
      tolerance: z.enum(["GOOD", "OKAY", "POOR"], { message: "How did it sit with her? Choose one." }),
      amountEaten: z.enum(["FULL", "PARTIAL", "FEW_BITES"]),
    }).parse({ date: str(fd, "date"), time: str(fd, "time"), mealType: str(fd, "mealType"), foodName: str(fd, "foodName"), tolerance: str(fd, "tolerance"), amountEaten: str(fd, "amountEaten") || "FULL" });

    let foodId = str(fd, "foodId") || null;
    if (foodId) {
      const f = await db.query.foods.findFirst({ where: and(eq(schema.foods.id, foodId), or(isNull(schema.foods.createdById), eq(schema.foods.createdById, ctx.pregnancy.ownerId))) });
      if (!f || f.name !== data.foodName) foodId = null; // typed a different name → treat as custom text
    }
    const values = {
      pregnancyId: ctx.pregnancy.id, loggedById: ctx.user.id, foodId, foodName: data.foodName, mealType: data.mealType,
      eatenAt: sastInstant(data.date, data.time), portionLabel: str(fd, "portionLabel") || "1 portion",
      grams: numOrNull(fd, "grams"), preparation: str(fd, "preparation"), amountEaten: data.amountEaten, tolerance: data.tolerance,
      nauseaAfter: bool(fd, "nauseaAfter"), vomitedAfter: bool(fd, "vomitedAfter"), favourite: bool(fd, "favourite"), notes: str(fd, "notes"),
    };
    if (id) {
      await ownedFoodLog(id, ctx.pregnancy.id);
      await db.update(schema.foodLogs).set(values).where(eq(schema.foodLogs.id, id));
    } else {
      await db.insert(schema.foodLogs).values(values);
    }
    if (values.vomitedAfter) {
      await db.insert(schema.symptomLogs).values({ pregnancyId: ctx.pregnancy.id, loggedById: ctx.user.id, loggedAt: values.eatenAt, vomitCount: 1, notes: `After eating ${data.foodName}` });
    }
    if (!ctx.isOwner) await audit(ctx, "partner.log_food", data.foodName);
    refresh();
    redirect(values.vomitedAfter ? "/symptoms?fromFood=1#log" : `/food?date=${data.date}&saved=1`);
  });
}

export async function deleteFoodLog(fd: FormData) {
  const ctx = await actionContext("LOG_FOR_ME");
  await ownedFoodLog(str(fd, "id"), ctx.pregnancy.id);
  await db.delete(schema.foodLogs).where(eq(schema.foodLogs.id, str(fd, "id")));
  refresh();
}

export async function duplicateFoodLog(fd: FormData) {
  const ctx = await actionContext("LOG_FOR_ME");
  const row = await ownedFoodLog(str(fd, "id"), ctx.pregnancy.id);
  const { id: _id, createdAt: _c, ...rest } = row;
  await db.insert(schema.foodLogs).values({ ...rest, loggedById: ctx.user.id, eatenAt: new Date() });
  refresh();
}

export async function createCustomFood(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext("LOG_FOR_ME");
    const name = z.string().min(2, "Give the food a name.").max(80).parse(str(fd, "name"));
    const n = (k: string) => numOrNull(fd, k);
    const hasLabel = ["proteinG", "carbsG", "fatG", "fibreG", "ironMg", "calciumMg", "folateUg"].some((k) => n(k) != null);
    await db.insert(schema.foods).values({
      name, category: str(fd, "category") || "Snacks", servingLabel: str(fd, "servingLabel") || "1 portion", servingGrams: n("servingGrams") ?? 100,
      proteinG: n("proteinG"), carbsG: n("carbsG"), fatG: n("fatG"), fibreG: n("fibreG"), ironMg: n("ironMg"), calciumMg: n("calciumMg"), folateUg: n("folateUg"),
      nutrientSource: hasLabel ? "Entered from the pack label (per 100 g)" : "No nutrient data", createdById: ctx.pregnancy.ownerId,
    });
    revalidatePath("/food/new");
    return { ok: true, message: `"${name}" added. You can now search for it.` };
  });
}

export async function saveDrinkLog(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext("LOG_FOR_ME");
    const data = z.object({
      drinkType: z.string().min(1).max(60), consumedMl: z.number({ message: "How much did she drink (ml)?" }).int().min(0).max(5000),
      retention: z.enum(["KEPT_DOWN", "PARTLY", "NOT_KEPT_DOWN"], { message: "Was it kept down? Choose one." }), date: isoDate, time: hhmm,
    }).parse({ drinkType: str(fd, "drinkType"), consumedMl: intOrNull(fd, "consumedMl") ?? undefined, retention: str(fd, "retention"), date: str(fd, "date") || todayISO(), time: str(fd, "time") });
    await db.insert(schema.drinkLogs).values({
      pregnancyId: ctx.pregnancy.id, loggedById: ctx.user.id, drinkType: data.drinkType, offeredMl: intOrNull(fd, "offeredMl"),
      consumedMl: data.consumedMl, retention: data.retention, temperature: str(fd, "temperature"), drankAt: sastInstant(data.date, data.time), notes: str(fd, "notes"),
    });
    if (!ctx.isOwner) await audit(ctx, "partner.log_drink", data.drinkType);
    refresh();
    return { ok: true, message: data.retention === "NOT_KEPT_DOWN" ? "Saved. If drinks keep coming back up, please see the guidance below." : "Saved — every sip counts." };
  });
}

export async function deleteDrinkLog(fd: FormData) {
  const ctx = await actionContext("LOG_FOR_ME");
  await db.delete(schema.drinkLogs).where(and(eq(schema.drinkLogs.id, str(fd, "id")), eq(schema.drinkLogs.pregnancyId, ctx.pregnancy.id)));
  refresh();
}

export async function saveSymptomLog(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext();
    if (!ctx.isOwner) throw new UserError("Only she can record symptoms.");
    const date = str(fd, "date") || todayISO();
    const time = str(fd, "time");
    hhmm.parse(time);
    const sev = intOrNull(fd, "nauseaSeverity");
    const values = {
      pregnancyId: ctx.pregnancy.id, loggedById: ctx.user.id, loggedAt: sastInstant(date, time),
      nauseaSeverity: sev == null ? null : Math.max(0, Math.min(10, sev)), nauseaStartedAt: str(fd, "nauseaStartedAt"),
      vomitCount: Math.max(0, Math.min(50, intOrNull(fd, "vomitCount") ?? 0)),
      fluidsKeptDown: (str(fd, "fluidsKeptDown") || null) as "KEPT_DOWN" | "PARTLY" | "NOT_KEPT_DOWN" | null,
      appetite: intOrNull(fd, "appetite"), weightKg: numOrNull(fd, "weightKg"), weightLossNoticed: bool(fd, "weightLossNoticed"),
      dizziness: bool(fd, "dizziness"), weakness: bool(fd, "weakness"), fainting: bool(fd, "fainting"), reducedUrine: bool(fd, "reducedUrine"),
      abdominalPain: (str(fd, "abdominalPain") || "NONE") as "NONE" | "MILD" | "SEVERE", shoulderTipPain: bool(fd, "shoulderTipPain"),
      bleeding: (str(fd, "bleeding") || "NONE") as "NONE" | "SPOTTING" | "HEAVY", fever: bool(fd, "fever"),
      triggers: str(fd, "triggers"), notes: str(fd, "notes"),
    };
    await db.insert(schema.symptomLogs).values(values);
    refresh();
    const alerts = evaluateSymptoms(values, { earlyPregnancyUnconfirmed: !ctx.pregnancy.ultrasoundConfirmed && ctx.dating.weeks < 14 });
    if (alerts.length) redirect("/symptoms?alert=1");
    return { ok: true, message: "Saved. Thank you for looking after yourself." };
  });
}

export async function saveCheckIn(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext();
    if (!ctx.isOwner) throw new UserError("Only she can complete the check-in.");
    const yn = (k: string) => (str(fd, k) === "yes" ? true : str(fd, k) === "no" ? false : null);
    await db.insert(schema.checkIns).values({
      pregnancyId: ctx.pregnancy.id, date: todayISO(), mood: intOrNull(fd, "mood"), nauseaSeverity: intOrNull(fd, "nauseaSeverity"),
      vomitCount: intOrNull(fd, "vomitCount"), fluidsKeptDown: (str(fd, "fluidsKeptDown") || null) as "KEPT_DOWN" | "PARTLY" | "NOT_KEPT_DOWN" | null,
      appetite: intOrNull(fd, "appetite"), energy: intOrNull(fd, "energy"), dizzyOrWeak: yn("dizzyOrWeak"), painOrBleeding: yn("painOrBleeding"),
      partnerRequest: str(fd, "partnerRequest"), notes: str(fd, "notes"),
    });
    if (str(fd, "partnerRequest")) await db.insert(schema.supportRequests).values({ pregnancyId: ctx.pregnancy.id, text: str(fd, "partnerRequest") });
    refresh();
    redirect("/?checkedIn=1");
  });
}

export async function acknowledgeAlert(fd: FormData) {
  const ctx = await actionContext();
  const type = str(fd, "alertType");
  if (type === INITIAL_ALERT) {
    await db.update(schema.safetyAcknowledgements).set({ acknowledgedAt: new Date() })
      .where(and(eq(schema.safetyAcknowledgements.pregnancyId, ctx.pregnancy.id), eq(schema.safetyAcknowledgements.alertType, INITIAL_ALERT), isNull(schema.safetyAcknowledgements.acknowledgedAt)));
  } else {
    await db.insert(schema.safetyAcknowledgements).values({ pregnancyId: ctx.pregnancy.id, userId: ctx.user.id, alertType: type, acknowledgedAt: new Date() });
  }
  refresh();
  const next = str(fd, "next");
  if (next) redirect(next);
}
