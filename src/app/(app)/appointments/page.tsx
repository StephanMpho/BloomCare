import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { CalendarClock, MapPin, FileText, Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/context";
import { formatDateTime, formatTime, toISODate } from "@/lib/dates";
import { rand } from "@/lib/money";
import { Card, CardTitle, PageHeader, Field, Input, Textarea, Select, Note, Empty, Badge } from "@/components/ui";
import { ActionForm, Submit, InlineAction } from "@/components/forms";
import { saveAppointment, deleteAppointment } from "@/app/actions/care";

const TYPES = ["Antenatal booking visit", "Antenatal check-up", "Ultrasound scan", "Blood tests", "GP / doctor visit", "Casualty / emergency visit", "Dietitian", "Other"];

type Appt = typeof schema.appointments.$inferSelect;

function ApptForm({ a }: { a?: Appt }) {
  return (
    <ActionForm action={saveAppointment} resetOnSuccess={!a} className="space-y-3">
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Doctor or clinic"><Input name="provider" defaultValue={a?.provider} required /></Field>
        <Field label="Type"><Select name="type" defaultValue={a?.type || TYPES[0]}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Date"><Input type="date" name="date" defaultValue={a ? toISODate(a.startsAt) : ""} required /></Field>
        <Field label="Time"><Input type="time" name="time" defaultValue={a ? formatTime(a.startsAt) : ""} required /></Field>
        <Field label="Location" className="sm:col-span-2"><Input name="location" defaultValue={a?.location} placeholder="e.g. clinic name, Bloemfontein" /></Field>
        <Field label="Estimated cost (R)"><Input name="est" inputMode="decimal" defaultValue={a?.estCostCents != null ? (a.estCostCents / 100).toFixed(2) : ""} /></Field>
        <Field label="Actual cost (R)"><Input name="actual" inputMode="decimal" defaultValue={a?.actualCostCents != null ? (a.actualCostCents / 100).toFixed(2) : ""} /></Field>
      </div>
      <Field label="Questions to ask"><Textarea name="questions" defaultValue={a?.questions} rows={3} placeholder="e.g. Can I have anti-sickness medicine? When is my scan?" /></Field>
      <Field label="Notes"><Textarea name="notes" defaultValue={a?.notes} rows={2} /></Field>
      <Field label="Clinician's recommendations & follow-up (after the visit)"><Textarea name="followUp" defaultValue={a?.followUp} rows={3} /></Field>
      <Submit variant={a ? "soft" : "rose"}>{a ? "Save changes" : "Add appointment"}</Submit>
    </ActionForm>
  );
}

export default async function Appointments() {
  const ctx = await requirePermission("APPOINTMENTS", { audit: "partner.view_appointments" });
  const list = await db.select().from(schema.appointments).where(eq(schema.appointments.pregnancyId, ctx.pregnancy.id)).orderBy(asc(schema.appointments.startsAt));
  const now = new Date();
  const upcoming = list.filter((a) => a.startsAt >= now);
  const past = list.filter((a) => a.startsAt < now).reverse();

  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" subtitle="Add real appointments as they're booked. BloomCare doesn't invent a schedule."
        action={ctx.isOwner && <Link href="/reports/print" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blush px-4 font-semibold dark:bg-night-line"><FileText size={18} /> Symptom summary for the doctor</Link>} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <h2 className="font-semibold">Upcoming</h2>
          {upcoming.length === 0 ? <Empty icon={<CalendarClock />} title="No upcoming appointments">South African guidelines encourage booking antenatal care early in pregnancy. Add it here once you have a date.</Empty>
            : upcoming.map((a) => <ApptCard key={a.id} a={a} />)}
          {past.length > 0 && <><h2 className="pt-2 font-semibold">Past</h2>{past.map((a) => <ApptCard key={a.id} a={a} past />)}</>}
        </div>
        <Card className="lg:col-span-2 self-start"><CardTitle icon={<CalendarClock size={18} />}>Add an appointment</CardTitle><ApptForm /></Card>
      </div>
      <Note>Reminders: appointments appear on the dashboard. Add them to your phone calendar too — BloomCare doesn&apos;t send SMS or email reminders yet.</Note>
    </div>
  );
}

function ApptCard({ a, past = false }: { a: Appt; past?: boolean }) {
  return (
    <Card className={past ? "opacity-80" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">{a.provider}</p>
          <p className="text-[15px]">{formatDateTime(a.startsAt)}{a.type && <> · <Badge tone="info">{a.type}</Badge></>}</p>
          {a.location && <p className="flex items-center gap-1 text-sm text-muted"><MapPin size={14} /> {a.location}</p>}
          {(a.estCostCents != null || a.actualCostCents != null) && <p className="text-sm text-muted">Cost: est. {rand(a.estCostCents)} · actual {rand(a.actualCostCents)}</p>}
        </div>
        <InlineAction action={deleteAppointment} fields={{ id: a.id }} confirm="Delete this appointment?"><Trash2 size={14} /><span className="sr-only">Delete</span></InlineAction>
      </div>
      {a.questions && <div className="mt-2"><p className="text-sm font-semibold">Questions</p><p className="whitespace-pre-line text-[15px]">{a.questions}</p></div>}
      {a.followUp && <div className="mt-2 rounded-2xl bg-sage/40 p-3 dark:bg-sage-deep/20"><p className="text-sm font-semibold">Clinician&apos;s recommendations</p><p className="whitespace-pre-line text-[15px]">{a.followUp}</p></div>}
      <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-lavender-deep dark:text-lavender">{past ? "Add notes from the visit" : "Edit"}</summary><div className="mt-3"><ApptForm a={a} /></div></details>
    </Card>
  );
}
