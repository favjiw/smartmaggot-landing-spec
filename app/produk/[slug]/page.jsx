import { notFound } from "next/navigation";
import { getPublicCatalog } from "../../../lib/public-data";
import { PublicDataProvider } from "../../../src/api";
import { fallbackPublic } from "../../../src/content";
import { ProductDetailPage } from "../../../src/screens/ProductDetailPage";

export const dynamic = "force-dynamic";

async function findProduct(slug) {
  const catalog = await getPublicCatalog();
  const products = catalog?.products ?? fallbackPublic.products;
  return { catalog, product: products.find((item) => item.slug === slug) };
}

// Pratinjau link WhatsApp lebih andal dengan JPG; foto produk bawaan punya salinan .jpg di sebelah .webp.
const ogImage = (url) => (url && /^\/assets\/products\/.+\.webp$/.test(url) ? url.replace(/\.webp$/, ".jpg") : url);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { product } = await findProduct(slug);
  if (!product) return { title: "Produk tidak ditemukan | Sinergi Garda Hijau Mengger" };
  const image = ogImage(product.photo_url);
  return {
    title: `${product.name} | Sinergi Garda Hijau Mengger`,
    description: product.description,
    alternates: { canonical: `/produk/${product.slug}` },
    openGraph: { type: "website", title: product.name, description: product.description, images: image ? [{ url: image, width: 800, alt: product.name }] : undefined },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const { catalog, product } = await findProduct(slug);
  if (!product) notFound();
  return <PublicDataProvider catalog={catalog}><ProductDetailPage slug={slug} /></PublicDataProvider>;
}
