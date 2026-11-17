import Link from "next/link";
import { Frown, Leaf, Lightbulb } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/context";
import { activeAlerts, initialNotice } from "@/lib/safety-status";
import { dailySeries, toleranceLists } from "@/lib/queries";
import { formatDateTime, nowHHMM, todayISO } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { Card, CardTitle, PageHeader, Field, Input, Choice, Check, Textarea, Badge, Note, cx } from "@/components/ui";
import { ActionForm, Submit, RangeField } from "@/components/forms";
import { Chart } from "@/components/charts";
import { AlertBanner, InitialUrgentNotice, WhenToGetHelp } from "@/components/safety";
import { saveSymptomLog } from "@/app/actions/logs";
import { SOURCES } from "@/lib/content/sources";

export default async function Symptoms({ searchParams }: { searchParams: Promise<{ range?: string; vomit?: string; alert?: string; fromFood?: string }> }) {
  const ctx = await requirePermission("VIEW_SYMPTOMS", { audit: "partner.view_symptoms" });
  const sp = await searchParams;
  const range = sp.range === "30" ? 30 : sp.range === "1" ? 1 : 7;
  const [alerts, notice, series, tolerance, history] = await Promise.all([
    activeAlerts(ctx), initialNotice(ctx), dailySeries(ctx.pregnancy.id, range), toleranceLists(ctx.pregnancy.id),
    db.select().from(schema.symptomLogs).where(eq(schema.symptomLogs.pregnancyId, ctx.pregnancy.id)).orderBy(desc(schema.symptomLogs.loggedAt)).limit(15),
  ]);
  const showNotes = can(ctx.access, "VIEW_NOTES");

  return (
    <div className="space-y-6">
      <PageHeader title="Nausea & Symptoms" subtitle="Record how you feel. BloomCare will flag anything that needs a clinician — it never diagnoses." />
      {ctx.isOwner && notice && !notice.acknowledgedAt && <InitialUrgentNotice next="/symptoms" />}
      {notice?.acknowledgedAt && (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
          On {formatDateTime(notice.acknowledgedAt)} you read the urgent-assessment notice from setup. Reading it doesn&apos;t mean the symptoms have been assessed —
          if you haven&apos;t been seen yet, or symptoms continue, please contact a doctor or clinic.
        </p>
      )}
      {(sp.alert || sp.fromFood) && alerts.length > 0 && <AlertBanner alerts={alerts} canAck={ctx.isOwner} />}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {ctx.isOwner && (
            <Card id="log" className="scroll-mt-20">
              <CardTitle icon={<Frown size={18} />}>{sp.vomit ? "Record vomiting" : "How are you feeling?"}</CardTitle>
              {sp.fromFood && <p className="mb-3 text-sm">A vomiting episode was added from your food log. Add any other symptoms below.</p>}
              <ActionForm action={saveSymptomLog} resetOnSuccess className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Time"><Input type="time" name="time" defaultValue={nowHHMM()} required /></Field>
                  <Field label="Vomiting episodes (since last log)"><Input type="number" name="vomitCount" min={0} max={50} defaultValue={sp.vomit ? 1 : 0} inputMode="numeric" /></Field>
                </div>
                <input type="hidden" name="date" value={todayISO()} />
                <RangeField name="nauseaSeverity" label="Nausea right now" defaultValue={sp.vomit ? 7 : 3} left="0 · none" right="10 · worst" />
                <div><p className="mb-1.5 text-sm font-semibold">Can you keep fluids down?</p>
                  <Choice name="fluidsKeptDown" options={[{ value: "KEPT_DOWN", label: "Yes" }, { value: "PARTLY", label: "Some" }, { value: "NOT_KEPT_DOWN", label: "No" }]} /></div>
                <div><p className="mb-1.5 text-sm font-semibold">Appetite</p>
                  <Choice name="appetite" options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: ["None", "Low", "Some", "Okay", "Good"][n - 1] }))} /></div>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-semibold">Any of these?</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Check name="dizziness" label="Dizziness" />
                    <Check name="weakness" label="Unusual weakness" />
                    <Check name="reducedUrine" label="Less urine / dark urine" />
                    <Check name="weightLossNoticed" label="Weight loss" />
                    <Check name="fever" label="Fever / feeling hot and shivery" />
                    <Check name="fainting" label="Fainted or nearly fainted" />
                    <Check name="shoulderTipPain" label="Pain at the tip of the shoulder" />
                  </div>
                </fieldset>
                <div><p className="mb-1.5 text-sm font-semibold">Abdominal or pelvic pain</p>
                  <Choice name="abdominalPain" defaultValue="NONE" options={[{ value: "NONE", label: "None" }, { value: "MILD", label: "Some" }, { value: "SEVERE", label: "Severe" }]} /></div>
                <div><p className="mb-1.5 text-sm font-semibold">Vaginal bleeding</p>
                  <Choice name="bleeding" defaultValue="NONE" options={[{ value: "NONE", label: "None" }, { value: "SPOTTING", label: "Spotting" }, { value: "HEAVY", label: "Heavy" }]} /></div>
                <details className="rounded-2xl border border-line p-3 dark:border-night-line">
                  <summary className="cursor-pointer text-sm font-semibold">More details (optional)</summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="When did nausea start?"><Input name="nauseaStartedAt" placeholder="e.g. on waking" /></Field>
                    <Field label="Weight (kg), if measured"><Input name="weightKg" inputMode="decimal" /></Field>
                    <Field label="Triggers (foods, smells)" className="sm:col-span-2"><Input name="triggers" placeholder="e.g. frying onions, perfume" /></Field>
                    <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" rows={2} /></Field>
                  </div>
                </details>
                <Submit variant="rose">Save</Submit>
              </ActionForm>
            </Card>
          )}

          <Card>
            <CardTitle action={
              <div className="flex gap-1 text-sm">
                {[["1", "Today"], ["7", "7 days"], ["30", "30 days"]].map(([v, l]) => (
                  <Link key={v} href={`/symptoms?range=${v}`} className={cx("rounded-full px-3 py-1 font-semibold", String(range) === v ? "bg-charcoal text-white dark:bg-blush dark:text-charcoal" : "bg-ivory dark:bg-night-line")}>{l}</Link>
                ))}
              </div>
            }>Patterns</CardTitle>
            <p className="mb-1 text-sm font-semibold">Highest nausea score per day (0–10)</p>
            <Chart data={series} x="label" kind="line" series={[{ key: "nausea", label: "Nausea", color: "s2" }]} yMax={10} height={180} />
            <p className="mb-1 mt-4 text-sm font-semibold">Vomiting episodes per day</p>
            <Chart data={series} x="label" series={[{ key: "vomits", label: "Vomiting episodes", color: "s1" }]} height={180} />
            <Note className="mt-2">Patterns can help you and your clinician spot triggers. They don&apos;t explain the cause.</Note>
          </Card>

          <Card>
            <CardTitle>Recent entries</CardTitle>
            {history.length === 0 ? <Note>No symptom entries yet.</Note> : (
              <ul className="divide-y divide-line text-[15px] dark:divide-night-line">
                {history.map((h) => (
                  <li key={h.id} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{formatDateTime(h.loggedAt)}</span>
                      {h.nauseaSeverity != null && <Badge tone="info">Nausea {h.nauseaSeverity}/10</Badge>}
                      {h.vomitCount > 0 && <Badge tone="warn">Vomited ×{h.vomitCount}</Badge>}
                      {h.fluidsKeptDown === "NOT_KEPT_DOWN" && <Badge tone="bad">Fluids not kept down</Badge>}
                      {(h.dizziness || h.weakness) && <Badge tone="warn">Dizzy/weak</Badge>}
                      {h.abdominalPain !== "NONE" && <Badge tone={h.abdominalPain === "SEVERE" ? "bad" : "warn"}>Pain: {h.abdominalPain.toLowerCase()}</Badge>}
                      {h.bleeding !== "NONE" && <Badge tone="bad">Bleeding: {h.bleeding.toLowerCase()}</Badge>}
                    </div>
                    {h.triggers && <div className="text-sm text-muted">Triggers: {h.triggers}</div>}
                    {h.notes && showNotes && <div className="text-sm italic text-muted">{h.notes}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card><CardTitle>When to get help</CardTitle><WhenToGetHelp /></Card>
          <Card tone="sage">
            <CardTitle icon={<Leaf size={18} />}>Your food tolerance journal</CardTitle>
            <p className="text-sm font-semibold">Foods I can tolerate</p>
            <div className="mb-3 mt-1 flex flex-wrap gap-1.5">{tolerance.tolerated.length ? tolerance.tolerated.map((t) => <Badge key={t.name} tone="good">{t.name} · {t.good}×</Badge>) : <Note>Log foods as &quot;sat well&quot; to build this list.</Note>}</div>
            <p className="text-sm font-semibold">Foods that make me feel sick</p>
            <div className="mt-1 flex flex-wrap gap-1.5">{tolerance.notTolerated.length ? tolerance.notTolerated.map((t) => <Badge key={t.name} tone="warn">{t.name} · {t.bad}×</Badge>) : <Note>Nothing recorded.</Note>}</div>
            <Note className="mt-2">Built only from what you&apos;ve actually logged.</Note>
          </Card>
          <Card tone="lavender">
            <CardTitle icon={<Lightbulb size={18} />}>Things that help some people</CardTitle>
            <ul className="list-disc space-y-1 pl-5 text-[15px]">
              <li>Small, frequent snacks — an empty stomach can make nausea worse.</li>
              <li>Plain, dry foods (crackers, toast) — try some before getting up.</li>
              <li>Cold foods, which smell less than hot ones.</li>
              <li>Sipping fluids between meals rather than with them.</li>
              <li>Ginger in food or drinks (biscuits, ginger tea).</li>
              <li>Fresh air, and asking someone else to cook while smells are a trigger.</li>
              <li>Rest — tiredness can make nausea worse.</li>
            </ul>
            <p className="mt-3 text-[15px]"><strong>About medicine:</strong> there are anti-sickness medicines that are considered safe in pregnancy. Whether one is right for you is a decision for your doctor or pharmacist — ask about them, especially if you&apos;re vomiting several times a day.</p>
            <Note className="mt-2">Avoid unproven herbal remedies; check anything with your clinician first. Sources: <a className="underline" href={SOURCES.nhsNVP.url}>NHS</a>, <a className="underline" href={SOURCES.acogNVP.url}>ACOG</a>, <a className="underline" href={SOURCES.rcogGTG69.url}>RCOG</a>.</Note>
          </Card>
        </div>
      </div>
    </div>
  );
}
