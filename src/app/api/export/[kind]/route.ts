import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getContext, audit } from "@/lib/context";
import { parseRange, reportData, toCsv } from "@/lib/reports";
import { formatDateTime, toISODate } from "@/lib/dates";

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const ctx = await getContext();
  if (!ctx || !ctx.isOwner) return new NextResponse("Not allowed", { status: 403 });
  const { kind } = await params;
  const url = new URL(req.url);

  if (kind === "all") {
    // Full personal-data export (POPIA right of access): every record linked to this pregnancy.
    const pid = ctx.pregnancy.id;
    const tables = { foodLogs: schema.foodLogs, drinkLogs: schema.drinkLogs, symptomLogs: schema.symptomLogs, checkIns: schema.checkIns, mealPlan: schema.mealPlanEntries,
      savedMeals: schema.savedMeals, groceries: schema.groceryItems, supplements: schema.supplements, appointments: schema.appointments, journal: schema.journalEntries,
      supportRequests: schema.supportRequests, reminders: schema.reminders, partnerAccess: schema.partnerAccess, safetyAcknowledgements: schema.safetyAcknowledgements, photoChecks: schema.photoChecks, auditLog: schema.auditLogs } as const;
    const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), user: { name: ctx.user.name, email: ctx.user.email }, pregnancy: ctx.pregnancy };
    for (const [k, t] of Object.entries(tables)) out[k] = await db.select().from(t).where(eq((t as typeof schema.foodLogs).pregnancyId, pid));
    (out.partnerAccess as { inviteTokenHash?: string }[]).forEach((p) => delete p.inviteTokenHash);
    const suppIds = (out.supplements as { id: string }[]).map((s) => s.id);
    out.supplementLogs = suppIds.length ? await db.select().from(schema.supplementLogs).where(inArray(schema.supplementLogs.supplementId, suppIds)) : [];
    out.customFoods = await db.select().from(schema.foods).where(eq(schema.foods.createdById, ctx.user.id));
    await audit(ctx, "export.all");
    return new NextResponse(JSON.stringify(out, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="bloomcare-export.json"` } });
  }

  const r = parseRange(Object.fromEntries(url.searchParams));
  const d = await reportData(ctx.pregnancy.id, r.from, r.to);
  let rows: Record<string, unknown>[];
  switch (kind) {
    case "food": rows = d.foods.map(({ log, food }) => ({ when: formatDateTime(log.eatenAt), meal: log.mealType, food: log.foodName, category: food?.category ?? "", portion: log.portionLabel, amount_eaten: log.amountEaten, tolerance: log.tolerance, nausea_after: log.nauseaAfter, vomited_after: log.vomitedAfter, notes: log.notes })); break;
    case "symptoms": rows = d.symptoms.map((s) => ({ when: formatDateTime(s.loggedAt), nausea_0_10: s.nauseaSeverity, vomiting_episodes: s.vomitCount, fluids_kept_down: s.fluidsKeptDown, dizziness: s.dizziness, weakness: s.weakness, fainting: s.fainting, reduced_urine: s.reducedUrine, weight_kg: s.weightKg, weight_loss: s.weightLossNoticed, abdominal_pain: s.abdominalPain, shoulder_tip_pain: s.shoulderTipPain, bleeding: s.bleeding, fever: s.fever, triggers: s.triggers, notes: s.notes })); break;
    case "hydration": rows = d.drinks.map((x) => ({ when: formatDateTime(x.drankAt), drink: x.drinkType, offered_ml: x.offeredMl, consumed_ml: x.consumedMl, retention: x.retention, temperature: x.temperature, notes: x.notes })); break;
    case "supplements": rows = d.suppLogs.map((l) => ({ date: l.date, supplement: d.supps.find((s) => s.id === l.supplementId)?.name, status: l.status, side_effects: l.sideEffects })); break;
    case "groceries": rows = d.groceries.map((g) => ({ month: g.month, item: g.name, category: g.category, quantity: g.quantity, unit: g.unit, estimated_r: (g.estCostCents / 100).toFixed(2), actual_r: g.actualCostCents != null ? (g.actualCostCents / 100).toFixed(2) : "", store: g.store, purchase_date: g.purchaseDate })); break;
    case "appointments": rows = d.appts.map((a) => ({ date: toISODate(a.startsAt), when: formatDateTime(a.startsAt), provider: a.provider, type: a.type, location: a.location, questions: a.questions, notes: a.notes, follow_up: a.followUp })); break;
    default: return new NextResponse("Unknown export", { status: 404 });
  }
  await audit(ctx, `export.${kind}`);
  return new NextResponse(toCsv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="bloomcare-${kind}-${r.from}-to-${r.to}.csv"` } });
}
