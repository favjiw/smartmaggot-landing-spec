import { AdminPage } from "../../../src/screens/AdminPage";

export const dynamic = "force-dynamic";

export default async function Page({ params }) {
  const { section = [] } = await params;
  return <AdminPage section={section[0] ?? ""} />;
}
