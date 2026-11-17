import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2, Check as CheckIcon, Home, Wallet } from "lucide-react";
import { requirePermission } from "@/lib/context";
import { groceriesForMonth } from "@/lib/queries";
import { budgetSummary } from "@/lib/budget";
import { todayISO } from "@/lib/dates";
import { rand, randShort } from "@/lib/money";
import { Card, CardTitle, PageHeader, Field, Input, Select, Badge, Note, Empty, Check, cx } from "@/components/ui";
import { ActionForm, Submit, InlineAction } from "@/components/forms";
import { Chart } from "@/components/charts";
import { addGrocery, updateGrocery, toggleGrocery, deleteGrocery, setBudget } from "@/app/actions/groceries";

const CATEGORIES = ["Fruits", "Vegetables", "Protein", "Dairy", "Grains", "Snacks", "Hydration essentials", "Cooking essentials", "Other"];
const STORES = ["Shoprite", "Checkers", "Pick n Pay", "Spar", "Boxer", "Other"];

function shiftMonth(m: string, n: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export default async function Groceries({ searchParams }: { searchParams: Promise<{ month?: string; group?: string; generated?: string }> }) {
  const ctx = await requirePermission("GROCERIES");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : todayISO().slice(0, 7);
  const group = sp.group === "store" ? "store" : sp.group === "cadence" ? "cadence" : "category";
  const items = await groceriesForMonth(ctx.pregnancy.id, month);
  const s = budgetSummary(items, ctx.pregnancy.monthlyBudgetCents, month, todayISO());
  const keyOf = (i: (typeof items)[number]) => group === "store" ? (i.store || "No store chosen") : group === "cadence" ? (i.cadence === "WEEKLY" ? "Weekly purchases" : "Monthly purchases") : i.category;
  const groups = [...new Set(items.map(keyOf))].sort();
  const monthLabel = new Date(month + "-15T12:00:00Z").toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const pantryPlanned = items.filter((i) => i.inPantry && !i.purchased && i.fromMealPlan).length;
  const pct = Math.min(100, (s.spent / Math.max(1, s.budget)) * 100);

  return (
    <div className="space-y-6">
      <PageHeader title="Grocery Budget" subtitle="All prices in rand. Suggested prices are estimates until you enter what you actually paid." />
      {sp.generated && <p className="rounded-2xl bg-sage/40 p-3 text-sm">Grocery list created from the meal plan. Tick off what&apos;s already at home so it isn&apos;t counted.</p>}

      <div className="flex items-center gap-1">
        <Link href={`/groceries?month=${shiftMonth(month, -1)}`} aria-label="Previous month" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/50"><ChevronLeft /></Link>
        <span className="font-semibold">{monthLabel}</span>
        <Link href={`/groceries?month=${shiftMonth(month, 1)}`} aria-label="Next month" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/50"><ChevronRight /></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card tone="sage" className="p-4"><div className="text-xs font-semibold uppercase text-muted">Remaining</div><div className="text-3xl font-semibold">{randShort(s.remaining)}</div><div className="text-sm">of {randShort(s.budget)}</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-night"><div className="h-full rounded-full bg-sage-deep" style={{ width: `${pct}%` }} /></div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-muted">Spent</div><div className="text-3xl font-semibold">{randShort(s.spent)}</div><div className="text-sm text-muted">{s.usesEstimates ? "includes some estimates" : "actual prices"}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-muted">Planned (not yet bought)</div><div className="text-3xl font-semibold">{randShort(s.planned)}</div><div className="text-sm text-muted">{s.pantryCount} pantry item{s.pantryCount === 1 ? "" : "s"} excluded</div></Card>
        <Card tone={s.projectedOver ? "blush" : "lavender"} className="p-4"><div className="text-xs font-semibold uppercase text-muted">Projected month-end</div><div className="text-3xl font-semibold">{randShort(s.projected)}</div><div className="text-sm">weekly average so far {randShort(s.weeklyAverage)}</div></Card>
      </div>

      <Card tone="lavender">
        <CardTitle icon={<Wallet size={18} />}>Budget insights</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-[15px]">
          <li>You have {randShort(s.remaining)} remaining in your monthly grocery budget.</li>
          {s.projectedOver ? <li>Planned items would take you about {randShort(s.projected - s.budget)} over budget — consider which can wait, without cutting the foods she tolerates.</li>
            : items.length > 0 && <li>Spending plus planned items fit within the budget.</li>}
          {pantryPlanned > 0 && <li>{pantryPlanned} planned ingredient{pantryPlanned > 1 ? "s are" : " is"} already in your pantry.</li>}
          <li>Beans, lentils and eggs are often affordable protein options compared with some meats.</li>
          <li>Never trade food safety or foods she can actually keep down for savings.</li>
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">Group by:</span>
            {[["category", "Food category"], ["store", "Supermarket"], ["cadence", "Weekly / monthly"]].map(([v, l]) => (
              <Link key={v} href={`/groceries?month=${month}&group=${v}`} className={cx("rounded-full px-3 py-1 font-semibold", group === v ? "bg-charcoal text-white dark:bg-blush dark:text-charcoal" : "bg-white shadow-soft dark:bg-night-card")}>{l}</Link>
            ))}
          </div>
          {items.length === 0 ? <Empty title="No items for this month">Add items below, or create a list from the <Link className="underline" href="/planner">meal plan</Link>.</Empty> : groups.map((g) => (
            <Card key={g}>
              <CardTitle>{g}</CardTitle>
              <ul className="divide-y divide-line dark:divide-night-line">
                {items.filter((i) => keyOf(i) === g).map((i) => (
                  <li key={i.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className={cx(i.purchased && "line-through opacity-60")}>
                        <span className="font-semibold">{i.name}</span> <span className="text-sm text-muted">× {i.quantity} {i.unit}</span>
                        <div className="text-sm text-muted">
                          {i.actualCostCents != null ? <>Paid {rand(i.actualCostCents)}</> : <>Est. {rand(i.estCostCents)} <Badge tone="neutral">estimate</Badge></>}
                          {i.store && ` · ${i.store}`}{i.expiryDate && ` · use by ${i.expiryDate}`}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {i.inPantry && <Badge tone="info"><Home size={12} /> In pantry</Badge>}
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
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Add an item</CardTitle>
            <ActionForm action={addGrocery} resetOnSuccess className="space-y-3">
              <input type="hidden" name="month" value={month} />
              <Field label="Product"><Input name="name" required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity"><Input name="quantity" inputMode="decimal" defaultValue="1" /></Field>
                <Field label="Unit"><Input name="unit" defaultValue="item" /></Field>
                <Field label="Est. price (R)"><Input name="est" inputMode="decimal" /></Field>
                <Field label="Store"><Select name="store"><option value="">—</option>{STORES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
              </div>
              <Field label="Category"><Select name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Buy"><Select name="cadence"><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></Select></Field>
              <Check name="inPantry" label="Already at home (pantry)" />
              <Submit variant="rose" className="w-full">Add</Submit>
            </ActionForm>
          </Card>
          <Card>
            <CardTitle>Spending by category</CardTitle>
            <Chart data={Object.entries(s.byCategory).map(([k, v]) => ({ category: k, rand: Math.round(v / 100) }))} x="category" series={[{ key: "rand", label: "Spent (R)" }]} empty="Mark items as bought to see spending." />
          </Card>
          {ctx.isOwner && (
            <Card>
              <CardTitle>Monthly budget</CardTitle>
              <ActionForm action={setBudget} className="flex gap-2">
                <Input name="budget" inputMode="decimal" defaultValue={(ctx.pregnancy.monthlyBudgetCents / 100).toFixed(0)} aria-label="Monthly budget in rand" />
                <Submit variant="soft" className="shrink-0">Save</Submit>
              </ActionForm>
            </Card>
          )}
          <Note>BloomCare has no live supermarket prices — there&apos;s no permitted price feed. Prices from the meal plan are rough estimates; replace them with real till prices.</Note>
        </div>
      </div>
    </div>
  );
}
