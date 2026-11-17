// Gestational dating, following standard obstetric conventions:
//  • Gestational age (GA) is counted from the first day of the last menstrual period (LMP).
//  • Estimated due date (EDD) by LMP = LMP + 280 days (Naegele's rule).
//  • If a clinician or ultrasound supplies a due date, that date takes precedence and
//    GA is derived from it: GA = 280 − (EDD − today).
//  • Trimesters: first up to 13w6d, second 14w0d–27w6d, third from 28w0d.
// All results are estimates; dating is confirmed clinically (usually by early ultrasound).
import { addDays, daysBetween, todayISO } from "./dates";

export const TERM_DAYS = 280;

export type DatingInput = {
  lmpDate: string;
  clinicalDueDate?: string | null;
  datingMethod: "LMP" | "ULTRASOUND" | "CLINICIAN";
};

export type Dating = {
  gaDays: number;
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3;
  edd: string;
  eddByLmp: string;
  daysToDue: number;
  progress: number; // 0..1
  basis: "LMP" | "ULTRASOUND" | "CLINICIAN";
  label: string;
  notYetPregnantByDates: boolean;
};

export function eddFromLmp(lmp: string) {
  return addDays(lmp, TERM_DAYS);
}

export function trimesterFor(gaDays: number): 1 | 2 | 3 {
  if (gaDays < 14 * 7) return 1;
  if (gaDays < 28 * 7) return 2;
  return 3;
}

export function calculateDating(input: DatingInput, today: string = todayISO()): Dating {
  const eddByLmp = eddFromLmp(input.lmpDate);
  const useClinical = input.datingMethod !== "LMP" && !!input.clinicalDueDate;
  const edd = useClinical ? input.clinicalDueDate! : eddByLmp;
  const gaDays = TERM_DAYS - daysBetween(today, edd);
  const safeGa = Math.max(0, gaDays);
  const weeks = Math.floor(safeGa / 7);
  const days = safeGa % 7;
  return {
    gaDays: safeGa,
    weeks,
    days,
    trimester: trimesterFor(safeGa),
    edd,
    eddByLmp,
    daysToDue: daysBetween(today, edd),
    progress: Math.min(1, safeGa / TERM_DAYS),
    basis: useClinical ? input.datingMethod : "LMP",
    label: `${weeks} week${weeks === 1 ? "" : "s"}, ${days} day${days === 1 ? "" : "s"}`,
    notYetPregnantByDates: gaDays < 0,
  };
}

/** Validate an LMP: must not be in the future or implausibly old (> 44 weeks ago). */
export function validateLmp(lmp: string, today: string = todayISO()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lmp) || Number.isNaN(Date.parse(lmp))) return "Please enter a valid date.";
  const diff = daysBetween(lmp, today);
  if (diff < 0) return "The date can't be in the future.";
  if (diff > 44 * 7) return "That date is more than 44 weeks ago — please check it.";
  return null;
}
