import { daysInMonth } from "./dates";

export type BudgetItem = { estCostCents: number; actualCostCents: number | null; purchased: boolean; inPantry: boolean; category: string };

export function budgetSummary(items: BudgetItem[], budgetCents: number, month: string, todayIso: string) {
  const spent = items.filter((i) => i.purchased).reduce((s, i) => s + (i.actualCostCents ?? i.estCostCents), 0);
  // Pantry items are not counted toward planned cost until a new purchase is needed.
  const planned = items.filter((i) => !i.purchased && !i.inPantry).reduce((s, i) => s + i.estCostCents, 0);
  const dim = daysInMonth(month);
  const isCurrent = todayIso.slice(0, 7) === month;
  const elapsed = isCurrent ? Number(todayIso.slice(8, 10)) : todayIso.slice(0, 7) > month ? dim : 0;
  const weeksElapsed = Math.max(1, elapsed / 7);
  const weeklyAverage = elapsed > 0 ? Math.round(spent / weeksElapsed) : 0;
  const projected = spent + planned;
  const byCategory: Record<string, number> = {};
  for (const i of items.filter((x) => x.purchased)) byCategory[i.category] = (byCategory[i.category] ?? 0) + (i.actualCostCents ?? i.estCostCents);
  return {
    budget: budgetCents,
    spent,
    remaining: budgetCents - spent,
    planned,
    projected,
    projectedOver: projected > budgetCents,
    weeklyAverage,
    pantryCount: items.filter((i) => i.inPantry && !i.purchased).length,
    byCategory,
    usesEstimates: items.some((i) => i.purchased && i.actualCostCents == null),
  };
}
