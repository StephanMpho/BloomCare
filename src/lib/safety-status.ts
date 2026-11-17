import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import { todayISO } from "./dates";
import { evaluateSymptoms, fluidsSnapshotFromDrinks, mergeSnapshots, sortAlerts, type SafetyAlert, type SymptomSnapshot } from "./safety";
import type { AppContext } from "./context";

export const INITIAL_ALERT = "INITIAL_URGENT";

export type ActiveAlert = SafetyAlert & { acknowledgedAt: Date | null };

/** Evaluate the last 24 hours of symptom logs, drinks and today's check-in. */
export async function activeAlerts(ctx: AppContext): Promise<ActiveAlert[]> {
  const since = new Date(Date.now() - 24 * 3600_000);
  const pid = ctx.pregnancy.id;
  const [logs, drinks, checkIn, acks] = await Promise.all([
    db.select().from(schema.symptomLogs).where(and(eq(schema.symptomLogs.pregnancyId, pid), gte(schema.symptomLogs.loggedAt, since))),
    db.select({ retention: schema.drinkLogs.retention }).from(schema.drinkLogs).where(and(eq(schema.drinkLogs.pregnancyId, pid), gte(schema.drinkLogs.drankAt, since))),
    db.query.checkIns.findFirst({ where: and(eq(schema.checkIns.pregnancyId, pid), eq(schema.checkIns.date, todayISO())), orderBy: desc(schema.checkIns.createdAt) }),
    db.select().from(schema.safetyAcknowledgements).where(and(eq(schema.safetyAcknowledgements.pregnancyId, pid), gte(schema.safetyAcknowledgements.displayedAt, since))),
  ]);

  const snaps: SymptomSnapshot[] = logs.map((l) => ({ ...l }));
  snaps.push(fluidsSnapshotFromDrinks(drinks));
  if (checkIn) {
    snaps.push({
      vomitCount: checkIn.vomitCount ?? 0,
      fluidsKeptDown: checkIn.fluidsKeptDown,
      dizziness: !!checkIn.dizzyOrWeak,
      // "pain or bleeding" in the quick check-in is treated as mild pain → urgent assessment in early pregnancy.
      abdominalPain: checkIn.painOrBleeding ? "MILD" : "NONE",
    });
  }
  const merged = mergeSnapshots(snaps);
  const early = !ctx.pregnancy.ultrasoundConfirmed && ctx.dating.weeks < 14;
  const alerts = sortAlerts(evaluateSymptoms(merged, { earlyPregnancyUnconfirmed: early }));
  return alerts.map((a) => ({
    ...a,
    acknowledgedAt: acks.find((k) => k.alertType === a.id && k.acknowledgedAt)?.acknowledgedAt ?? null,
  }));
}

/** The onboarding urgent notice: shown until acknowledged; acknowledgement ≠ assessment. */
export async function initialNotice(ctx: AppContext) {
  return db.query.safetyAcknowledgements.findFirst({
    where: and(eq(schema.safetyAcknowledgements.pregnancyId, ctx.pregnancy.id), eq(schema.safetyAcknowledgements.alertType, INITIAL_ALERT)),
    orderBy: desc(schema.safetyAcknowledgements.displayedAt),
  });
}
