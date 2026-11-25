BEGIN;

-- Revisi: nomor WhatsApp kontak diganti ke +62 813-1340-4144.
UPDATE site_settings SET whatsapp = '6281313404144', updated_at = now() WHERE id = 1;

COMMIT;
