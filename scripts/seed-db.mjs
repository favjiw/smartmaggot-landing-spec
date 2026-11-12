import bcrypt from "bcryptjs";
import { pool, query } from "../lib/db.js";

const email = process.env.ADMIN_EMAIL ?? "admin@gardahijau.com";
const password = process.env.ADMIN_PASSWORD;

if (!password || password.length < 8) {
  console.error("ADMIN_PASSWORD wajib diisi minimal 8 karakter.");
  process.exitCode = 1;
} else {
  const passwordHash = await bcrypt.hash(password, 12);
  await query(`INSERT INTO admins (name,email,password_hash) VALUES ($1,$2,$3)
    ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash`, ["Pengelola Katalog", email.toLowerCase(), passwordHash]);
  console.log(`Admin siap: ${email}`);
}

await pool.end();
