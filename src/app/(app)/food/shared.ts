import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { searchFoods } from "@/lib/foods";

export async function foodFormData(ownerId: string, pid: string) {
  const foods = await searchFoods("", ownerId);
  const recent = await db.select({ name: schema.foodLogs.foodName, fav: schema.foodLogs.favourite }).from(schema.foodLogs)
    .where(eq(schema.foodLogs.pregnancyId, pid)).orderBy(desc(schema.foodLogs.eatenAt)).limit(60);
  const favs = [...new Set([...recent.filter((r) => r.fav).map((r) => r.name), ...recent.map((r) => r.name)])].slice(0, 8);
  return {
    foods: foods.map((f) => ({ id: f.id, name: f.name, category: f.category, servingLabel: f.servingLabel, servingGrams: f.servingGrams, safetyNote: f.safetyNote, nutrientSource: f.nutrientSource, custom: !!f.createdById })),
    favourites: favs,
  };
}
