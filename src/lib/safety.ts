// Medical safety rules. These are deliberately conservative, transparent rules
// that *escalate* to clinicians. They never diagnose.
//
// Sources (see src/lib/content/sources.ts):
//  - NHS: Severe vomiting in pregnancy (hyperemesis gravidarum)
//  - NHS: Ectopic pregnancy — symptoms
//  - RCOG Green-top Guideline 69 (nausea & vomiting of pregnancy / HG)
//  - ACOG FAQ: Morning sickness — nausea and vomiting of pregnancy

export type AlertLevel = "EMERGENCY" | "URGENT" | "CONTACT_CLINICIAN";

export type SafetyAlert = {
  id: string; // stable alert type, used for acknowledgement records
  level: AlertLevel;
  title: string;
  message: string;
  reasons: string[];
};

export type SymptomSnapshot = {
  vomitCount: number;
  fluidsKeptDown?: "KEPT_DOWN" | "PARTLY" | "NOT_KEPT_DOWN" | null;
  dizziness?: boolean;
  weakness?: boolean;
  fainting?: boolean;
  reducedUrine?: boolean;
  weightLossNoticed?: boolean;
  abdominalPain?: "NONE" | "MILD" | "SEVERE";
  shoulderTipPain?: boolean;
  bleeding?: "NONE" | "SPOTTING" | "HEAVY";
  fever?: boolean;
};

export const EMERGENCY_TEXT =
  "Severe abdominal pain, fainting, shoulder-tip pain or significant vaginal bleeding during early pregnancy requires emergency medical assessment.";
export const URGENT_TEXT =
  "If you cannot keep fluids down, have reduced urination, dizziness, significant weight loss or repeated vomiting, seek urgent medical care.";
export const EMERGENCY_NUMBERS = "In South Africa: ambulance 10177, or 112 from a cellphone. Go to the nearest hospital casualty/emergency unit.";

/**
 * Evaluate symptoms reported over a recent window (normally the last 24 hours, merged).
 * `earlyPregnancyUnconfirmed` = no ultrasound confirmation yet and GA < 14 weeks, which
 * makes any abdominal/pelvic pain worth prompt assessment (ectopic pregnancy must be excluded).
 */
export function evaluateSymptoms(s: SymptomSnapshot, opts: { earlyPregnancyUnconfirmed: boolean }): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];

  const emergencyReasons: string[] = [];
  if (s.abdominalPain === "SEVERE") emergencyReasons.push("Severe abdominal or pelvic pain");
  if (s.fainting) emergencyReasons.push("Fainting or collapse");
  if (s.shoulderTipPain) emergencyReasons.push("Shoulder-tip pain");
  if (s.bleeding === "HEAVY") emergencyReasons.push("Heavy vaginal bleeding");
  if (emergencyReasons.length) {
    alerts.push({
      id: "EMERGENCY_SIGNS",
      level: "EMERGENCY",
      title: "Get emergency care now",
      message: `${EMERGENCY_TEXT} ${EMERGENCY_NUMBERS}`,
      reasons: emergencyReasons,
    });
  }

  const urgentReasons: string[] = [];
  if (s.fluidsKeptDown === "NOT_KEPT_DOWN") urgentReasons.push("Unable to keep fluids down");
  if (s.reducedUrine) urgentReasons.push("Passing less urine than usual / dark urine");
  if (s.dizziness) urgentReasons.push("Dizziness");
  if (s.weakness) urgentReasons.push("Unusual weakness");
  if (s.weightLossNoticed) urgentReasons.push("Weight loss");
  if (s.vomitCount >= 3) urgentReasons.push(`Repeated vomiting (${s.vomitCount} times recorded)`);
  else if (s.vomitCount > 0 && (s.fluidsKeptDown === "PARTLY" || s.dizziness || s.weakness))
    urgentReasons.push("Vomiting together with other warning signs");
  if (s.abdominalPain === "MILD" && opts.earlyPregnancyUnconfirmed)
    urgentReasons.push("Abdominal or pelvic pain before the pregnancy location has been confirmed by ultrasound");
  if (s.fever) urgentReasons.push("Fever");
  if (urgentReasons.length) {
    alerts.push({
      id: "URGENT_ASSESSMENT",
      level: "URGENT",
      title: "Please get urgent medical assessment",
      message: URGENT_TEXT + " Contact your clinic or doctor today, or go to a hospital casualty unit if you can't reach them.",
      reasons: urgentReasons,
    });
  }

  if (s.bleeding === "SPOTTING" && !emergencyReasons.length) {
    alerts.push({
      id: "SPOTTING",
      level: "CONTACT_CLINICIAN",
      title: "Let your clinician know about the bleeding",
      message: "Any bleeding in pregnancy should be discussed with your doctor or midwife. If it becomes heavy or comes with pain, dizziness or fainting, get emergency care.",
      reasons: ["Spotting / light bleeding"],
    });
  }
  return alerts;
}

/** Merge several symptom snapshots (e.g. last 24h of logs + today's check-in) into one. */
export function mergeSnapshots(list: SymptomSnapshot[]): SymptomSnapshot {
  const painRank = { NONE: 0, MILD: 1, SEVERE: 2 } as const;
  const bleedRank = { NONE: 0, SPOTTING: 1, HEAVY: 2 } as const;
  const retRank = { KEPT_DOWN: 0, PARTLY: 1, NOT_KEPT_DOWN: 2 } as const;
  const out: SymptomSnapshot = { vomitCount: 0, abdominalPain: "NONE", bleeding: "NONE", fluidsKeptDown: null };
  for (const s of list) {
    out.vomitCount += s.vomitCount || 0;
    for (const k of ["dizziness", "weakness", "fainting", "reducedUrine", "weightLossNoticed", "shoulderTipPain", "fever"] as const) {
      if (s[k]) out[k] = true;
    }
    if (s.abdominalPain && painRank[s.abdominalPain] > painRank[out.abdominalPain!]) out.abdominalPain = s.abdominalPain;
    if (s.bleeding && bleedRank[s.bleeding] > bleedRank[out.bleeding!]) out.bleeding = s.bleeding;
    if (s.fluidsKeptDown && (!out.fluidsKeptDown || retRank[s.fluidsKeptDown] > retRank[out.fluidsKeptDown]))
      out.fluidsKeptDown = s.fluidsKeptDown;
  }
  return out;
}

/** Drinks: two or more drinks not kept down in the window counts as "unable to keep fluids down". */
export function fluidsSnapshotFromDrinks(drinks: { retention: "KEPT_DOWN" | "PARTLY" | "NOT_KEPT_DOWN" }[]): SymptomSnapshot {
  const notKept = drinks.filter((d) => d.retention === "NOT_KEPT_DOWN").length;
  const partly = drinks.filter((d) => d.retention === "PARTLY").length;
  return {
    vomitCount: 0,
    fluidsKeptDown: notKept >= 2 ? "NOT_KEPT_DOWN" : notKept + partly >= 2 ? "PARTLY" : null,
  };
}

export const LEVEL_ORDER: Record<AlertLevel, number> = { EMERGENCY: 0, URGENT: 1, CONTACT_CLINICIAN: 2 };
export function sortAlerts(a: SafetyAlert[]) {
  return [...a].sort((x, y) => LEVEL_ORDER[x.level] - LEVEL_ORDER[y.level]);
}
