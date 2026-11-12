# Garda Hijau

Landing page dan halaman admin untuk katalog produk Garda Hijau. Aplikasi memakai satu framework, Next.js dengan React, dan PostgreSQL. API berjalan di Route Handlers Next.js pada aplikasi yang sama.

## Fitur

- Landing page, profil, daftar kegiatan, dan halaman detail kegiatan.
- Admin untuk ringkasan, stok, produk, kegiatan, pengaturan profil/kontak, dan angka dampak.
- Pergerakan stok dicatat sebagai riwayat masuk, keluar, atau penyesuaian. Stok tersedia dihitung dari seluruh riwayat.
- Foto produk dan kegiatan dapat dipilih dari kamera/galeri lalu disimpan ke PostgreSQL.
- Login admin menggunakan email dan kata sandi. API admin dilindungi token.

## Kebutuhan

- Node.js 18.18 atau lebih baru dan npm.
- PostgreSQL 14 atau lebih baru.
- `psql` tersedia di PATH untuk menjalankan migrasi.

## Menjalankan di komputer lokal

### 1. Pasang dependensi

```bash
npm install
```

### 2. Siapkan PostgreSQL

Buat database dan pengguna PostgreSQL. Contoh di Linux dengan akun PostgreSQL lokal:

```bash
sudo -u postgres psql
```

Di prompt `psql`, buat pengguna dan database:

```sql
CREATE USER gardahijau WITH PASSWORD 'ganti-password-database';
CREATE DATABASE gardahijau OWNER gardahijau;
\q
```

Jika pengguna/database sudah tersedia, langkah ini bisa dilewati.

### 3. Atur environment

Salin contoh konfigurasi:

```bash
cp .env.example .env.local
```

Ubah nilai di `.env.local` sesuai PostgreSQL lokal. Buat `JWT_SECRET` acak yang panjang (minimal 32 karakter), serta ganti `ADMIN_PASSWORD` dengan kata sandi yang kuat.

Contoh URL database:

```env
DATABASE_URL=postgresql://gardahijau:ganti-password-database@localhost:5432/gardahijau
DATABASE_SSL=false
JWT_SECRET=ganti-dengan-random-secret-minimal-32-karakter
ADMIN_EMAIL=admin@gardahijau.com
ADMIN_PASSWORD=ganti-password-ini
```

`.env.local` berisi rahasia dan sudah dikecualikan dari Git. Jangan commit atau membagikan isinya.

### 4. Buat tabel dan data awal

Pastikan environment tersedia di terminal yang menjalankan perintah database:

```bash
set -a
source .env.local
set +a
npm run db:migrate
npm run db:seed
```

Migrasi membuat tabel dan memasukkan contoh pengaturan, dampak, produk, serta kegiatan awal. Data awal hanya ditambahkan jika belum ada. Sebelum instalasi produksi pertama, periksa dan ganti contoh data pada `database/001_initial.sql` dengan data organisasi yang benar.

`db:seed` membuat atau memperbarui akun admin dari `ADMIN_EMAIL` dan `ADMIN_PASSWORD`. Jika password diubah setelah akun dibuat, jalankan ulang `npm run db:seed`.

### 5. Jalankan aplikasi

```bash
npm run dev
```

Buka:

- Situs publik: <http://localhost:3000>
- Admin: <http://localhost:3000/admin/login>
- Pemeriksaan koneksi database: <http://localhost:3000/api/health>

Untuk menghentikan server development, tekan `Ctrl+C` di terminal.

## Cara memakai admin

Masuk dengan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dari `.env.local`.

- **Ringkasan** menampilkan stok, riwayat pergerakan, grafik tujuh hari, dan angka dampak landing page.
- **Produk** menambah atau mengubah produk, harga, foto, batas stok menipis, dan visibilitas katalog.
- **Stok** mencatat stok masuk, stok keluar, dan koreksi stok. Gunakan jumlah positif; sistem mengatur arah perubahan dari jenis catatan.
- **Kegiatan** mengelola cerita kegiatan dan foto yang ditampilkan di situs.
- **Pengaturan** mengubah nama mitra, nomor WhatsApp, email, alamat, jam operasional, dan informasi katalog.
- Bagian **Dampak di landing page** mengubah total sampah organik yang diolah dan jumlah siklus budidaya yang ditampilkan ke publik.

## Database dan unggahan

File migrasi berada di `database/` dan dijalankan berurutan oleh `npm run db:migrate`. Tabel utama:

- `admins`: akun admin.
- `products`: informasi dan pengaturan katalog.
- `stock_movements`: ledger stok; jumlah stok dihitung dari penjumlahan catatan.
- `activities`: berita/kegiatan dan status publikasi.
- `site_settings`: informasi kontak dan tampilan katalog.
- `impact_stats`: angka dampak untuk landing page.
- `media`: berkas foto dalam bentuk data biner.

Foto menerima JPG, PNG, atau WebP dengan ukuran maksimal 2 MB per berkas. Foto disimpan di PostgreSQL; siapkan kapasitas database dan backup yang memadai.

Migrasi awal berisi data contoh untuk memudahkan percobaan lokal. Periksa data tersebut sebelum digunakan pada database produksi.

## API yang tersedia

Semua endpoint menggunakan prefix `/api`. Login dan endpoint publik tidak memerlukan token. Endpoint `/api/admin/*` memerlukan token admin yang diperoleh dari login.

| Method | Endpoint | Kegunaan |
|---|---|---|
| `GET` | `/api/health` | Memeriksa koneksi PostgreSQL |
| `POST` | `/api/auth/login` | Login admin |
| `GET` | `/api/public/catalog` | Mengambil produk, kegiatan, dan pengaturan publik |
| `GET` | `/api/public/ringkasan` | Mengambil angka dampak publik |
| `GET` | `/api/admin/dashboard` | Mengambil ringkasan admin dan grafik stok tujuh hari |
| `GET`, `POST`, `PATCH` | `/api/admin/products` | Membaca, menambah, dan mengubah produk |
| `GET`, `POST` | `/api/admin/products/:id/stock` | Membaca riwayat atau mencatat pergerakan stok |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/admin/activities` | Mengelola kegiatan |
| `GET`, `PUT` | `/api/admin/settings` | Membaca atau mengubah pengaturan situs |
| `PUT` | `/api/admin/impact` | Mengubah angka dampak landing page |
| `POST` | `/api/admin/upload` | Mengunggah foto ke PostgreSQL |

Contoh respons memakai bentuk `{ "success": true, "data": ... }`. Kegagalan memakai `{ "success": false, "message": "..." }`.

## Build dan menjalankan mode produksi

Siapkan PostgreSQL produksi, isi environment produksi (`DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`), lalu jalankan migrasi dan siapkan akun admin:

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Aplikasi berjalan pada port `3000` secara default. Tempatkan reverse proxy HTTPS di depan aplikasi dan atur backup PostgreSQL secara berkala. Jangan gunakan `ADMIN_PASSWORD` contoh pada deployment.

## Pemecahan masalah

- **`DATABASE_URL` kosong atau koneksi ditolak:** muat `.env.local` ke shell sebelum menjalankan migrasi, periksa PostgreSQL aktif, nama database, kata sandi, dan port.
- **Login gagal:** pastikan `ADMIN_EMAIL`/`ADMIN_PASSWORD` benar, kemudian jalankan `npm run db:seed` setelah memuat `.env.local`.
- **Tabel belum ditemukan:** jalankan `npm run db:migrate`.
- **Next.js menampilkan file `.next` hilang atau rusak:** hentikan server yang berjalan ganda di folder proyek, lalu jalankan kembali `npm run dev`. Proyek menggunakan `.next-dev` untuk development dan `.next-build` untuk build produksi.
- **Foto gagal diunggah:** pastikan jenis berkas JPG/PNG/WebP, ukuran di bawah 2 MB, dan koneksi database memiliki ruang yang cukup.

## Struktur proyek

```text
app/                    Halaman Next.js dan API Route Handler
database/               Skema dan migrasi PostgreSQL
lib/                    Koneksi database dan autentikasi server
public/assets/          Logo dan aset situs
scripts/                Utilitas persiapan aset dan akun admin
src/screens/            Halaman React landing dan admin
src/api.js              Klien API browser dan hooks data publik
src/styles.css          Gaya landing page
src/admin.css           Gaya admin dan layout responsif
```
