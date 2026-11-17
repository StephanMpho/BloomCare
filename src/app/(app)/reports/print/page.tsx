import { redirect } from "next/navigation";
import { requireContext } from "@/lib/context";
import { parseRange, reportData } from "@/lib/reports";
import { formatDate, formatDateTime, toISODate, addDays } from "@/lib/dates";
import { toleranceLists } from "@/lib/queries";
import { PrintButton } from "@/components/forms";

export default async function PrintSummary({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const ctx = await requireContext();
  if (!ctx.isOwner) redirect("/partner");
  const r = parseRange(await searchParams);
  const [d, tol] = await Promise.all([reportData(ctx.pregnancy.id, r.from, r.to), toleranceLists(ctx.pregnancy.id)]);
  const dd = ctx.dating;
  const days = Array.from({ length: r.days }, (_, i) => addDays(r.from, i));
  const warn = d.symptoms.filter((s) => s.fluidsKeptDown === "NOT_KEPT_DOWN" || s.dizziness || s.weakness || s.fainting || s.reducedUrine || s.abdominalPain !== "NONE" || s.bleeding !== "NONE" || s.weightLossNoticed || s.fever);
  const weights = d.symptoms.filter((s) => s.weightKg != null);
  const upcoming = d.appts.filter((a) => a.startsAt >= new Date());
  const lastQuestions = upcoming[0]?.questions;

  return (
    <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 text-[14px] text-charcoal shadow-soft print:shadow-none">
      <div className="no-print mb-4 flex justify-end"><PrintButton /></div>
      <h1 className="font-display text-2xl font-semibold">Symptom & nutrition summary</h1>
      <p>{ctx.pregnancy.preferredName} · {formatDate(r.from)} – {formatDate(r.to)} · generated {formatDateTime(new Date())}</p>
      <p>Gestation by {dd.basis === "LMP" ? "LMP" : dd.basis.toLowerCase()}: <strong>{dd.weeks}+{dd.days} weeks</strong> · LMP {formatDate(ctx.pregnancy.lmpDate)} · EDD {formatDate(dd.edd)} · Ultrasound confirmation: {ctx.pregnancy.ultrasoundConfirmed ? "recorded" : "not yet recorded"}</p>
      <p>Allergies: {ctx.pregnancy.allergies || "none recorded"}</p>
      <p className="mt-1 text-xs">Self-reported data recorded in the BloomCare app. Not a clinical record.</p>

      <h2 className="mt-5 border-b pb-1 text-lg font-semibold">Daily overview</h2>
      <table className="mt-2 w-full text-left">
        <thead><tr><th>Date</th><th>Max nausea</th><th>Vomits</th><th>Fluids drunk / kept down (ml)</th><th>Foods logged</th></tr></thead>
        <tbody>{days.map((day) => {
          const s = d.symptoms.filter((x) => toISODate(x.loggedAt) === day);
          const dr = d.drinks.filter((x) => toISODate(x.drankAt) === day);
          const f = d.foods.filter((x) => toISODate(x.log.eatenAt) === day);
          const sev = s.map((x) => x.nauseaSeverity).filter((x): x is number => x != null);
          const kept = dr.reduce((a, x) => a + (x.retention === "KEPT_DOWN" ? x.consumedMl : x.retention === "PARTLY" ? Math.round(x.consumedMl / 2) : 0), 0);
          return <tr key={day} className="border-t"><td>{formatDate(day, { day: "numeric", month: "short" })}</td><td>{sev.length ? Math.max(...sev) : "—"}</td><td>{s.reduce((a, x) => a + x.vomitCount, 0)}</td><td>{dr.reduce((a, x) => a + x.consumedMl, 0)} / {kept}</td><td>{f.length}</td></tr>;
        })}</tbody>
      </table>

      <h2 className="mt-5 border-b pb-1 text-lg font-semibold">Warning signs recorded</h2>
      {warn.length === 0 ? <p>None recorded in this period.</p> : <ul className="list-disc pl-5">{warn.map((s) => (
        <li key={s.id}>{formatDateTime(s.loggedAt)}: {[s.fluidsKeptDown === "NOT_KEPT_DOWN" && "unable to keep fluids down", s.dizziness && "dizziness", s.weakness && "weakness", s.fainting && "fainting", s.reducedUrine && "reduced urine", s.weightLossNoticed && "weight loss", s.abdominalPain !== "NONE" && `abdominal/pelvic pain (${s.abdominalPain.toLowerCase()})`, s.shoulderTipPain && "shoulder-tip pain", s.bleeding !== "NONE" && `bleeding (${s.bleeding.toLowerCase()})`, s.fever && "fever"].filter(Boolean).join(", ")}</li>
      ))}</ul>}
      {weights.length > 0 && <p className="mt-2">Weights recorded: {weights.map((w) => `${w.weightKg} kg (${formatDate(toISODate(w.loggedAt), { day: "numeric", month: "short" })})`).join(", ")}</p>}

      <h2 className="mt-5 border-b pb-1 text-lg font-semibold">Food tolerance</h2>
      <p><strong>Tolerated:</strong> {tol.tolerated.map((t) => t.name).join(", ") || "—"}</p>
      <p><strong>Not tolerated:</strong> {tol.notTolerated.map((t) => t.name).join(", ") || "—"}</p>

      <h2 className="mt-5 border-b pb-1 text-lg font-semibold">Food diary</h2>
      {d.foods.length === 0 ? <p>No foods logged.</p> : <ul className="list-disc pl-5">{d.foods.map(({ log }) => <li key={log.id}>{formatDateTime(log.eatenAt)} — {log.foodName} ({log.portionLabel}{log.amountEaten !== "FULL" ? `, ate ${log.amountEaten === "PARTIAL" ? "about half" : "a few bites"}` : ""}) · {log.tolerance === "GOOD" ? "sat well" : log.tolerance === "OKAY" ? "okay" : "not tolerated"}{log.vomitedAfter ? " · vomited after" : ""}</li>)}</ul>}

      <h2 className="mt-5 border-b pb-1 text-lg font-semibold">Supplements</h2>
      {d.supps.length === 0 ? <p>None recorded.</p> : <ul className="list-disc pl-5">{d.supps.map((s) => <li key={s.id}>{s.name} {s.dose} {s.unit}, {s.frequency} — taken {d.suppLogs.filter((l) => l.supplementId === s.id && l.status === "TAKEN").length}, missed {d.suppLogs.filter((l) => l.supplementId === s.id && l.status === "MISSED").length}{d.suppLogs.some((l) => l.supplementId === s.id && l.sideEffects) ? ` · side effects: ${d.suppLogs.filter((l) => l.supplementId === s.id && l.sideEffects).map((l) => l.sideEffects).join("; ")}` : ""}</li>)}</ul>}

      {lastQuestions && <><h2 className="mt-5 border-b pb-1 text-lg font-semibold">Questions for this visit</h2><p className="whitespace-pre-line">{lastQuestions}</p></>}
      <h2 className="mt-5 border-b pb-1 text-lg font-semibold">Clinician notes</h2>
      <div className="mt-2 h-32 rounded border border-dashed" />
    </article>
  );
}
