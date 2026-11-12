import Link from "next/link";
import { getPublicCatalog } from "../../lib/public-data";
import { PublicDataProvider } from "../../src/api";
import { Header } from "../../src/components";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profil | Sinergi Garda Hijau Mengger",
};

export default async function ProfilePage() {
  const catalog = await getPublicCatalog();
  return <PublicDataProvider catalog={catalog}><Header /><main className="development-page"><section className="development-card"><h1>Halaman ini sedang dalam tahap pengembangan</h1><p>Profil, sejarah Rumah Maggot, visi dan misi, program, serta struktur organisasi akan ditampilkan di halaman ini setelah informasinya selesai disusun.</p><Link className="button" href="/">Kembali ke beranda</Link></section></main></PublicDataProvider>;
}
