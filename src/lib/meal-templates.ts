// Nausea-friendly meal templates for the 7-day planner.
// Costs are ESTIMATES in ZAR cents for the portion shown — verify against real till slips.
// Ingredients feed the grocery-list generator (estimates per pack, labelled as such).

export type Slot = "BREAKFAST" | "MORNING_SNACK" | "LUNCH" | "AFTERNOON_SNACK" | "SUPPER" | "EVENING_SNACK";

export type Ingredient = { item: string; amount: number }; // amount = fraction of one pack used
export type MealTemplate = {
  key: string;
  title: string;
  slots: Slot[];
  portion: string;
  preparation: string;
  nutrients: string;
  alternative: string;
  safetyNote?: string;
  estCostCents: number;
  keywords: string[]; // matched against tolerance / aversion lists
  ingredients: Ingredient[];
  gentle: boolean; // suitable on hard nausea days
};

// One pack of each grocery item, with an estimated price (ZAR cents). Estimates only.
export const GROCERY_CATALOGUE: Record<string, { name: string; category: string; unit: string; estCents: number; cadence: "WEEKLY" | "MONTHLY" }> = {
  oats: { name: "Rolled oats 1 kg", category: "Grains", unit: "pack", estCents: 3500, cadence: "MONTHLY" },
  bananas: { name: "Bananas 1 kg", category: "Fruits", unit: "kg", estCents: 2500, cadence: "WEEKLY" },
  apples: { name: "Apples 1.5 kg bag", category: "Fruits", unit: "bag", estCents: 3500, cadence: "WEEKLY" },
  oranges: { name: "Oranges 1.5 kg bag", category: "Fruits", unit: "bag", estCents: 3000, cadence: "WEEKLY" },
  bread: { name: "Brown bread loaf", category: "Grains", unit: "loaf", estCents: 2000, cadence: "WEEKLY" },
  crackers: { name: "Cream crackers 200 g", category: "Snacks", unit: "box", estCents: 2200, cadence: "WEEKLY" },
  gingerBiscuits: { name: "Ginger biscuits 200 g", category: "Snacks", unit: "pack", estCents: 2000, cadence: "MONTHLY" },
  eggs: { name: "Eggs (18)", category: "Protein", unit: "tray", estCents: 6000, cadence: "WEEKLY" },
  milk: { name: "Milk 2 L (pasteurised)", category: "Dairy", unit: "bottle", estCents: 3500, cadence: "WEEKLY" },
  yoghurt: { name: "Plain yoghurt 1 kg", category: "Dairy", unit: "tub", estCents: 4000, cadence: "WEEKLY" },
  cheese: { name: "Cheddar 400 g", category: "Dairy", unit: "block", estCents: 6500, cadence: "MONTHLY" },
  maize: { name: "Maize meal 2.5 kg", category: "Grains", unit: "bag", estCents: 4000, cadence: "MONTHLY" },
  rice: { name: "White rice 2 kg", category: "Grains", unit: "bag", estCents: 4500, cadence: "MONTHLY" },
  potatoes: { name: "Potatoes 2 kg", category: "Vegetables", unit: "bag", estCents: 4000, cadence: "WEEKLY" },
  sweetPotatoes: { name: "Sweet potatoes 1 kg", category: "Vegetables", unit: "kg", estCents: 2500, cadence: "WEEKLY" },
  spinach: { name: "Spinach bunch", category: "Vegetables", unit: "bunch", estCents: 1800, cadence: "WEEKLY" },
  butternut: { name: "Butternut (whole)", category: "Vegetables", unit: "each", estCents: 2500, cadence: "WEEKLY" },
  carrots: { name: "Carrots 1 kg", category: "Vegetables", unit: "kg", estCents: 1800, cadence: "WEEKLY" },
  beans: { name: "Canned sugar beans 410 g", category: "Protein", unit: "can", estCents: 1800, cadence: "WEEKLY" },
  lentils: { name: "Brown lentils 500 g", category: "Protein", unit: "pack", estCents: 3000, cadence: "MONTHLY" },
  chicken: { name: "Chicken breast fillets 500 g", category: "Protein", unit: "pack", estCents: 6000, cadence: "WEEKLY" },
  pilchards: { name: "Pilchards in tomato 400 g", category: "Protein", unit: "can", estCents: 2800, cadence: "WEEKLY" },
  peanutButter: { name: "Peanut butter 400 g", category: "Cooking essentials", unit: "jar", estCents: 4000, cadence: "MONTHLY" },
  ginger: { name: "Fresh ginger root", category: "Hydration essentials", unit: "piece", estCents: 1000, cadence: "WEEKLY" },
  ors: { name: "Oral rehydration sachets (pharmacy)", category: "Hydration essentials", unit: "box", estCents: 4500, cadence: "MONTHLY" },
  rooibos: { name: "Rooibos tea 80 bags", category: "Hydration essentials", unit: "box", estCents: 3500, cadence: "MONTHLY" },
  soupVeg: { name: "Soup vegetables pack", category: "Vegetables", unit: "pack", estCents: 3000, cadence: "WEEKLY" },
  jelly: { name: "Jelly powder 80 g", category: "Snacks", unit: "sachet", estCents: 1200, cadence: "MONTHLY" },
  oil: { name: "Sunflower oil 750 ml", category: "Cooking essentials", unit: "bottle", estCents: 3500, cadence: "MONTHLY" },
  salt: { name: "Iodised salt 1 kg", category: "Cooking essentials", unit: "pack", estCents: 1200, cadence: "MONTHLY" },
};

export const MEAL_TEMPLATES: MealTemplate[] = [
  { key: "oats-banana", title: "Soft oats with banana", slots: ["BREAKFAST"], portion: "½ cup cooked oats + ½ banana, adjusted to tolerance",
    preparation: "Cook oats thoroughly in water or milk; top with sliced banana. Let it cool a little — cooler food smells less.",
    nutrients: "Fibre, carbohydrate, some B vitamins", alternative: "Dry toast or plain crackers if oats aren't manageable",
    estCostCents: 900, keywords: ["oats", "banana", "porridge"], ingredients: [{ item: "oats", amount: 0.05 }, { item: "bananas", amount: 0.06 }, { item: "milk", amount: 0.06 }], gentle: true },
  { key: "dry-toast", title: "Dry toast with a thin spread of peanut butter", slots: ["BREAKFAST", "MORNING_SNACK", "EVENING_SNACK"], portion: "1 slice, eaten slowly",
    preparation: "Toast lightly; skip the spread on harder days.", nutrients: "Carbohydrate; protein and fat from peanut butter",
    alternative: "Cream crackers", estCostCents: 300, keywords: ["toast", "bread", "peanut butter"], ingredients: [{ item: "bread", amount: 0.05 }, { item: "peanutButter", amount: 0.03 }], gentle: true },
  { key: "pap-milk", title: "Soft maize porridge with milk", slots: ["BREAKFAST", "SUPPER"], portion: "1 small bowl",
    preparation: "Cook soft porridge thoroughly; add a little warm or cool milk.", nutrients: "Carbohydrate (SA maize meal is fortified); calcium & protein from milk",
    alternative: "Oats or plain toast", estCostCents: 400, keywords: ["pap", "maize", "porridge", "milk"], ingredients: [{ item: "maize", amount: 0.04 }, { item: "milk", amount: 0.1 }], gentle: true },
  { key: "egg-toast", title: "Scrambled egg on toast", slots: ["BREAKFAST", "LUNCH"], portion: "1 egg + 1 slice toast",
    preparation: "Scramble until fully set with no runny parts.", nutrients: "Protein, choline, B12", alternative: "Peanut butter toast",
    safetyNote: "Eggs must be fully cooked.", estCostCents: 600, keywords: ["egg", "toast", "bread"], ingredients: [{ item: "eggs", amount: 0.06 }, { item: "bread", amount: 0.05 }], gentle: false },
  { key: "crackers", title: "Plain crackers", slots: ["MORNING_SNACK", "AFTERNOON_SNACK", "EVENING_SNACK"], portion: "3–4 crackers, small nibbles",
    preparation: "Keep a few beside the bed — some people find eating before getting up helps.", nutrients: "Carbohydrate",
    alternative: "Ginger biscuits", estCostCents: 300, keywords: ["crackers", "cracker"], ingredients: [{ item: "crackers", amount: 0.15 }], gentle: true },
  { key: "banana-snack", title: "Banana", slots: ["MORNING_SNACK", "AFTERNOON_SNACK"], portion: "½–1 banana",
    preparation: "Eat at room temperature or slightly chilled.", nutrients: "Carbohydrate, potassium, some folate",
    alternative: "Apple slices", estCostCents: 300, keywords: ["banana"], ingredients: [{ item: "bananas", amount: 0.12 }], gentle: true },
  { key: "yoghurt-fruit", title: "Cool plain yoghurt with apple", slots: ["MORNING_SNACK", "AFTERNOON_SNACK", "EVENING_SNACK"], portion: "½ cup yoghurt + a few apple slices",
    preparation: "Serve cold. Use pasteurised yoghurt.", nutrients: "Calcium, protein", alternative: "Glass of cold milk",
    estCostCents: 700, keywords: ["yoghurt", "yogurt", "apple"], ingredients: [{ item: "yoghurt", amount: 0.12 }, { item: "apples", amount: 0.1 }], gentle: true },
  { key: "ginger-biscuits", title: "Ginger biscuits", slots: ["AFTERNOON_SNACK", "EVENING_SNACK"], portion: "1–2 biscuits",
    preparation: "Ready to eat.", nutrients: "Carbohydrate", alternative: "Plain crackers",
    estCostCents: 200, keywords: ["ginger", "biscuit"], ingredients: [{ item: "gingerBiscuits", amount: 0.1 }], gentle: true },
  { key: "orange-wedges", title: "Cold orange wedges", slots: ["MORNING_SNACK", "AFTERNOON_SNACK"], portion: "1 orange",
    preparation: "Chill first — cold, tart fruit is often easier.", nutrients: "Vitamin C (helps iron absorption), some folate",
    alternative: "Apple slices", estCostCents: 300, keywords: ["orange"], ingredients: [{ item: "oranges", amount: 0.12 }], gentle: true },
  { key: "potato-butternut", title: "Mashed potato & butternut", slots: ["LUNCH", "SUPPER"], portion: "½–1 cup, small portion",
    preparation: "Boil until soft, mash with a little milk. Plain and mild.", nutrients: "Carbohydrate, vitamin A (from butternut)",
    alternative: "Plain rice", estCostCents: 900, keywords: ["potato", "butternut", "pumpkin", "mash"], ingredients: [{ item: "potatoes", amount: 0.1 }, { item: "butternut", amount: 0.3 }, { item: "milk", amount: 0.03 }], gentle: true },
  { key: "veg-soup", title: "Mild vegetable soup", slots: ["LUNCH", "SUPPER"], portion: "1 cup, sipped slowly",
    preparation: "Simmer soup vegetables until soft; blend if easier. Counts toward fluids too.", nutrients: "Fluids, some vitamins & fibre",
    alternative: "Plain broth with crackers", estCostCents: 900, keywords: ["soup"], ingredients: [{ item: "soupVeg", amount: 0.3 }], gentle: true },
  { key: "chicken-rice", title: "Plain chicken & rice", slots: ["LUNCH", "SUPPER"], portion: "Small piece of chicken + ½ cup rice",
    preparation: "Poach or bake chicken until fully cooked (no pink). Keep seasoning mild; open a window to reduce smells.",
    nutrients: "Protein, choline, B12", alternative: "Beans and rice, or scrambled egg", safetyNote: "Cook chicken thoroughly.",
    estCostCents: 2200, keywords: ["chicken", "rice"], ingredients: [{ item: "chicken", amount: 0.25 }, { item: "rice", amount: 0.05 }], gentle: false },
  { key: "pilchards-pap", title: "Pilchards with soft pap", slots: ["LUNCH", "SUPPER"], portion: "½ can + small bowl pap",
    preparation: "Heat pilchards through. If the smell is a trigger, choose another protein today.", nutrients: "Protein, omega-3, calcium (soft bones)",
    alternative: "Egg or beans with pap", estCostCents: 1700, keywords: ["pilchards", "fish", "pap"], ingredients: [{ item: "pilchards", amount: 0.5 }, { item: "maize", amount: 0.04 }], gentle: false },
  { key: "beans-rice", title: "Sugar beans with rice", slots: ["LUNCH", "SUPPER"], portion: "½ cup beans + ½ cup rice",
    preparation: "Heat canned beans thoroughly; serve with plain rice.", nutrients: "Protein, fibre, iron, folate",
    alternative: "Lentils with rice", estCostCents: 1100, keywords: ["beans", "rice"], ingredients: [{ item: "beans", amount: 0.5 }, { item: "rice", amount: 0.05 }], gentle: false },
  { key: "lentil-stew", title: "Mild lentil & carrot stew", slots: ["LUNCH", "SUPPER"], portion: "1 small bowl",
    preparation: "Simmer lentils with carrots until soft; season with iodised salt.", nutrients: "Protein, fibre, iron, folate",
    alternative: "Beans and rice", estCostCents: 1000, keywords: ["lentil", "carrot", "stew"], ingredients: [{ item: "lentils", amount: 0.2 }, { item: "carrots", amount: 0.15 }, { item: "salt", amount: 0.01 }], gentle: false },
  { key: "sweet-potato-spinach", title: "Sweet potato with spinach & cheese", slots: ["LUNCH", "SUPPER"], portion: "1 small sweet potato + ½ cup spinach",
    preparation: "Bake or boil sweet potato; wash spinach well and cook until wilted; grate a little pasteurised cheddar on top.",
    nutrients: "Folate, iron, calcium, vitamin A, fibre", alternative: "Mashed potato & butternut",
    estCostCents: 1400, keywords: ["sweet potato", "spinach", "cheese"], ingredients: [{ item: "sweetPotatoes", amount: 0.15 }, { item: "spinach", amount: 0.3 }, { item: "cheese", amount: 0.05 }], gentle: false },
  { key: "jelly", title: "Cool jelly", slots: ["EVENING_SNACK", "AFTERNOON_SNACK"], portion: "½ cup",
    preparation: "Make ahead and keep in the fridge — cool and easy on hard days.", nutrients: "Mostly fluid and sugar",
    alternative: "Ice lolly", estCostCents: 300, keywords: ["jelly"], ingredients: [{ item: "jelly", amount: 0.25 }], gentle: true },
];

export const SLOTS: Slot[] = ["BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "SUPPER", "EVENING_SNACK"];

export const MEAL_LABEL: Record<string, string> = {
  BREAKFAST: "Breakfast", MORNING_SNACK: "Morning snack", LUNCH: "Lunch", AFTERNOON_SNACK: "Afternoon snack",
  SUPPER: "Supper", EVENING_SNACK: "Evening snack", DRINKS: "Drinks",
};

export function templateByKey(key: string | null | undefined) {
  return MEAL_TEMPLATES.find((t) => t.key === key);
}

function matches(t: MealTemplate, words: string[]) {
  const lower = words.map((w) => w.toLowerCase().trim()).filter(Boolean);
  return lower.some((w) => t.keywords.some((k) => w.includes(k) || k.includes(w)) || t.title.toLowerCase().includes(w));
}

/**
 * Transparent selection rules:
 *  1. Exclude templates matching foods she logged as not tolerated or listed as triggers.
 *  2. On a "gentle" plan (hard nausea days) only use gentle templates.
 *  3. Prefer templates matching foods she has logged as tolerated.
 *  4. Rotate through the remaining options so the week has variety.
 */
export function chooseTemplates(opts: {
  slot: Slot; avoid: string[]; prefer: string[]; gentleOnly: boolean; dayIndex: number; exclude?: string[];
}): MealTemplate[] {
  let pool = MEAL_TEMPLATES.filter((t) => t.slots.includes(opts.slot));
  pool = pool.filter((t) => !matches(t, opts.avoid));
  if (opts.gentleOnly) pool = pool.filter((t) => t.gentle);
  if (opts.exclude?.length) {
    const rest = pool.filter((t) => !opts.exclude!.includes(t.key));
    if (rest.length) pool = rest;
  }
  const preferred = pool.filter((t) => matches(t, opts.prefer));
  const others = pool.filter((t) => !preferred.includes(t));
  const rot = <T,>(a: T[]) => (a.length ? [...a.slice(opts.dayIndex % a.length), ...a.slice(0, opts.dayIndex % a.length)] : a);
  return [...rot(preferred), ...rot(others)];
}

/** Aggregate meal-plan ingredient fractions into whole packs to buy. */
export function aggregateIngredients(templateKeys: string[]) {
  const totals = new Map<string, number>();
  for (const k of templateKeys) {
    const t = templateByKey(k);
    if (!t) continue;
    for (const ing of t.ingredients) totals.set(ing.item, (totals.get(ing.item) ?? 0) + ing.amount);
  }
  return [...totals.entries()]
    .filter(([item]) => GROCERY_CATALOGUE[item])
    .map(([item, frac]) => {
      const c = GROCERY_CATALOGUE[item];
      const packs = Math.max(1, Math.ceil(frac - 1e-9));
      return { item, name: c.name, category: c.category, unit: c.unit, quantity: packs, estCostCents: packs * c.estCents, cadence: c.cadence };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
