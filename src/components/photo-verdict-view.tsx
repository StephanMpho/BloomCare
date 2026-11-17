import Link from "next/link";
import { ShieldCheck, ShieldAlert, ShieldX, Stethoscope, HelpCircle, Plus } from "lucide-react";
import { SOURCES } from "@/lib/content/sources";
import { VERDICT_LABEL, type JudgedItem, type VerdictLevel } from "@/lib/photo-verdict";
import { Badge } from "./ui";

const TONE: Record<VerdictLevel, "good" | "warn" | "bad" | "info" | "neutral"> = {
  GOOD: "good", CAUTION: "warn", AVOID: "bad", ASK: "info", UNKNOWN: "neutral",
};
const ICON = { GOOD: ShieldCheck, CAUTION: ShieldAlert, AVOID: ShieldX, ASK: Stethoscope, UNKNOWN: HelpCircle } as const;

const OVERALL_TEXT: Record<VerdictLevel, string> = {
  GOOD: "Everything here is generally fine in pregnancy when prepared properly.",
  CAUTION: "Mostly fine, with some care needed. See the notes below.",
  AVOID: "Something on this plate is best avoided. See below for safer swaps.",
  ASK: "Something here needs her clinician's advice.",
  UNKNOWN: "Some foods aren't in BloomCare's reviewed library, so we can't give a full verdict.",
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
