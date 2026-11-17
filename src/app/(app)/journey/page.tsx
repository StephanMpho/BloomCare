import { desc, eq } from "drizzle-orm";
import { Sprout, BookHeart } from "lucide-react";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/context";
import { JOURNEY, stageFor } from "@/lib/content/journey";
import { SOURCES } from "@/lib/content/sources";
import { formatDate, addDays, toISODate } from "@/lib/dates";
import { nextAppointment } from "@/lib/queries";
import { Card, CardTitle, PageHeader, Field, Input, Textarea, Check, Badge, Note, cx } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { saveJournal } from "@/app/actions/care";

export default async function Journey() {
  const ctx = await requirePermission("VIEW_JOURNEY");
  const d = ctx.dating;
  const stage = stageFor(d.weeks);
  const [entries, appt] = await Promise.all([
    db.select().from(schema.journalEntries).where(eq(schema.journalEntries.pregnancyId, ctx.pregnancy.id)).orderBy(desc(schema.journalEntries.date)).limit(30),
    nextAppointment(ctx.pregnancy.id),
  ]);
  const visible = ctx.isOwner ? entries : entries.filter((e) => !e.private);
  const firstTri = JOURNEY.filter((s) => s.from >= 4 && s.to <= 14);

  return (
    <div className="space-y-6">
      <PageHeader title="Pregnancy Journey" subtitle="Dates are estimates until confirmed clinically, usually by an early ultrasound." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card tone="sage" className="lg:col-span-2">
          <CardTitle icon={<Sprout size={18} />}>{stage.title}</CardTitle>
          <p className="font-display text-3xl">{d.label}</p>
          <p className="text-[15px]">Trimester {d.trimester} · Estimated due date <strong>{formatDate(d.edd)}</strong> · {d.daysToDue} days to go</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/80 dark:bg-night"><div className="h-full rounded-full bg-sage-deep" style={{ width: `${Math.max(2, d.progress * 100)}%` }} /></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><p className="font-semibold">Development (typical)</p><ul className="list-disc pl-5 text-[15px]">{stage.development.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><p className="font-semibold">Common symptoms</p><ul className="list-disc pl-5 text-[15px]">{stage.symptoms.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><p className="font-semibold">Nutrition focus</p><ul className="list-disc pl-5 text-[15px]">{stage.nutrition.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><p className="font-semibold">Questions for your clinician</p><ul className="list-disc pl-5 text-[15px]">{stage.questions.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <Note className="mt-3">Every pregnancy differs. Sources: {stage.sources.map((s, i) => <span key={s}>{i > 0 && " · "}<a className="underline" href={SOURCES[s].url}>{SOURCES[s].title}</a></span>)}</Note>
        </Card>
        <Card>
          <CardTitle>How dates are worked out</CardTitle>
          <ul className="space-y-2 text-[15px]">
            <li>Last period started: <strong>{formatDate(ctx.pregnancy.lmpDate)}</strong></li>
            <li>Due date by last period (+280 days): <strong>{formatDate(d.eddByLmp)}</strong></li>
            {ctx.pregnancy.clinicalDueDate && <li>Clinical due date: <strong>{formatDate(ctx.pregnancy.clinicalDueDate)}</strong> ({ctx.pregnancy.datingMethod === "ULTRASOUND" ? "ultrasound" : "clinician"})</li>}
            <li>Using: <Badge tone="info">{d.basis === "LMP" ? "Last menstrual period" : d.basis === "ULTRASOUND" ? "Ultrasound" : "Clinician date"}</Badge></li>
            <li>Ultrasound confirmation: <Badge tone={ctx.pregnancy.ultrasoundConfirmed ? "good" : "warn"}>{ctx.pregnancy.ultrasoundConfirmed ? "Recorded" : "Not yet recorded"}</Badge></li>
            <li>Next appointment: {appt ? formatDate(toISODate(appt.startsAt)) : "none added"}</li>
          </ul>
          {ctx.isOwner && <Note className="mt-3">Update these in Settings when the clinic gives you a scan date.</Note>}
        </Card>
      </div>

      <Card>
        <CardTitle>First trimester at a glance</CardTitle>
        <div className="grid gap-4 md:grid-cols-4">
          {firstTri.map((s) => (
            <div key={s.title} className={cx("rounded-2xl border p-4", s === stage ? "border-rose bg-blush/50 dark:bg-rose/20" : "border-line dark:border-night-line")}>
              <p className="font-semibold">{s.title.split(":")[0]}</p>
              <p className="text-sm text-muted">{s.title.split(":")[1]}</p>
              <p className="mt-2 text-sm">{s.development[0]}</p>
              <p className="mt-1 text-xs text-muted">≈ {formatDate(addDays(ctx.pregnancy.lmpDate, s.from * 7), { day: "numeric", month: "short" })} – {formatDate(addDays(ctx.pregnancy.lmpDate, s.to * 7 + 6), { day: "numeric", month: "short" })}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {ctx.isOwner && (
          <Card tone="blush">
            <CardTitle icon={<BookHeart size={18} />}>Weekly journal — week {d.weeks}</CardTitle>
            <ActionForm action={saveJournal} resetOnSuccess className="space-y-3">
              <Field label="How I'm feeling"><Textarea name="feeling" rows={2} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Favourite foods this week"><Input name="favouriteFoods" /></Field>
                <Field label="Food aversions"><Input name="aversions" /></Field>
              </div>
              <Field label="Questions for the doctor"><Textarea name="questions" rows={2} /></Field>
              <Field label="Memories to keep"><Textarea name="memories" rows={2} /></Field>
              <Check name="private" label="Keep this entry private (never shown to my partner)" />
              <Submit variant="rose">Save entry</Submit>
            </ActionForm>
            <Note className="mt-2">Photo uploads aren&apos;t enabled yet — they need private file storage (see README).</Note>
          </Card>
        )}
        <Card>
          <CardTitle>Journal entries</CardTitle>
          {visible.length === 0 ? <Note>No entries yet.</Note> : (
            <ul className="space-y-3">{visible.map((e) => (
              <li key={e.id} className="rounded-2xl bg-ivory p-3 dark:bg-night">
                <p className="text-sm font-semibold">Week {e.week} · {formatDate(e.date)} {e.private && <Badge>Private</Badge>}</p>
                {e.feeling && <p className="text-[15px]">{e.feeling}</p>}
                {e.favouriteFoods && <p className="text-sm"><strong>Favourites:</strong> {e.favouriteFoods}</p>}
                {e.aversions && <p className="text-sm"><strong>Aversions:</strong> {e.aversions}</p>}
                {e.questions && <p className="text-sm"><strong>Questions:</strong> {e.questions}</p>}
                {e.memories && <p className="text-sm"><strong>Memories:</strong> {e.memories}</p>}
              </li>
            ))}</ul>
          )}
        </Card>
      </div>
    </div>
  );
}
