BEGIN;

-- API landing pindah dari /api ke /web-api supaya bisa berbagi domain dengan backend
-- (backend tetap memakai /api/*). Perbarui URL foto yang sudah tersimpan.
UPDATE products
SET photo_url = regexp_replace(photo_url, '^/api/media/', '/web-api/media/')
WHERE photo_url LIKE '/api/media/%';

UPDATE activities
SET photos = ARRAY(SELECT regexp_replace(p, '^/api/media/', '/web-api/media/') FROM unnest(photos) AS p)
WHERE EXISTS (SELECT 1 FROM unnest(photos) AS p WHERE p LIKE '/api/media/%');

COMMIT;
