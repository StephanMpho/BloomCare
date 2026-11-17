import { GlassWater, Trash2 } from "lucide-react";
import { requirePermission } from "@/lib/context";
import { can } from "@/lib/permissions";
import { addDays, formatTime, nowHHMM, todayISO } from "@/lib/dates";
import { drinksForRange, fluidTotals, dailySeries } from "@/lib/queries";
import { Card, CardTitle, PageHeader, Field, Input, Select, Choice, Textarea, Badge, Empty, Note } from "@/components/ui";
import { ActionForm, Submit, InlineAction } from "@/components/forms";
import { Chart } from "@/components/charts";
import { saveDrinkLog, deleteDrinkLog } from "@/app/actions/logs";
import { WhenToGetHelp } from "@/components/safety";

const DRINKS = ["Water", "Oral rehydration solution", "Milk", "Soup / broth", "Rooibos tea", "Ginger drink", "Diluted juice", "Ice chips / lolly", "Other"];

export default async function Hydration() {
  const ctx = await requirePermission("VIEW_HYDRATION", { audit: "partner.view_hydration" });
  const today = todayISO();
  const [drinks, week] = await Promise.all([drinksForRange(ctx.pregnancy.id, today, addDays(today, 1)), dailySeries(ctx.pregnancy.id, 7)]);
  const t = fluidTotals(drinks);
  const canLog = can(ctx.access, "LOG_FOR_ME");

  return (
    <div className="space-y-6">
      <PageHeader title="Hydration" subtitle="Small sips count. Log what was drunk and whether it stayed down." />
      {t.notKeptCount >= 1 && (
        <p className="rounded-2xl border-2 border-amber-600 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
          {t.notKeptCount} drink{t.notKeptCount > 1 ? "s" : ""} came back up today. If you can&apos;t keep fluids down, are passing less urine, or feel dizzy, please seek urgent medical care — a clinic can give anti-sickness medicine and fluids.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {canLog && (
            <Card id="log" className="scroll-mt-20">
              <CardTitle icon={<GlassWater size={18} />}>Log a drink</CardTitle>
              <ActionForm action={saveDrinkLog} resetOnSuccess className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Drink"><Select name="drinkType" defaultValue="Water">{DRINKS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
                  <Field label="Time"><Input type="time" name="time" defaultValue={nowHHMM()} required /></Field>
                  <Field label="Amount drunk (ml)" hint="1 cup ≈ 250 ml · 1 glass ≈ 200 ml · a few sips ≈ 30 ml"><Input type="number" name="consumedMl" min={0} max={5000} inputMode="numeric" required /></Field>
                  <Field label="Amount offered (ml, optional)"><Input type="number" name="offeredMl" min={0} inputMode="numeric" /></Field>
                </div>
                <div><p className="mb-1.5 text-sm font-semibold">Did it stay down?</p>
                  <Choice name="retention" required options={[{ value: "KEPT_DOWN", label: "Yes" }, { value: "PARTLY", label: "Partly" }, { value: "NOT_KEPT_DOWN", label: "No, came back up" }]} /></div>
                <div><p className="mb-1.5 text-sm font-semibold">Temperature</p>
                  <Choice name="temperature" options={[{ value: "Ice cold", label: "Ice cold" }, { value: "Cool", label: "Cool" }, { value: "Room", label: "Room temp" }, { value: "Warm", label: "Warm" }]} /></div>
                <Field label="Notes (optional)"><Textarea name="notes" rows={2} placeholder="e.g. cold water through a straw works best" /></Field>
                <input type="hidden" name="date" value={today} />
                <Submit variant="rose">Save drink</Submit>
              </ActionForm>
            </Card>
          )}
          <Card>
            <CardTitle>Today&apos;s drinks</CardTitle>
            {drinks.length === 0 ? <Empty title="No drinks logged yet today" /> : (
              <ul className="divide-y divide-line dark:divide-night-line">
                {drinks.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div><span className="text-muted">{formatTime(d.drankAt)}</span> · <strong>{d.drinkType}</strong> · {d.consumedMl} ml{d.temperature ? ` · ${d.temperature}` : ""}
                      {d.notes && can(ctx.access, "VIEW_NOTES") && <div className="text-sm italic text-muted">{d.notes}</div>}</div>
                    <div className="flex items-center gap-1">
                      <Badge tone={d.retention === "KEPT_DOWN" ? "good" : d.retention === "PARTLY" ? "neutral" : "warn"}>{d.retention === "KEPT_DOWN" ? "Kept down" : d.retention === "PARTLY" ? "Partly" : "Came back up"}</Badge>
                      {canLog && <InlineAction action={deleteDrinkLog} fields={{ id: d.id }} confirm="Delete this drink?"><Trash2 size={14} /><span className="sr-only">Delete</span></InlineAction>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Card tone="sage">
            <CardTitle>Today (self-reported)</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-3xl font-semibold">{t.consumed} ml</div><div className="text-sm">drunk</div></div>
              <div><div className="text-3xl font-semibold">≈{t.kept} ml</div><div className="text-sm">kept down</div></div>
            </div>
            <Note className="mt-2">&quot;Kept down&quot; counts &quot;partly&quot; as half. These numbers can&apos;t show whether you&apos;re dehydrated — only a clinician can assess that.</Note>
          </Card>
          <Card>
            <CardTitle>Last 7 days</CardTitle>
            <Chart data={week} x="label" series={[{ key: "consumed", label: "Drunk (ml)", color: "s2" }, { key: "keptDown", label: "Kept down (ml)", color: "s3" }]} unit=" ml" />
          </Card>
          <Card tone="lavender">
            <CardTitle>Sipping tips</CardTitle>
            <ul className="list-disc space-y-1 pl-5 text-[15px]">
              <li>Take small sips often rather than a full glass at once.</li>
              <li>Try very cold drinks, ice chips, ice lollies or drinking through a straw.</li>
              <li>Drink between meals rather than with food.</li>
              <li>Oral rehydration solution (from a pharmacy) can help replace salts — ask the pharmacist.</li>
              <li>Note which temperatures and drinks work best for you — they&apos;re saved with each log.</li>
            </ul>
          </Card>
        </div>
      </div>
      <Card><CardTitle>When to get help</CardTitle><WhenToGetHelp /></Card>
    </div>
  );
}
