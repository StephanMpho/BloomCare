import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartHandshake, Utensils, Leaf, ShoppingBasket, CalendarClock, Sprout, Check, Lightbulb, MessageCircleHeart, Camera } from "lucide-react";
import { requireContext, audit } from "@/lib/context";
import { can } from "@/lib/permissions";
import { addDays, formatDate, formatDateTime, formatTime, todayISO } from "@/lib/dates";
import { foodLogsForRange, groceriesForMonth, nextAppointment, openSupportRequests, planForDay, recentPhotoChecks, toleranceLists } from "@/lib/queries";
import { OverallVerdict, VerdictList } from "@/components/photo-verdict-view";
import { MEAL_LABEL } from "@/lib/meal-templates";
import { Card, CardTitle, PageHeader, Badge, Empty, Note } from "@/components/ui";
import { InlineAction } from "@/components/forms";
import { completeSupportRequest } from "@/app/actions/care";

const HELP_IDEAS = [
  "Prepare a simple, mild meal — and open a window while cooking",
  "Buy bananas, crackers or ginger biscuits",
  "Refill her water bottle or make ice lollies",
  "Arrange transport to an appointment",
  "Take over cooking when smells are a trigger",
  "Ask what food feels manageable today — and accept 'nothing right now'",
];
const MESSAGES = [
  "You don't need to finish everything. We can try something else later.",
  "I'm here to help. What feels manageable right now?",
  "Your comfort matters. We can take meals one at a time.",
];

export default async function PartnerDashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const ctx = await requireContext();
  if (ctx.isOwner) redirect("/");
  const sp = await searchParams;
  const a = ctx.access;
  const pid = ctx.pregnancy.id;
  const today = todayISO();
  const [foods, tol, plan, groceries, appt, requests] = await Promise.all([
    can(a, "VIEW_MEALS") ? foodLogsForRange(pid, today, addDays(today, 1)) : Promise.resolve([]),
    can(a, "VIEW_TOLERANCE") ? toleranceLists(pid) : Promise.resolve(null),
    can(a, "MEAL_PLAN") ? planForDay(pid, today) : Promise.resolve([]),
    can(a, "GROCERIES") ? groceriesForMonth(pid) : Promise.resolve([]),
    can(a, "APPOINTMENTS") ? nextAppointment(pid) : Promise.resolve(undefined),
    can(a, "SUPPORT_REQUESTS") ? openSupportRequests(pid) : Promise.resolve([]),
  ]);
  // Always shown to an accepted partner (owner's choice; she's told before each check).
  const [lastPhoto] = await recentPhotoChecks(pid, 1);
  await audit(ctx, "partner.view_dashboard");
  const toBuy = groceries.filter((g) => !g.purchased && !g.inPantry);
  const name = ctx.pregnancy.preferredName;

  return (
    <div className="space-y-6">
      <PageHeader title={`Supporting ${name}`} subtitle="Here to help, not to monitor. You see only what she has chosen to share." />
      {sp.denied && <p className="rounded-2xl bg-lavender/50 p-3 text-sm">That section isn&apos;t shared with you. That&apos;s her choice to make.</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        {can(a, "SUPPORT_REQUESTS") && (
          <Card tone="blush" className="lg:col-span-2">
            <CardTitle icon={<HeartHandshake size={18} />}>What she&apos;s asked for</CardTitle>
            {requests.length === 0 ? <Note>No open requests right now.</Note> : (
              <ul className="space-y-2">{requests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3 dark:bg-night-card">
                  <span>{r.text} <span className="text-xs text-muted">· {formatDateTime(r.createdAt)}</span></span>
                  <InlineAction action={completeSupportRequest} fields={{ id: r.id }} variant="soft"><Check size={14} /> Done</InlineAction>
                </li>
              ))}</ul>
            )}
          </Card>
        )}
        {can(a, "VIEW_JOURNEY") && (
          <Card tone="sage">
            <CardTitle icon={<Sprout size={18} />}>Pregnancy</CardTitle>
            <p className="font-display text-2xl">{ctx.dating.label}</p>
            <p className="text-sm">Estimated due {formatDate(ctx.dating.edd)} (estimate until confirmed by scan)</p>
          </Card>
        )}
      </div>

      {lastPhoto && (
        <Card>
          <CardTitle icon={<Camera size={18} />} action={<Link href="/food/photo" className="text-sm underline">All photo checks</Link>}>
            Latest photo check · {formatDateTime(lastPhoto.createdAt)}
          </CardTitle>
          <div className="space-y-3">
            <OverallVerdict level={lastPhoto.overall} />
            <VerdictList items={lastPhoto.items} canLog={can(a, "LOG_FOR_ME")} />
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {can(a, "VIEW_MEALS") && (
          <Card>
            <CardTitle icon={<Utensils size={18} />}>Today&apos;s meals</CardTitle>
            {foods.length === 0 ? <Empty title="Nothing logged yet today">That&apos;s okay — no pressure.</Empty> : (
              <ul className="space-y-1.5">{foods.map(({ log }) => <li key={log.id}>{formatTime(log.eatenAt)} · {log.foodName} <span className="text-sm text-muted">({MEAL_LABEL[log.mealType]})</span></li>)}</ul>
            )}
          </Card>
        )}
        {tol && (
          <Card>
            <CardTitle icon={<Leaf size={18} />}>Foods that work for her right now</CardTitle>
            <div className="flex flex-wrap gap-1.5">{tol.tolerated.length ? tol.tolerated.map((t) => <Badge key={t.name} tone="good">{t.name}</Badge>) : <Note>Not enough logged yet.</Note>}</div>
            {tol.notTolerated.length > 0 && <><p className="mt-3 text-sm font-semibold">Best avoided for now</p><div className="mt-1 flex flex-wrap gap-1.5">{tol.notTolerated.map((t) => <Badge key={t.name} tone="warn">{t.name}</Badge>)}</div></>}
          </Card>
        )}
        {can(a, "MEAL_PLAN") && (
          <Card>
            <CardTitle icon={<Utensils size={18} />} action={<Link href="/planner" className="text-sm font-semibold text-rose underline">Meal plan</Link>}>Planned for today</CardTitle>
            {plan.length === 0 ? <Note>No plan for today.</Note> : <ul className="space-y-1">{plan.map((p) => <li key={p.id}><span className="text-sm text-muted">{MEAL_LABEL[p.mealType]}:</span> {p.title}</li>)}</ul>}
          </Card>
        )}
        {can(a, "GROCERIES") && (
          <Card>
            <CardTitle icon={<ShoppingBasket size={18} />} action={<Link href="/groceries" className="text-sm font-semibold text-rose underline">Groceries</Link>}>Still to buy</CardTitle>
            {toBuy.length === 0 ? <Note>Nothing outstanding.</Note> : <ul className="list-disc pl-5">{toBuy.slice(0, 10).map((g) => <li key={g.id}>{g.name}</li>)}</ul>}
          </Card>
        )}
        {can(a, "APPOINTMENTS") && (
          <Card>
            <CardTitle icon={<CalendarClock size={18} />} action={<Link href="/appointments" className="text-sm font-semibold text-rose underline">All</Link>}>Next appointment</CardTitle>
            {appt ? <p><strong>{appt.provider}</strong><br />{formatDateTime(appt.startsAt)}{appt.location ? ` · ${appt.location}` : ""}</p> : <Note>None added yet.</Note>}
          </Card>
        )}
        <Card tone="lavender">
          <CardTitle icon={<Lightbulb size={18} />}>Ways to help today</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-[15px]">{HELP_IDEAS.map((h) => <li key={h}>{h}</li>)}</ul>
          <Note className="mt-2">If she can&apos;t keep fluids down, is dizzy, has pain or bleeding — help her get to a doctor or casualty. In an emergency call 10177.</Note>
        </Card>
        <Card>
          <CardTitle icon={<MessageCircleHeart size={18} />}>Supportive things to say</CardTitle>
          <ul className="space-y-2">{MESSAGES.map((m) => <li key={m} className="rounded-2xl bg-ivory p-3 italic dark:bg-night">&ldquo;{m}&rdquo;</li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
