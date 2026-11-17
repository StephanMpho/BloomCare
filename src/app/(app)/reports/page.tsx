import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { requireContext } from "@/lib/context";
import { parseRange, reportData } from "@/lib/reports";
import { addDays, toISODate, formatDate } from "@/lib/dates";
import { toleranceLists } from "@/lib/queries";
import { Card, CardTitle, PageHeader, Input, Badge, Note, cx } from "@/components/ui";
import { Chart } from "@/components/charts";

export default async function Reports({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const ctx = await requireContext();
  if (!ctx.isOwner) redirect("/partner");
  const sp = await searchParams;
  const r = parseRange(sp);
  const [d, tol] = await Promise.all([reportData(ctx.pregnancy.id, r.from, r.to), toleranceLists(ctx.pregnancy.id)]);
  const days = Array.from({ length: r.days }, (_, i) => addDays(r.from, i));
  const series = days.map((day) => {
    const f = d.foods.filter((x) => toISODate(x.log.eatenAt) === day);
    const dr = d.drinks.filter((x) => toISODate(x.drankAt) === day);
    const s = d.symptoms.filter((x) => toISODate(x.loggedAt) === day);
    const sev = s.map((x) => x.nauseaSeverity).filter((x): x is number => x != null);
    const sl = d.suppLogs.filter((x) => x.date === day);
    return {
      label: formatDate(day, { day: "numeric", month: "short" }),
      meals: f.length, groups: new Set(f.map((x) => x.food?.category).filter(Boolean)).size,
      consumed: dr.reduce((a, x) => a + x.consumedMl, 0),
      kept: dr.reduce((a, x) => a + (x.retention === "KEPT_DOWN" ? x.consumedMl : x.retention === "PARTLY" ? Math.round(x.consumedMl / 2) : 0), 0),
      vomits: s.reduce((a, x) => a + x.vomitCount, 0), nausea: sev.length ? Math.max(...sev) : null,
      taken: sl.filter((x) => x.status === "TAKEN").length,
      good: f.filter((x) => x.log.tolerance === "GOOD").length, poor: f.filter((x) => x.log.tolerance === "POOR").length,
    };
  });
  const byCat: Record<string, number> = {};
  for (const g of d.groceries) byCat[g.category] = (byCat[g.category] ?? 0) + (g.actualCostCents ?? g.estCostCents);
  const qs = r.key === "custom" ? `range=custom&from=${r.from}&to=${r.to}` : `range=${r.key}`;
  const exports = [["food", "Food diary"], ["symptoms", "Nausea & vomiting"], ["hydration", "Hydration log"], ["supplements", "Supplement history"], ["groceries", "Grocery spending"], ["appointments", "Appointment notes"]];

  return (
    <div className="space-y-6">
      <PageHeader title="Insights & Reports" subtitle={`Based on what you logged, ${formatDate(r.from)} – ${formatDate(r.to)}.`}
        action={<Link href={`/reports/print?${qs}`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-charcoal px-4 font-semibold text-white dark:bg-blush dark:text-charcoal"><FileText size={18} /> Summary for clinician (PDF)</Link>} />
      <div className="flex flex-wrap items-end gap-2">
        {[["7", "7 days"], ["30", "30 days"]].map(([v, l]) => <Link key={v} href={`/reports?range=${v}`} className={cx("min-h-11 rounded-full px-4 py-2.5 text-sm font-semibold", r.key === v ? "bg-charcoal text-white dark:bg-blush dark:text-charcoal" : "bg-white shadow-soft dark:bg-night-card")}>{l}</Link>)}
        <form className="flex flex-wrap items-end gap-2" action="/reports">
          <input type="hidden" name="range" value="custom" />
          <label className="text-sm">From<Input type="date" name="from" defaultValue={r.from} className="mt-1" /></label>
          <label className="text-sm">To<Input type="date" name="to" defaultValue={r.to} className="mt-1" /></label>
          <button className="min-h-11 rounded-2xl bg-blush px-4 font-semibold dark:bg-night-line">Apply</button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardTitle>Foods logged per day</CardTitle><Chart data={series} x="label" series={[{ key: "meals", label: "Foods logged" }]} /></Card>
        <Card><CardTitle>Food-group variety per day</CardTitle><Chart data={series} x="label" series={[{ key: "groups", label: "Food groups", color: "s3" }]} /><Note>Number of different food groups among items with a known category.</Note></Card>
        <Card><CardTitle>Recorded fluids</CardTitle><Chart data={series} x="label" series={[{ key: "consumed", label: "Drunk (ml)", color: "s2" }, { key: "kept", label: "Kept down (ml)", color: "s3" }]} unit=" ml" /><Note>Self-reported; not a measure of hydration status.</Note></Card>
        <Card><CardTitle>Vomiting episodes by day</CardTitle><Chart data={series} x="label" series={[{ key: "vomits", label: "Vomiting episodes" }]} /></Card>
        <Card><CardTitle>Nausea severity (highest each day)</CardTitle><Chart data={series} x="label" kind="line" series={[{ key: "nausea", label: "Nausea 0–10", color: "s2" }]} yMax={10} /></Card>
        <Card><CardTitle>Food tolerance pattern</CardTitle><Chart data={series} x="label" series={[{ key: "good", label: "Sat well", color: "s3" }, { key: "poor", label: "Didn't sit well", color: "s1" }]} />
          <div className="mt-2 flex flex-wrap gap-1">{tol.tolerated.slice(0, 6).map((t) => <Badge key={t.name} tone="good">{t.name}</Badge>)}{tol.notTolerated.slice(0, 6).map((t) => <Badge key={t.name} tone="warn">{t.name}</Badge>)}</div></Card>
        <Card><CardTitle>Grocery spending by category</CardTitle><Chart data={Object.entries(byCat).map(([k, v]) => ({ k, r: Math.round(v / 100) }))} x="k" series={[{ key: "r", label: "Rand" }]} empty="No purchases recorded in this period." /></Card>
        {d.supps.length > 0 && <Card><CardTitle>Supplement doses recorded as taken</CardTitle><Chart data={series} x="label" series={[{ key: "taken", label: "Doses taken", color: "s2" }]} /></Card>}
      </div>

      <Card tone="lavender">
        <CardTitle icon={<Download size={18} />}>Export (CSV for spreadsheets)</CardTitle>
        <div className="flex flex-wrap gap-2">
          {exports.map(([k, l]) => <a key={k} href={`/api/export/${k}?${qs}`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 font-semibold shadow-soft dark:bg-night-card"><Download size={16} /> {l}</a>)}
        </div>
        <Note className="mt-2">The PDF summary uses your browser&apos;s &quot;Save as PDF&quot; option on the print screen.</Note>
      </Card>
    </div>
  );
}
