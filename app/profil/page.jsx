import Link from "next/link";
import { Header } from "../../src/components";

export const metadata = {
  title: "Profil | Sinergi Garda Hijau Mengger",
};

export default function ProfilePage() {
  return <><Header /><main className="development-page"><section className="development-card"><h1>Halaman ini sedang dalam tahap pengembangan</h1><p>Profil, sejarah Rumah Maggot, visi dan misi, program, serta struktur organisasi akan ditampilkan di halaman ini setelah informasinya selesai disusun.</p><Link className="button" href="/">Kembali ke beranda</Link></section></main></>;
}
