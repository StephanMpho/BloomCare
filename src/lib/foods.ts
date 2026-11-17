import "server-only";
import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { FOOD_SEEDS, seedNutrientSource } from "./foods-data";

let seeded = false;
/** Idempotently insert/update the reference food list. */
export async function ensureFoodsSeeded() {
  if (seeded) return;
  for (const f of FOOD_SEEDS) {
    const v = {
      key: f.key, name: f.name, category: f.category, servingLabel: f.servingLabel, servingGrams: f.servingGrams,
      proteinG: f.n?.proteinG ?? null, carbsG: f.n?.carbsG ?? null, fatG: f.n?.fatG ?? null, fibreG: f.n?.fibreG ?? null,
      ironMg: f.n?.ironMg ?? null, calciumMg: f.n?.calciumMg ?? null, folateUg: f.n?.folateUg ?? null, b12Ug: f.n?.b12Ug ?? null,
      cholineMg: f.n?.cholineMg ?? null, nutrientSource: seedNutrientSource(f), safetyNote: f.safetyNote ?? null,
    };
    await db.insert(schema.foods).values(v).onConflictDoUpdate({ target: schema.foods.key, set: v });
  }
  seeded = true;
}

/** Foods visible to this pregnancy: reference foods + her own custom foods. */
export async function searchFoods(q: string, ownerId: string) {
  await ensureFoodsSeeded();
  const visible = or(isNull(schema.foods.createdById), eq(schema.foods.createdById, ownerId));
  const term = q.trim().replace(/[%_]/g, "");
  return db.select().from(schema.foods)
    .where(term ? and(ilike(schema.foods.name, `%${term}%`), visible) : visible)
    .orderBy(sql`${schema.foods.createdById} is null`, schema.foods.name)
    .limit(term ? 15 : 40);
}
