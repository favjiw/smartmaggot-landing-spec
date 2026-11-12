BEGIN;

UPDATE products
SET is_visible = true, updated_at = now()
WHERE slug = 'maggot-kering';

INSERT INTO activities (slug,title,category,activity_date,summary,content,photos,is_published) VALUES
  ('sosialisasi-biokonversi','Sosialisasi Pemilahan Sampah RW 03','Sosialisasi Warga','2026-11-04','Edukasi intensif pemilahan sampah organik dapur bersama kader PKK warga Mengger.','Warga mempelajari cara memisahkan sampah organik sejak dari rumah agar proses pengolahan di Rumah Maggot berjalan lebih efektif.',ARRAY['/assets/activities/pemilahan.webp'],true),
  ('uji-coba-panen-sayur','Uji Coba Panen Sayur Pupuk Kasgot','Panen & Produksi','2026-10-28','Penerapan kasgot pada kebun warga menunjukkan hasil panen yang lebih sehat.','Kasgot hasil pengolahan Rumah Maggot digunakan pada kebun warga sebagai bagian dari uji pemanfaatan pupuk organik lokal.',ARRAY['/assets/activities/pelatihan.webp'],true)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  activity_date = EXCLUDED.activity_date,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  photos = EXCLUDED.photos,
  is_published = true,
  updated_at = now();

COMMIT;
