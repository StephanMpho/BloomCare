// Seeds the reference food list (idempotent). Usage: npm run db:seed
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";
import { FOOD_SEEDS, seedNutrientSource } from "../src/lib/foods-data";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  for (const f of FOOD_SEEDS) {
    const v = {
      key: f.key, name: f.name, category: f.category, servingLabel: f.servingLabel, servingGrams: f.servingGrams,
      proteinG: f.n?.proteinG ?? null, carbsG: f.n?.carbsG ?? null, fatG: f.n?.fatG ?? null, fibreG: f.n?.fibreG ?? null,
      ironMg: f.n?.ironMg ?? null, calciumMg: f.n?.calciumMg ?? null, folateUg: f.n?.folateUg ?? null, b12Ug: f.n?.b12Ug ?? null,
      cholineMg: f.n?.cholineMg ?? null, nutrientSource: seedNutrientSource(f), safetyNote: f.safetyNote ?? null,
    };
    await db.insert(schema.foods).values(v).onConflictDoUpdate({ target: schema.foods.key, set: v });
  }
  console.log(`Seeded ${FOOD_SEEDS.length} reference foods.`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
