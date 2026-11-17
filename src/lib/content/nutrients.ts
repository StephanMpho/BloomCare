import type { SourceId } from "./sources";

export type NutrientGuide = {
  key: string;
  name: string;
  role: string;
  guidance: string;
  foods: string[];
  preparation: string;
  supplements: string;
  whenToAsk: string;
  sources: SourceId[];
};

export const NUTRIENT_GUIDE: NutrientGuide[] = [
  { key: "folate", name: "Folate / folic acid", role: "Supports the early development of the baby's neural tube (which becomes the brain and spinal cord).",
    guidance: "General guidance is to take a folic acid supplement in early pregnancy (the NHS advises 400 micrograms daily until 12 weeks; WHO recommends daily folic acid as part of routine antenatal care). Some people need a higher, prescribed dose.",
    foods: ["Spinach and other dark leafy greens", "Beans and lentils", "Oranges", "Avocado", "Fortified bread and maize meal (fortified by law in SA)"],
    preparation: "Wash greens well; steam or cook briefly to retain folate.",
    supplements: "Usually advised as a supplement — food alone is not relied on. Ask her clinic or pharmacist which product and dose is right for her.",
    whenToAsk: "Now — this is time-sensitive in early pregnancy. Ask at the first clinic or doctor visit, or a pharmacist today.", sources: ["nhsVitamins", "whoANC"] },
  { key: "iron", name: "Iron", role: "Needed to make extra red blood cells; low iron (anaemia) is common in pregnancy.",
    guidance: "Iron needs rise in pregnancy. WHO recommends daily iron as part of routine antenatal care; clinics check haemoglobin with blood tests.",
    foods: ["Lean red meat and chicken", "Beans and lentils", "Spinach", "Fortified cereals", "Pilchards"],
    preparation: "Pair plant iron with vitamin C (e.g. orange) to help absorption. Tea can reduce absorption if drunk with meals.",
    supplements: "Often provided at antenatal clinics. Iron can worsen nausea or constipation for some — tell the clinician rather than stopping on your own.",
    whenToAsk: "At booking bloods, or if she feels very tired, breathless or pale.", sources: ["whoANC", "nhsVitamins"] },
  { key: "calcium", name: "Calcium", role: "Builds the baby's bones and teeth.",
    guidance: "WHO recommends calcium supplementation where dietary calcium is low (common in many settings, including parts of SA).",
    foods: ["Milk", "Plain yoghurt", "Pasteurised hard cheese", "Pilchards (soft bones)", "Spinach"],
    preparation: "Choose pasteurised dairy only.", supplements: "May be provided at antenatal clinics — ask whether it applies to her.",
    whenToAsk: "At booking; also if dairy isn't tolerated.", sources: ["whoANC"] },
  { key: "protein", name: "Protein", role: "Growth of the baby, placenta and her own tissues.",
    guidance: "Needs rise during pregnancy, especially from the second trimester. During nausea, small amounts often are fine.",
    foods: ["Eggs (fully cooked)", "Chicken", "Beans and lentils", "Milk and yoghurt", "Peanut butter", "Pilchards"],
    preparation: "Cook eggs, meat and poultry thoroughly.", supplements: "Not usually needed as a supplement.",
    whenToAsk: "If she can't eat much protein for a long time, or is losing weight.", sources: ["acogNutrition"] },
  { key: "choline", name: "Choline", role: "Brain and nervous system development.",
    guidance: "Many diets are low in choline; eggs are one of the richest sources.",
    foods: ["Fully cooked eggs", "Chicken and meat", "Beans and lentils", "Milk"],
    preparation: "Eggs fully cooked — firm white and yolk.", supplements: "Most prenatal vitamins contain little or none. Ask the clinician.",
    whenToAsk: "If eggs and meat aren't part of her diet.", sources: ["acogNutrition"] },
  { key: "iodine", name: "Iodine", role: "Thyroid hormone production and the baby's brain development.",
    guidance: "Needs rise in pregnancy. South Africa iodises table salt by law, which helps.",
    foods: ["Iodised salt (in small amounts)", "Milk and yoghurt", "Fish", "Eggs"],
    preparation: "Use iodised salt in cooking rather than unfortified salts.", supplements: "Sometimes included in prenatal vitamins — ask before adding a separate one.",
    whenToAsk: "If she has a thyroid condition or avoids dairy and fish.", sources: ["nhsVitamins"] },
  { key: "omega3", name: "Omega-3 (DHA)", role: "Brain and eye development.",
    guidance: "Low-mercury oily fish is generally encouraged in moderate amounts (e.g. around 2 portions a week in NHS guidance).",
    foods: ["Pilchards / sardines", "Canned salmon or mackerel (low-mercury)"],
    preparation: "Cook fresh fish thoroughly; avoid raw fish.", supplements: "Fish-liver oils (cod liver oil) are NOT advised in pregnancy because of vitamin A.",
    whenToAsk: "If she doesn't eat fish.", sources: ["nhsFoods", "fdaFish"] },
  { key: "vitaminC", name: "Vitamin C", role: "Tissue health and helps absorb iron from plant foods.",
    guidance: "Easily met from everyday fruit and vegetables.",
    foods: ["Oranges", "Tomatoes", "Guavas", "Peppers", "Cabbage"],
    preparation: "Wash fruit and vegetables well before eating.", supplements: "Not usually needed separately.",
    whenToAsk: "Rarely needed — mention it if fruit and vegetables aren't tolerated at all.", sources: ["acogNutrition"] },
  { key: "fibre", name: "Fibre", role: "Digestive health; helps with pregnancy constipation (and iron-related constipation).",
    guidance: "Increase gradually, with fluids.",
    foods: ["Oats", "Beans and lentils", "Fruit", "Vegetables", "Brown bread"],
    preparation: "Drink fluids alongside fibre.", supplements: "Ask a pharmacist before using fibre supplements or laxatives.",
    whenToAsk: "If constipation is a problem.", sources: ["acogNutrition"] },
  { key: "vitaminD", name: "Vitamin D", role: "Helps absorb calcium for bones.",
    guidance: "The NHS advises 10 micrograms daily in pregnancy (UK context). Ask locally whether this applies.",
    foods: ["Eggs", "Oily fish", "Sunlight on skin"], preparation: "—",
    supplements: "Ask the clinician or pharmacist.", whenToAsk: "At booking.", sources: ["nhsVitamins"] },
];

export const SUPPLEMENT_INFO = [
  { name: "Folic acid", info: "Time-sensitive in early pregnancy. NHS general advice is 400 µg daily until 12 weeks; some people need a prescribed higher dose. Ask her clinician or pharmacist today." },
  { name: "Iron", info: "Commonly provided at antenatal clinics. Can upset the stomach; don't stop or change without discussing it." },
  { name: "Iodine", info: "Sometimes in prenatal multivitamins. Check before adding a separate product." },
  { name: "Vitamin D", info: "NHS advises 10 µg daily in pregnancy. Ask locally." },
  { name: "Calcium", info: "WHO recommends calcium supplements in low-calcium populations — ask the clinic." },
  { name: "Vitamin B12", info: "Important if she eats little or no animal food." },
  { name: "Prenatal multivitamin", info: "Choose a pregnancy-specific product. Avoid products containing vitamin A as retinol (and fish-liver oils)." },
];
