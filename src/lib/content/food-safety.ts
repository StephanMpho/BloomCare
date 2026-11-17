import type { SourceId } from "./sources";

export type SafetyCategory = "SAFE_PREPARED" | "PRECAUTIONS" | "AVOID" | "ASK_CLINICIAN";
export const SAFETY_LABEL: Record<SafetyCategory, string> = {
  SAFE_PREPARED: "Generally safe when properly prepared",
  PRECAUTIONS: "Safe with limits or precautions",
  AVOID: "Avoid during pregnancy",
  ASK_CLINICIAN: "Requires individual clinical advice",
};

export type FoodSafetyEntry = {
  key: string;
  name: string;
  aliases: string[];
  category: SafetyCategory;
  summary: string;
  details: string[];
  alternatives?: string[];
  sources: SourceId[];
};

export const FOOD_SAFETY: FoodSafetyEntry[] = [
  { key: "polony", name: "Polony, viennas, russians & cold processed meats", aliases: ["polony", "vienna", "viennas", "russian", "frankfurter", "hot dog", "cold meat", "deli meat", "ham", "salami", "processed meat"],
    category: "PRECAUTIONS",
    summary: "Ready-to-eat processed meats can carry Listeria, which is especially dangerous in pregnancy. Don't eat them cold — only heated until steaming hot all the way through.",
    details: [
      "South Africa's 2017–18 listeriosis outbreak — one of the largest recorded — was linked to processed meat, including polony. The Department of Health advised against eating polony, viennas, russians and similar cold meats that are usually eaten without cooking.",
      "Heating until steaming hot throughout (e.g. pan-fried or simmered until piping hot in the centre) kills Listeria. Eat it straight away.",
      "Keep processed meat in the fridge, use by the date on the pack, and clean surfaces it touched.",
      "Polony is high in salt and low in many pregnancy nutrients, so it works best as a small part of a meal rather than the main food.",
    ],
    alternatives: ["Polony fried until steaming hot, in a sandwich", "Fully cooked egg (can be eaten cool once cooked and refrigerated)", "Pasteurised cheddar on crackers", "Peanut butter on toast", "Plain yoghurt"],
    sources: ["saListeria", "saColdMeat", "nhsFoods"] },
  { key: "eggs", name: "Eggs", aliases: ["egg", "eggs", "boiled egg", "scrambled egg", "mayonnaise", "mayo"], category: "SAFE_PREPARED",
    summary: "Eggs are a good source of protein and choline. Cook until the white and yolk are firm.",
    details: ["Avoid raw or runny eggs and foods containing raw egg (e.g. homemade mayonnaise, raw cake batter).", "Commercial shop-bought mayonnaise is made with pasteurised egg."],
    sources: ["nhsFoods"] },
  { key: "pilchards", name: "Pilchards / sardines (canned)", aliases: ["pilchard", "pilchards", "sardine", "sardines", "canned fish", "tinned fish"], category: "SAFE_PREPARED",
    summary: "Canned pilchards are a low-mercury oily fish — a useful, affordable source of protein, omega-3 and calcium.",
    details: ["Oily fish is generally advised in moderation (around 2 portions a week in NHS guidance).", "Refrigerate leftovers in a covered (non-tin) container."],
    sources: ["nhsFoods", "fdaFish"] },
  { key: "chicken", name: "Meat & poultry", aliases: ["chicken", "meat", "beef", "mince", "pork", "lamb", "boerewors", "steak", "braai"], category: "SAFE_PREPARED",
    summary: "Safe when cooked thoroughly with no pink meat or blood, especially poultry, pork, sausages and mince.",
    details: ["Avoid rare or undercooked meat.", "Wash hands, boards and knives after handling raw meat.", "Biltong and other cured, uncooked meats carry a small risk of toxoplasmosis and Listeria — many guidelines advise avoiding them; discuss with her clinician."],
    sources: ["nhsFoods"] },
  { key: "biltong", name: "Biltong & dry wors", aliases: ["biltong", "droewors", "dry wors", "cured meat", "jerky"], category: "ASK_CLINICIAN",
    summary: "Biltong is cured, not cooked. Guidance for cured meats varies; many sources advise avoiding or freezing first. Ask her clinician.",
    details: ["NHS advice says cold cured meats are safer if frozen for 4 days or cooked before eating.", "Choose reputable products and store them properly."],
    sources: ["nhsFoods"] },
  { key: "liver", name: "Liver & liver products", aliases: ["liver", "pate", "pâté", "chicken livers", "cod liver oil", "fish liver oil"], category: "AVOID",
    summary: "Avoid liver, liver pâté and fish-liver oils: they contain high amounts of vitamin A (retinol), which can harm the baby in large amounts.",
    details: ["Also avoid supplements containing vitamin A as retinol unless a clinician advises otherwise.", "Pâté of any kind (including vegetable) can carry Listeria."],
    sources: ["nhsFoods", "nhsVitamins"] },
  { key: "high-mercury-fish", name: "High-mercury fish", aliases: ["swordfish", "shark", "marlin", "king mackerel", "tilefish", "fresh tuna", "tuna steak"], category: "AVOID",
    summary: "Avoid shark, swordfish and marlin. Limit tuna.",
    details: ["Canned tuna is lower in mercury than fresh tuna steaks; limits differ between guidelines.", "Low-mercury choices include pilchards, sardines, salmon and hake."],
    sources: ["nhsFoods", "fdaFish"] },
  { key: "sushi", name: "Sushi & raw seafood", aliases: ["sushi", "sashimi", "raw fish", "oysters", "raw seafood", "smoked salmon"], category: "PRECAUTIONS",
    summary: "Raw or undercooked shellfish should be avoided. Raw fish in sushi is only advised if previously frozen; cold-smoked fish carries a Listeria risk unless cooked.",
    details: ["Cooked sushi (e.g. cooked prawn, vegetable) is a safer choice.", "Smoked salmon is safe when cooked until steaming hot (NHS)."],
    sources: ["nhsFoods"] },
  { key: "dairy", name: "Dairy & soft cheese", aliases: ["milk", "cheese", "feta", "brie", "camembert", "blue cheese", "yoghurt", "yogurt", "amasi", "maas", "raw milk", "goat cheese"], category: "PRECAUTIONS",
    summary: "Pasteurised milk, yoghurt and hard cheese are fine. Avoid unpasteurised (raw) milk and mould-ripened or soft blue cheeses unless cooked until steaming hot.",
    details: ["Pasteurised feta, cottage cheese, mozzarella and cream cheese are generally considered safe (NHS).", "Brie, camembert and soft blue cheeses should be cooked until steaming hot.", "Check homemade amasi/maas was made from pasteurised milk; shop-bought is pasteurised."],
    sources: ["nhsFoods"] },
  { key: "produce", name: "Fruit, vegetables & salads", aliases: ["fruit", "vegetables", "salad", "lettuce", "sprouts", "spinach", "apple", "banana"], category: "SAFE_PREPARED",
    summary: "Encouraged. Wash well to remove soil (toxoplasmosis risk). Pre-packed salads should be washed and eaten before the use-by date.",
    details: ["Raw sprouts (e.g. alfalfa) are best cooked."], sources: ["nhsFoods"] },
  { key: "caffeine", name: "Coffee, tea & caffeine", aliases: ["coffee", "tea", "caffeine", "cola", "coke", "chocolate", "rooibos"], category: "PRECAUTIONS",
    summary: "Limit caffeine to under 200 mg a day (roughly 2 mugs of instant coffee or 1 mug of filter coffee). Rooibos is naturally caffeine-free.",
    details: ["Caffeine is also in tea, cola, energy drinks and chocolate.", "Rooibos tea is caffeine-free; there's limited data on very large amounts of herbal teas."],
    sources: ["nhsFoods"] },
  { key: "energy-drinks", name: "Energy drinks", aliases: ["energy drink", "red bull", "monster", "dragon", "score"], category: "AVOID",
    summary: "Best avoided: high caffeine plus other stimulants with limited safety data in pregnancy.",
    details: ["If she needs fluids, choose water, diluted juice, rooibos or oral rehydration solution."], sources: ["nhsFoods"] },
  { key: "alcohol", name: "Alcohol", aliases: ["alcohol", "wine", "beer", "cider", "spirits", "umqombothi"], category: "AVOID",
    summary: "No amount of alcohol is known to be safe in pregnancy. Avoid completely.",
    details: ["If she drank before knowing she was pregnant, mention it to her clinician — no need to panic."], sources: ["nhsFoods", "acogNutrition"] },
  { key: "herbal", name: "Herbal remedies & supplements", aliases: ["herbal", "herbs", "muthi", "traditional medicine", "herbal tea", "supplement", "detox"], category: "ASK_CLINICIAN",
    summary: "Many herbal products haven't been tested in pregnancy and some are harmful. Check every remedy with her doctor or pharmacist before use.",
    details: ["Includes traditional medicines and 'detox' or slimming products.", "Ginger in normal food amounts is widely used for nausea; ginger supplements should still be checked."],
    sources: ["rcogGTG69", "nhsFoods"] },
  { key: "ginger", name: "Ginger", aliases: ["ginger", "ginger tea", "ginger biscuit", "ginger beer"], category: "PRECAUTIONS",
    summary: "Ginger in food and drinks is commonly suggested for mild nausea and is generally considered safe in normal amounts.",
    details: ["Ginger supplements/capsules: check with a clinician or pharmacist first.", "Ginger is not a treatment for severe vomiting — that needs medical care."],
    sources: ["rcogGTG69", "acogNVP"] },
  { key: "peanuts", name: "Peanuts & peanut butter", aliases: ["peanut", "peanuts", "peanut butter", "nuts"], category: "SAFE_PREPARED",
    summary: "Fine to eat in pregnancy unless she is allergic.", details: [], sources: ["nhsFoods"] },
  { key: "leftovers", name: "Leftovers & reheated food", aliases: ["leftovers", "reheated", "takeaway", "rice leftovers"], category: "PRECAUTIONS",
    summary: "Cool leftovers quickly, refrigerate, eat within 1–2 days, and reheat until steaming hot throughout.",
    details: ["Reheat only once."], sources: ["nhsFoods"] },
];

export function checkFood(query: string): FoodSafetyEntry[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  return FOOD_SAFETY.filter((e) => e.aliases.some((a) => a.includes(q) || q.includes(a)) || e.name.toLowerCase().includes(q));
}
