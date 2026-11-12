import pg from "pg";

const { Pool } = pg;
pg.types.setTypeParser(1082, (value) => value);

const globalForDb = globalThis;

export const pool = globalForDb.smartMaggotPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

if (process.env.NODE_ENV !== "production") globalForDb.smartMaggotPool = pool;

export const query = (text, params) => pool.query(text, params);
