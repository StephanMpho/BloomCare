import Link from "next/link";
import { ShieldCheck, ShieldAlert, ShieldX, Stethoscope, HelpCircle, Plus, Heart, ThumbsUp, Scale, Ban } from "lucide-react";
import { SOURCES, type SourceId } from "@/lib/content/sources";
import { VERDICT_LABEL, type HealthinessVerdict, type JudgedItem, type VerdictLevel } from "@/lib/photo-verdict";
import { Badge } from "./ui";

const TONE: Record<VerdictLevel, "good" | "warn" | "bad" | "info" | "neutral"> = {
  GOOD: "good", CAUTION: "warn", AVOID: "bad", ASK: "info", UNKNOWN: "neutral",
};
const ICON = { GOOD: ShieldCheck, CAUTION: ShieldAlert, AVOID: ShieldX, ASK: Stethoscope, UNKNOWN: HelpCircle } as const;

const OVERALL_TEXT: Record<VerdictLevel, string> = {
  GOOD: "A healthy, safe choice for pregnancy when prepared properly.",
  CAUTION: "Mostly fine, with something to limit or take care with. See the notes below.",
  AVOID: "Something on this plate is best avoided in pregnancy. See below for safer swaps.",
  ASK: "Something here needs her clinician's advice.",
  UNKNOWN: "We couldn't match some foods to BloomCare's guidance, so this isn't a full verdict.",
};

export function VerdictBadge({ level }: { level: VerdictLevel }) {
  const Icon = ICON[level];
  return <Badge tone={TONE[level]}><Icon size={14} aria-hidden /> {VERDICT_LABEL[level]}</Badge>;
}

export function OverallVerdict({ level }: { level: VerdictLevel }) {
  return (
    <div className="flex items-start gap-3">
      <VerdictBadge level={level} />
      <p className="text-sm">{OVERALL_TEXT[level]}</p>
    </div>
  );
}

const H_TONE: Record<HealthinessVerdict["level"], "good" | "warn" | "bad"> = { GREAT: "good", GOOD: "good", LIMIT: "warn", AVOID: "bad" };
const H_ICON = { GREAT: Heart, GOOD: ThumbsUp, LIMIT: Scale, AVOID: Ban } as const;

function Sources({ ids }: { ids: SourceId[] }) {
  if (!ids.length) return null;
  return (
    <span className="text-xs text-muted dark:text-white/60">
      {" "}Sources:{" "}
      {ids.map((s, k) => (
        <span key={s}>{k > 0 && ", "}<a className="underline" href={SOURCES[s].url} target="_blank" rel="noreferrer">{SOURCES[s].title.split(" — ")[0]}</a></span>
      ))}
    </span>
  );
}

function HealthinessBlock({ h }: { h: HealthinessVerdict }) {
  const Icon = H_ICON[h.level];
  return (
    <div className="mt-2 rounded-2xl bg-ivory p-2.5 text-sm dark:bg-night-line/60">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Healthy for her?</span>
        <Badge tone={H_TONE[h.level]}><Icon size={14} aria-hidden /> {h.label}</Badge>
        <span className="text-xs text-muted dark:text-white/60">{h.group}</span>
      </p>
      <p className="mt-1.5">{h.why}{h.tip && <> {h.tip}</>}<Sources ids={h.sources} /></p>
    </div>
  );
}

export function VerdictList({ items, canLog }: { items: JudgedItem[]; canLog: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="rounded-2xl border border-line p-3 dark:border-night-line">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {it.name}
              {it.preparation && <span className="font-normal text-muted dark:text-white/60"> · {it.preparation}</span>}
            </p>
            <VerdictBadge level={it.level} />
          </div>
          {it.healthiness && <HealthinessBlock h={it.healthiness} />}
          <ul className="mt-2 space-y-1.5 text-sm">
            {it.reasons.map((r, j) => (
              <li key={j}>
                {r.text}
                {r.sources?.length ? (
                  <span className="text-xs text-muted dark:text-white/60">
                    {" "}Sources:{" "}
                    {r.sources.map((s, k) => (
                      <span key={s}>{k > 0 && ", "}<a className="underline" href={SOURCES[s].url} target="_blank" rel="noreferrer">{SOURCES[s].title.split(" — ")[0]}</a></span>
                    ))}
                    {r.guideKey && <> · <Link className="underline" href={`/guide?q=${encodeURIComponent(it.name)}`}>More in the guide</Link></>}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {canLog && (
            <Link href={`/food/new?name=${encodeURIComponent(it.name)}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-rose underline">
              <Plus size={14} /> Add to food diary
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
