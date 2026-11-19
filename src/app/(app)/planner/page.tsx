import Link from "next/link";
import { and, eq, gte, lt } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Shuffle, Trash2, Repeat, Sparkles, ShoppingBasket, GlassWater, Coffee, Apple, Soup, Cookie, Moon, Sun, CalendarRange, ListChecks } from "lucide-react";
import { db, schema } from "@/db";
import { monthKey } from "@/lib/dates";
import { requirePermission } from "@/lib/context";
import { activeAlerts } from "@/lib/safety-status";
import { can } from "@/lib/permissions";
import { addDays, formatDate, todayISO, weekStart } from "@/lib/dates";
import { MEAL_LABEL, SLOTS } from "@/lib/meal-templates";
import { rand, randShort } from "@/lib/money";
import { Card, CardTitle, PageHeader, Badge, Field, Input, Select, Check, Note, Empty, cx } from "@/components/ui";
import { ActionForm, Submit, InlineAction } from "@/components/forms";
import { generateWeek, swapMeal, removeMeal, repeatMeal, setMealStatus, addCustomMeal, addSavedMeal, planMonth } from "@/app/actions/plan";

function monthBounds(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { start: `${m}-01`, end: `${m}-${String(last).padStart(2, "0")}`, label: new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-ZA", { month: "long" }) };
}
const nextMonth = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7); };

const ICON = { BREAKFAST: Coffee, MORNING_SNACK: Apple, LUNCH: Soup, AFTERNOON_SNACK: Cookie, SUPPER: Sun, EVENING_SNACK: Moon } as const;
const STATUS = [
  { value: "EATEN", label: "Eaten", tone: "good" }, { value: "PARTIAL", label: "Partly eaten", tone: "neutral" }, { value: "NOT_EATEN", label: "Not eaten", tone: "neutral" },
  { value: "REPLACED", label: "Replaced", tone: "info" }, { value: "NOT_TOLERATED", label: "Not tolerated", tone: "warn" },
] as const;

export default async function Planner({ searchParams }: { searchParams: Promise<{ week?: string; day?: string; made?: string }> }) {
  const ctx = await requirePermission("MEAL_PLAN");
  const sp = await searchParams;
  const start = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "") ? sp.week! : todayISO());
  const [entries, saved, alerts] = await Promise.all([
    db.select().from(schema.mealPlanEntries).where(and(eq(schema.mealPlanEntries.pregnancyId, ctx.pregnancy.id), gte(schema.mealPlanEntries.date, start), lt(schema.mealPlanEntries.date, addDays(start, 7)))),
    db.select().from(schema.savedMeals).where(eq(schema.savedMeals.pregnancyId, ctx.pregnancy.id)),
    can(ctx.access, "VIEW_SYMPTOMS") ? activeAlerts(ctx) : Promise.resolve([]),
  ]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  // Open on: the day asked for, else the date linked to (e.g. 1 Dec), else today, else the first planned day.
  const firstPlanned = days.find((d) => entries.some((e) => e.date === d));
  const selected = [sp.day, sp.week, todayISO(), firstPlanned].find((d): d is string => !!d && days.includes(d)) ?? days[0];
  const dayEntries = entries.filter((e) => e.date === selected);
  const weekCost = entries.reduce((a, e) => a + e.estCostCents, 0);
  const urgent = alerts.some((a) => a.level !== "CONTACT_CLINICIAN");

  // Month plans: this month and next (so December can be planned during November).
  const thisMonth = monthKey(todayISO());
  const months = await Promise.all([thisMonth, nextMonth(thisMonth)].map(async (m) => {
    const b = monthBounds(m);
    const [meals, shop] = await Promise.all([
      db.select({ cost: schema.mealPlanEntries.estCostCents }).from(schema.mealPlanEntries)
        .where(and(eq(schema.mealPlanEntries.pregnancyId, ctx.pregnancy.id), gte(schema.mealPlanEntries.date, b.start), lt(schema.mealPlanEntries.date, addDays(b.end, 1)))),
      db.select({ est: schema.groceryItems.estCostCents, pantry: schema.groceryItems.inPantry, shopDate: schema.groceryItems.shopDate }).from(schema.groceryItems)
        .where(and(eq(schema.groceryItems.pregnancyId, ctx.pregnancy.id), eq(schema.groceryItems.month, m))),
    ]);
    const trips = new Set(shop.map((i) => i.shopDate).filter(Boolean)).size;
    return { m, ...b, meals: meals.length, shopCost: shop.filter((i) => !i.pantry).reduce((a, i) => a + i.est, 0), trips };
  }));
  const made = months.find((x) => x.m === sp.made);
  const budget = ctx.pregnancy.monthlyBudgetCents;

  return (
    <div className="space-y-6">
      <PageHeader title="Plan & Shop" subtitle="Gentle, nausea-friendly meals and the shopping that goes with them. Swap anything: her tolerance always wins."
        action={<div className="flex flex-wrap gap-2">
          <Link href="/planner/foods" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-white px-4 font-semibold dark:border-night-line dark:bg-night-card"><ListChecks size={18} /> Her food list</Link>
          {can(ctx.access, "GROCERIES") && <Link href={`/groceries${months.find((x) => x.trips > 0) ? `?month=${months.find((x) => x.trips > 0)!.m}` : ""}`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blush/70 px-4 font-semibold dark:bg-night-line"><ShoppingBasket size={18} /> Shopping list</Link>}
        </div>} />

      {made && <p className="rounded-2xl bg-sage/40 p-3 text-sm">{made.label} plan ready: {made.meals} meals and snacks, with {made.trips} weekly shopping list{made.trips === 1 ? "" : "s"}. 💚</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {months.map((x) => (
          <Card key={x.m} tone={x.meals ? "plain" : "blush"}>
            <CardTitle icon={<CalendarRange size={18} />}>{x.label} plan</CardTitle>
            {x.meals ? (
              <>
                <p className="text-[15px]"><strong>{x.meals}</strong> meals and snacks planned{x.trips ? <>, <strong>{x.trips}</strong> weekly shops</> : null}.</p>
                {x.shopCost > 0 && <p className={cx("text-sm", x.shopCost > budget ? "text-amber-800 dark:text-amber-200" : "text-muted dark:text-white/60")}>
                  Shopping ≈ {randShort(x.shopCost)} of the {randShort(budget)} budget{x.shopCost > budget ? " (over budget: swap in cheaper meals like beans, lentils or pap)" : ""}. Estimates only.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/planner?week=${x.start}`} className="inline-flex min-h-11 items-center rounded-2xl bg-charcoal px-4 font-semibold text-white dark:bg-blush dark:text-charcoal">View meals</Link>
                  {can(ctx.access, "GROCERIES") && <Link href={`/groceries?month=${x.m}`} className="inline-flex min-h-11 items-center rounded-2xl border border-line px-4 font-semibold dark:border-night-line">Shopping lists</Link>}
                  <form action={planMonth}><input type="hidden" name="start" value={x.m === thisMonth ? todayISO() : x.start} /><input type="hidden" name="end" value={x.end} />
                    <Submit variant="ghost"><Sparkles size={16} /> Re-make</Submit></form>
                </div>
              </>
            ) : (
              <>
                <p className="text-[15px]">Breakfast, lunch and supper plus two snacks every day{x.m === thisMonth ? " for the rest of the month" : ""}, with a shopping list for each week.</p>
                <form action={planMonth} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="start" value={x.m === thisMonth ? todayISO() : x.start} /><input type="hidden" name="end" value={x.end} />
                  <Submit variant="rose"><Sparkles size={16} /> Create {x.label} plan</Submit>
                </form>
              </>
            )}
          </Card>
        ))}
      </div>
      <Note>Plans skip foods logged as not tolerated or listed as triggers, prefer foods that sat well, and never change meals already marked as eaten. Re-making a plan keeps anything already bought.</Note>

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

      <details className="rounded-3xl bg-white p-4 shadow-soft dark:bg-night-card">
      <summary className="cursor-pointer font-semibold">Add your own meal or a favourite</summary>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
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
      </details>
    </div>
  );
}
