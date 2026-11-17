// Turns food names identified from a photo into a verdict using ONLY BloomCare's
// curated, sourced rules: the food-safety library, her allergies and nausea triggers,
// and her own tolerance history. The AI never decides whether a food is safe.
import { FOOD_SAFETY, type FoodSafetyEntry, type SafetyCategory } from "./content/food-safety";
import type { SourceId } from "./content/sources";

export type VerdictLevel = "GOOD" | "CAUTION" | "AVOID" | "ASK" | "UNKNOWN";

export const VERDICT_LABEL: Record<VerdictLevel, string> = {
  GOOD: "Generally fine",
  CAUTION: "OK with care",
  AVOID: "Avoid",
  ASK: "Ask her clinician",
  UNKNOWN: "Not in our library",
};

/** Worst first. UNKNOWN ranks above GOOD so an unrecognised food never makes a meal look "all clear". */
const SEVERITY: Record<VerdictLevel, number> = { AVOID: 0, ASK: 1, CAUTION: 2, UNKNOWN: 3, GOOD: 4 };

const FROM_CATEGORY: Record<SafetyCategory, VerdictLevel> = {
  SAFE_PREPARED: "GOOD",
  PRECAUTIONS: "CAUTION",
  AVOID: "AVOID",
  ASK_CLINICIAN: "ASK",
};

export type VerdictReason = { text: string; kind: "safety" | "allergy" | "trigger" | "tolerance"; sources?: SourceId[]; guideKey?: string };

export type JudgedItem = {
  name: string;
  preparation: string;
  level: VerdictLevel;
  reasons: VerdictReason[];
};

export type PersonalContext = {
  allergies: string;        // free text, comma/line separated
  nauseaTriggers: string;   // free text, comma/line separated
  notTolerated: { name: string; bad: number }[];
  tolerated: { name: string; good: number }[];
};

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const splitList = (s: string) => s.split(/[,;\n]+/).map(norm).filter((x) => x.length >= 3);

/** Singular forms to try: "peanuts" → "peanut", "tomatoes" → "tomato", "berries" → "berry". */
function singulars(n: string): string[] {
  const out = [n];
  if (n.endsWith("ies") && n.length > 4) out.push(n.slice(0, -3) + "y");
  if (n.endsWith("es") && n.length > 3) out.push(n.slice(0, -2));
  if (n.endsWith("s") && !n.endsWith("ss") && n.length > 3) out.push(n.slice(0, -1));
  return out;
}

/**
 * Whole-word/phrase containment, so "ham" doesn't match "graham crackers".
 * Plural-tolerant in both directions, because allergies are usually written in the
 * plural ("peanuts", "eggs") while food names are singular ("peanut butter", "fried egg").
 */
function mentions(haystack: string, needle: string) {
  const h = ` ${norm(haystack)} `;
  const n = norm(needle);
  if (!n) return false;
  return singulars(n).some((s) => h.includes(` ${s} `) || h.includes(` ${s}s `) || h.includes(` ${s}es `));
}

export function safetyEntriesFor(name: string): FoodSafetyEntry[] {
  return FOOD_SAFETY.filter((e) => e.aliases.some((a) => mentions(name, a)));
}

export function worst(levels: VerdictLevel[]): VerdictLevel {
  return levels.reduce<VerdictLevel>((w, l) => (SEVERITY[l] < SEVERITY[w] ? l : w), "GOOD");
}

export function judgeItem(item: { name: string; preparation?: string }, me: PersonalContext): JudgedItem {
  const label = `${item.name} ${item.preparation ?? ""}`;
  const reasons: VerdictReason[] = [];
  const levels: VerdictLevel[] = [];

  for (const a of splitList(me.allergies)) {
    if (mentions(label, a)) {
      levels.push("AVOID");
      reasons.push({ kind: "allergy", text: `Listed in her allergies ("${a}"). Don't eat it unless her clinician has said it's fine.` });
    }
  }

  const entries = safetyEntriesFor(item.name);
  for (const e of entries) {
    levels.push(FROM_CATEGORY[e.category]);
    reasons.push({ kind: "safety", text: e.summary, sources: e.sources, guideKey: e.key });
  }

  for (const t of splitList(me.nauseaTriggers)) {
    if (mentions(label, t)) {
      levels.push("CAUTION");
      reasons.push({ kind: "trigger", text: `She listed "${t}" as a nausea trigger. Try a small amount first, or swap it.` });
    }
  }

  const bad = me.notTolerated.find((f) => mentions(item.name, f.name) || mentions(f.name, item.name));
  if (bad) {
    levels.push("CAUTION");
    reasons.push({ kind: "tolerance", text: `Hasn't sat well before (logged ${bad.bad} time${bad.bad === 1 ? "" : "s"}). A smaller portion may help.` });
  } else {
    const good = me.tolerated.find((f) => mentions(item.name, f.name) || mentions(f.name, item.name));
    if (good) reasons.push({ kind: "tolerance", text: `Usually sits well with her (logged ${good.good} time${good.good === 1 ? "" : "s"}).` });
  }

  if (entries.length === 0 && !levels.includes("AVOID")) {
    levels.push("UNKNOWN");
    reasons.push({ kind: "safety", text: "This food isn't in BloomCare's food-safety library, so we can't give a verdict. General rule: well-cooked, freshly prepared, pasteurised foods are usually fine. If you're unsure, ask her clinician." });
  }

  return { name: item.name, preparation: item.preparation ?? "", level: worst(levels), reasons };
}

export function judgeMeal(items: { name: string; preparation?: string }[], me: PersonalContext) {
  const judged = items.map((i) => judgeItem(i, me));
  return { items: judged, overall: worst(judged.map((j) => j.level)) };
}
