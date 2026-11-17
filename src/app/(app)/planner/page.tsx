import Link from "next/link";
import { and, eq, gte, lt } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Shuffle, Trash2, Repeat, Sparkles, ShoppingBasket, GlassWater, Coffee, Apple, Soup, Cookie, Moon, Sun } from "lucide-react";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/context";
import { activeAlerts } from "@/lib/safety-status";
import { can } from "@/lib/permissions";
import { addDays, formatDate, todayISO, weekStart } from "@/lib/dates";
import { MEAL_LABEL, SLOTS } from "@/lib/meal-templates";
import { rand, randShort } from "@/lib/money";
import { Card, PageHeader, Badge, Field, Input, Select, Check, Note, Empty, cx } from "@/components/ui";
import { ActionForm, Submit, InlineAction } from "@/components/forms";
import { generateWeek, swapMeal, removeMeal, repeatMeal, setMealStatus, addCustomMeal, addSavedMeal, planToGroceries } from "@/app/actions/plan";

const ICON = { BREAKFAST: Coffee, MORNING_SNACK: Apple, LUNCH: Soup, AFTERNOON_SNACK: Cookie, SUPPER: Sun, EVENING_SNACK: Moon } as const;
const STATUS = [
  { value: "EATEN", label: "Eaten", tone: "good" }, { value: "PARTIAL", label: "Partly eaten", tone: "neutral" }, { value: "NOT_EATEN", label: "Not eaten", tone: "neutral" },
  { value: "REPLACED", label: "Replaced", tone: "info" }, { value: "NOT_TOLERATED", label: "Not tolerated", tone: "warn" },
] as const;

export default async function Planner({ searchParams }: { searchParams: Promise<{ week?: string; day?: string }> }) {
  const ctx = await requirePermission("MEAL_PLAN");
  const sp = await searchParams;
  const start = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "") ? sp.week! : todayISO());
  const [entries, saved, alerts] = await Promise.all([
    db.select().from(schema.mealPlanEntries).where(and(eq(schema.mealPlanEntries.pregnancyId, ctx.pregnancy.id), gte(schema.mealPlanEntries.date, start), lt(schema.mealPlanEntries.date, addDays(start, 7)))),
    db.select().from(schema.savedMeals).where(eq(schema.savedMeals.pregnancyId, ctx.pregnancy.id)),
    can(ctx.access, "VIEW_SYMPTOMS") ? activeAlerts(ctx) : Promise.resolve([]),
  ]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const selected = days.includes(sp.day ?? "") ? sp.day! : days.includes(todayISO()) ? todayISO() : days[0];
  const dayEntries = entries.filter((e) => e.date === selected);
  const weekCost = entries.reduce((a, e) => a + e.estCostCents, 0);
  const urgent = alerts.some((a) => a.level !== "CONTACT_CLINICIAN");

  return (
    <div className="space-y-6">
      <PageHeader title="Meal Planner" subtitle="A gentle, nausea-friendly week. Swap anything — her tolerance always wins."
        action={<form action={planToGroceries}><input type="hidden" name="weekStart" value={start} /><Submit variant="soft"><ShoppingBasket size={18} /> Make grocery list</Submit></form>} />

      {urgent && (
        <p className="rounded-2xl border-2 border-amber-600 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
          Right now, getting medical care matters more than any meal plan. A plan can&apos;t fix being unable to keep fluids down — please contact a doctor or clinic.
          Until then, focus on small sips and whatever she can tolerate; use the <strong>gentle plan</strong> below.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={`/planner?week=${addDays(start, -7)}`} aria-label="Previous week" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/50"><ChevronLeft /></Link>
          <span className="font-semibold">{formatDate(start, { day: "numeric", month: "short" })} – {formatDate(addDays(start, 6), { day: "numeric", month: "short" })}</span>
          <Link href={`/planner?week=${addDays(start, 7)}`} aria-label="Next week" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/50"><ChevronRight /></Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={generateWeek}><input type="hidden" name="weekStart" value={start} /><input type="hidden" name="gentle" value="1" /><Submit variant={urgent ? "rose" : "outline"}><Sparkles size={16} /> Gentle plan (hard days)</Submit></form>
          <form action={generateWeek}><input type="hidden" name="weekStart" value={start} /><Submit variant={urgent ? "outline" : "rose"}><Sparkles size={16} /> {entries.length ? "Refresh week" : "Suggest a week"}</Submit></form>
        </div>
      </div>
      <Note>Suggestions skip foods logged as not tolerated or listed as triggers, prefer foods that sat well, and keep anything already marked. Estimated week cost: {randShort(weekCost)} (estimates — verify in store).</Note>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {days.map((d) => {
          const n = entries.filter((e) => e.date === d).length;
          return (
            <Link key={d} href={`/planner?week=${start}&day=${d}`} role="tab" aria-selected={d === selected}
              className={cx("flex min-w-20 flex-col items-center rounded-2xl px-3 py-2 text-sm font-semibold", d === selected ? "bg-charcoal text-white dark:bg-blush dark:text-charcoal" : "bg-white shadow-soft dark:bg-night-card")}>
              <span>{formatDate(d, { weekday: "short" })}</span><span className="text-lg">{d.slice(8)}</span><span className="text-[11px] opacity-70">{n} meals</span>
            </Link>
          );
        })}
      </div>

      {dayEntries.length === 0 ? <Empty title="Nothing planned for this day">Use &quot;Suggest a week&quot; or add a meal below.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {SLOTS.map((slot) => dayEntries.filter((e) => e.mealType === slot).map((e) => {
            const Icon = ICON[slot];
            const st = STATUS.find((s) => s.value === e.status);
            return (
              <Card key={e.id} className="flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blush text-rose dark:bg-rose/30"><Icon size={22} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">{MEAL_LABEL[slot]}</div>
                    <h3 className="text-lg font-semibold">{e.title}</h3>
                    {st && <Badge tone={st.tone}>{st.label}</Badge>}
                  </div>
                  {e.estCostCents > 0 && <span className="text-sm text-muted">≈{rand(e.estCostCents)}</span>}
                </div>
                <dl className="mt-3 space-y-1.5 text-[15px]">
                  {e.portion && <div><dt className="inline font-semibold">Portion: </dt><dd className="inline">{e.portion}</dd></div>}
                  {e.preparation && <div><dt className="inline font-semibold">How: </dt><dd className="inline">{e.preparation}</dd></div>}
                  {e.nutrients && <div><dt className="inline font-semibold">Offers: </dt><dd className="inline">{e.nutrients}</dd></div>}
                  {e.alternative && <div><dt className="inline font-semibold">If not today: </dt><dd className="inline">{e.alternative}</dd></div>}
                  {e.safetyNote && <div className="text-amber-800 dark:text-amber-200"><dt className="inline font-semibold">Food safety: </dt><dd className="inline">{e.safetyNote}</dd></div>}
                </dl>
                <div className="mt-auto pt-3">
                  <div className="flex flex-wrap gap-1">
                    {STATUS.map((s) => <InlineAction key={s.value} action={setMealStatus} fields={{ id: e.id, status: s.value }} variant={e.status === s.value ? "primary" : "soft"}>{s.label}</InlineAction>)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2 dark:border-night-line">
                    <InlineAction action={swapMeal} fields={{ id: e.id }}><Shuffle size={14} /> Swap</InlineAction>
                    <InlineAction action={repeatMeal} fields={{ id: e.id }}><Repeat size={14} /> Repeat tomorrow</InlineAction>
                    <InlineAction action={removeMeal} fields={{ id: e.id }}><Trash2 size={14} /> Remove</InlineAction>
                  </div>
                  <Note className="mt-1">Marking eaten, partly eaten or not tolerated also adds it to the food diary.</Note>
                </div>
              </Card>
            );
          }))}
        </div>
      )}

      <Card tone="sage">
        <div className="flex items-start gap-3"><GlassWater className="mt-1 shrink-0 text-sage-deep" />
          <div><p className="font-semibold">Hydration for {formatDate(selected, { weekday: "long" })}</p>
            <p className="text-[15px]">Small sips through the day — water, rooibos, ginger drinks, ice lollies or oral rehydration solution. If fluids won&apos;t stay down, that needs medical care, not a different menu.</p></div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Add your own meal</h2>
          <ActionForm action={addCustomMeal} resetOnSuccess className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Meal"><Input name="title" required placeholder="e.g. Toasted cheese sandwich" /></Field>
              <Field label="Slot"><Select name="mealType">{SLOTS.map((s) => <option key={s} value={s}>{MEAL_LABEL[s]}</option>)}</Select></Field>
              <Field label="Day"><Select name="date" defaultValue={selected}>{days.map((d) => <option key={d} value={d}>{formatDate(d, { weekday: "long", day: "numeric", month: "short" })}</option>)}</Select></Field>
              <Field label="Estimated cost (R)"><Input name="cost" inputMode="decimal" /></Field>
              <Field label="Portion"><Input name="portion" /></Field>
              <Field label="Alternative"><Input name="alternative" /></Field>
            </div>
            <Field label="Preparation"><Input name="preparation" /></Field>
            <Check name="saveFavourite" label="Save as a favourite meal" />
            <Submit variant="soft">Add meal</Submit>
          </ActionForm>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Favourite meals</h2>
          {saved.length === 0 ? <Note>Meals you save appear here for quick reuse.</Note> : (
            <ul className="space-y-2">
              {saved.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl bg-ivory px-3 py-2 dark:bg-night">
                  <span><strong>{s.title}</strong> <span className="text-sm text-muted">· {MEAL_LABEL[s.mealType]}</span></span>
                  <InlineAction action={addSavedMeal} fields={{ id: s.id, date: selected }} variant="soft">Add to {formatDate(selected, { weekday: "short" })}</InlineAction>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
