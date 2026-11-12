import { ActivityDetailPage } from "../../../src/screens/ActivityDetailPage";

export const dynamic = "force-dynamic";

export default async function Page({ params }) {
  const { slug } = await params;
  return <ActivityDetailPage slug={slug} />;
}
