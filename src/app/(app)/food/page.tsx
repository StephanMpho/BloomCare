import Link from "next/link";
import { ChevronLeft, ChevronRight, Utensils, Pencil, Copy, Trash2, Plus } from "lucide-react";
import { requirePermission } from "@/lib/context";
import { can } from "@/lib/permissions";
import { addDays, formatDate, formatTime, todayISO } from "@/lib/dates";
import { foodLogsForRange, nutrientsFor } from "@/lib/queries";
import { MEAL_LABEL } from "@/lib/meal-templates";
import { PREGNANCY_REFERENCE, NUTRIENT_KEYS } from "@/lib/foods-data";
import { AMOUNT_FACTOR, round } from "@/lib/nutrition";
import { Card, CardTitle, PageHeader, Badge, LinkButton, Empty, Note } from "@/components/ui";
import { InlineAction } from "@/components/forms";
import { deleteFoodLog, duplicateFoodLog } from "@/app/actions/logs";

export default async function FoodDiary({ searchParams }: { searchParams: Promise<{ date?: string; saved?: string }> }) {
  const ctx = await requirePermission("VIEW_MEALS", { audit: "partner.view_food" });
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayISO();
  const rows = await foodLogsForRange(ctx.pregnancy.id, date, addDays(date, 1));
  const nut = nutrientsFor(rows);
  const canEdit = can(ctx.access, "LOG_FOR_ME");
  const showNotes = can(ctx.access, "VIEW_NOTES");

  return (
    <div className="space-y-6">
      <PageHeader title="Food Diary" subtitle="Everything logged, in order. No targets to hit — just a gentle record."
        action={canEdit && <LinkButton href="/food/new" variant="rose"><Plus size={18} /> Log food</LinkButton>} />
      {sp.saved && <p className="rounded-2xl bg-sage/40 p-3 text-sm">Saved. Well done for eating something. 💚</p>}

      <div className="flex items-center justify-between rounded-3xl bg-white p-2 shadow-soft dark:bg-night-card">
        <Link href={`/food?date=${addDays(date, -1)}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/50" aria-label="Previous day"><ChevronLeft /></Link>
        <div className="text-center"><div className="font-semibold">{formatDate(date, { weekday: "long", day: "numeric", month: "long" })}</div>{date === todayISO() && <div className="text-xs text-muted">Today</div>}</div>
        {date < todayISO() ? <Link href={`/food?date=${addDays(date, 1)}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/50" aria-label="Next day"><ChevronRight /></Link> : <span className="min-w-11" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<Utensils size={18} />}>Timeline</CardTitle>
          {rows.length === 0 ? <Empty title="Nothing logged for this day">{canEdit && <Link href="/food/new" className="underline">Log something</Link>}</Empty> : (
            <ol className="relative ml-3 border-l-2 border-blush-deep/60 dark:border-night-line">
              {rows.map(({ log, food }) => (
                <li key={log.id} className="mb-5 ml-5">
                  <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border-2 border-white bg-rose dark:border-night-card" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{formatTime(log.eatenAt)} · {MEAL_LABEL[log.mealType]}</div>
                      <div className="text-lg font-semibold">{log.foodName}</div>
                      <div className="text-sm text-muted">{log.portionLabel}{log.amountEaten !== "FULL" ? ` · ate ${log.amountEaten === "PARTIAL" ? "about half" : "a few bites"}` : ""}{log.preparation ? ` · ${log.preparation}` : ""}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={log.tolerance === "GOOD" ? "good" : log.tolerance === "OKAY" ? "neutral" : "warn"}>{log.tolerance === "GOOD" ? "Sat well" : log.tolerance === "OKAY" ? "Okay" : "Didn't sit well"}</Badge>
                      {log.nauseaAfter && <Badge tone="warn">Nausea after</Badge>}
                      {log.vomitedAfter && <Badge tone="bad">Vomited after</Badge>}
                      {food?.category && <Badge tone="info">{food.category}</Badge>}
                    </div>
                  </div>
                  {log.notes && showNotes && <p className="mt-1 text-[15px] italic">&ldquo;{log.notes}&rdquo;</p>}
                  {canEdit && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Link href={`/food/${log.id}/edit`} className="inline-flex min-h-9 items-center gap-1 rounded-2xl px-3 text-sm font-semibold hover:bg-blush/50"><Pencil size={14} /> Edit</Link>
                      <InlineAction action={duplicateFoodLog} fields={{ id: log.id }}><Copy size={14} /> Log again now</InlineAction>
                      <InlineAction action={deleteFoodLog} fields={{ id: log.id }} confirm="Delete this entry?"><Trash2 size={14} /> Delete</InlineAction>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card tone="lavender">
          <CardTitle>Nutrients represented</CardTitle>
          {rows.length === 0 ? <Note>Log foods to see approximate nutrients.</Note> : (
            <>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="py-1">Nutrient</th><th>Logged ≈</th><th>General reference</th></tr></thead>
                <tbody>
                  {NUTRIENT_KEYS.map((k) => {
                    const r = PREGNANCY_REFERENCE[k]; const t = nut.totals[k];
                    return (
                      <tr key={k} className="border-t border-white/60 dark:border-night-line">
                        <td className="py-1.5 font-medium">{r.label}</td>
                        <td>{t.itemsWithData ? `${round(t.value, r.unit)} ${r.unit}` : <span className="text-muted">no data</span>}{t.itemsWithData > 0 && t.itemsWithData < rows.length && <span className="text-xs text-muted"> ({t.itemsWithData}/{rows.length})</span>}</td>
                        <td className="text-muted">{r.ref ? `${r.ref} ${r.unit}/day` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Note className="mt-3">
                Approximate values from reference data (USDA FoodData Central, not SA-specific); SA bread & maize meal are fortified and shown as &quot;no data&quot; — check pack labels.
                &quot;About half&quot; counts as {AMOUNT_FACTOR.PARTIAL * 100}% and &quot;a few bites&quot; as {AMOUNT_FACTOR.FEW_BITES * 100}% of the portion.
                Reference intakes are US National Academies values for pregnancy, shown for context only — this is not a diagnosis of deficiency, and supplements are a clinician&apos;s decision.
              </Note>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
