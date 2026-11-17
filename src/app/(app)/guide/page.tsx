import { Search, ShieldCheck, ShieldAlert, ShieldX, Stethoscope } from "lucide-react";
import { requireContext } from "@/lib/context";
import { NUTRIENT_GUIDE } from "@/lib/content/nutrients";
import { FOOD_SAFETY, SAFETY_LABEL, checkFood, type SafetyCategory } from "@/lib/content/food-safety";
import { SOURCES, CONTENT_REVIEW, type SourceId } from "@/lib/content/sources";
import { Card, CardTitle, PageHeader, Input, Badge, Note, cx } from "@/components/ui";

const CAT_STYLE: Record<SafetyCategory, { tone: "good" | "warn" | "bad" | "info"; icon: typeof ShieldCheck }> = {
  SAFE_PREPARED: { tone: "good", icon: ShieldCheck }, PRECAUTIONS: { tone: "warn", icon: ShieldAlert },
  AVOID: { tone: "bad", icon: ShieldX }, ASK_CLINICIAN: { tone: "info", icon: Stethoscope },
};

function Sources({ ids }: { ids: readonly SourceId[] }) {
  return <Note className="mt-2">Sources: {ids.map((id, i) => <span key={id}>{i > 0 && " · "}<a href={SOURCES[id].url} target="_blank" rel="noreferrer" className="underline">{SOURCES[id].title}</a></span>)}</Note>;
}

export default async function Guide({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  await requireContext();
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 60);
  const results = q ? checkFood(q) : [];
  const tab = sp.tab === "nutrients" ? "nutrients" : "safety";

  return (
    <div className="space-y-6">
      <PageHeader title="Nutrition & Food Safety" subtitle="Educational information from public health sources — not personal medical advice." />

      <Card tone="blush">
        <CardTitle icon={<Search size={18} />}>Can I eat this while pregnant?</CardTitle>
        <form className="flex gap-2" action="/guide">
          <Input name="q" defaultValue={q} placeholder="e.g. polony, pilchards, feta, sushi, coffee" aria-label="Food to check" />
          <button className="min-h-11 shrink-0 rounded-2xl bg-charcoal px-5 font-semibold text-white dark:bg-blush dark:text-charcoal">Check</button>
        </form>
        {q && (results.length ? (
          <div className="mt-4 space-y-3">{results.map((r) => <SafetyEntry key={r.key} e={r} open />)}</div>
        ) : (
          <div className="mt-4 rounded-2xl bg-white p-4 text-[15px] dark:bg-night-card">
            <p className="font-semibold">&quot;{q}&quot; isn&apos;t in BloomCare&apos;s reviewed list yet.</p>
            <p className="mt-1">General rules: cook meat, eggs and fish thoroughly; choose pasteurised dairy; wash fruit and vegetables; avoid alcohol; and ask her clinician, a pharmacist or a dietitian about anything else. BloomCare doesn&apos;t generate answers it hasn&apos;t sourced.</p>
          </div>
        ))}
      </Card>

      <div className="flex gap-2">
        {[["safety", "Food safety library"], ["nutrients", "Key nutrients"]].map(([v, l]) => (
          <a key={v} href={`/guide?tab=${v}`} className={cx("rounded-full px-4 py-2 text-sm font-semibold", tab === v ? "bg-charcoal text-white dark:bg-blush dark:text-charcoal" : "bg-white shadow-soft dark:bg-night-card")}>{l}</a>
        ))}
      </div>

      {tab === "safety" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">{(Object.keys(SAFETY_LABEL) as SafetyCategory[]).map((c) => <Badge key={c} tone={CAT_STYLE[c].tone}>{SAFETY_LABEL[c]}</Badge>)}</div>
          <div className="grid gap-4 md:grid-cols-2">{FOOD_SAFETY.map((e) => <SafetyEntry key={e.key} e={e} />)}</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-3xl bg-white shadow-soft dark:bg-night-card">
            <table className="w-full text-left text-[15px]">
              <thead className="bg-blush/60 dark:bg-night-line"><tr><th className="p-3">Nutrient</th><th className="p-3">Why it matters</th><th className="p-3">Affordable SA sources</th></tr></thead>
              <tbody>{NUTRIENT_GUIDE.map((n) => <tr key={n.key} className="border-t border-line dark:border-night-line"><td className="p-3 font-semibold">{n.name}</td><td className="p-3">{n.role}</td><td className="p-3">{n.foods.slice(0, 3).join(", ")}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {NUTRIENT_GUIDE.map((n) => (
              <Card key={n.key}>
                <h3 className="text-lg font-semibold">{n.name}</h3>
                <dl className="mt-2 space-y-2 text-[15px]">
                  <div><dt className="font-semibold">Role in pregnancy</dt><dd>{n.role}</dd></div>
                  <div><dt className="font-semibold">General guidance</dt><dd>{n.guidance}</dd></div>
                  <div><dt className="font-semibold">Foods</dt><dd>{n.foods.join(" · ")}</dd></div>
                  <div><dt className="font-semibold">Safe preparation</dt><dd>{n.preparation}</dd></div>
                  <div><dt className="font-semibold">Supplements?</dt><dd>{n.supplements}</dd></div>
                  <div><dt className="font-semibold">Ask a doctor or dietitian</dt><dd>{n.whenToAsk}</dd></div>
                </dl>
                <Sources ids={n.sources} />
              </Card>
            ))}
          </div>
        </div>
      )}
      <Note>Content compiled {CONTENT_REVIEW.compiled}. {CONTENT_REVIEW.status}</Note>
    </div>
  );
}

function SafetyEntry({ e, open = false }: { e: (typeof FOOD_SAFETY)[number]; open?: boolean }) {
  const s = CAT_STYLE[e.category];
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <s.icon className="mt-0.5 shrink-0" size={22} />
        <div className="min-w-0">
          <h3 className="font-semibold">{e.name}</h3>
          <Badge tone={s.tone} className="mt-1">{SAFETY_LABEL[e.category]}</Badge>
          <p className="mt-2 text-[15px]">{e.summary}</p>
          {(e.details.length > 0 || e.alternatives) && (
            <details open={open} className="mt-2">
              <summary className="cursor-pointer text-sm font-semibold text-lavender-deep dark:text-lavender">More detail</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">{e.details.map((d) => <li key={d}>{d}</li>)}</ul>
              {e.alternatives && <p className="mt-2 text-[15px]"><strong>Safer options:</strong> {e.alternatives.join(" · ")}</p>}
            </details>
          )}
          <Sources ids={e.sources} />
        </div>
      </div>
    </Card>
  );
}
