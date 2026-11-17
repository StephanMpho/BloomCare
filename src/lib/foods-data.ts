// Reference food list for the food search.
//
// NUTRIENT VALUES — please read:
//  • Values are per 100 g and are approximate reference values drawn from the
//    USDA FoodData Central "SR Legacy" dataset for the closest generic food.
//  • They are NOT South African food-composition data (SAFOODS / SAMRC). South
//    African bread, maize meal and some cereals are fortified by law, so local
//    values differ — those foods are deliberately left without nutrient data and
//    users are pointed to the pack label instead.
//  • `null` means "no reliable value" and is shown as missing — never as zero.
//  • Before clinical use, have a dietitian verify these values or replace them
//    with licensed SAFOODS data (see README → "Nutrient data").

export type FoodSeed = {
  key: string;
  name: string;
  category: FoodCategory;
  servingLabel: string;
  servingGrams: number;
  n?: Partial<Record<NutrientKey, number | null>>;
  safetyNote?: string;
};

export type FoodCategory =
  | "Grains & starches" | "Fruit" | "Vegetables" | "Protein" | "Dairy"
  | "Fats & spreads" | "Snacks" | "Drinks" | "Processed meat";

export const NUTRIENT_KEYS = ["proteinG", "carbsG", "fatG", "fibreG", "ironMg", "calciumMg", "folateUg", "b12Ug", "cholineMg"] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

const USDA = "Approx. USDA FoodData Central (SR Legacy), per 100 g — not SA-specific";
const LABEL = "No reliable generic value — SA product may be fortified; check the pack label";

export const FOOD_SEEDS: FoodSeed[] = [
  { key: "maize-porridge-soft", name: "Soft maize porridge (pap)", category: "Grains & starches", servingLabel: "1 small bowl (200 g cooked)", servingGrams: 200 },
  { key: "oats-cooked", name: "Oats, cooked with water", category: "Grains & starches", servingLabel: "½ cup cooked (120 g)", servingGrams: 120,
    n: { proteinG: 2.5, carbsG: 12, fatG: 1.5, fibreG: 1.7, ironMg: 0.9, calciumMg: 9, folateUg: 6, b12Ug: 0, cholineMg: null } },
  { key: "brown-bread", name: "Brown bread", category: "Grains & starches", servingLabel: "1 slice (35 g)", servingGrams: 35 },
  { key: "white-toast", name: "White toast", category: "Grains & starches", servingLabel: "1 slice (30 g)", servingGrams: 30 },
  { key: "rice-white-cooked", name: "White rice, cooked", category: "Grains & starches", servingLabel: "½ cup (90 g)", servingGrams: 90,
    n: { proteinG: 2.7, carbsG: 28.2, fatG: 0.3, fibreG: 0.4, ironMg: null, calciumMg: 10, folateUg: null, b12Ug: 0, cholineMg: 2.1 } },
  { key: "potato-boiled", name: "Potato, boiled (no skin)", category: "Grains & starches", servingLabel: "1 medium (150 g)", servingGrams: 150,
    n: { proteinG: 1.7, carbsG: 20, fatG: 0.1, fibreG: 1.8, ironMg: 0.3, calciumMg: 8, folateUg: 9, b12Ug: 0, cholineMg: null } },
  { key: "sweet-potato-baked", name: "Sweet potato, baked", category: "Grains & starches", servingLabel: "1 small (130 g)", servingGrams: 130,
    n: { proteinG: 2.0, carbsG: 20.7, fatG: 0.2, fibreG: 3.3, ironMg: 0.7, calciumMg: 38, folateUg: 6, b12Ug: 0, cholineMg: 13.1 } },
  { key: "crackers-wholewheat", name: "Whole-wheat crackers", category: "Snacks", servingLabel: "4 crackers (30 g)", servingGrams: 30 },
  { key: "crackers-cream", name: "Cream crackers / plain biscuits", category: "Snacks", servingLabel: "3 crackers (25 g)", servingGrams: 25 },
  { key: "ginger-biscuits", name: "Ginger biscuits", category: "Snacks", servingLabel: "2 biscuits (20 g)", servingGrams: 20 },
  { key: "banana", name: "Banana", category: "Fruit", servingLabel: "1 medium (118 g)", servingGrams: 118,
    n: { proteinG: 1.1, carbsG: 22.8, fatG: 0.3, fibreG: 2.6, ironMg: 0.3, calciumMg: 5, folateUg: 20, b12Ug: 0, cholineMg: 9.8 } },
  { key: "apple", name: "Apple", category: "Fruit", servingLabel: "1 medium (180 g)", servingGrams: 180,
    n: { proteinG: 0.3, carbsG: 13.8, fatG: 0.2, fibreG: 2.4, ironMg: 0.1, calciumMg: 6, folateUg: 3, b12Ug: 0, cholineMg: 3.4 } },
  { key: "orange", name: "Orange", category: "Fruit", servingLabel: "1 medium (130 g)", servingGrams: 130,
    n: { proteinG: 0.9, carbsG: 11.8, fatG: 0.1, fibreG: 2.4, ironMg: 0.1, calciumMg: 40, folateUg: 30, b12Ug: 0, cholineMg: 8.4 } },
  { key: "avocado", name: "Avocado", category: "Fats & spreads", servingLabel: "¼ avocado (50 g)", servingGrams: 50,
    n: { proteinG: 2.0, carbsG: 8.5, fatG: 14.7, fibreG: 6.7, ironMg: 0.6, calciumMg: 12, folateUg: 81, b12Ug: 0, cholineMg: 14.2 } },
  { key: "spinach-cooked", name: "Spinach, cooked", category: "Vegetables", servingLabel: "½ cup (90 g)", servingGrams: 90,
    n: { proteinG: 3.0, carbsG: 3.8, fatG: 0.3, fibreG: 2.4, ironMg: 3.6, calciumMg: 136, folateUg: 146, b12Ug: 0, cholineMg: 19.3 } },
  { key: "pumpkin-cooked", name: "Pumpkin / butternut, cooked", category: "Vegetables", servingLabel: "½ cup (120 g)", servingGrams: 120,
    n: { proteinG: 0.7, carbsG: 4.9, fatG: 0.1, fibreG: 1.1, ironMg: 0.6, calciumMg: 15, folateUg: 9, b12Ug: 0, cholineMg: null } },
  { key: "carrots-cooked", name: "Carrots, cooked", category: "Vegetables", servingLabel: "½ cup (78 g)", servingGrams: 78,
    n: { proteinG: 0.8, carbsG: 8.2, fatG: 0.2, fibreG: 3.0, ironMg: 0.3, calciumMg: 30, folateUg: 14, b12Ug: 0, cholineMg: null } },
  { key: "beans-cooked", name: "Beans (sugar / kidney), cooked", category: "Protein", servingLabel: "½ cup (90 g)", servingGrams: 90,
    n: { proteinG: 8.7, carbsG: 22.8, fatG: 0.5, fibreG: 7.4, ironMg: 2.9, calciumMg: 35, folateUg: 130, b12Ug: 0, cholineMg: 30.5 } },
  { key: "lentils-cooked", name: "Lentils, cooked", category: "Protein", servingLabel: "½ cup (100 g)", servingGrams: 100,
    n: { proteinG: 9.0, carbsG: 20.1, fatG: 0.4, fibreG: 7.9, ironMg: 3.3, calciumMg: 19, folateUg: 181, b12Ug: 0, cholineMg: 32.7 } },
  { key: "egg-cooked", name: "Egg, fully cooked (boiled/scrambled)", category: "Protein", servingLabel: "1 large egg (50 g)", servingGrams: 50,
    n: { proteinG: 12.6, carbsG: 1.1, fatG: 10.6, fibreG: 0, ironMg: 1.2, calciumMg: 50, folateUg: 44, b12Ug: 1.1, cholineMg: 294 },
    safetyNote: "Cook until white and yolk are firm." },
  { key: "chicken-cooked", name: "Chicken breast, cooked (no skin)", category: "Protein", servingLabel: "1 palm-sized piece (90 g)", servingGrams: 90,
    n: { proteinG: 31, carbsG: 0, fatG: 3.6, fibreG: 0, ironMg: 1.0, calciumMg: 15, folateUg: 4, b12Ug: 0.3, cholineMg: 85.3 },
    safetyNote: "Cook until juices run clear and there's no pink meat." },
  { key: "pilchards-tomato", name: "Pilchards in tomato sauce (canned)", category: "Protein", servingLabel: "½ can drained (100 g)", servingGrams: 100,
    n: { proteinG: 20.9, carbsG: 0.7, fatG: 10.5, fibreG: null, ironMg: 2.3, calciumMg: 240, folateUg: null, b12Ug: null, cholineMg: null },
    safetyNote: "Canned oily fish is a low-mercury choice. Refrigerate leftovers in a covered container and use within 1–2 days." },
  { key: "peanut-butter", name: "Peanut butter", category: "Fats & spreads", servingLabel: "1 tbsp (16 g)", servingGrams: 16,
    n: { proteinG: 22.2, carbsG: 19.6, fatG: 51.4, fibreG: 6, ironMg: 1.7, calciumMg: 43, folateUg: null, b12Ug: 0, cholineMg: 63 } },
  { key: "milk-full-cream", name: "Milk, full cream (pasteurised)", category: "Dairy", servingLabel: "1 cup (250 ml)", servingGrams: 250,
    n: { proteinG: 3.2, carbsG: 4.8, fatG: 3.3, fibreG: 0, ironMg: 0, calciumMg: 113, folateUg: 5, b12Ug: 0.45, cholineMg: 14.3 } },
  { key: "yoghurt-plain", name: "Plain yoghurt (pasteurised)", category: "Dairy", servingLabel: "½ cup (125 g)", servingGrams: 125,
    n: { proteinG: 3.5, carbsG: 4.7, fatG: 3.3, fibreG: 0, ironMg: 0.1, calciumMg: 121, folateUg: 7, b12Ug: 0.37, cholineMg: 15.2 } },
  { key: "cheddar", name: "Cheddar cheese (pasteurised)", category: "Dairy", servingLabel: "1 matchbox piece (30 g)", servingGrams: 30,
    n: { proteinG: 24.9, carbsG: 1.3, fatG: 33.1, fibreG: 0, ironMg: 0.7, calciumMg: 721, folateUg: 18, b12Ug: 0.83, cholineMg: 16.5 } },
  { key: "polony", name: "Polony", category: "Processed meat", servingLabel: "2 slices (40 g)", servingGrams: 40,
    safetyNote: "Ready-to-eat processed meat: Listeria risk in pregnancy. Only eat if heated until steaming hot throughout — see the Food Safety guide." },
  { key: "viennas", name: "Viennas / frankfurters", category: "Processed meat", servingLabel: "2 viennas (80 g)", servingGrams: 80,
    safetyNote: "Listeria risk — heat until steaming hot throughout; don't eat cold." },
  { key: "soup-veg", name: "Vegetable soup (homemade)", category: "Vegetables", servingLabel: "1 cup (250 ml)", servingGrams: 250 },
  { key: "jelly", name: "Jelly", category: "Snacks", servingLabel: "½ cup (120 g)", servingGrams: 120 },
  { key: "ice-lolly", name: "Ice lolly", category: "Snacks", servingLabel: "1 lolly", servingGrams: 60 },
];

export function seedNutrientSource(f: FoodSeed) {
  if (!f.n) return LABEL;
  return USDA;
}

// General pregnancy reference intakes (US National Academies DRIs — RDA/AI for pregnancy, age 19–50).
// Shown as context only. A day's food log is never a diagnosis of deficiency or adequacy.
export const PREGNANCY_REFERENCE: Record<NutrientKey, { label: string; unit: string; ref: number | null; note?: string }> = {
  proteinG: { label: "Protein", unit: "g", ref: 71 },
  carbsG: { label: "Carbohydrate", unit: "g", ref: 175 },
  fatG: { label: "Fat", unit: "g", ref: null },
  fibreG: { label: "Fibre", unit: "g", ref: 28 },
  ironMg: { label: "Iron", unit: "mg", ref: 27 },
  calciumMg: { label: "Calcium", unit: "mg", ref: 1000 },
  folateUg: { label: "Folate", unit: "µg", ref: 600, note: "DFE; supplements are usually advised in addition — ask her clinician" },
  b12Ug: { label: "Vitamin B12", unit: "µg", ref: 2.6 },
  cholineMg: { label: "Choline", unit: "mg", ref: 450 },
};
