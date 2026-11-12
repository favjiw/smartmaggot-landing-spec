import "../src/styles.css";
import "../src/admin.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://gardahijau.codelabspace.or.id"),
  title: "Sinergi Garda Hijau Mengger",
  description: "Pengolahan sampah organik warga Mengger melalui budidaya maggot BSF.",
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }) {
  return <html lang="id"><body>{children}</body></html>;
}
