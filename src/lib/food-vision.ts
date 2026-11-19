import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { UserError } from "./form";
import { FOOD_GROUPS, FOOD_GROUP_KEYS } from "./content/food-groups";

const GROUP_GUIDE = FOOD_GROUP_KEYS.map((k) => `${k} (${FOOD_GROUPS[k].examples})`).join("; ");

// Claude's only job here is RECOGNITION: which foods are in the photo and how they look
// prepared. It must not judge safety or health; BloomCare's sourced rules do that
// (see photo-verdict.ts). The photo is sent once and never stored.

export const IdentifiedFoods = z.object({
  containsFood: z.boolean().describe("False if the photo does not clearly show food or drink."),
  items: z.array(z.object({
    name: z.string().describe("Plain, generic food name as commonly said in South Africa, e.g. 'pap', 'boerewors', 'chakalaka', 'fried egg', 'polony'."),
    preparation: z.string().describe("Visible preparation only, e.g. 'fried', 'boiled', 'raw', 'yolk looks runny', 'meat looks pink inside'. Empty string if unclear."),
    group: z.enum(FOOD_GROUP_KEYS).describe(`Which food group this item belongs to. Groups: ${GROUP_GUIDE}`),
    confidence: z.enum(["high", "medium", "low"]),
  })).max(12),
  note: z.string().describe("One short sentence if the photo is unclear or something important can't be seen. Otherwise empty string."),
});
export type IdentifiedFoods = z.infer<typeof IdentifiedFoods>;

const SYSTEM = `You identify foods and drinks in photos for a South African pregnancy food diary.

List each distinct food or drink you can see, using plain generic names a South African would use (for example "pap", "samp and beans", "vetkoek", "boerewors", "chakalaka", "polony", "Rooibos tea"). Describe only preparation you can actually see, such as fried, boiled, raw, a runny yolk or pink meat, because the app uses this to apply food-safety rules. Don't guess hidden ingredients or brands.

Also put each item in the single food group that fits it best. Use "mixed-dish" only when separate ingredients can't be told apart, and "other" when nothing fits.

Do not give any health, nutrition or safety opinion. Another part of the app does that from a reviewed library. If the image isn't food, set containsFood to false and return no items.`;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const NOT_SET_UP = "Photo checks aren't set up on this server yet. You can still log food by name.";

let client: Anthropic | null = null;
function anthropic() {
  // The SDK resolves credentials itself (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile).
  try {
    return (client ??= new Anthropic());
  } catch (e) {
    console.error("[photo check] Anthropic client not configured:", e);
    throw new UserError(NOT_SET_UP);
  }
}

export async function identifyFoods(photo: File): Promise<IdentifiedFoods> {
  if (!MEDIA_TYPES.includes(photo.type as MediaType)) throw new UserError("Please use a JPEG, PNG or WebP photo.");
  if (photo.size === 0) throw new UserError("Please take or choose a photo first.");
  if (photo.size > MAX_PHOTO_BYTES) throw new UserError("That photo is too large. Please try again — the app shrinks photos from the camera automatically.");
  const data = Buffer.from(await photo.arrayBuffer()).toString("base64");

  let response;
  try {
    response = await anthropic().beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low", format: betaZodOutputFormat(IdentifiedFoods) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: photo.type as MediaType, data } },
          { type: "text", text: "Which foods and drinks are in this photo?" },
        ],
      }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new UserError("Photo checks are busy right now. Please try again in a minute.");
    if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message)) {
      console.error("[photo check] Anthropic account is out of credit. Top up at console.anthropic.com → Billing.");
      throw new UserError("Photo checks are unavailable right now. You can still log food by name.");
    }
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      console.error("[photo check] Anthropic credentials rejected:", e.message);
      throw new UserError(NOT_SET_UP);
    }
    // Missing credentials surface as a plain Error ("Could not resolve authentication method…") before any request is sent.
    if (e instanceof Error && !(e instanceof Anthropic.APIError) && /resolve authentication/i.test(e.message)) {
      console.error("[photo check] No Anthropic credentials found:", e.message);
      throw new UserError(NOT_SET_UP);
    }
    throw e; // logged by safe(); user sees a generic message
  }

  if (response.stop_reason === "refusal") throw new UserError("We couldn't check that photo. Please try another one, or log the food by name.");
  if (!response.parsed_output) throw new UserError("We couldn't read the foods in that photo. Please try again or log the food by name.");
  return response.parsed_output;
}
