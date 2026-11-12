BEGIN;

CREATE TABLE IF NOT EXISTS admins (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  partner_name text NOT NULL,
  whatsapp text NOT NULL CHECK (whatsapp ~ '^[0-9]{10,16}$'),
  email text,
  address text NOT NULL,
  operational_hours text NOT NULL,
  description text NOT NULL,
  show_catalog boolean NOT NULL DEFAULT true,
  show_stock_status boolean NOT NULL DEFAULT true,
  default_unit text NOT NULL DEFAULT 'kg',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  price numeric(12,2) CHECK (price IS NULL OR price >= 0),
  unit text NOT NULL DEFAULT 'kg',
  photo_url text,
  low_stock_threshold numeric(12,3) NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('MASUK','KELUAR','PENYESUAIAN')),
  quantity numeric(12,3) NOT NULL CHECK (quantity <> 0),
  note text,
  created_by bigint REFERENCES admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((type='MASUK' AND quantity>0) OR (type='KELUAR' AND quantity<0) OR type='PENYESUAIAN')
);

CREATE TABLE IF NOT EXISTS activities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Kegiatan Warga',
  activity_date date NOT NULL,
  summary text NOT NULL CHECK (char_length(summary) <= 200),
  content text NOT NULL,
  photos text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_stats (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id=1),
  total_waste_kg numeric(14,1) NOT NULL DEFAULT 0 CHECK (total_waste_kg >= 0),
  processing_count bigint NOT NULL DEFAULT 0 CHECK (processing_count >= 0),
  cycle_count bigint NOT NULL DEFAULT 0 CHECK (cycle_count >= 0),
  harvest_cycle_count bigint NOT NULL DEFAULT 0 CHECK (harvest_cycle_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 2097152),
  data bytea NOT NULL,
  created_by bigint REFERENCES admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_created_idx ON stock_movements (product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS activities_published_date_idx ON activities (is_published,activity_date DESC);
CREATE INDEX IF NOT EXISTS products_visible_idx ON products (is_visible) WHERE is_visible=true;

INSERT INTO site_settings (id,partner_name,whatsapp,email,address,operational_hours,description)
VALUES (1,'Sinergi Garda Hijau Mengger','6281234567890','kontak@gardahijau.id','Hanggar Maggot, Kelurahan Mengger, Kota Bandung','Senin–Sabtu, 08.00–16.00','Inisiatif biokonversi sampah organik berbasis maggot BSF dan pengolahan kompos di Kelurahan Mengger, Bandung.') ON CONFLICT (id) DO NOTHING;
INSERT INTO impact_stats (id,total_waste_kg,processing_count,cycle_count,harvest_cycle_count)
VALUES (1,1234.5,87,24,18) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (slug,name,description,price,unit,photo_url,low_stock_threshold,is_visible) VALUES
  ('maggot-segar','Maggot segar','Larva BSF segar berprotein tinggi untuk pakan ikan dan unggas.',8000,'kg','/assets/activities/panen.webp',5,true),
  ('kasgot','Kasgot','Pupuk organik padat kaya mikroba untuk tanaman dan kebun warga.',NULL,'kg','/assets/activities/kasgot.webp',5,true),
  ('maggot-kering','Maggot kering','Pakan bernutrisi dengan masa simpan lebih panjang.',45000,'kg','/assets/activities/kunjungan.webp',3,false)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO activities (slug,title,category,activity_date,summary,content,photos,is_published) VALUES
  ('panen-raya-maggot-siklus-ke-24','Panen Raya Maggot Siklus ke-24','Panen & Produksi','2026-11-10','Warga dan kader pengelola memanen larva BSF untuk kebutuhan pakan peternak lokal.','Siklus budidaya biokonversi maggot batch ke-24 berhasil dipanen bersama warga.\n\nSisa residu organik diayak menjadi kasgot untuk kebun warga.',ARRAY['/assets/activities/panen.webp','/assets/activities/kasgot.webp'],true)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO stock_movements (product_id,type,quantity,note)
SELECT id,'MASUK',CASE slug WHEN 'maggot-segar' THEN 12.5 WHEN 'kasgot' THEN 4 ELSE 2 END,'Stok awal' FROM products p
WHERE NOT EXISTS (SELECT 1 FROM stock_movements sm WHERE sm.product_id=p.id);

COMMIT;
