BEGIN;

-- Revisi katalog: produk yang dijual hanya Pelet Maggot, Maggot Bubuk, dan Maggot Kering.
-- Foto: ilustrasi dari Wikimedia Commons (atribusi tampil di bawah katalog, lihat HomePage.jsx).
-- Harga belum ditetapkan (tampil "Tanya harga"); isi lewat admin setelah ada.
-- Maggot segar dan kasgot disembunyikan, tidak dihapus, karena riwayat stoknya masih dirujuk.
UPDATE products SET is_visible = false, updated_at = now()
WHERE slug IN ('maggot-segar', 'kasgot');

INSERT INTO products (slug, name, description, price, unit, photo_url, low_stock_threshold, is_visible) VALUES
  ('pelet-maggot', 'Pelet Maggot', 'Pelet pakan dari campuran maggot, dedak, dan jagung bubuk. Kaya protein untuk ikan dan unggas.', NULL, 'kg', '/assets/products/pelet-maggot.webp', 3, true),
  ('maggot-bubuk', 'Maggot Bubuk', 'Tepung dari maggot kering yang digiling halus, kaya protein untuk campuran pakan ternak.', NULL, 'kg', '/assets/products/maggot-bubuk.webp', 3, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  photo_url = EXCLUDED.photo_url,
  is_visible = true,
  updated_at = now();

UPDATE products SET
  name = 'Maggot Kering',
  description = 'Maggot BSF yang disangrai hingga kering, kaya nutrisi dan tahan simpan lebih lama untuk pakan ternak.',
  price = NULL,
  photo_url = '/assets/products/maggot-kering.webp',
  is_visible = true,
  updated_at = now()
WHERE slug = 'maggot-kering';

COMMIT;
