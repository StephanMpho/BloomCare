import { z } from "zod";
import type { ActionResult } from "@/components/forms";

export const str = (fd: FormData, k: string) => (fd.get(k)?.toString() ?? "").trim();
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true" || fd.get(k) === "yes";
export const intOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};
export const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a date.");
export const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Please choose a time.");

/** An error whose message is written for the user and safe to display. */
export class UserError extends Error {}

/**
 * Wrap an action so thrown errors become friendly form errors (redirects still propagate).
 * Only UserError and Zod messages reach the user; anything else (DB errors, bugs) is logged
 * server-side and replaced with a generic message so SQL, params or stack details never leak.
 */
export async function safe(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
    if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Please check the form." };
    if (e instanceof UserError) return { error: e.message };
    console.error("[action error]", e);
    return { error: "Something went wrong on our side. Please try again in a moment." };
  }
}
