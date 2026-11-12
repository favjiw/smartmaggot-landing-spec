import { cache } from "react";
import { query } from "./db";
import { getExternalImpact } from "./gardahijau-api";

const productSelect = `SELECT p.id,p.slug,p.name,p.description,p.price::float AS price,p.unit,p.photo_url,
  CASE WHEN COALESCE(SUM(sm.quantity), 0) <= 0 THEN 'Habis' WHEN COALESCE(SUM(sm.quantity), 0) <= p.low_stock_threshold THEN 'Menipis' ELSE 'Tersedia' END AS stock_status
  FROM products p LEFT JOIN stock_movements sm ON sm.product_id = p.id`;

// Data dari pg bisa berisi Date; ubah ke JSON murni supaya aman dikirim ke Client Component.
const plain = (value) => JSON.parse(JSON.stringify(value));

/** Produk, kegiatan, dan pengaturan publik dari PostgreSQL. null jika database tidak tersedia. */
export const getPublicCatalog = cache(async () => {
  try {
    const [products, activities, settings] = await Promise.all([
      query(`${productSelect} WHERE p.is_visible=true GROUP BY p.id ORDER BY p.id`),
      query("SELECT id,slug,title,category,activity_date,summary,content,photos FROM activities WHERE is_published=true ORDER BY activity_date DESC, id DESC"),
      query("SELECT partner_name,whatsapp,email,address,operational_hours,description,show_catalog,show_stock_status FROM site_settings WHERE id=1"),
    ]);
    return plain({ products: products.rows, activities: activities.rows, settings: settings.rows[0] ?? null });
  } catch (error) {
    console.warn(`[public-data] Katalog tidak bisa dibaca dari database: ${error.message}`);
    return null;
  }
});

async function getDatabaseImpact() {
  try {
    const { rows } = await query("SELECT total_waste_kg, processing_count, cycle_count, harvest_cycle_count, updated_at FROM impact_stats WHERE id=1");
    const item = rows[0];
    if (!item) return null;
    return { totalSampahKg: Number(item.total_waste_kg), jumlahPencacahan: Number(item.processing_count), jumlahSiklus: Number(item.cycle_count), jumlahSiklusPanen: Number(item.harvest_cycle_count), diperbaruiPada: new Date(item.updated_at).toISOString(), sumber: "manual" };
  } catch (error) {
    console.warn(`[public-data] Angka dampak tidak bisa dibaca dari database: ${error.message}`);
    return null;
  }
}

const hasNumbers = (impact) => impact && (impact.totalSampahKg > 0 || impact.jumlahSiklus > 0);

/**
 * Angka dampak untuk landing page. Urutan sumber:
 * 1. API aplikasi Garda Hijau (data pencatatan Android yang sebenarnya),
 * 2. angka manual dari admin (tabel impact_stats).
 * Mengembalikan null jika tidak ada angka bermakna, sehingga kartu dampak disembunyikan.
 */
export const getPublicImpact = cache(async () => {
  const external = await getExternalImpact();
  if (hasNumbers(external)) return external;
  const manual = await getDatabaseImpact();
  return hasNumbers(manual) ? manual : null;
});
