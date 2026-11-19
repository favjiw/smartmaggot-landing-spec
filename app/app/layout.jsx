import localFont from "next/font/local";
import "../../src/app-web/app.css";
import { AppSessionProvider } from "../../src/app-web/session";

const atkinson = localFont({
  src: [
    { path: "../../src/app-web/fonts/atkinson_regular.ttf", weight: "400" },
    { path: "../../src/app-web/fonts/atkinson_medium.ttf", weight: "500" },
    { path: "../../src/app-web/fonts/atkinson_bold.ttf", weight: "700" },
  ],
  variable: "--ghm-atkinson",
  display: "swap",
});
const bricolage = localFont({
  src: [
    { path: "../../src/app-web/fonts/bricolage_semibold.ttf", weight: "600" },
    { path: "../../src/app-web/fonts/bricolage_bold.ttf", weight: "700" },
  ],
  variable: "--ghm-bricolage",
  display: "swap",
});

export const metadata = {
  title: { default: "Garda Hijau Mengger", template: "%s · Garda Hijau Mengger" },
  description: "Catat sampah yang masuk dan pantau kandang maggot di RW-mu.",
  manifest: "/ghm/manifest.webmanifest",
  applicationName: "Garda Hijau Mengger",
  appleWebApp: { capable: true, title: "Garda Hijau", statusBarStyle: "default" },
  icons: { icon: "/ghm/icon-192.png", apple: "/ghm/apple-touch-icon.png" },
  robots: { index: false, follow: false },
  alternates: { canonical: "/app" },
};

export const viewport = {
  themeColor: "#1e5b3a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AppLayout({ children }) {
  return (
    <div className={`ghm-app ${atkinson.variable} ${bricolage.variable}`}>
      <AppSessionProvider>{children}</AppSessionProvider>
    </div>
  );
}
