import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Trash2, Check as CheckIcon, Home, Repeat, CalendarDays, Archive, Plus } from "lucide-react";
import { requirePermission } from "@/lib/context";
import { groceriesForMonth } from "@/lib/queries";
import { budgetSummary } from "@/lib/budget";
import { formatDate, todayISO } from "@/lib/dates";
import { rand, randShort } from "@/lib/money";
import { monthOverview, quantityText, type OverviewRow } from "@/lib/shopping-overview";
import { Card, CardTitle, PageHeader, Field, Input, Select, Badge, Note, Empty, Check, cx } from "@/components/ui";
import { ActionForm, Submit, InlineAction } from "@/components/forms";
import { addGrocery, updateGrocery, toggleGrocery, deleteGrocery, setBudget } from "@/app/actions/groceries";

const CATEGORIES = ["Fruits", "Vegetables", "Protein", "Dairy", "Grains", "Snacks", "Hydration essentials", "Cooking essentials", "Other"];
const STORES = ["Shoprite", "Checkers", "Pick n Pay", "Spar", "Boxer", "Other"];

function shiftMonth(m: string, n: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

type Item = Awaited<ReturnType<typeof groceriesForMonth>>[number];

/** Tick-off rows used in the weekly-shop and plain list views. */
function GroceryRows({ rows }: { rows: Item[] }) {
  return (
    <ul className="divide-y divide-line dark:divide-night-line">
      {rows.map((i) => (
        <li key={i.id} className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className={cx(i.purchased && "line-through opacity-60")}>
              <span className="font-semibold">{i.name}</span> <span className="text-sm text-muted">× {i.quantity}</span>
              <div className="text-sm text-muted">
                {i.actualCostCents != null ? <>Paid {rand(i.actualCostCents)}</> : <>≈{rand(i.estCostCents)}</>}
                {i.store && ` · ${i.store}`}{i.expiryDate && ` · use by ${i.expiryDate}`}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {i.inPantry && <Badge tone="info"><Home size={12} /> At home</Badge>}
              <InlineAction action={toggleGrocery} fields={{ id: i.id, field: "purchased" }} variant={i.purchased ? "primary" : "soft"}><CheckIcon size={14} /> {i.purchased ? "Bought" : "Mark bought"}</InlineAction>
              <InlineAction action={toggleGrocery} fields={{ id: i.id, field: "inPantry" }}>{i.inPantry ? "Not at home" : "Have at home"}</InlineAction>
              <InlineAction action={deleteGrocery} fields={{ id: i.id }} confirm="Remove this item?"><Trash2 size={14} /><span className="sr-only">Remove</span></InlineAction>
            </div>
          </div>
          <details className="mt-1">
            <summary className="cursor-pointer text-sm text-lavender-deep dark:text-lavender">Enter actual price / store</summary>
            <ActionForm action={updateGrocery} className="mt-2 grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="id" value={i.id} />
              <Field label="Actual price (R)"><Input name="actual" inputMode="decimal" defaultValue={i.actualCostCents != null ? (i.actualCostCents / 100).toFixed(2) : ""} /></Field>
              <Field label="Estimated (R)"><Input name="est" inputMode="decimal" defaultValue={(i.estCostCents / 100).toFixed(2)} /></Field>
              <Field label="Store"><Select name="store" defaultValue={i.store}><option value="">—</option>{STORES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label="Purchase date"><Input type="date" name="purchaseDate" defaultValue={i.purchaseDate ?? ""} /></Field>
              <Field label="Expiry date"><Input type="date" name="expiryDate" defaultValue={i.expiryDate ?? ""} /></Field>
              <div className="flex flex-col justify-end gap-2"><Check name="purchased" label="Purchased" defaultChecked={i.purchased} /><Check name="inPantry" label="In pantry" defaultChecked={i.inPantry} /></div>
              <Submit variant="soft" className="sm:col-span-3">Save</Submit>
            </ActionForm>
          </details>
        </li>
      ))}
    </ul>
  );
}

/** Month overview: each product once, in its buying rhythm. */
function OverviewSection({ title, icon, rows, total, hint }: { title: string; icon: ReactNode; rows: OverviewRow[]; total: number; hint: string }) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardTitle icon={icon} action={<span className="text-sm font-semibold">≈{randShort(total)}</span>}>{title}</CardTitle>
      <p className="-mt-2 mb-2 text-sm text-muted dark:text-white/60">{hint}</p>
      <ul className="divide-y divide-line dark:divide-night-line">
        {rows.map((r) => (
          <li key={r.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div>
              <span className="font-semibold">{r.name}</span> <span className="text-sm text-muted dark:text-white/60">{quantityText(r)}</span>
              {(r.atHome || r.bought > 0) && (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {r.atHome && <Badge tone="info"><Home size={12} /> At home</Badge>}
                  {r.bought > 0 && <Badge tone="good">{r.cadence === "WEEKLY" ? `Bought ${r.bought} of ${r.shops}` : "Bought"}</Badge>}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold">≈{rand(r.totalCents)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function Groceries({ searchParams }: { searchParams: Promise<{ month?: string; view?: string; generated?: string }> }) {
  const ctx = await requirePermission("GROCERIES");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : todayISO().slice(0, 7);
  const items = await groceriesForMonth(ctx.pregnancy.id, month);
  const hasTrips = items.some((i) => i.shopDate);
  // Planned months: "month" = each product once (weekly / monthly / 3-monthly); "week" = tick-off list per shop.
  const view = hasTrips ? (sp.view === "week" ? "week" : "month") : "list";
  const tripDates = [...new Set(items.map((i) => i.shopDate).filter((d): d is string => !!d))].sort();
  const shortDate = (d: string) => formatDate(d, { weekday: "short", day: "numeric", month: "short" });
  const tripLabel = (d: string) => `Shop ${tripDates.indexOf(d) + 1} · ${shortDate(d)}`;
  const nextTrip = tripDates.find((d) => d >= todayISO()) ?? tripDates[0];
  const s = budgetSummary(items, ctx.pregnancy.monthlyBudgetCents, month, todayISO());
  const ov = monthOverview(items);
  const monthLabel = new Date(month + "-15T12:00:00Z").toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const pct = Math.min(100, (s.projected / Math.max(1, s.budget)) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Shopping list" subtitle="South African prices from the PMBEJD food price survey (August 2026). Enter what you actually paid to keep the budget accurate."
        action={<Link href="/planner" className="text-sm underline">Back to Plan &amp; Shop</Link>} />
      {sp.generated && <p className="rounded-2xl bg-sage/40 p-3 text-sm">Shopping list created from the meal plan. Mark anything already at home so it isn&apos;t counted.</p>}

      <div className="flex items-center gap-1">
        <Link href={`/groceries?month=${shiftMonth(month, -1)}`} aria-label="Previous month" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/50"><ChevronLeft /></Link>
        <span className="font-semibold">{monthLabel}</span>
        <Link href={`/groceries?month=${shiftMonth(month, 1)}`} aria-label="Next month" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/50"><ChevronRight /></Link>
      </div>

      <Card tone={s.projectedOver ? "blush" : "sage"}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="text-xs font-semibold uppercase text-muted">Budget</div><div className="text-2xl font-semibold">{randShort(s.budget)}</div></div>
          <div><div className="text-xs font-semibold uppercase text-muted">This month</div><div className="text-2xl font-semibold">≈{randShort(s.projected)}</div></div>
          <div><div className="text-xs font-semibold uppercase text-muted">Remaining</div><div className="text-2xl font-semibold">{randShort(s.remaining)}</div></div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-night"><div className={cx("h-full rounded-full", s.projectedOver ? "bg-rose" : "bg-sage-deep")} style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-sm">
          {s.projectedOver ? <>This list is about {randShort(s.projected - s.budget)} over budget. Beans, lentils, eggs, pap and pilchards are the cheapest nutritious swaps.</>
            : items.length ? <>Spent so far {randShort(s.spent)}. The whole list fits the budget with about {randShort(s.budget - s.projected)} to spare.</> : <>No items yet.</>}
        </p>
      </Card>

      {hasTrips && (
        <div className="flex gap-2" role="tablist">
          {[["month", "Month overview"], ["week", "Weekly shops"]].map(([v, l]) => (
            <Link key={v} role="tab" aria-selected={view === v} href={`/groceries?month=${month}&view=${v}`}
              className={cx("rounded-full px-4 py-2 font-semibold", view === v ? "bg-charcoal text-white dark:bg-blush dark:text-charcoal" : "bg-white shadow-soft dark:bg-night-card")}>{l}</Link>
          ))}
        </div>
      )}

      {items.length === 0 && <Empty title="No items for this month">Create a monthly plan in <Link className="underline" href="/planner">Plan &amp; Shop</Link>, or add items below.</Empty>}

      {view === "month" && (
        <>
          <OverviewSection title="Buy every week" icon={<Repeat size={18} />} rows={ov.weekly} total={ov.totals.weekly}
            hint="Fresh food: buy on each weekly shop so it stays fresh." />
          <OverviewSection title="Buy once a month" icon={<CalendarDays size={18} />} rows={ov.monthly} total={ov.totals.monthly}
            hint={`Keeps well: buy on the first shop${tripDates[0] ? ` (${shortDate(tripDates[0])})` : ""}.`} />
          <OverviewSection title="Buy every 3 months" icon={<Archive size={18} />} rows={ov.quarterly} total={ov.totals.quarterly}
            hint={`Lasts about 3 months: buy once, then skip it for the next two months (about ${randShort(Math.round(ov.totals.quarterly / 3))} a month).`} />
          <Note>To tick items off in the shop, open <Link className="underline" href={`/groceries?month=${month}&view=week`}>Weekly shops</Link>.</Note>
        </>
      )}

      {view === "week" && tripDates.map((d) => {
        const inTrip = items.filter((i) => i.shopDate === d);
        const left = inTrip.filter((i) => !i.purchased && !i.inPantry);
        return (
          <details key={d} open={d === nextTrip} className="rounded-3xl bg-white p-4 shadow-soft dark:bg-night-card">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{tripLabel(d)}</h2>
              <span className="text-sm text-muted dark:text-white/60">{left.length ? `${left.length} to buy · ≈${randShort(left.reduce((a, i) => a + i.estCostCents, 0))}` : "All done ✓"}</span>
            </summary>
            <GroceryRows rows={inTrip} />
          </details>
        );
      })}
      {view === "week" && items.some((i) => !i.shopDate) && <Card><CardTitle>Other items</CardTitle><GroceryRows rows={items.filter((i) => !i.shopDate)} /></Card>}

      {view === "list" && [...new Set(items.map((i) => i.category))].sort().map((c) => (
        <Card key={c}><CardTitle>{c}</CardTitle><GroceryRows rows={items.filter((i) => i.category === c)} /></Card>
      ))}

      <details className="rounded-3xl bg-white p-4 shadow-soft dark:bg-night-card">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Plus size={18} /> Add your own item{ctx.isOwner ? " or change the budget" : ""}</summary>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <ActionForm action={addGrocery} resetOnSuccess className="space-y-3">
            <input type="hidden" name="month" value={month} />
            <Field label="Product"><Input name="name" required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity"><Input name="quantity" inputMode="decimal" defaultValue="1" /></Field>
              <Field label="Est. price (R)"><Input name="est" inputMode="decimal" /></Field>
            </div>
            <Field label="Category"><Select name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Buy"><Select name="cadence"><option value="WEEKLY">Every week</option><option value="MONTHLY">Once a month</option><option value="QUARTERLY">Every 3 months</option></Select></Field>
            <Check name="inPantry" label="Already at home" />
            <Submit variant="rose" className="w-full">Add</Submit>
          </ActionForm>
          {ctx.isOwner && (
            <div>
              <p className="mb-2 font-semibold">Monthly food budget</p>
              <ActionForm action={setBudget} className="flex gap-2">
                <Input name="budget" inputMode="decimal" defaultValue={(ctx.pregnancy.monthlyBudgetCents / 100).toFixed(0)} aria-label="Monthly budget in rand" />
                <Submit variant="soft" className="shrink-0">Save</Submit>
              </ActionForm>
            </div>
          )}
        </div>
      </details>
      <Note>Prices: PMBEJD Household Affordability Index, August 2026 (the average of the cheapest shelf prices at 52 supermarkets and 36 butcheries across SA), converted to these pack sizes. Items PMBEJD doesn&apos;t track (oats, yoghurt, cheese, crackers, lentils and a few others) use typical supermarket prices. Specials and smaller packs vary, so enter real till prices to keep the budget accurate.</Note>
    </div>
  );
}
