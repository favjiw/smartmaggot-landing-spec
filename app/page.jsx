import { getPublicCatalog, getPublicImpact } from "../lib/public-data";
import { PublicDataProvider } from "../src/api";
import { HomePage } from "../src/screens/HomePage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [catalog, impact] = await Promise.all([getPublicCatalog(), getPublicImpact()]);
  return <PublicDataProvider catalog={catalog} impact={impact}><HomePage /></PublicDataProvider>;
}
