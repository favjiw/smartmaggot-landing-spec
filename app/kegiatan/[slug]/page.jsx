import { notFound } from "next/navigation";
import { getPublicCatalog } from "../../../lib/public-data";
import { PublicDataProvider } from "../../../src/api";
import { fallbackPublic } from "../../../src/content";
import { ActivityDetailPage } from "../../../src/screens/ActivityDetailPage";

export const dynamic = "force-dynamic";

async function findActivity(slug) {
  const catalog = await getPublicCatalog();
  const activities = catalog?.activities ?? fallbackPublic.activities;
  return { catalog, activity: activities.find((item) => item.slug === slug) };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { activity } = await findActivity(slug);
  if (!activity) return { title: "Kegiatan tidak ditemukan | Sinergi Garda Hijau Mengger" };
  return {
    title: `${activity.title} | Sinergi Garda Hijau Mengger`,
    description: activity.summary,
    alternates: { canonical: `/kegiatan/${activity.slug}` },
    openGraph: { title: activity.title, description: activity.summary, images: activity.photos?.[0] ? [activity.photos[0]] : undefined },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const { catalog, activity } = await findActivity(slug);
  if (!activity) notFound();
  return <PublicDataProvider catalog={catalog}><ActivityDetailPage slug={slug} /></PublicDataProvider>;
}
