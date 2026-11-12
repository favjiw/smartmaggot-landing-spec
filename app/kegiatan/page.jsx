import { getPublicCatalog } from "../../lib/public-data";
import { PublicDataProvider } from "../../src/api";
import { ActivitiesPage } from "../../src/screens/ActivitiesPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kegiatan | Sinergi Garda Hijau Mengger",
  alternates: { canonical: "/kegiatan" },
};

export default async function Page() {
  const catalog = await getPublicCatalog();
  return <PublicDataProvider catalog={catalog}><ActivitiesPage /></PublicDataProvider>;
}
