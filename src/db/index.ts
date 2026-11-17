import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

const useSsl = process.env.DATABASE_SSL === "true";

/**
 * With DATABASE_SSL=true, certificates are always verified. Hosts whose server certificate
 * is signed by their own CA (e.g. Supabase) need that CA's PEM text in DATABASE_SSL_CA.
 * `sslmode`/`sslrootcert` etc. are stripped from the URL because pg lets them override
 * the `ssl` option below.
 */
function connectionString() {
  const raw = process.env.DATABASE_URL;
  if (!raw || !useSsl) return raw;
  const u = new URL(raw);
  for (const k of [...u.searchParams.keys()]) if (k.startsWith("ssl")) u.searchParams.delete(k);
  return u.toString();
}

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: connectionString(),
    max: 10,
    ssl: useSsl
      ? { rejectUnauthorized: true, ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n") } : {}) }
      : undefined,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
