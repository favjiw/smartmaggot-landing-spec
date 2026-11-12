# Garda Hijau

Landing page dan halaman admin untuk katalog produk Garda Hijau. Aplikasi memakai satu framework, Next.js dengan React, dan PostgreSQL. API berjalan di Route Handlers Next.js pada aplikasi yang sama.

## Fitur

- Landing page, profil, daftar kegiatan (dengan filter kategori), dan halaman detail kegiatan. Data dirender di server, jadi konten dari database langsung tampil tanpa kedip.
- Angka dampak di landing diambil dari API aplikasi Garda Hijau (data pencatatan Android), dengan angka manual admin sebagai cadangan.
- Admin untuk ringkasan, stok, produk, kegiatan, pengaturan profil/kontak, dan angka dampak.
- Pergerakan stok dicatat sebagai riwayat masuk, keluar, atau penyesuaian. Stok tersedia dihitung dari seluruh riwayat.
- Foto produk dan kegiatan dapat dipilih dari kamera/galeri lalu disimpan ke PostgreSQL.
- Login admin menggunakan email dan kata sandi. API admin dilindungi token.

## Kebutuhan

- Node.js 18.18 atau lebih baru dan npm.
- PostgreSQL 14 atau lebih baru. `psql` tidak wajib; migrasi dijalankan lewat Node.

## Menjalankan di komputer lokal

### 1. Pasang dependensi

```bash
npm install
```

### 2. Atur environment

Salin contoh konfigurasi:

```bash
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
```

Ubah nilai di `.env.local`:

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL, mis. `postgresql://postgres:PASSWORD_ANDA@localhost:5432/gardahijau`. Database akan dibuat otomatis jika belum ada. |
| `DATABASE_SSL` | `true` untuk database cloud yang mewajibkan SSL. |
| `JWT_SECRET` | String acak minimal 32 karakter. Wajib di produksi. Buat dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Akun login admin web (password minimal 8 karakter). |
| `GARDAHIJAU_API_URL` | Alamat API aplikasi Garda Hijau. Bawaan: `https://gardahijau.codelabspace.or.id`. |
| `GARDAHIJAU_API_USERNAME`, `GARDAHIJAU_API_PASSWORD` | Akun layanan aplikasi Garda Hijau untuk membaca data pencacahan & siklus. Lihat bagian *Integrasi API Garda Hijau*. |
| `GARDAHIJAU_API_DISABLED` | `true` untuk mematikan integrasi dan hanya memakai angka manual. |

`.env.local` berisi rahasia dan sudah dikecualikan dari Git. Jangan commit atau membagikan isinya.

### 3. Buat tabel, data awal, dan akun admin

```bash
npm run db:setup
```

Perintah ini menjalankan `db:migrate` lalu `db:seed`. Skrip membaca `.env.local` sendiri, jadi tidak perlu `source` atau `set` variabel di terminal (berlaku di Windows, macOS, dan Linux).

- `db:migrate` menjalankan file `database/*.sql` berurutan dan mencatatnya di tabel `schema_migrations`, sehingga setiap file hanya dijalankan sekali. Aman dijalankan ulang.
- `db:seed` membuat atau memperbarui akun admin dari `ADMIN_EMAIL` dan `ADMIN_PASSWORD`. Jika password diubah, jalankan ulang `npm run db:seed`.

Migrasi awal berisi data contoh. Sebelum instalasi produksi pertama, periksa dan ganti contoh data pada `database/001_initial.sql` dengan data organisasi yang benar.

### 4. Jalankan aplikasi

```bash
npm run dev
```

Buka:

- Situs publik: <http://localhost:3000>
- Admin: <http://localhost:3000/admin/login>
- Pemeriksaan koneksi database: <http://localhost:3000/web-api/health>

Untuk menghentikan server development, tekan `Ctrl+C` di terminal.

## Integrasi API Garda Hijau

Landing page menampilkan **total sampah organik yang diolah** dan **jumlah siklus budidaya** dari aplikasi Android Garda Hijau melalui API [Maggot BEM](https://gardahijau.codelabspace.or.id/api-docs/). Integrasi berjalan di server Next.js (`lib/gardahijau-api.js`), sehingga kredensial tidak pernah dikirim ke browser.

Urutan sumber angka dampak:

1. `GET {GARDAHIJAU_API_URL}/api/public/ringkasan` tanpa token (kontrak di `TUGAS-BE.md`). Saat ini endpoint ini belum tersedia di backend; begitu dirilis, landing langsung memakainya tanpa perubahan kode dan tanpa akun layanan.
2. Jika belum tersedia dan `GARDAHIJAU_API_USERNAME`/`GARDAHIJAU_API_PASSWORD` diisi: login sebagai akun layanan, lalu menjumlahkan `totalSampah` dari `GET /api/pencacahan` dan menghitung `GET /api/siklus`.
3. Jika API tidak bisa dihubungi: angka manual dari admin (*Pengaturan → Dampak di landing page*).
4. Jika semua sumber kosong atau bernilai 0, kartu dampak disembunyikan (tidak menampilkan error atau angka 0).

Hasil disimpan di memori server selama 5 menit (stale-while-revalidate), dan token login dipakai ulang sampai mendekati kedaluwarsa, sehingga API tidak dipanggil setiap kali halaman dibuka. Bila API gagal, percobaan berikutnya ditunda 1 menit.

> **Catatan:** dokumentasi API menyebut `GET /api/pencacahan` dan `GET /api/siklus` mengembalikan data **milik user yang login**. Jika itu benar, angka di landing hanya mencakup data akun layanan tersebut. Untuk total semua RW, minta tim backend merilis `/api/public/ringkasan` (T1 di `TUGAS-BE.md`).

Cek sumber angka yang sedang dipakai lewat `GET /web-api/public/ringkasan` (endpoint landing); field `sumber` bernilai `api-publik`, `api-akun-layanan`, atau `manual`.

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

API landing memakai prefix `/web-api` (bukan `/api`) agar bisa berbagi domain dengan backend Maggot BEM, yang tetap memakai `/api/*` dan `/api-docs`.

Semua endpoint menggunakan prefix `/web-api`. Login dan endpoint publik tidak memerlukan token. Endpoint `/web-api/admin/*` memerlukan token admin yang diperoleh dari login.

| Method | Endpoint | Kegunaan |
|---|---|---|
| `GET` | `/web-api/health` | Memeriksa koneksi PostgreSQL |
| `POST` | `/web-api/auth/login` | Login admin |
| `GET` | `/web-api/public/catalog` | Mengambil produk, kegiatan, dan pengaturan publik (`503` jika database tidak tersedia) |
| `GET` | `/web-api/public/ringkasan` | Mengambil angka dampak publik dari API Garda Hijau atau angka manual (`503` jika tidak ada) |
| `GET` | `/web-api/admin/dashboard` | Mengambil ringkasan admin dan grafik stok tujuh hari |
| `GET`, `POST`, `PATCH` | `/web-api/admin/products` | Membaca, menambah, dan mengubah produk |
| `GET`, `POST` | `/web-api/admin/products/:id/stock` | Membaca riwayat atau mencatat pergerakan stok |
| `GET`, `POST`, `PATCH`, `DELETE` | `/web-api/admin/activities` | Mengelola kegiatan |
| `GET`, `PUT` | `/web-api/admin/settings` | Membaca atau mengubah pengaturan situs |
| `PUT` | `/web-api/admin/impact` | Mengubah angka dampak landing page |
| `POST` | `/web-api/admin/upload` | Mengunggah foto ke PostgreSQL |

Contoh respons memakai bentuk `{ "success": true, "data": ... }`. Kegagalan memakai `{ "success": false, "message": "..." }`.

## Build dan menjalankan mode produksi

Siapkan PostgreSQL produksi, isi environment produksi (`DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan variabel `GARDAHIJAU_API_*`), lalu jalankan migrasi dan siapkan akun admin:

```bash
npm ci
npm run db:setup
npm run build
npm start
```

Aplikasi berjalan pada port `3000` secara default. Tempatkan reverse proxy HTTPS di depan aplikasi dan atur backup PostgreSQL secara berkala. Jangan gunakan `ADMIN_PASSWORD` contoh pada deployment.

## Pemecahan masalah

- **`password authentication failed` atau koneksi ditolak:** periksa user, kata sandi, dan port di `DATABASE_URL` pada `.env.local`, serta pastikan service PostgreSQL berjalan.
- **Login admin gagal:** pastikan `ADMIN_EMAIL`/`ADMIN_PASSWORD` benar, kemudian jalankan `npm run db:seed`.
- **Kartu dampak tidak muncul:** buka `/web-api/public/ringkasan`. Lihat log server untuk pesan `[gardahijau-api]` (mis. login akun layanan gagal), atau isi angka manual di admin.
- **Landing menampilkan produk/kegiatan contoh:** database belum tersambung; halaman memakai data cadangan dari `src/content.js`. Periksa `/web-api/health`.
- **Tabel belum ditemukan:** jalankan `npm run db:migrate`.
- **Next.js menampilkan file `.next` hilang atau rusak:** hentikan server yang berjalan ganda di folder proyek, lalu jalankan kembali `npm run dev`. Proyek menggunakan `.next-dev` untuk development dan `.next-build` untuk build produksi.
- **Foto gagal diunggah:** pastikan jenis berkas JPG/PNG/WebP, ukuran di bawah 2 MB, dan koneksi database memiliki ruang yang cukup.

## Struktur proyek

```text
app/                    Halaman Next.js dan API Route Handler
database/               Skema dan migrasi PostgreSQL
lib/                    Koneksi database, autentikasi, data publik, klien API Garda Hijau
assets-source/          Foto dan logo asli (sumber sebelum dikonversi)
public/assets/          Logo, foto produk (products/), foto kegiatan, dan aset situs
scripts/                Migrasi database, akun admin, dan persiapan aset
src/screens/            Halaman React landing dan admin
src/api.js              Klien API admin dan context data publik
src/styles.css          Gaya landing page
src/admin.css           Gaya admin dan layout responsif
```
