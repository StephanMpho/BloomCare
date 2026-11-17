// Overlap check across recorded supplements. Informational only — it flags
// ingredients that appear in more than one product so she can ask a pharmacist.
export type SupplementLike = { name: string; ingredients: string[]; active: boolean };

const NORMALISE: Record<string, string> = {
  "folic acid": "folate", folate: "folate", "methylfolate": "folate", "5-mthf": "folate",
  iron: "iron", "ferrous sulfate": "iron", "ferrous sulphate": "iron", "ferrous fumarate": "iron",
  iodine: "iodine", "potassium iodide": "iodine",
  "vitamin d": "vitamin D", "vitamin d3": "vitamin D", cholecalciferol: "vitamin D",
  calcium: "calcium", "calcium carbonate": "calcium",
  "vitamin a": "vitamin A", retinol: "vitamin A (retinol)", "retinyl palmitate": "vitamin A (retinol)", "beta-carotene": "beta-carotene",
  "vitamin b12": "vitamin B12", cobalamin: "vitamin B12", cyanocobalamin: "vitamin B12",
  zinc: "zinc", "omega-3": "omega-3", dha: "omega-3", "fish oil": "omega-3", "cod liver oil": "vitamin A (retinol)",
};

export function normaliseIngredient(s: string) {
  const k = s.toLowerCase().trim();
  return NORMALISE[k] ?? k;
}

export function findOverlaps(list: SupplementLike[]) {
  const map = new Map<string, string[]>();
  for (const s of list.filter((x) => x.active)) {
    for (const ing of new Set(s.ingredients.map(normaliseIngredient).filter(Boolean))) {
      map.set(ing, [...(map.get(ing) ?? []), s.name]);
    }
  }
  return [...map.entries()].filter(([, names]) => names.length > 1).map(([ingredient, products]) => ({ ingredient, products }));
}

export function hasRetinol(list: SupplementLike[]) {
  return list.filter((s) => s.active && s.ingredients.map(normaliseIngredient).includes("vitamin A (retinol)")).map((s) => s.name);
}
