import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { Pill, AlertTriangle, Info } from "lucide-react";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/context";
import { findOverlaps, hasRetinol } from "@/lib/supplements";
import { SUPPLEMENT_INFO } from "@/lib/content/nutrients";
import { SOURCES } from "@/lib/content/sources";
import { addDays, formatDate, todayISO } from "@/lib/dates";
import { Card, CardTitle, PageHeader, Field, Input, Select, Textarea, Check, Badge, Note, Empty } from "@/components/ui";
import { ActionForm, Submit, InlineAction } from "@/components/forms";
import { saveSupplement, logDose, toggleSupplementActive } from "@/app/actions/care";

export default async function Supplements() {
  const ctx = await requirePermission("VIEW_SUPPLEMENTS", { audit: "partner.view_supplements" });
  const list = await db.select().from(schema.supplements).where(eq(schema.supplements.pregnancyId, ctx.pregnancy.id)).orderBy(desc(schema.supplements.active), schema.supplements.name);
  const today = todayISO();
  const logs = list.length ? await db.select().from(schema.supplementLogs).where(and(inArray(schema.supplementLogs.supplementId, list.map((s) => s.id)), gte(schema.supplementLogs.date, addDays(today, -13)))) : [];
  const overlaps = findOverlaps(list);
  const retinol = hasRetinol(list);

  return (
    <div className="space-y-6">
      <PageHeader title="Prenatal Vitamins & Supplements" subtitle="Record what her clinician or pharmacist recommends. BloomCare never prescribes or suggests doses." />
      <Card tone="blush">
        <div className="flex gap-3"><Info className="mt-0.5 shrink-0 text-rose" />
          <p className="text-[15px]"><strong>Folic acid is time-sensitive in early pregnancy.</strong> If she isn&apos;t taking any yet, ask a pharmacist, clinic or doctor about it as soon as possible — they&apos;ll advise the right product and dose for her.</p></div>
      </Card>
      {(overlaps.length > 0 || retinol.length > 0) && (
        <Card className="border-amber-500">
          <CardTitle icon={<AlertTriangle size={18} />}>Ingredient check</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-[15px]">
            {overlaps.map((o) => <li key={o.ingredient}><strong>{o.ingredient}</strong> is in more than one product ({o.products.join(", ")}). Ask a pharmacist whether the combined amount is right.</li>)}
            {retinol.map((n) => <li key={n}><strong>{n}</strong> lists vitamin A as retinol (or a fish-liver oil). High-dose retinol can harm the baby — check with a pharmacist or doctor before taking it.</li>)}
          </ul>
          <Note className="mt-2">Based only on the ingredients you entered.</Note>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {list.length === 0 ? <Empty icon={<Pill />} title="No supplements recorded">None reported so far. Add one once a clinician or pharmacist recommends it.</Empty> : list.map((s) => {
            const todayLog = logs.find((l) => l.supplementId === s.id && l.date === today);
            const recent = logs.filter((l) => l.supplementId === s.id);
            return (
              <Card key={s.id} className={s.active ? "" : "opacity-60"}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{s.name}</h3>
                    <p className="text-[15px]">{s.dose} {s.unit} · {s.frequency}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge tone={s.source === "NOT_YET_APPROVED" ? "warn" : "good"}>{s.source === "CLINICIAN" ? "Recommended by clinician" : s.source === "PHARMACIST" ? "Recommended by pharmacist" : "Not yet approved"}</Badge>
                      {s.recommendedBy && <Badge>{s.recommendedBy}</Badge>}
                      {s.reminderEnabled && <Badge tone="info">Reminder on</Badge>}
                    </div>
                  </div>
                  {todayLog && <Badge tone={todayLog.status === "TAKEN" ? "good" : "neutral"}>{todayLog.status === "TAKEN" ? "Taken today" : "Missed today"}</Badge>}
                </div>
                {s.instructions && <p className="mt-2 text-[15px]"><strong>Instructions (as given by clinician):</strong> {s.instructions}</p>}
                {s.ingredients.length > 0 && <p className="mt-1 text-sm text-muted">Ingredients: {s.ingredients.join(", ")}</p>}
                <p className="mt-1 text-sm text-muted">Last 14 days: {recent.filter((l) => l.status === "TAKEN").length} taken · {recent.filter((l) => l.status === "MISSED").length} missed</p>
                {ctx.isOwner && s.active && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    <InlineAction action={logDose} fields={{ id: s.id, status: "TAKEN" }} variant="soft">Taken today</InlineAction>
                    <InlineAction action={logDose} fields={{ id: s.id, status: "MISSED" }}>Missed today</InlineAction>
                  </div>
                )}
                {ctx.isOwner && <div className="mt-1"><InlineAction action={toggleSupplementActive} fields={{ id: s.id }}>{s.active ? "Stop tracking" : "Resume tracking"}</InlineAction></div>}
                {ctx.isOwner && s.active && (
                  <details className="mt-2"><summary className="cursor-pointer text-sm text-lavender-deep dark:text-lavender">Record a side effect</summary>
                    <form action={logDose} className="mt-2 flex gap-2"><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value={todayLog?.status ?? "TAKEN"} />
                      <Input name="sideEffects" placeholder="e.g. made nausea worse" aria-label="Side effect" /><Submit variant="soft" className="shrink-0">Save</Submit></form></details>
                )}
              </Card>
            );
          })}
        </div>
        <div className="space-y-6 lg:col-span-2">
          {ctx.isOwner && (
            <Card>
              <CardTitle icon={<Pill size={18} />}>Add a recommended supplement</CardTitle>
              <ActionForm action={saveSupplement} resetOnSuccess className="space-y-3">
                <Field label="Product name"><Input name="name" required /></Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Dose" className="col-span-2"><Input name="dose" required placeholder="as on label/script" /></Field>
                  <Field label="Unit"><Select name="unit">{["µg", "mg", "tablet", "capsule", "ml"].map((u) => <option key={u}>{u}</option>)}</Select></Field>
                </div>
                <Field label="How often"><Input name="frequency" required placeholder="e.g. once daily" /></Field>
                <Field label="Who recommended it?"><Select name="source" required defaultValue=""><option value="" disabled>Choose…</option><option value="CLINICIAN">Doctor / midwife / clinic</option><option value="PHARMACIST">Pharmacist</option><option value="NOT_YET_APPROVED">Not yet checked by anyone</option></Select></Field>
                <Field label="Their name (optional)"><Input name="recommendedBy" /></Field>
                <Field label="Instructions given"><Textarea name="instructions" rows={2} /></Field>
                <Field label="Ingredients" hint="Comma-separated, from the label — used for the overlap check."><Input name="ingredients" placeholder="folic acid, iron, iodine" /></Field>
                <Field label="Start date"><Input type="date" name="startDate" /></Field>
                <Check name="reminderEnabled" label="Remind me (only for approved supplements)" />
                <Submit variant="rose" className="w-full">Save</Submit>
              </ActionForm>
            </Card>
          )}
          <Card tone="lavender">
            <CardTitle>General information</CardTitle>
            <ul className="space-y-2 text-[15px]">{SUPPLEMENT_INFO.map((s) => <li key={s.name}><strong>{s.name}:</strong> {s.info}</li>)}</ul>
            <Note className="mt-2">General guidance, not her instructions. Sources: <a className="underline" href={SOURCES.nhsVitamins.url}>NHS</a> · <a className="underline" href={SOURCES.whoANC.url}>WHO</a>. Shown {formatDate(today)}.</Note>
          </Card>
        </div>
      </div>
    </div>
  );
}
