// Turns per-shop grocery rows into one line per product for the month overview:
// "Bananas 1 kg: 1 each week (5 shops) ≈ R85". Pure, so it can be unit-tested.

export type OverviewInput = {
  name: string; category: string; unit: string; quantity: number; estCostCents: number; actualCostCents: number | null;
  cadence: "WEEKLY" | "MONTHLY" | "QUARTERLY"; purchased: boolean; inPantry: boolean; shopDate: string | null; notes: string;
};

export type OverviewRow = {
  name: string; category: string; unit: string; cadence: OverviewInput["cadence"];
  perShop: number[]; shops: number; totalQty: number; totalCents: number; bought: number; atHome: boolean; note: string;
};

export function monthOverview(items: OverviewInput[]) {
  const map = new Map<string, OverviewRow>();
  for (const i of items) {
    const key = `${i.cadence}|${i.name}`;
    const row = map.get(key) ?? { name: i.name, category: i.category, unit: i.unit, cadence: i.cadence, perShop: [], shops: 0, totalQty: 0, totalCents: 0, bought: 0, atHome: false, note: i.notes };
    row.perShop.push(i.quantity);
    row.shops += 1;
    row.totalQty += i.quantity;
    if (!i.inPantry) row.totalCents += i.purchased ? (i.actualCostCents ?? i.estCostCents) : i.estCostCents;
    if (i.purchased) row.bought += 1;
    if (i.inPantry) row.atHome = true;
    map.set(key, row);
  }
  const sort = (a: OverviewRow, b: OverviewRow) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  const rows = [...map.values()];
  const section = (c: OverviewInput["cadence"]) => rows.filter((r) => r.cadence === c).sort(sort);
  const sum = (rs: OverviewRow[]) => rs.reduce((a, r) => a + r.totalCents, 0);
  const weekly = section("WEEKLY"), monthly = section("MONTHLY"), quarterly = section("QUARTERLY");
  return {
    weekly, monthly, quarterly,
    totals: { weekly: sum(weekly), monthly: sum(monthly), quarterly: sum(quarterly), all: sum(rows) },
  };
}

/** Pack counts (names already include the size): "× 1 each week · 5 shops", "× 1–2 each week", "× 3". */
export function quantityText(r: OverviewRow) {
  if (r.cadence !== "WEEKLY") return `× ${r.totalQty}`;
  const lo = Math.min(...r.perShop), hi = Math.max(...r.perShop);
  return `× ${lo === hi ? lo : `${lo}–${hi}`} each week · ${r.shops} shop${r.shops === 1 ? "" : "s"}`;
}
