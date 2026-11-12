BEGIN;

-- Foto produk Maggot Segar memakai foto larva BSF (sumber: assets-source/products/maggot1.jpg).
-- Hanya mengganti foto bawaan, foto yang sudah diunggah admin tidak ditimpa.
UPDATE products
SET photo_url = '/assets/products/maggot-segar.webp', updated_at = now()
WHERE slug = 'maggot-segar'
  AND (photo_url IS NULL OR photo_url = '' OR photo_url = '/assets/activities/panen.webp');

COMMIT;
