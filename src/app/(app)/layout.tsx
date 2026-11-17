import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireContext } from "@/lib/context";
import { activeAlerts } from "@/lib/safety-status";
import { can } from "@/lib/permissions";
import { Shell } from "@/components/shell";
import { AlertBanner } from "@/components/safety";
import { ReminderRunner } from "@/components/client-bits";

const REMINDER_TEXT: Record<string, string> = {
  FLUIDS: "A gentle nudge: a few small sips of something you can manage?",
  MEALS: "Optional check-in: is there a small snack that feels okay right now?",
  SUPPLEMENTS: "Reminder: supplements your clinician recommended.",
  CHECKIN: "How are you feeling today? The daily check-in takes a minute.",
  GROCERIES: "Grocery list ready for this week's shop.",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const showAlerts = ctx.isOwner || can(ctx.access, "VIEW_SYMPTOMS");
  const alerts = showAlerts ? await activeAlerts(ctx) : [];
  const reminders = ctx.isOwner
    ? (await db.select().from(schema.reminders).where(eq(schema.reminders.pregnancyId, ctx.pregnancy.id)))
        .filter((r) => r.enabled).map((r) => ({ kind: r.kind, label: REMINDER_TEXT[r.kind] ?? "Reminder", times: r.times }))
    : [];
  return (
    <Shell access={ctx.access} name={ctx.user.name}
      banner={alerts.length ? <div className="no-print mx-auto max-w-6xl px-4 pt-4 md:px-8"><AlertBanner alerts={alerts} canAck={ctx.isOwner} compact /></div> : null}>
      {children}
      <ReminderRunner reminders={reminders} quietStart={ctx.pregnancy.quietHoursStart} quietEnd={ctx.pregnancy.quietHoursEnd} />
      <footer className="mt-12 border-t border-line pt-4 text-xs text-muted dark:border-night-line dark:text-white/50">
        BloomCare supports self-monitoring and general education. It does not diagnose, prescribe or replace antenatal care with a qualified doctor, midwife or dietitian. In an emergency call 10177 (or 112 from a cellphone).
      </footer>
    </Shell>
  );
}
