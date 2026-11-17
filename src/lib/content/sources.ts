// Reference sources used across the app. Each content block lists the ids it relies on.
// CONTENT_REVIEW states honestly who reviewed the content and when.
export const CONTENT_REVIEW = {
  compiled: "17 November 2026",
  status: "Compiled by the developer from the sources below. Not yet reviewed by a clinician — please have her doctor, midwife or a dietitian check anything before relying on it.",
};

export const SOURCES = {
  nhsHG: { title: "NHS — Severe vomiting in pregnancy (hyperemesis gravidarum)", url: "https://www.nhs.uk/pregnancy/related-conditions/complications/severe-vomiting/" },
  nhsNVP: { title: "NHS — Vomiting and morning sickness", url: "https://www.nhs.uk/pregnancy/related-conditions/common-symptoms/vomiting-and-morning-sickness/" },
  nhsEctopic: { title: "NHS — Ectopic pregnancy", url: "https://www.nhs.uk/conditions/ectopic-pregnancy/" },
  nhsFoods: { title: "NHS — Foods to avoid in pregnancy", url: "https://www.nhs.uk/pregnancy/keeping-well/foods-to-avoid/" },
  nhsVitamins: { title: "NHS — Vitamins, supplements and nutrition in pregnancy", url: "https://www.nhs.uk/pregnancy/keeping-well/vitamins-supplements-and-nutrition/" },
  rcogGTG69: { title: "RCOG Green-top Guideline 69 — Nausea and vomiting of pregnancy and hyperemesis gravidarum", url: "https://www.rcog.org.uk/guidance/browse-all-guidance/green-top-guidelines/the-management-of-nausea-and-vomiting-of-pregnancy-and-hyperemesis-gravidarum-green-top-guideline-no-69/" },
  whoANC: { title: "WHO — Recommendations on antenatal care for a positive pregnancy experience (2016)", url: "https://www.who.int/publications/i/item/9789241549912" },
  acogNVP: { title: "ACOG — Morning sickness: nausea and vomiting of pregnancy (FAQ)", url: "https://www.acog.org/womens-health/faqs/morning-sickness-nausea-and-vomiting-of-pregnancy" },
  acogNutrition: { title: "ACOG — Nutrition during pregnancy (FAQ)", url: "https://www.acog.org/womens-health/faqs/nutrition-during-pregnancy" },
  saListeria: { title: "SA Department of Health — Minister's update on the listeriosis outbreak (4 Mar 2018)", url: "https://www.gov.za/news/speeches/minister-aaron-motsoaledi-update-listeriosis-outbreak-south-africa-04-mar-2018" },
  saColdMeat: { title: "Vuk'uzenzele (SA Government) — Cold processed meat a listeria no-no", url: "https://www.vukuzenzele.gov.za/cold-processed-meat-listeria-no-no" },
  momConnect: { title: "SA Government — MomConnect (register: dial *134*550#)", url: "https://www.sanews.gov.za/node/37507" },
  fdaFish: { title: "FDA/EPA — Advice about eating fish", url: "https://www.fda.gov/food/consumers/advice-about-eating-fish" },
  usdaFdc: { title: "USDA FoodData Central", url: "https://fdc.nal.usda.gov/" },
  nasDri: { title: "National Academies — Dietary Reference Intakes", url: "https://www.nationalacademies.org/our-work/summary-report-of-the-dietary-reference-intakes" },
} as const;

export type SourceId = keyof typeof SOURCES;
