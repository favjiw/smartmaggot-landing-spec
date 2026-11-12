import "./load-env.mjs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { pool } from "../lib/db.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Salin .env.example ke .env.local lalu isi koneksi PostgreSQL.");
  process.exit(1);
}

const dir = path.resolve("database");
const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
// Buat database jika belum ada (kode 3D000), memakai koneksi ke database bawaan "postgres".
async function createDatabaseIfMissing() {
  const url = new URL(process.env.DATABASE_URL);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: url.toString(), ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false });
  await admin.connect();
  try { await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`); console.log(`✔ Database "${name}" dibuat.`); }
  finally { await admin.end(); }
}

const connect = () => pool.connect().catch(async (error) => {
  if (error.code !== "3D000") throw error;
  await createDatabaseIfMissing();
  return pool.connect();
});

const client = await connect().catch(async (error) => {
  console.error(`Tidak bisa terhubung ke PostgreSQL: ${error.message}
Periksa DATABASE_URL di .env.local (user, password, port, nama database) dan pastikan PostgreSQL berjalan.`);
  await pool.end();
  process.exit(1);
});

try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const { rows } = await client.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.name));
  let count = 0;

  for (const name of files) {
    if (applied.has(name)) continue;
    // Setiap file migrasi sudah membungkus dirinya dengan BEGIN/COMMIT.
    await client.query(await readFile(path.join(dir, name), "utf8"));
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    console.log(`✔ ${name}`);
    count += 1;
  }

  console.log(count ? `${count} migrasi dijalankan.` : "Database sudah versi terbaru.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`Migrasi gagal: ${error.message}`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
