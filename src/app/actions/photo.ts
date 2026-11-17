"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { actionContext, audit } from "@/lib/context";
import { rateLimited } from "@/lib/auth";
import { safe, UserError } from "@/lib/form";
import { identifyFoods } from "@/lib/food-vision";
import { judgeMeal, type JudgedItem, type VerdictLevel } from "@/lib/photo-verdict";
import { toleranceLists } from "@/lib/queries";

export type PhotoState =
  | null
  | { error: string }
  | { step: "confirm"; items: { name: string; preparation: string; confidence: string }[]; note: string }
  | { step: "result"; overall: VerdictLevel; items: JudgedItem[] };

/** Step 1: send the photo to Claude for recognition only. Nothing is stored. */
export async function identifyPhoto(_: PhotoState, fd: FormData): Promise<PhotoState> {
  return safe(async () => {
    const ctx = await actionContext("LOG_FOR_ME");
    if (rateLimited(`photo:${ctx.user.id}`, 30, 60 * 60_000)) throw new UserError("That's a lot of photo checks in an hour. Please wait a little and try again.");
    const photo = fd.get("photo");
    if (!(photo instanceof File)) throw new UserError("Please take or choose a photo first.");
    const found = await identifyFoods(photo);
    if (!found.containsFood || found.items.length === 0) {
      throw new UserError(found.note || "We couldn't see any food in that photo. Try again with the plate in good light.");
    }
    return { step: "confirm" as const, items: found.items, note: found.note };
  });
}

/** Step 2: after she confirms or edits the list, apply BloomCare's rules and save the result. */
export async function checkFoods(_: PhotoState, fd: FormData): Promise<PhotoState> {
  return safe(async () => {
    const ctx = await actionContext("LOG_FOR_ME");
    const names = fd.getAll("name").map((v) => v.toString().trim());
    const preps = fd.getAll("preparation").map((v) => v.toString().trim());
    const items = z.array(z.object({ name: z.string().min(1).max(80), preparation: z.string().max(120) })).min(1, "Add at least one food to check.").max(12)
      .parse(names.map((name, i) => ({ name, preparation: preps[i] ?? "" })).filter((i) => i.name));

    const tol = await toleranceLists(ctx.pregnancy.id);
    const result = judgeMeal(items, {
      allergies: ctx.pregnancy.allergies,
      nauseaTriggers: ctx.pregnancy.nauseaTriggers,
      notTolerated: tol.notTolerated,
      tolerated: tol.tolerated,
    });
    await db.insert(schema.photoChecks).values({ pregnancyId: ctx.pregnancy.id, checkedById: ctx.user.id, overall: result.overall, items: result.items });
    if (!ctx.isOwner) await audit(ctx, "partner.photo_check", items.map((i) => i.name).join(", "));
    revalidatePath("/food/photo");
    revalidatePath("/partner");
    return { step: "result" as const, ...result };
  });
}
