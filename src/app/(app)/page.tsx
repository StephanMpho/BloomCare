import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Utensils, GlassWater, Frown, Droplets, CalendarDays, ShoppingBasket, Sprout, HeartHandshake, CalendarClock, Smile, Leaf, ClipboardCheck } from "lucide-react";
import { db, schema } from "@/db";
import { requireContext } from "@/lib/context";
import { initialNotice } from "@/lib/safety-status";
import { addDays, formatDate, formatDateTime, formatTime, greetingFor, todayISO } from "@/lib/dates";
import { drinksForRange, foodLogsForRange, fluidTotals, groceriesForMonth, nextAppointment, nutrientsFor, openSupportRequests, planForDay, symptomsForRange, toleranceLists, dailySeries } from "@/lib/queries";
import { budgetSummary } from "@/lib/budget";
import { randShort } from "@/lib/money";
import { stageFor } from "@/lib/content/journey";
import { MEAL_LABEL, SLOTS } from "@/lib/meal-templates";
import { PREGNANCY_REFERENCE } from "@/lib/foods-data";
import { round } from "@/lib/nutrition";
import { Card, CardTitle, Badge, LinkButton, Empty, Note, Stat } from "@/components/ui";
import { InitialUrgentNotice } from "@/components/safety";
import { InlineAction, ActionForm, Submit } from "@/components/forms";
import { Chart } from "@/components/charts";
import { Input } from "@/components/ui";
import { setMealStatus } from "@/app/actions/plan";
import { addSupportRequest } from "@/app/actions/care";

const PLAN_STATUSES = [
  { value: "EATEN", label: "Eaten" }, { value: "PARTIAL", label: "Partly" }, { value: "NOT_EATEN", label: "Not eaten" },
  { value: "REPLACED", label: "Replaced" }, { value: "NOT_TOLERATED", label: "Didn't sit well" },
];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ checkedIn?: string }> }) {
  const ctx = await requireContext();
  if (!ctx.isOwner) redirect("/partner");
  const sp = await searchParams;
  const pid = ctx.pregnancy.id;
  const today = todayISO();
  const tomorrow = addDays(today, 1);

  const notice = await initialNotice(ctx);
  if (notice && !notice.acknowledgedAt) {
    return <div className="mx-auto max-w-2xl"><InitialUrgentNotice next="/" /></div>;
  }

  const [foods, drinks, symptoms, plan, appt, groceries, requests, tolerance, checkIn, week] = await Promise.all([
    foodLogsForRange(pid, today, tomorrow), drinksForRange(pid, today, tomorrow), symptomsForRange(pid, today, tomorrow),
    planForDay(pid, today), nextAppointment(pid), groceriesForMonth(pid), openSupportRequests(pid), toleranceLists(pid),
    db.query.checkIns.findFirst({ where: and(eq(schema.checkIns.pregnancyId, pid), eq(schema.checkIns.date, today)), orderBy: desc(schema.checkIns.createdAt) }),
    dailySeries(pid, 7),
  ]);
  const d = ctx.dating;
  const stage = stageFor(d.weeks);
  const fl = fluidTotals(drinks);
  const vomits = symptoms.reduce((a, s) => a + s.vomitCount, 0);
  const sevs = [...symptoms.map((s) => s.nauseaSeverity), checkIn?.nauseaSeverity].filter((x): x is number => x != null);
  const nausea = sevs.length ? sevs[sevs.length - 1] : null;
  const nut = nutrientsFor(foods);
  const groups = [...new Set(foods.map((f) => f.food?.category).filter(Boolean))] as string[];
  const budget = budgetSummary(groceries, ctx.pregnancy.monthlyBudgetCents, today.slice(0, 7), today);
  const greetingName = ctx.pregnancy.greeting || ctx.pregnancy.preferredName;
  const nauseaWord = nausea == null ? "Not logged" : nausea <= 2 ? "Mild" : nausea <= 6 ? "Moderate" : "Strong";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">{greetingFor()}, {greetingName}</h1>
          <p className="mt-1 text-muted dark:text-white/70">How are you feeling today? Your pregnancy journey, one day at a time.</p>
        </div>
        {!checkIn && <LinkButton href="/check-in" variant="rose"><ClipboardCheck size={18} /> Daily check-in</LinkButton>}
      </header>
      {sp.checkedIn && <p className="rounded-2xl bg-sage/40 p-3 text-sm">Thank you for checking in. 💚</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card tone="blush" className="p-4"><Stat label="Pregnancy" value={`Week ${d.weeks}, day ${d.days}`} sub={`${d.daysToDue} days to due date`} /></Card>
        <Card className="p-4"><Stat label="Meals logged" value={foods.length} sub="today" /></Card>
        <Card className="p-4"><Stat label="Fluids logged" value={`${fl.consumed} ml`} sub={`≈${fl.kept} ml kept down`} /></Card>
        <Card tone="lavender" className="p-4"><Stat label="Nausea now" value={nauseaWord} sub={nausea != null ? `${nausea}/10 · ${vomits} vomit${vomits === 1 ? "" : "s"} today` : `${vomits} vomit${vomits === 1 ? "" : "s"} today`} /></Card>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { href: "/food/new", label: "Log Food", icon: Utensils }, { href: "/hydration#log", label: "Log Drink", icon: GlassWater },
          { href: "/symptoms#log", label: "Log Nausea", icon: Frown }, { href: "/symptoms?vomit=1#log", label: "Record Vomiting", icon: Droplets },
          { href: "/planner", label: "Meal Plan", icon: CalendarDays }, { href: "/groceries", label: "Grocery List", icon: ShoppingBasket },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-3xl border border-line bg-white p-2 text-center text-sm font-semibold shadow-soft hover:bg-blush/40 dark:border-night-line dark:bg-night-card">
            <a.icon size={22} className="text-rose" /> {a.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardTitle icon={<CalendarDays size={18} />} action={<Link href="/planner" className="text-sm font-semibold text-rose underline">Open planner</Link>}>Today&apos;s food plan</CardTitle>
            {plan.length === 0 ? (
              <Empty title="No plan for today yet">Make a gentle, nausea-friendly plan in the <Link className="underline" href="/planner">Meal Planner</Link>. On hard days, fluids and anything tolerated come first.</Empty>
            ) : (
              <ul className="divide-y divide-line dark:divide-night-line">
                {SLOTS.map((slot) => plan.filter((p) => p.mealType === slot).map((p) => (
                  <li key={p.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><div className="text-xs font-semibold uppercase tracking-wide text-muted">{MEAL_LABEL[slot]}</div><div className="font-semibold">{p.title}</div></div>
                      {p.status !== "PLANNED" && <Badge tone={p.status === "EATEN" ? "good" : p.status === "NOT_TOLERATED" ? "warn" : "neutral"}>{PLAN_STATUSES.find((s) => s.value === p.status)?.label}</Badge>}
                    </div>
                    {p.status === "PLANNED" && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {PLAN_STATUSES.map((s) => <InlineAction key={s.value} action={setMealStatus} fields={{ id: p.id, status: s.value }} variant="soft">{s.label}</InlineAction>)}
                      </div>
                    )}
                  </li>
                )))}
              </ul>
            )}
            <Note className="mt-2">You don&apos;t need to finish everything. Small amounts count.</Note>
          </Card>

          <Card>
            <CardTitle icon={<Utensils size={18} />} action={<Link href="/food" className="text-sm font-semibold text-rose underline">Food diary</Link>}>Daily nutrition overview</CardTitle>
            {foods.length === 0 ? <Empty title="Nothing logged yet today">Whatever you manage — even a few crackers — is worth noting.</Empty> : (
              <>
                <ul className="mb-3 space-y-1.5">
                  {foods.map(({ log }) => (
                    <li key={log.id} className="flex items-center justify-between gap-2 text-[15px]">
                      <span><span className="text-muted">{formatTime(log.eatenAt)}</span> · {log.foodName}</span>
                      <Badge tone={log.tolerance === "GOOD" ? "good" : log.tolerance === "OKAY" ? "neutral" : "warn"}>{log.tolerance === "GOOD" ? "Sat well" : log.tolerance === "OKAY" ? "Okay" : "Didn't sit well"}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-semibold">Food groups today</p>
                <div className="mt-1 flex flex-wrap gap-1.5">{groups.length ? groups.map((g) => <Badge key={g} tone="info">{g}</Badge>) : <span className="text-sm text-muted">Custom foods only</span>}</div>
                <p className="mt-3 text-sm font-semibold">Nutrients represented (approximate)</p>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  {(["proteinG", "folateUg", "ironMg", "calciumMg", "cholineMg", "fibreG"] as const).map((k) => {
                    const r = PREGNANCY_REFERENCE[k]; const t = nut.totals[k];
                    return <div key={k}><span className="text-muted">{r.label}:</span> {t.itemsWithData ? `≈${round(t.value, r.unit)} ${r.unit}` : "no data"}</div>;
                  })}
                </div>
                <Note className="mt-2">Estimates from {Math.max(...Object.values(nut.totals).map((t) => t.itemsWithData))} of {foods.length} items with nutrient data. One day&apos;s log doesn&apos;t determine your baby&apos;s health — patterns over weeks, and your clinician&apos;s advice, matter more.</Note>
              </>
            )}
          </Card>

          <Card>
            <CardTitle icon={<Leaf size={18} />}>Food tolerance</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="mb-1 text-sm font-semibold text-sage-deep dark:text-sage">Foods I can tolerate</p>
                {tolerance.tolerated.length ? <div className="flex flex-wrap gap-1.5">{tolerance.tolerated.slice(0, 10).map((t) => <Badge key={t.name} tone="good">{t.name}</Badge>)}</div> : <Note>Builds automatically from foods you log as sitting well.</Note>}
              </div>
              <div><p className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-200">Foods that make me feel sick</p>
                {tolerance.notTolerated.length ? <div className="flex flex-wrap gap-1.5">{tolerance.notTolerated.slice(0, 10).map((t) => <Badge key={t.name} tone="warn">{t.name}</Badge>)}</div> : <Note>Nothing recorded yet.</Note>}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card tone="sage">
            <CardTitle icon={<Sprout size={18} />} action={<Link href="/journey" className="text-sm font-semibold underline">Journey</Link>}>Pregnancy progress</CardTitle>
            <p className="font-display text-2xl">{d.label}</p>
            <p className="text-sm">Trimester {d.trimester} · Due {formatDate(d.edd)}</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/80 dark:bg-night" role="progressbar" aria-valuenow={Math.round(d.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Pregnancy progress">
              <div className="h-full rounded-full bg-sage-deep" style={{ width: `${Math.max(2, d.progress * 100)}%` }} />
            </div>
            <p className="mt-3 text-[15px]">{stage.development[0]}</p>
            <Note className="mt-2">{d.basis === "LMP" ? "Estimated from your last period. Not yet confirmed by ultrasound — your clinic may adjust it." : `Due date from ${d.basis === "ULTRASOUND" ? "ultrasound" : "your clinician"}.`}</Note>
          </Card>

          <Card>
            <CardTitle icon={<GlassWater size={18} />} action={<Link href="/hydration" className="text-sm font-semibold text-rose underline">Hydration</Link>}>Hydration (self-reported)</CardTitle>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-2xl font-semibold">{fl.consumed}</div><div className="text-xs text-muted">ml drunk</div></div>
              <div><div className="text-2xl font-semibold">≈{fl.kept}</div><div className="text-xs text-muted">ml kept down</div></div>
              <div><div className="text-2xl font-semibold">{fl.notKeptCount}</div><div className="text-xs text-muted">came back up</div></div>
            </div>
            <Note className="mt-2">These totals can&apos;t tell whether you&apos;re dehydrated. If drinks keep coming back up, you&apos;re passing less urine, or you feel dizzy — get urgent care.</Note>
          </Card>

          <Card>
            <CardTitle icon={<Frown size={18} />} action={<Link href="/symptoms" className="text-sm font-semibold text-rose underline">Details</Link>}>Daily symptoms</CardTitle>
            {checkIn || symptoms.length ? (
              <ul className="space-y-1 text-[15px]">
                <li>Nausea: <strong>{nausea != null ? `${nausea}/10` : "not rated yet"}</strong></li>
                <li>Vomiting episodes: <strong>{vomits + (checkIn?.vomitCount ?? 0)}</strong></li>
                {checkIn && <li>Appetite: {checkIn.appetite ?? "—"}/5 · Energy: {checkIn.energy ?? "—"}/5</li>}
                {symptoms.some((s) => s.dizziness || s.weakness) && <li>Dizziness or weakness reported</li>}
              </ul>
            ) : <Empty title="No symptoms logged today" />}
            <Link href="/symptoms#when-to-get-help" className="mt-3 inline-block text-sm font-semibold text-red-800 underline dark:text-red-300">When to get medical help →</Link>
          </Card>

          <Card>
            <CardTitle icon={<CalendarClock size={18} />}>Next appointment</CardTitle>
            {appt ? <div><p className="font-semibold">{appt.provider}</p><p className="text-sm">{formatDateTime(appt.startsAt)}{appt.location ? ` · ${appt.location}` : ""}</p></div>
              : <Empty title="No appointment added">If you haven&apos;t booked antenatal care yet, <Link href="/appointments" className="underline">add it here</Link> once you have a date.</Empty>}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<Smile size={18} />} action={<Link href="/reports" className="text-sm font-semibold text-rose underline">All insights</Link>}>Weekly patterns</CardTitle>
          <Chart data={week} x="label" series={[{ key: "meals", label: "Foods logged" }]} height={180} />
          <Note>Based on the foods you logged this week.</Note>
        </Card>
        <Card>
          <CardTitle icon={<ShoppingBasket size={18} />} action={<Link href="/groceries" className="text-sm font-semibold text-rose underline">Budget</Link>}>Grocery budget</CardTitle>
          <p className="text-2xl font-semibold">{randShort(budget.remaining)} <span className="text-base font-normal text-muted">left of {randShort(budget.budget)}</span></p>
          <p className="text-sm text-muted">Spent {randShort(budget.spent)} · planned {randShort(budget.planned)}</p>
        </Card>
      </div>

      <Card tone="lavender">
        <CardTitle icon={<HeartHandshake size={18} />}>How your partner can help</CardTitle>
        {requests.length > 0 && <ul className="mb-3 list-disc space-y-1 pl-5">{requests.map((r) => <li key={r.id}>{r.text}</li>)}</ul>}
        <ActionForm action={addSupportRequest} resetOnSuccess className="flex gap-2">
          <Input name="text" placeholder="e.g. Please buy ginger biscuits and bananas" aria-label="Request for your partner" />
          <Submit variant="primary" className="shrink-0">Share</Submit>
        </ActionForm>
        <Note className="mt-2">Only visible to your partner if you&apos;ve allowed &quot;how you can help&quot; requests in Settings.</Note>
      </Card>
    </div>
  );
}
