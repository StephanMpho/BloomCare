// Curated "is this healthy in pregnancy?" guidance per food group.
// The photo check asks Claude only to SORT a food into one of these groups; the advice
// below is written and sourced here, never generated. Specific food-safety rules
// (food-safety.ts), allergies and her own logs take priority over this general guidance.
import type { SourceId } from "./sources";

export type Healthiness = "GREAT" | "GOOD" | "LIMIT" | "AVOID";

export const HEALTHINESS_LABEL: Record<Healthiness, string> = {
  GREAT: "Great choice",
  GOOD: "Good choice",
  LIMIT: "Fine now and then",
  AVOID: "Avoid in pregnancy",
};

export type FoodGroup = {
  key: FoodGroupKey;
  label: string;
  examples: string; // helps Claude sort, and shown in the confirm step
  healthiness: Healthiness;
  why: string;
  tip?: string;
  sources: SourceId[];
};

export const FOOD_GROUP_KEYS = [
  "vegetables", "fruit", "legumes", "wholegrains", "starches", "dairy", "eggs", "meat-poultry",
  "fish", "nuts-seeds", "fats-oils", "processed-meat", "fried-fast-food", "sweets-snacks",
  "sugary-drinks", "water-plain-drinks", "caffeinated-drinks", "alcohol", "mixed-dish", "other",
] as const;
export type FoodGroupKey = (typeof FOOD_GROUP_KEYS)[number];

export const FOOD_GROUPS: Record<FoodGroupKey, FoodGroup> = {
  vegetables: {
    key: "vegetables", label: "Vegetables", examples: "carrots, cucumber, peppers, spinach, cabbage, butternut, tomato, morogo",
    healthiness: "GREAT",
    why: "Vegetables give fibre (helpful for pregnancy constipation), folate, vitamin C and other vitamins. Aim for plenty every day.",
    tip: "Wash vegetables well, especially ones eaten raw, to remove soil that can carry toxoplasmosis.",
    sources: ["nhsHealthyDiet", "nhsFoods"],
  },
  fruit: {
    key: "fruit", label: "Fruit", examples: "apple, banana, orange, lemon, mango, berries, grapes",
    healthiness: "GREAT",
    why: "Fruit gives fibre, vitamin C and other vitamins. Whole fruit is better than juice, which has less fibre and more sugar.",
    tip: "Wash fruit before eating.",
    sources: ["nhsHealthyDiet"],
  },
  legumes: {
    key: "legumes", label: "Beans, lentils & chickpeas", examples: "beans, lentils, chickpeas, hummus, samp and beans, baked beans",
    healthiness: "GREAT",
    why: "Beans, lentils and chickpeas are an affordable source of protein, iron, folate and fibre, which all matter in pregnancy.",
    sources: ["nhsHealthyDiet", "acogNutrition"],
  },
  wholegrains: {
    key: "wholegrains", label: "Wholegrain starches", examples: "brown or wholewheat bread, oats, brown rice, wholewheat crackers, crispbread",
    healthiness: "GREAT",
    why: "Wholegrain starchy foods give energy plus more fibre and B vitamins than refined versions. Starchy foods should make up about a third of meals.",
    sources: ["nhsHealthyDiet"],
  },
  starches: {
    key: "starches", label: "Starchy foods", examples: "pap, white bread, white rice, pasta, potatoes, pita, roti",
    healthiness: "GOOD",
    why: "Starchy foods are a good source of energy and, when plain, are often easy on nausea. Maize meal and bread in South Africa are fortified with vitamins and iron.",
    tip: "Choose wholegrain versions when you can, and keep the skins on potatoes.",
    sources: ["nhsHealthyDiet"],
  },
  dairy: {
    key: "dairy", label: "Milk, yoghurt & cheese", examples: "milk, maas, yoghurt, cheddar, cottage cheese",
    healthiness: "GOOD",
    why: "Dairy is a good source of calcium and protein for her and the baby's developing bones.",
    tip: "Only pasteurised dairy. Some soft and mould-ripened cheeses need care: check the food-safety guide.",
    sources: ["nhsHealthyDiet", "nhsFoods"],
  },
  eggs: {
    key: "eggs", label: "Eggs", examples: "boiled egg, scrambled egg, omelette",
    healthiness: "GOOD",
    why: "Eggs give protein and choline, which supports the baby's brain development.",
    tip: "Cook until the white and yolk are firm.",
    sources: ["nhsHealthyDiet", "nhsFoods"],
  },
  "meat-poultry": {
    key: "meat-poultry", label: "Meat & poultry", examples: "chicken, beef, mince, lamb, pork, boerewors, stew",
    healthiness: "GOOD",
    why: "Meat and poultry give protein and iron. Lean cuts are the healthiest choice.",
    tip: "Cook thoroughly until there's no pink or blood, especially chicken, pork, sausages and mince.",
    sources: ["nhsHealthyDiet", "nhsFoods"],
  },
  fish: {
    key: "fish", label: "Fish", examples: "pilchards, sardines, hake, salmon, tuna",
    healthiness: "GOOD",
    why: "Fish gives protein, and oily fish like pilchards and sardines give omega-3 fats that support the baby's development. About two portions a week is suggested.",
    tip: "Cook fish thoroughly. Some fish are high in mercury: check the food-safety guide.",
    sources: ["nhsHealthyDiet", "fdaFish"],
  },
  "nuts-seeds": {
    key: "nuts-seeds", label: "Nuts & seeds", examples: "peanuts, peanut butter, almonds, pumpkin seeds, sunflower seeds",
    healthiness: "GOOD",
    why: "Nuts and seeds give protein, healthy fats, fibre and minerals. A small handful is a useful snack.",
    tip: "Avoid them if she has a nut allergy.",
    sources: ["nhsHealthyDiet", "nhsFoods"],
  },
  "fats-oils": {
    key: "fats-oils", label: "Fats, oils & spreads", examples: "butter, margarine, mayonnaise, cooking oil, salad dressing",
    healthiness: "LIMIT",
    why: "Fats are high in energy. Small amounts are fine; unsaturated oils and spreads are better than butter or lard.",
    sources: ["nhsHealthyDiet"],
  },
  "processed-meat": {
    key: "processed-meat", label: "Processed meat", examples: "polony, viennas, russians, ham, salami, bacon",
    healthiness: "LIMIT",
    why: "Processed meats are high in salt and saturated fat and low in many nutrients. Some also carry a listeria risk unless heated until steaming hot.",
    tip: "Check the food-safety guide for how to eat these safely.",
    sources: ["nhsHealthyDiet", "saColdMeat"],
  },
  "fried-fast-food": {
    key: "fried-fast-food", label: "Fried & fast food", examples: "chips, vetkoek, fried chicken, burgers, pies, kota, samoosas",
    healthiness: "LIMIT",
    why: "Fried and fast foods are high in fat, salt and energy but low in fibre and vitamins. They're fine occasionally, but shouldn't replace balanced meals.",
    tip: "If she's nauseous, greasy foods can make it worse.",
    sources: ["nhsHealthyDiet", "nhsNVP"],
  },
  "sweets-snacks": {
    key: "sweets-snacks", label: "Sweets & sugary snacks", examples: "chocolate, sweets, cake, biscuits, rusks, crisps, ice cream",
    healthiness: "LIMIT",
    why: "Sweets and snacks are high in sugar or fat with few nutrients. Enjoy them in small amounts; plain biscuits can still help with nausea.",
    sources: ["nhsHealthyDiet"],
  },
  "sugary-drinks": {
    key: "sugary-drinks", label: "Sugary drinks", examples: "fizzy drinks, cordial, sweetened juice, iced tea",
    healthiness: "LIMIT",
    why: "Sugary drinks add a lot of sugar without nutrients. Water, milk or diluted juice are better choices.",
    sources: ["nhsHealthyDiet"],
  },
  "water-plain-drinks": {
    key: "water-plain-drinks", label: "Water & plain drinks", examples: "water, sparkling water, rooibos, milk-based drinks without sugar",
    healthiness: "GREAT",
    why: "Staying hydrated matters in pregnancy, especially with nausea or vomiting. Water is the best choice.",
    sources: ["nhsHealthyDiet", "nhsNVP"],
  },
  "caffeinated-drinks": {
    key: "caffeinated-drinks", label: "Coffee, tea & caffeine", examples: "coffee, black tea, cola, energy drinks",
    healthiness: "LIMIT",
    why: "Caffeine should be limited in pregnancy (under 200 mg a day, about two mugs of instant coffee). Energy drinks are best avoided.",
    sources: ["nhsFoods"],
  },
  alcohol: {
    key: "alcohol", label: "Alcohol", examples: "beer, wine, cider, spirits, umqombothi",
    healthiness: "AVOID",
    why: "There is no known safe amount of alcohol in pregnancy. The safest choice is not to drink at all.",
    sources: ["nhsFoods", "whoANC"],
  },
  "mixed-dish": {
    key: "mixed-dish", label: "Mixed dish", examples: "curry, stew with vegetables, pizza, sandwich, salad with several ingredients",
    healthiness: "GOOD",
    why: "Mixed dishes can be balanced. Meals with vegetables, a starch and some protein are a good pattern.",
    tip: "For a clearer answer, list the main ingredients separately.",
    sources: ["nhsHealthyDiet"],
  },
  other: {
    key: "other", label: "Not sure", examples: "anything that doesn't fit the groups above",
    healthiness: "GOOD", // not used: "other" never produces a healthiness verdict
    why: "",
    sources: [],
  },
};
