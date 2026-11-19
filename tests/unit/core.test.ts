import { describe, it, expect, vi } from "vitest";
import { calculateDating, eddFromLmp, validateLmp, trimesterFor } from "@/lib/pregnancy";
import { evaluateSymptoms, mergeSnapshots, fluidsSnapshotFromDrinks } from "@/lib/safety";
import { can, sanitizePermissions } from "@/lib/permissions";
import { budgetSummary } from "@/lib/budget";
import { aggregateIngredients, chooseTemplates } from "@/lib/meal-templates";
import { sumNutrients } from "@/lib/nutrition";
import { findOverlaps, hasRetinol } from "@/lib/supplements";
import { checkFood } from "@/lib/content/food-safety";
import { parseRand, rand } from "@/lib/money";
import { todayISO, weekStart, daysBetween } from "@/lib/dates";

describe("pregnancy dating", () => {
  it("LMP 9 Oct 2026 gives EDD 16 Jul 2027", () => {
    expect(eddFromLmp("2026-10-09")).toBe("2027-07-16");
  });
  it("is 5 weeks 4 days on 17 Nov 2026 (not '2 weeks because recently discovered')", () => {
    const d = calculateDating({ lmpDate: "2026-10-09", datingMethod: "LMP" }, "2026-11-17");
    expect(d.weeks).toBe(5);
    expect(d.days).toBe(4);
    expect(d.trimester).toBe(1);
    expect(d.daysToDue).toBe(241);
  });
  it("prefers an ultrasound due date when provided", () => {
    const d = calculateDating({ lmpDate: "2026-10-09", clinicalDueDate: "2027-07-23", datingMethod: "ULTRASOUND" }, "2026-11-17");
    expect(d.edd).toBe("2027-07-23");
    expect(d.weeks).toBe(4);
    expect(d.days).toBe(4);
    expect(d.basis).toBe("ULTRASOUND");
  });
  it("ignores a clinical date when method is LMP", () => {
    const d = calculateDating({ lmpDate: "2026-10-09", clinicalDueDate: "2027-07-23", datingMethod: "LMP" }, "2026-11-17");
    expect(d.edd).toBe("2027-07-16");
  });
  it("trimester boundaries: 13w6d is T1, 14w0d is T2, 28w0d is T3", () => {
    expect(trimesterFor(13 * 7 + 6)).toBe(1);
    expect(trimesterFor(14 * 7)).toBe(2);
    expect(trimesterFor(28 * 7)).toBe(3);
  });
  it("rejects future and implausible LMP dates", () => {
    expect(validateLmp("2026-12-01", "2026-11-17")).toMatch(/future/);
    expect(validateLmp("2025-01-01", "2026-11-17")).toMatch(/44 weeks/);
    expect(validateLmp("2026-10-09", "2026-11-17")).toBeNull();
  });
});

describe("safety rules", () => {
  const early = { earlyPregnancyUnconfirmed: true };
  it("her reported baseline triggers urgent assessment", () => {
    const a = evaluateSymptoms({ vomitCount: 4, fluidsKeptDown: "NOT_KEPT_DOWN", weightLossNoticed: true, dizziness: true, weakness: true, abdominalPain: "MILD" }, early);
    expect(a.map((x) => x.level)).toContain("URGENT");
    const u = a.find((x) => x.level === "URGENT")!;
    expect(u.reasons.join(" ")).toMatch(/fluids/);
    expect(u.reasons.join(" ")).toMatch(/ultrasound/);
  });
  it("does not wait for a vomiting threshold when fluids can't be kept down", () => {
    const a = evaluateSymptoms({ vomitCount: 1, fluidsKeptDown: "NOT_KEPT_DOWN" }, early);
    expect(a[0].level).toBe("URGENT");
  });
  it("severe pain, fainting, shoulder-tip pain or heavy bleeding are emergencies", () => {
    for (const s of [{ abdominalPain: "SEVERE" as const }, { fainting: true }, { shoulderTipPain: true }, { bleeding: "HEAVY" as const }]) {
      const a = evaluateSymptoms({ vomitCount: 0, ...s }, early);
      expect(a[0].level).toBe("EMERGENCY");
      expect(a[0].message).toMatch(/10177/);
    }
  });
  it("spotting asks to contact a clinician", () => {
    const a = evaluateSymptoms({ vomitCount: 0, bleeding: "SPOTTING" }, { earlyPregnancyUnconfirmed: false });
    expect(a[0].level).toBe("CONTACT_CLINICIAN");
  });
  it("mild nausea alone produces no alert", () => {
    expect(evaluateSymptoms({ vomitCount: 0 }, { earlyPregnancyUnconfirmed: false })).toHaveLength(0);
  });
  it("vomiting counts add up across logs in the window", () => {
    const m = mergeSnapshots([{ vomitCount: 1 }, { vomitCount: 2, abdominalPain: "MILD" }, { vomitCount: 0, bleeding: "SPOTTING" }]);
    expect(m.vomitCount).toBe(3);
    expect(m.abdominalPain).toBe("MILD");
    expect(m.bleeding).toBe("SPOTTING");
  });
  it("two drinks not kept down = unable to keep fluids down", () => {
    expect(fluidsSnapshotFromDrinks([{ retention: "NOT_KEPT_DOWN" }, { retention: "NOT_KEPT_DOWN" }]).fluidsKeptDown).toBe("NOT_KEPT_DOWN");
    expect(fluidsSnapshotFromDrinks([{ retention: "KEPT_DOWN" }]).fluidsKeptDown).toBeNull();
  });
});

describe("permissions", () => {
  it("owners can do everything; partners only what was granted", () => {
    expect(can({ role: "OWNER", permissions: [] }, "VIEW_SYMPTOMS")).toBe(true);
    expect(can({ role: "PARTNER", permissions: ["GROCERIES"] }, "VIEW_SYMPTOMS")).toBe(false);
    expect(can({ role: "PARTNER", permissions: ["GROCERIES"] }, "GROCERIES")).toBe(true);
  });
  it("drops unknown permission strings", () => {
    expect(sanitizePermissions(["GROCERIES", "ADMIN", "GROCERIES"])).toEqual(["GROCERIES"]);
  });
});

describe("budget", () => {
  it("excludes pantry items from planned cost and uses actual prices", () => {
    const s = budgetSummary(
      [
        { estCostCents: 5000, actualCostCents: 4500, purchased: true, inPantry: false, category: "Protein" },
        { estCostCents: 3000, actualCostCents: null, purchased: false, inPantry: false, category: "Dairy" },
        { estCostCents: 9999, actualCostCents: null, purchased: false, inPantry: true, category: "Grains" },
      ], 300000, "2026-11", "2026-11-14");
    expect(s.spent).toBe(4500);
    expect(s.remaining).toBe(295500);
    expect(s.planned).toBe(3000);
    expect(s.pantryCount).toBe(1);
    expect(s.weeklyAverage).toBe(2250);
  });
});

describe("meal planning", () => {
  it("never suggests foods logged as not tolerated", () => {
    const opts = chooseTemplates({ slot: "BREAKFAST", avoid: ["oats"], prefer: [], gentleOnly: false, dayIndex: 0 });
    expect(opts.some((t) => t.key === "oats-banana")).toBe(false);
  });
  it("prefers tolerated foods first", () => {
    const opts = chooseTemplates({ slot: "AFTERNOON_SNACK", avoid: [], prefer: ["banana"], gentleOnly: false, dayIndex: 0 });
    expect(opts[0].key).toBe("banana-snack");
  });
  it("gentle days only use gentle options", () => {
    const opts = chooseTemplates({ slot: "SUPPER", avoid: [], prefer: [], gentleOnly: true, dayIndex: 2 });
    expect(opts.every((t) => t.gentle)).toBe(true);
  });
  it("aggregates ingredient fractions into whole packs", () => {
    const list = aggregateIngredients(["oats-banana", "oats-banana", "banana-snack"]);
    const bananas = list.find((l) => l.item === "bananas")!;
    expect(bananas.quantity).toBe(1);
    expect(bananas.estCostCents).toBe(2500);
  });
});

describe("nutrition", () => {
  it("scales per-100 g values by grams and amount eaten, and counts missing data", () => {
    const r = sumNutrients([
      { grams: 50, amountEaten: "FULL", food: { proteinG: 12.6, cholineMg: 294 } },
      { grams: 200, amountEaten: "PARTIAL", food: { proteinG: null } },
      { grams: 40, amountEaten: "FULL", food: null },
    ]);
    expect(r.totals.proteinG.value).toBeCloseTo(6.3);
    expect(r.totals.proteinG.itemsWithData).toBe(1);
    expect(r.totals.cholineMg.value).toBeCloseTo(147);
    expect(r.itemCount).toBe(3);
  });
});

describe("supplements", () => {
  it("flags overlapping ingredients and retinol", () => {
    const list = [
      { name: "Prenatal multi", ingredients: ["Folic acid", "Iron", "Retinol"], active: true },
      { name: "Folic acid 400", ingredients: ["folic acid"], active: true },
    ];
    expect(findOverlaps(list)).toEqual([{ ingredient: "folate", products: ["Prenatal multi", "Folic acid 400"] }]);
    expect(hasRetinol(list)).toEqual(["Prenatal multi"]);
  });
});

describe("food checker & helpers", () => {
  it("finds polony and classifies it with precautions", () => {
    const r = checkFood("Polony");
    expect(r[0].key).toBe("polony");
    expect(r[0].category).toBe("PRECAUTIONS");
  });
  it("money parsing", () => {
    expect(parseRand("R 45,50")).toBe(4550);
    expect(parseRand("abc")).toBeNull();
    expect(rand(300000)).toBe("R3 000.00");
  });
  it("date helpers use SAST", () => {
    expect(todayISO(new Date("2026-11-16T22:30:00Z"))).toBe("2026-11-17");
    expect(weekStart("2026-11-17")).toBe("2026-11-16");
    expect(daysBetween("2026-10-09", "2026-11-17")).toBe(39);
  });
});

describe("action error handling", () => {
  it("shows UserError messages but hides unexpected errors (e.g. SQL)", async () => {
    const { safe, UserError } = await import("@/lib/form");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await safe(async () => { throw new UserError("Item not found."); })).toEqual({ error: "Item not found." });
    const leaked = await safe(async () => { throw new Error('Failed query: select "password_hash" from "users" params: a@b.c'); });
    expect(leaked?.error).toBeTruthy();
    expect(leaked?.error).not.toMatch(/query|password|a@b\.c/i);
    errSpy.mockRestore();
  });
});

describe("photo check verdicts (rules only, never AI)", async () => {
  const { judgeItem, judgeMeal } = await import("@/lib/photo-verdict");
  const me = { allergies: "peanuts", nauseaTriggers: "boerewors, coffee", notTolerated: [{ name: "Chakalaka", bad: 2 }], tolerated: [{ name: "Pap", good: 5 }] };
  const none = { allergies: "", nauseaTriggers: "", notTolerated: [], tolerated: [] };

  it("uses the sourced food-safety library", () => {
    expect(judgeItem({ name: "chicken livers" }, none).level).toBe("AVOID");
    expect(judgeItem({ name: "polony" }, none).level).toBe("CAUTION");
    expect(judgeItem({ name: "biltong" }, none).level).toBe("ASK");
    const egg = judgeItem({ name: "boiled egg" }, none);
    expect(egg.level).toBe("GOOD");
    expect(egg.reasons[0].sources?.length).toBeGreaterThan(0);
  });
  it("matches whole words only ('ham' must not match 'graham crackers')", () => {
    expect(judgeItem({ name: "graham crackers" }, none).level).toBe("UNKNOWN");
  });
  it("never calls an unknown food safe", () => {
    const r = judgeItem({ name: "vetkoek" }, none);
    expect(r.level).toBe("UNKNOWN");
    expect(r.reasons[0].text).toMatch(/clinician/);
  });
  it("allergies make it AVOID even when the library says it's fine", () => {
    expect(judgeItem({ name: "peanut butter on toast" }, me).level).toBe("AVOID");
  });
  it("her triggers and tolerance history add caution", () => {
    expect(judgeItem({ name: "boerewors", preparation: "grilled" }, me).level).toBe("CAUTION");
    expect(judgeItem({ name: "chakalaka" }, me).reasons.some((x) => x.kind === "tolerance")).toBe(true);
    expect(judgeItem({ name: "pap" }, me).reasons.some((x) => /sits well/.test(x.text))).toBe(true);
  });
  it("the meal verdict is the worst item, and unknown outranks good", () => {
    expect(judgeMeal([{ name: "boiled egg" }, { name: "liver" }], none).overall).toBe("AVOID");
    expect(judgeMeal([{ name: "boiled egg" }, { name: "vetkoek" }], none).overall).toBe("UNKNOWN");
  });
});

describe("photo check: healthy-for-pregnancy guidance by food group", async () => {
  const { judgeItem, judgeMeal } = await import("@/lib/photo-verdict");
  const { FOOD_GROUPS, FOOD_GROUP_KEYS } = await import("@/lib/content/food-groups");
  const none = { allergies: "", nauseaTriggers: "", notTolerated: [], tolerated: [] };

  it("everyday foods outside the safety library now get a sourced answer", () => {
    const carrots = judgeItem({ name: "carrot sticks", group: "vegetables" }, none);
    expect(carrots.level).toBe("GOOD");
    expect(carrots.healthiness?.label).toBe("Great choice");
    expect(carrots.healthiness?.sources.length).toBeGreaterThan(0);
    expect(carrots.reasons.some((r) => /couldn't match/.test(r.text))).toBe(false);
  });
  it("foods to limit are flagged, alcohol is avoid", () => {
    expect(judgeItem({ name: "chocolate cake", group: "sweets-snacks" }, none).level).toBe("CAUTION");
    expect(judgeItem({ name: "red wine", group: "alcohol" }, none).level).toBe("AVOID");
  });
  it("specific safety rules still apply on top of the group", () => {
    expect(judgeItem({ name: "chicken livers", group: "meat-poultry" }, none).level).toBe("AVOID");
    expect(judgeItem({ name: "polony", group: "processed-meat" }, none).level).toBe("CAUTION");
  });
  it("an allergen never shows 'Great choice'", () => {
    const r = judgeItem({ name: "peanut butter", group: "nuts-seeds" }, { ...none, allergies: "peanuts" });
    expect(r.level).toBe("AVOID");
    expect(r.healthiness).toBeNull();
  });
  it("'other' or a missing group stays unknown rather than safe", () => {
    expect(judgeItem({ name: "mystery dish", group: "other" }, none).level).toBe("UNKNOWN");
    expect(judgeItem({ name: "mystery dish" }, none).level).toBe("UNKNOWN");
  });
  it("today's veggie platter would now get a full verdict", () => {
    const meal = judgeMeal([
      { name: "carrot sticks", group: "vegetables" }, { name: "cucumber", group: "vegetables" },
      { name: "hummus", group: "legumes" }, { name: "pita bread", group: "starches" }, { name: "crispbread", group: "wholegrains" },
    ], none);
    expect(meal.overall).toBe("GOOD");
  });
  it("every group except 'other' has written, sourced guidance", () => {
    for (const k of FOOD_GROUP_KEYS) if (k !== "other") {
      expect(FOOD_GROUPS[k].why.length).toBeGreaterThan(20);
      expect(FOOD_GROUPS[k].sources.length).toBeGreaterThan(0);
    }
  });
});

describe("monthly meal plan (December)", async () => {
  const { buildRangePlan, shoppingTrips, shoppingListForPlan, PLAN_SLOTS } = await import("@/lib/month-plan");
  const { templateByKey } = await import("@/lib/meal-templates");
  const plan = buildRangePlan({ start: "2026-12-01", end: "2026-12-31", avoid: [], prefer: [], gentle: false });

  it("covers every day of December with 3 meals and 2 snacks", () => {
    expect(new Set(plan.map((p) => p.date)).size).toBe(31);
    expect(plan.length).toBe(31 * PLAN_SLOTS.length);
    expect(plan.some((p) => p.slot === "EVENING_SNACK")).toBe(false);
  });
  it("adds variety: no slot repeats yesterday's meal, lunch differs from supper", () => {
    for (const p of plan) {
      const y = plan.find((q) => q.slot === p.slot && q.date === new Date(Date.parse(p.date) - 864e5).toISOString().slice(0, 10));
      if (y) expect(y.key).not.toBe(p.key);
    }
    for (const d of new Set(plan.map((p) => p.date))) {
      const l = plan.find((p) => p.date === d && p.slot === "LUNCH"), s = plan.find((p) => p.date === d && p.slot === "SUPPER");
      expect(l?.key).not.toBe(s?.key);
    }
  });
  it("never plans foods she didn't tolerate", () => {
    const p = buildRangePlan({ start: "2026-12-01", end: "2026-12-31", avoid: ["pilchards", "chicken"], prefer: [], gentle: false });
    expect(p.some((x) => /pilchard|chicken/i.test(templateByKey(x.key)!.title))).toBe(false);
  });
  it("leaves meals she already marked alone", () => {
    const p = buildRangePlan({ start: "2026-12-01", end: "2026-12-02", avoid: [], prefer: [], gentle: false, keep: [{ date: "2026-12-01", slot: "BREAKFAST" }] });
    expect(p.some((x) => x.date === "2026-12-01" && x.slot === "BREAKFAST")).toBe(false);
    expect(p.length).toBe(2 * PLAN_SLOTS.length - 1);
  });
  it("shops weekly: 1, 8, 15, 22 and 29 December", () => {
    const trips = shoppingTrips("2026-12-01", "2026-12-31");
    expect(trips.map((t) => t.date)).toEqual(["2026-12-01", "2026-12-08", "2026-12-15", "2026-12-22", "2026-12-29"]);
    expect(trips.at(-1)!.to).toBe("2026-12-31");
  });
  it("long-lasting items go on the first trip only; fresh items each week", () => {
    const trips = shoppingTrips("2026-12-01", "2026-12-31");
    const list = shoppingListForPlan(plan, trips);
    const maize = list.filter((i) => i.item === "maize");
    expect(maize.every((i) => i.shopDate === "2026-12-01")).toBe(true);
    expect(new Set(list.filter((i) => i.item === "bananas").map((i) => i.shopDate)).size).toBeGreaterThan(1);
  });
});
