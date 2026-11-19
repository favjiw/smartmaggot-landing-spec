import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

// Folder build dipisah supaya `next dev` dan `next build` tidak saling menimpa.
// Ditentukan dari phase (bukan variabel env di script npm) agar jalan di Windows, macOS, dan Linux.
export default function nextConfig(phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  // Aplikasi web (/app) memanggil backend di /api. Di server, Nginx meneruskan /api ke backend
  // sebelum sampai ke Next.js. Saat pengembangan lokal (atau bila BACKEND_API_URL diisi),
  // Next.js yang meneruskannya.
  const backend = (process.env.BACKEND_API_URL || (isDev ? "https://gardahijaukemdiktisaintek.digital" : "")).replace(/\/+$/, "");
  return {
    distDir: process.env.NEXT_DIST_DIR || (isDev ? ".next-dev" : ".next-build"),
    // Cegah Next.js memilih folder induk sebagai root bila ada package-lock.json lain di atas proyek.
    outputFileTracingRoot: projectRoot,
    turbopack: { root: projectRoot },
    async rewrites() {
      return backend ? [{ source: "/api/:path*", destination: `${backend}/api/:path*` }] : [];
    },
  };
}
