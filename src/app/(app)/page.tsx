import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Utensils, GlassWater, Droplets, CalendarDays, Sprout, HeartHandshake, CalendarClock, ClipboardCheck, Camera, CheckCircle2 } from "lucide-react";
import { db, schema } from "@/db";
import { requireContext } from "@/lib/context";
import { initialNotice } from "@/lib/safety-status";
import { formatDate, formatDateTime, greetingFor, todayISO } from "@/lib/dates";
import { nextAppointment, openSupportRequests, planForDay } from "@/lib/queries";
import { stageFor } from "@/lib/content/journey";
import { MEAL_LABEL, SLOTS } from "@/lib/meal-templates";
import { Card, CardTitle, Badge, LinkButton, Empty, Note, Input } from "@/components/ui";
import { InitialUrgentNotice } from "@/components/safety";
import { InlineAction, ActionForm, Submit } from "@/components/forms";
import { setMealStatus } from "@/app/actions/plan";
import { addSupportRequest } from "@/app/actions/care";

// Simplified home: progress, how she feels, quick logging, today's meals, next appointment.
// Detailed charts, nutrition and budget live under More (Reports, Shopping list, Symptoms).
const QUICK_STATUSES = [
  { value: "EATEN", label: "Eaten" }, { value: "PARTIAL", label: "Some" }, { value: "NOT_TOLERATED", label: "Didn't sit well" },
];
const STATUS_LABEL: Record<string, string> = { EATEN: "Eaten", PARTIAL: "Ate some", NOT_EATEN: "Not eaten", REPLACED: "Replaced", NOT_TOLERATED: "Didn't sit well" };

export default async function Today({ searchParams }: { searchParams: Promise<{ checkedIn?: string }> }) {
  const ctx = await requireContext();
  if (!ctx.isOwner) redirect("/partner");
  const sp = await searchParams;
  const pid = ctx.pregnancy.id;
  const today = todayISO();

  const notice = await initialNotice(ctx);
  if (notice && !notice.acknowledgedAt) {
    return <div className="mx-auto max-w-2xl"><InitialUrgentNotice next="/" /></div>;
  }

  const [plan, appt, requests, checkIn] = await Promise.all([
    planForDay(pid, today), nextAppointment(pid), openSupportRequests(pid),
    db.query.checkIns.findFirst({ where: and(eq(schema.checkIns.pregnancyId, pid), eq(schema.checkIns.date, today)), orderBy: desc(schema.checkIns.createdAt) }),
  ]);
  const d = ctx.dating;
  const stage = stageFor(d.weeks);
  const name = ctx.pregnancy.greeting || ctx.pregnancy.preferredName;
  const eaten = plan.filter((p) => p.status === "EATEN" || p.status === "PARTIAL").length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="font-display text-3xl font-semibold md:text-4xl">{greetingFor()}, {name}</h1>
      {sp.checkedIn && <p className="rounded-2xl bg-sage/40 p-3 text-sm">Thank you for checking in. 💚</p>}

      <Card tone="sage">
        <CardTitle icon={<Sprout size={18} />} action={<Link href="/journey" className="text-sm font-semibold underline">This week</Link>}>Your pregnancy</CardTitle>
        <p className="font-display text-3xl">Week {d.weeks}, day {d.days}</p>
        <p className="text-[15px]">Due {formatDate(d.edd)} · {d.daysToDue} days to go · Trimester {d.trimester}</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/80 dark:bg-night" role="progressbar" aria-valuenow={Math.round(d.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Pregnancy progress">
          <div className="h-full rounded-full bg-sage-deep" style={{ width: `${Math.max(2, d.progress * 100)}%` }} />
        </div>
        <p className="mt-3 text-[15px]">{stage.development[0]}</p>
        {d.basis === "LMP" && <Note className="mt-1">Estimated from your last period until a scan confirms it.</Note>}
      </Card>

      <Card tone={checkIn ? "plain" : "blush"}>
        {checkIn ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="text-sage-deep" size={22} /> You&apos;ve checked in today{checkIn.nauseaSeverity != null ? ` · nausea ${checkIn.nauseaSeverity}/10` : ""}</p>
            <Link href="/check-in" className="text-sm font-semibold underline">Update</Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-lg font-semibold">How are you feeling today?</p><p className="text-sm text-muted dark:text-white/70">A one-minute check-in. It helps spot when you need care.</p></div>
            <LinkButton href="/check-in" variant="rose"><ClipboardCheck size={18} /> Check in</LinkButton>
          </div>
        )}
        <Link href="/symptoms#when-to-get-help" className="mt-3 inline-block text-sm font-semibold text-red-800 underline dark:text-red-300">When to get medical help →</Link>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/food/photo", label: "Photo of food", icon: Camera },
          { href: "/food/new", label: "Log food", icon: Utensils },
          { href: "/hydration#log", label: "Log a drink", icon: GlassWater },
          { href: "/symptoms#log", label: "Nausea / vomiting", icon: Droplets },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-3xl border border-line bg-white p-2 text-center font-semibold shadow-soft hover:bg-blush/40 dark:border-night-line dark:bg-night-card">
            <a.icon size={26} className="text-rose" /> {a.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardTitle icon={<CalendarDays size={18} />} action={<Link href="/planner" className="text-sm font-semibold text-rose underline">Full plan</Link>}>
          Today&apos;s meals {plan.length > 0 && <span className="font-normal text-muted">· {eaten} of {plan.length}</span>}
        </CardTitle>
        {plan.length === 0 ? (
          <Empty title="No meals planned for today">Create a monthly plan in <Link className="underline" href="/planner">Plan &amp; Shop</Link>. On hard days, sips of fluid and anything that stays down come first.</Empty>
        ) : (
          <ul className="divide-y divide-line dark:divide-night-line">
            {SLOTS.map((slot) => plan.filter((p) => p.mealType === slot).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><div className="text-xs font-semibold uppercase tracking-wide text-muted">{MEAL_LABEL[slot]}</div><div className="font-semibold">{p.title}</div></div>
                {p.status === "PLANNED" ? (
                  <div className="flex flex-wrap gap-1">
                    {QUICK_STATUSES.map((s) => <InlineAction key={s.value} action={setMealStatus} fields={{ id: p.id, status: s.value }} variant="soft">{s.label}</InlineAction>)}
                  </div>
                ) : <Badge tone={p.status === "EATEN" ? "good" : p.status === "NOT_TOLERATED" ? "warn" : "neutral"}>{STATUS_LABEL[p.status]}</Badge>}
              </li>
            )))}
          </ul>
        )}
        <Note className="mt-2">You don&apos;t need to finish everything. Small amounts count. Ticking a meal also adds it to your food diary.</Note>
      </Card>

      <Card>
        <CardTitle icon={<CalendarClock size={18} />} action={<Link href="/appointments" className="text-sm font-semibold text-rose underline">All</Link>}>Next appointment</CardTitle>
        {appt ? <div><p className="font-semibold">{appt.provider}</p><p className="text-sm">{formatDateTime(appt.startsAt)}{appt.location ? ` · ${appt.location}` : ""}</p></div>
          : <Empty title="No appointment added">Add your next clinic or doctor visit in <Link href="/appointments" className="underline">Appointments</Link>.</Empty>}
      </Card>

      <Card tone="lavender">
        <CardTitle icon={<HeartHandshake size={18} />}>Ask your partner for help</CardTitle>
        {requests.length > 0 && <ul className="mb-3 list-disc space-y-1 pl-5">{requests.map((r) => <li key={r.id}>{r.text}</li>)}</ul>}
        <ActionForm action={addSupportRequest} resetOnSuccess className="flex gap-2">
          <Input name="text" placeholder="e.g. Please buy ginger biscuits and bananas" aria-label="Request for your partner" />
          <Submit variant="primary" className="shrink-0">Send</Submit>
        </ActionForm>
        <Note className="mt-2">Your partner sees these once you&apos;ve allowed &quot;how you can help&quot; requests in Settings.</Note>
      </Card>
    </div>
  );
}
