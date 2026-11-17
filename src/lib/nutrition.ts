import { NUTRIENT_KEYS, type NutrientKey } from "./foods-data";

export type FoodNutrients = Partial<Record<NutrientKey, number | null>>;
export type LoggedItem = { grams: number | null; amountEaten: "FULL" | "PARTIAL" | "FEW_BITES"; food: FoodNutrients | null };

// Rough share of the portion eaten when not fully finished. Stated in the UI.
export const AMOUNT_FACTOR = { FULL: 1, PARTIAL: 0.5, FEW_BITES: 0.15 } as const;

export type NutrientTotals = Record<NutrientKey, { value: number; itemsWithData: number }>;

/**
 * Sum nutrients across logged items. For every nutrient we also count how many
 * items actually had data, so the UI can say "based on 3 of 5 items".
 */
export function sumNutrients(items: LoggedItem[]): { totals: NutrientTotals; itemCount: number } {
  const totals = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, { value: 0, itemsWithData: 0 }])) as NutrientTotals;
  for (const it of items) {
    if (!it.food || it.grams == null) continue;
    const factor = (it.grams / 100) * AMOUNT_FACTOR[it.amountEaten];
    for (const k of NUTRIENT_KEYS) {
      const v = it.food[k];
      if (v == null) continue;
      totals[k].value += v * factor;
      totals[k].itemsWithData += 1;
    }
  }
  return { totals, itemCount: items.length };
}

export function round(v: number, unit: string) {
  if (unit === "µg" && v < 10) return v.toFixed(1);
  if (v < 10) return v.toFixed(1);
  return Math.round(v).toString();
}
