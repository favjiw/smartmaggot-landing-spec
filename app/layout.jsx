import "../src/styles.css";
import "../src/admin.css";

export const metadata = {
  metadataBase: new URL("https://gardahijau.com"),
  title: "Sinergi Garda Hijau Mengger",
  description: "Pengolahan sampah organik warga Mengger melalui budidaya maggot BSF.",
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }) {
  return <html lang="id"><body>{children}</body></html>;
}
