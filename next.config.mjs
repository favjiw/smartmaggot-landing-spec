import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

// Folder build dipisah supaya `next dev` dan `next build` tidak saling menimpa.
// Ditentukan dari phase (bukan variabel env di script npm) agar jalan di Windows, macOS, dan Linux.
export default function nextConfig(phase) {
  return {
    distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next-build"),
    // Cegah Next.js memilih folder induk sebagai root bila ada package-lock.json lain di atas proyek.
    outputFileTracingRoot: projectRoot,
    turbopack: { root: projectRoot },
  };
}
