// Memuat .env, .env.local, dst. dengan aturan yang sama seperti Next.js.
// Diimpor paling awal oleh skrip CLI supaya DATABASE_URL tersedia sebelum pool dibuat.
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
