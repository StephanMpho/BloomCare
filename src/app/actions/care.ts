"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { actionContext, audit } from "@/lib/context";
import { safe, str, bool, isoDate, hhmm } from "@/lib/form";
import { parseRand } from "@/lib/money";
import { sastInstant, todayISO } from "@/lib/dates";
import type { ActionResult } from "@/components/forms";

/* ---------- Supplements (owner only: health decisions stay hers) ---------- */
export async function saveSupplement(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext();
    if (!ctx.isOwner) throw new Error("Only she can manage supplements.");
    const data = z.object({
      name: z.string().min(1, "Supplement name?").max(100), dose: z.string().min(1, "Enter the dose exactly as on the prescription or label.").max(40),
      unit: z.string().min(1).max(20), frequency: z.string().min(1, "How often?").max(60),
      source: z.enum(["CLINICIAN", "PHARMACIST", "NOT_YET_APPROVED"], { message: "Who recommended it?" }),
    }).parse({ name: str(fd, "name"), dose: str(fd, "dose"), unit: str(fd, "unit"), frequency: str(fd, "frequency"), source: str(fd, "source") });
    const wantsReminder = bool(fd, "reminderEnabled");
    await db.insert(schema.supplements).values({
      pregnancyId: ctx.pregnancy.id, ...data, instructions: str(fd, "instructions"), recommendedBy: str(fd, "recommendedBy"),
      ingredients: str(fd, "ingredients").split(",").map((s) => s.trim()).filter(Boolean), startDate: str(fd, "startDate") || null,
      // Reminders only for clinician- or pharmacist-approved supplements.
      reminderEnabled: wantsReminder && data.source !== "NOT_YET_APPROVED", notes: str(fd, "notes"),
    });
    revalidatePath("/supplements");
    return { ok: true, message: wantsReminder && data.source === "NOT_YET_APPROVED"
      ? "Saved. Reminders stay off until a clinician or pharmacist has approved it." : "Supplement saved." };
  });
}

export async function logDose(fd: FormData) {
  const ctx = await actionContext();
  if (!ctx.isOwner) throw new Error("Only she can record doses.");
  const s = await db.query.supplements.findFirst({ where: and(eq(schema.supplements.id, str(fd, "id")), eq(schema.supplements.pregnancyId, ctx.pregnancy.id)) });
  if (!s) return;
  const status = str(fd, "status") === "MISSED" ? "MISSED" : "TAKEN";
  const date = str(fd, "date") || todayISO();
  await db.insert(schema.supplementLogs).values({ supplementId: s.id, date, status, sideEffects: str(fd, "sideEffects") })
    .onConflictDoUpdate({ target: [schema.supplementLogs.supplementId, schema.supplementLogs.date], set: { status, sideEffects: str(fd, "sideEffects") } });
  revalidatePath("/supplements");
  revalidatePath("/");
}

export async function toggleSupplementActive(fd: FormData) {
  const ctx = await actionContext();
  if (!ctx.isOwner) return;
  const s = await db.query.supplements.findFirst({ where: and(eq(schema.supplements.id, str(fd, "id")), eq(schema.supplements.pregnancyId, ctx.pregnancy.id)) });
  if (!s) return;
  await db.update(schema.supplements).set({ active: !s.active }).where(eq(schema.supplements.id, s.id));
  revalidatePath("/supplements");
}

/* ---------- Appointments ---------- */
export async function saveAppointment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext("APPOINTMENTS");
    const id = str(fd, "id");
    const date = isoDate.parse(str(fd, "date"));
    const time = hhmm.parse(str(fd, "time"));
    const provider = z.string().min(1, "Doctor or clinic name?").max(120).parse(str(fd, "provider"));
    const v = {
      pregnancyId: ctx.pregnancy.id, startsAt: sastInstant(date, time), provider, location: str(fd, "location"), type: str(fd, "type"),
      estCostCents: parseRand(str(fd, "est")), actualCostCents: parseRand(str(fd, "actual")),
      questions: str(fd, "questions"), notes: str(fd, "notes"), followUp: str(fd, "followUp"),
    };
    if (id) {
      const ex = await db.query.appointments.findFirst({ where: and(eq(schema.appointments.id, id), eq(schema.appointments.pregnancyId, ctx.pregnancy.id)) });
      if (!ex) throw new Error("Appointment not found.");
      await db.update(schema.appointments).set(v).where(eq(schema.appointments.id, id));
    } else {
      await db.insert(schema.appointments).values(v);
    }
    if (!ctx.isOwner) await audit(ctx, "partner.appointment", provider);
    revalidatePath("/appointments");
    revalidatePath("/");
    return { ok: true, message: "Appointment saved." };
  });
}

export async function deleteAppointment(fd: FormData) {
  const ctx = await actionContext("APPOINTMENTS");
  await db.delete(schema.appointments).where(and(eq(schema.appointments.id, str(fd, "id")), eq(schema.appointments.pregnancyId, ctx.pregnancy.id)));
  revalidatePath("/appointments");
}

/* ---------- Journal ---------- */
export async function saveJournal(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext();
    if (!ctx.isOwner) throw new Error("Only she can write in the journal.");
    await db.insert(schema.journalEntries).values({
      pregnancyId: ctx.pregnancy.id, date: todayISO(), week: ctx.dating.weeks, feeling: str(fd, "feeling"), favouriteFoods: str(fd, "favouriteFoods"),
      aversions: str(fd, "aversions"), questions: str(fd, "questions"), memories: str(fd, "memories"), private: bool(fd, "private"),
    });
    revalidatePath("/journey");
    return { ok: true, message: "Journal entry saved." };
  });
}

/* ---------- Support requests ---------- */
export async function addSupportRequest(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await actionContext();
    if (!ctx.isOwner) throw new Error("Only she can add requests.");
    const text = z.string().min(2).max(200).parse(str(fd, "text"));
    await db.insert(schema.supportRequests).values({ pregnancyId: ctx.pregnancy.id, text });
    revalidatePath("/");
    revalidatePath("/partner");
    return { ok: true, message: "Shared with your partner (if they have access to requests)." };
  });
}

export async function completeSupportRequest(fd: FormData) {
  const ctx = await actionContext("SUPPORT_REQUESTS");
  await db.update(schema.supportRequests).set({ doneAt: new Date() })
    .where(and(eq(schema.supportRequests.id, str(fd, "id")), eq(schema.supportRequests.pregnancyId, ctx.pregnancy.id)));
  revalidatePath("/");
  revalidatePath("/partner");
}
