# Smart Maggot — Keputusan Lingkup & Spec (12 Nov 2026)

Hasil sesi *grilling* (skill `grill-me` Matt Pocock) bersama Favian, 12 Nov 2026, yang disesuaikan dengan keputusan tim di grup WA pukul 10:05–10:08.

| File | Untuk siapa | Isi |
|---|---|---|
| `SPEC-landing-katalog.md` | Tim landing ("anak bawah") | Spec landing page + katalog (fitur 2) |
| `TUGAS-BE.md` | Gilang | 2 perubahan kecil di BE-BEM sebelum landing go-live |
| `content.template.json` | Tim landing | Contoh file konten. Semua isian `TODO` diganti konten asli |

## Arsitektur yang disepakati

```
                ┌──────────────────────────────┐
  Peternak ───▶ │ Android WeGot (branch `dev`) │  Fitur 1: monitoring (admin)
                └──────────────┬───────────────┘
                               │ token JWT
                ┌──────────────▼───────────────┐      ┌────────────────────────────┐
                │ BE-BEM  api.smartmaggot.my.id │ ───▶ │ Flask prediksi panen       │
                │ Express + Prisma + Postgres   │      │ flaskapi.smartmaggot.my.id │
                └──────────────▲───────────────┘      └────────────────────────────┘
                               │ GET /api/public/ringkasan (tanpa token)
                ┌──────────────┴───────────────┐
  Pembeli ────▶ │ Landing  smartmaggot.my.id   │  Fitur 2: promosi + katalog statis
                └──────────────────────────────┘
                               │ tombol "Pesan via WhatsApp"
                               ▼
                          WA admin mitra
```

## Keputusan final

1. **Fitur 1 (admin)** = Android WeGot branch `dev` + BE-BEM + Flask prediksi panen, dipakai **apa adanya**. Gilang men-deploy ke `*.smartmaggot.my.id`. Server proyek `garda-hijau` yang semalam dimatikan.
2. **Sisi "smart"** = prediksi panen (Flask, model Iqbal) dan chatbot di Android. Prediksi harga **tidak** dibuat karena datanya tidak ada.
3. **Fitur 2 (publik)** = landing satu halaman di root `smartmaggot.my.id`, dikerjakan tim landing. Spec ditulis tanpa terikat framework.
4. **Katalog statis**: nama, foto, harga (kosong → "Tanya harga"), status *Tersedia / Pre-order*, satu tombol WA per produk. **Belum** tersambung ke data panen.
5. **Angka dampak** di landing diambil dari endpoint publik baru `GET /api/public/ringkasan`.
6. **Chatbot tidak dipasang di landing**, karena endpoint LLM berbayar yang terbuka ke publik tanpa batasan pemakaian berisiko kuota cepat habis.
7. **Brand**: nama mitra (*Sinergi Garda Hijau Mengger*) jadi judul. *WeGot / Smart Maggot* disebut sebagai sistem pendukung.
8. **Konten** (WA, alamat, harga, foto, logo) dikumpulkan di satu file konten dengan placeholder `TODO`.
9. **Keamanan BE**: `authMiddleware` dipasang di `GET/PUT/DELETE /api/pencacahan`. `POST /api/auth/register` dibiarkan dulu.

## Backlog (resmi tidak dikerjakan hari ini)

Isi brief awal yang belum ada di Android/BE lama. **Pastikan pembina tidak mengharapkan ini muncul di demo.**

- Jenis/kategori sampah per catatan pencacahan
- Hasil panen **aktual** (maggot, kasgot, residu). Saat ini yang tersimpan hanya *prediksi*.
- Dashboard grafik per minggu/bulan
- Stok katalog otomatis dari panen (bergantung pada hasil panen aktual)
- Chatbot di landing (perlu rate limit dan kuota Azure yang jelas)
- Halaman admin web untuk produk/kegiatan. Untuk sekarang konten diubah lewat file konten.

## Catatan teknis yang ditemukan

- Repo WeGot: branch `main` cuma kerangka. App lengkapnya ada di **`dev`** (71 file Kotlin, ±3.900 baris).
- Model prediksi panen dilatih dari **500 baris data simulasi** (`dummy_data.csv`). Sebut sebagai *estimasi* saat demo.
- Proyek `garda-hijau` (semalam) sudah punya katalog publik + helper link WA (`frontend/src/lib/whatsapp.js`) dan tes e2e katalog. Boleh dijadikan acuan atau disalin tim landing.
