import type { SourceId } from "./sources";

export type JourneyStage = {
  from: number; // weeks (inclusive)
  to: number; // weeks (inclusive)
  title: string;
  development: string[];
  symptoms: string[];
  nutrition: string[];
  questions: string[];
  sources: SourceId[];
};

export const JOURNEY: JourneyStage[] = [
  { from: 0, to: 3, title: "Before a positive test", development: ["Weeks are counted from the first day of the last period, so the first two weeks happen before conception."],
    symptoms: ["Often none yet."], nutrition: ["Folic acid is advised before and in early pregnancy."], questions: ["Should I start folic acid now?"], sources: ["nhsVitamins"] },
  { from: 4, to: 6, title: "Weeks 4–6: Very early pregnancy",
    development: ["The pregnancy implants and the early placenta begins forming.", "The neural tube (future brain and spinal cord) forms — one reason folic acid matters now.", "A heartbeat-like flicker may be visible on ultrasound from around 6 weeks."],
    symptoms: ["Tiredness, breast tenderness, needing to urinate more", "Nausea often starts around now"],
    nutrition: ["Folic acid — ask the clinic or a pharmacist today", "Small, frequent, bland meals and sips of fluid", "Avoid alcohol and high-risk foods (see Food Safety)"],
    questions: ["When should my first scan be, and will it confirm where the pregnancy is?", "Which supplements should I take, and what dose?", "My vomiting and pain — do I need treatment?", "When do I book antenatal care (and register on MomConnect)?"],
    sources: ["nhsVitamins", "whoANC", "momConnect"] },
  { from: 7, to: 9, title: "Weeks 7–9: Organs are forming",
    development: ["Major organs are forming.", "From around 8–9 weeks the embryo has tiny limbs and is roughly the size of a grape."],
    symptoms: ["Nausea and vomiting often peak around 8–10 weeks", "Food aversions and strong smell sensitivity"],
    nutrition: ["Prioritise fluids and whatever is tolerated", "Iron-rich and protein foods when she can manage them"],
    questions: ["Can I have anti-sickness medication that's safe in pregnancy?", "What blood tests are done at booking (e.g. blood count, HIV, syphilis, blood group)?"],
    sources: ["nhsNVP", "acogNVP", "whoANC"] },
  { from: 10, to: 12, title: "Weeks 10–12: Embryo becomes a fetus",
    development: ["From about 10 weeks the embryo is called a fetus; the major structures are in place and continue growing.", "A dating scan around this time can confirm the due date."],
    symptoms: ["For many, nausea starts easing by 12–14 weeks — but not for everyone, especially with hyperemesis."],
    nutrition: ["Continue folic acid as advised", "Calcium and protein as appetite returns"],
    questions: ["Has my due date changed after the scan?", "Are any screening tests offered at this stage?"],
    sources: ["nhsNVP", "whoANC"] },
  { from: 13, to: 14, title: "Weeks 13–14: Moving into the second trimester",
    development: ["The second trimester begins at 14 weeks.", "Growth speeds up from here."],
    symptoms: ["Energy often improves", "Nausea eases for many"],
    nutrition: ["Gradually broaden the variety of foods", "Keep up iron, calcium and protein"],
    questions: ["What does my antenatal schedule look like from here?", "Is my weight gain on track for me?"],
    sources: ["whoANC"] },
  { from: 15, to: 27, title: "Second trimester", development: ["Growth continues; movements are often felt from around 16–22 weeks."],
    symptoms: ["Often a more comfortable phase"], nutrition: ["Balanced meals with protein, iron and calcium"],
    questions: ["When is the anatomy scan?", "Do I need a glucose test?"], sources: ["whoANC"] },
  { from: 28, to: 42, title: "Third trimester", development: ["The baby gains weight and prepares for birth."],
    symptoms: ["Heartburn, tiredness, swelling — report sudden swelling, headaches or vision changes urgently"],
    nutrition: ["Smaller, more frequent meals can help with heartburn"], questions: ["What's my birth plan?", "When should I come in once labour starts?"], sources: ["whoANC"] },
];

export function stageFor(weeks: number) {
  return JOURNEY.find((s) => weeks >= s.from && weeks <= s.to) ?? JOURNEY[JOURNEY.length - 1];
}
