"use server";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/lib/auth";
import { safe, str, bool, intOrNull } from "@/lib/form";
import { validateLmp } from "@/lib/pregnancy";
import { evaluateSymptoms } from "@/lib/safety";
import { INITIAL_ALERT } from "@/lib/safety-status";
import { parseRand } from "@/lib/money";
import type { ActionResult } from "@/components/forms";

export async function onboardingStepOne(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const user = await currentUser();
    if (!user) redirect("/login");
    const preferredName = str(fd, "preferredName") || user.name;
    const lmp = str(fd, "lmpDate");
    const lmpErr = validateLmp(lmp);
    if (lmpErr) return { error: lmpErr };
    const clinical = str(fd, "clinicalDueDate");
    const method = (str(fd, "datingMethod") || "LMP") as "LMP" | "ULTRASOUND" | "CLINICIAN";
    const values = {
      preferredName, greeting: str(fd, "greeting"), lmpDate: lmp, clinicalDueDate: clinical || null,
      datingMethod: clinical ? (method === "LMP" ? "CLINICIAN" : method) : "LMP" as const,
      ultrasoundConfirmed: bool(fd, "ultrasoundConfirmed"),
    };
    const existing = await db.query.pregnancies.findFirst({ where: eq(schema.pregnancies.ownerId, user.id) });
    let pid: string;
    if (existing) {
      await db.update(schema.pregnancies).set(values).where(eq(schema.pregnancies.id, existing.id));
      pid = existing.id;
    } else {
      const [p] = await db.insert(schema.pregnancies).values({ ownerId: user.id, ...values }).returning();
      pid = p.id;
    }

    // Quick symptom screen — stored as a real symptom log so history and alerts use it.
    const snap = {
      vomitCount: intOrNull(fd, "vomitCount") ?? 0,
      fluidsKeptDown: (str(fd, "fluidsKeptDown") || null) as "KEPT_DOWN" | "PARTLY" | "NOT_KEPT_DOWN" | null,
      weightLossNoticed: bool(fd, "weightLoss"),
      dizziness: bool(fd, "dizziness"),
      weakness: bool(fd, "weakness"),
      abdominalPain: (str(fd, "abdominalPain") || "NONE") as "NONE" | "MILD" | "SEVERE",
      bleeding: (str(fd, "bleeding") || "NONE") as "NONE" | "SPOTTING" | "HEAVY",
      fainting: bool(fd, "fainting"),
      reducedUrine: bool(fd, "reducedUrine"),
    };
    const anyReported = Object.values(snap).some((v) => v && v !== "NONE" && v !== "KEPT_DOWN");
    if (anyReported) {
      await db.insert(schema.symptomLogs).values({ pregnancyId: pid, loggedById: user.id, loggedAt: new Date(), ...snap, notes: "Reported during onboarding" });
    }
    const alerts = evaluateSymptoms(snap, { earlyPregnancyUnconfirmed: !values.ultrasoundConfirmed });
    if (alerts.some((a) => a.level !== "CONTACT_CLINICIAN")) {
      const open = await db.query.safetyAcknowledgements.findFirst({
        where: and(eq(schema.safetyAcknowledgements.pregnancyId, pid), eq(schema.safetyAcknowledgements.alertType, INITIAL_ALERT), isNull(schema.safetyAcknowledgements.acknowledgedAt)),
      });
      if (!open) await db.insert(schema.safetyAcknowledgements).values({ pregnancyId: pid, userId: user.id, alertType: INITIAL_ALERT });
      redirect("/onboarding?step=safety");
    }
    redirect("/onboarding?step=2");
  });
}

export async function onboardingStepTwo(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const user = await currentUser();
    if (!user) redirect("/login");
    const p = await db.query.pregnancies.findFirst({ where: eq(schema.pregnancies.ownerId, user.id) });
    if (!p) redirect("/onboarding");
    const budget = parseRand(str(fd, "budget")) ?? 300000;
    await db.update(schema.pregnancies).set({
      allergies: str(fd, "allergies"),
      toleratedAtStart: str(fd, "tolerated"),
      nauseaTriggers: str(fd, "triggers"),
      dietaryPreferences: str(fd, "dietary"),
      monthlyBudgetCents: budget,
      onboardedAt: new Date(),
    }).where(eq(schema.pregnancies.id, p.id));
    const kinds = ["FLUIDS", "CHECKIN", "MEALS"] as const;
    const defaults: Record<string, string[]> = { FLUIDS: ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"], CHECKIN: ["10:00"], MEALS: ["08:30", "12:30", "18:00"] };
    for (const k of kinds) {
      await db.insert(schema.reminders).values({ pregnancyId: p.id, kind: k, enabled: bool(fd, `rem_${k}`), times: defaults[k] })
        .onConflictDoUpdate({ target: [schema.reminders.pregnancyId, schema.reminders.kind], set: { enabled: bool(fd, `rem_${k}`) } });
    }
    redirect(bool(fd, "invitePartner") ? "/settings?tab=partner#partner" : "/");
  });
}
