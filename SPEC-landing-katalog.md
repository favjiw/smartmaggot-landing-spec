# Spec: Landing Page & Katalog Smart Maggot (Fitur 2)

> Status: **ready-for-human** · Target: deploy hari ini (12 Nov 2026) di `https://smartmaggot.my.id`
> Pemilik: tim landing · Konteks lengkap: `README.md`

## Problem Statement

Mitra *Sinergi Garda Hijau Mengger* mengolah sampah organik warga Kelurahan Mengger menjadi maggot BSF dan kasgot. Masalahnya, belum ada tempat publik untuk:

- memperkenalkan mitra dan programnya,
- menunjukkan bukti dampak (berapa sampah yang sudah diolah),
- menampilkan produk hasil olahan supaya bisa dibeli.

Calon pembeli (peternak ikan/unggas, petani, warga) tidak tahu produk apa saja yang tersedia, harganya berapa, atau harus menghubungi siapa. Aplikasi Android WeGot hanya dipakai pengelola untuk mencatat, jadi tidak bisa dilihat publik.

## Solution

Satu landing page publik yang ringan dan mobile-first di `smartmaggot.my.id`, berisi:

1. **Hero** dengan nama mitra, kalimat ajakan, dan **angka dampak langsung** (total sampah tercacah, jumlah siklus budidaya) yang diambil dari backend.
2. **Tentang & Program** (teks statis).
3. **Katalog produk** (statis): kartu produk dengan foto, nama, harga atau "Tanya harga", status *Tersedia / Pre-order*, dan **tombol "Pesan via WhatsApp"**. Tombol ini membuka chat ke admin dengan pesan yang sudah terisi otomatis. Tidak ada keranjang, checkout, atau pembayaran.
4. **Kegiatan** (gabungan galeri + berita): 3 kegiatan terbaru di beranda, ditambah halaman daftar dan halaman detail.
5. **Kontak**: tombol WA, alamat, dan peta.

Semua teks, harga, foto, dan nomor WA dibaca dari **satu file konten** (`content.template.json`). Dengan begitu konten bisa diganti tanpa menyentuh komponen.

## User Stories

**Pembeli / pengunjung**
1. Sebagai calon pembeli, saya ingin langsung melihat apa itu Garda Hijau Mengger dan apa yang dijual, supaya saya tahu situs ini relevan buat saya dalam beberapa detik.
2. Sebagai calon pembeli, saya ingin melihat daftar produk lengkap dengan foto, supaya saya tahu bentuk barangnya.
3. Sebagai calon pembeli, saya ingin melihat harga per satuan (mis. per kg), supaya saya bisa memperkirakan biaya.
4. Sebagai calon pembeli, saya ingin melihat tulisan "Tanya harga" kalau harga belum dicantumkan, supaya saya tahu tetap bisa bertanya, bukan mengira harganya Rp0.
5. Sebagai calon pembeli, saya ingin tahu apakah produk tersedia sekarang atau harus pre-order, supaya ekspektasi saya soal waktu benar.
6. Sebagai calon pembeli, saya ingin menekan satu tombol untuk langsung chat WhatsApp dengan pesan yang sudah menyebut nama produk, supaya saya tidak perlu mengetik dari nol.
7. Sebagai calon pembeli di HP, saya ingin tombol WA membuka aplikasi WhatsApp. Di laptop, saya ingin tombol itu membuka WhatsApp Web.
8. Sebagai calon pembeli, saya ingin tombol WA umum di bagian kontak/hero, supaya saya bisa bertanya hal di luar produk tertentu.
9. Sebagai calon pembeli, saya ingin melihat alamat dan peta lokasi, supaya saya bisa mengambil pesanan sendiri.
10. Sebagai pengunjung dengan koneksi lambat, saya ingin halaman tetap cepat terbuka dan gambar dimuat bertahap, supaya saya tidak menunggu lama.

**Warga, pembina, juri**
11. Sebagai warga atau pembina, saya ingin melihat berapa kg sampah yang sudah diolah, supaya dampak program terlihat nyata.
12. Sebagai pengunjung, saya ingin angka dampak tidak tampil sebagai "0" atau error ketika server bermasalah, supaya situs tidak terlihat rusak.
13. Sebagai pengunjung, saya ingin membaca tentang mitra dan program-programnya, supaya saya paham konteks dan tujuan kegiatan.
14. Sebagai pengunjung, saya ingin melihat dokumentasi kegiatan terbaru (foto + cerita singkat), supaya saya tahu program ini aktif berjalan.
15. Sebagai pengunjung, saya ingin membuka semua kegiatan di satu halaman daftar, lalu membuka detail satu kegiatan, supaya saya bisa membaca lebih lengkap.
16. Sebagai pengunjung, saya ingin tahu bahwa pencatatan dan prediksi panen didukung sistem *WeGot / Smart Maggot*, supaya sisi teknologinya terlihat.
17. Sebagai pengunjung, saya ingin melihat logo mitra dan pendukung (UNIKOM, BEM, dll.), supaya situs terlihat kredibel.

**Tim pengembang / pengisi konten**
18. Sebagai anggota tim, saya ingin mengganti nomor WA, harga, status produk, dan teks profil di satu file, supaya perubahan konten tidak berisiko merusak tampilan.
19. Sebagai anggota tim, saya ingin menambah kegiatan baru cukup dengan menambah satu entri di file konten dan menaruh fotonya di folder aset.
20. Sebagai anggota tim, saya ingin placeholder bertanda `TODO` yang mudah dicari, supaya tidak ada konten palsu yang terlanjur tayang.
21. Sebagai anggota tim, saya ingin judul halaman, deskripsi, dan gambar pratinjau (Open Graph) terisi, supaya link yang dibagikan ke grup WA tampil rapi.

## Implementation Decisions

**Bentuk & lokasi**
- Satu landing page di root `https://smartmaggot.my.id`, ditambah rute `/kegiatan` (daftar) dan `/kegiatan/{slug}` (detail).
- Mobile-first. Desain harus enak di lebar 360 px lebih dulu, baru desktop.
- Stack bebas, sesuai pilihan tim landing. Disarankan situs statis (build jadi HTML/JS/CSS) supaya bisa di-hosting di mana saja (Vercel/Netlify/nginx di VPS). Tidak butuh database sendiri.
- DNS root domain diarahkan ke hosting landing. Subdomain `api.`, `flaskapi.`, `chatbot.` tetap seperti sekarang.

**Urutan section di beranda**
1. Navbar: logo/nama mitra, tautan ke #produk, #kegiatan, #kontak, dan tombol WA kecil.
2. Hero: nama mitra, satu kalimat misi, tombol "Lihat Produk" dan "Hubungi Kami", serta **2 kartu angka dampak**.
3. Tentang & Program: paragraf profil + daftar program (ikon + judul + 1 kalimat).
4. Produk (katalog): grid kartu produk.
5. Kegiatan terbaru: 3 kartu terbaru (urut tanggal menurun) + tautan "Lihat semua kegiatan".
6. Teknologi pendukung: 1 blok singkat bahwa pencatatan dan estimasi panen memakai aplikasi *WeGot / Smart Maggot*.
7. Kontak: tombol WA, alamat, embed Google Maps, logo pendukung, footer.

**Identitas visual**
- Mengikuti prototipe Figma *Wise on Waste*: hijau sebagai warna utama, kartu putih bersudut membulat, font sans-serif geometris (Poppins atau sejenis).
- Ambil kode warna persis dari Figma. Perkiraan dari gambar prototipe: hijau utama ±`#5BAA7C`, hijau gelap ±`#2E5E3E`. Ini `TODO`, perlu dicek di Figma.
- Judul situs memakai nama mitra. *WeGot / Smart Maggot* hanya disebut sebagai sistem pendukung.

**Data katalog (statis)**
- Produk dibaca dari file konten. Field per produk: `id`, `nama`, `deskripsi` (1–2 kalimat), `foto`, `harga` (angka rupiah atau `null`), `satuan` (mis. `kg`, `karung`), `status` (`tersedia` | `pre-order`).
- `harga: null` → tampilkan "Tanya harga". Jangan pernah menampilkan "Rp0".
- Produk awal: **Maggot segar**, **Kasgot**, **Maggot kering**.
- Stok berupa angka **tidak** ditampilkan (lihat Out of Scope).

**Tombol WhatsApp**
- Format link: `https://wa.me/{nomor}?text={pesan yang di-URL-encode}`. Nomor memakai format internasional tanpa `+`, mis. `62812xxxx`.
- Pesan per produk:
  - Ada harga: `Halo, saya ingin memesan {nama} ({harga}/{satuan}) dari Garda Hijau Mengger. Apakah masih tersedia?`
  - Harga `null`: `Halo, saya ingin menanyakan harga dan ketersediaan {nama} dari Garda Hijau Mengger.`
- Pesan umum (navbar/kontak): `Halo, saya ingin bertanya tentang produk dan program Garda Hijau Mengger.`
- Satu nomor WA untuk semua tombol, diambil dari file konten.
- Acuan implementasi: `garda-hijau/frontend/src/lib/whatsapp.js` (fungsi `buatPesanOrder` dan `buatLinkWhatsapp`).

**Angka dampak (satu-satunya data dinamis)**
- Ambil sekali saat halaman dibuka: `GET https://api.smartmaggot.my.id/api/public/ringkasan`, tanpa token. Kontrak lengkapnya ada di `TUGAS-BE.md`.
- Tampilkan **"{totalSampahKg} kg sampah organik telah dicacah"** dan **"{jumlahSiklus} siklus budidaya maggot"**. Angka diformat dengan locale Indonesia (`1.234,5`).
- Selama memuat: tampilkan skeleton/placeholder.
- Kalau gagal, timeout (> 5 detik), atau nilainya 0: **sembunyikan kartu angka**. Jangan tampilkan error atau angka 0.

**Kegiatan**
- Field per kegiatan: `slug`, `judul`, `tanggal` (ISO), `ringkasan` (1–2 kalimat), `isi` (beberapa paragraf), `foto` (array, foto pertama jadi sampul).
- Beranda menampilkan 3 kegiatan terbaru. `/kegiatan` menampilkan semuanya (urut tanggal menurun). `/kegiatan/{slug}` menampilkan semua foto + isi.

**Profil, program, kontak**
- Disimpan sebagai teks statis di file konten (`mitra.*`, `program[]`, `kontak.*`).
- Konten yang belum ada diberi tanda `TODO`. **Sebelum go-live, cari `TODO` di file konten. Hasilnya harus kosong**, atau minimal nomor WA dan nama mitra sudah asli.

**SEO & share**
- `<title>`, meta description, dan gambar Open Graph diambil dari file konten.
- `lang="id"`.

## Testing Decisions

- **Yang diuji adalah perilaku yang terlihat pengguna, bukan detail implementasi.** Contoh: "klik Pesan di kartu Kasgot membuka URL wa.me berisi kata *Kasgot*", bukan "fungsi X dipanggil".
- **Unit test** (kalau stack mendukung): fungsi pembuat link/pesan WA untuk kasus *ada harga*, *harga null*, dan nama produk dengan karakter khusus (`&`, spasi). Lalu formatter angka/rupiah. Acuan: tes helper WA di proyek `garda-hijau`.
- **E2E smoke test** (Playwright, kalau sempat): beranda terbuka; jumlah kartu produk sama dengan jumlah produk di file konten; `href` tombol WA berawalan `https://wa.me/` dan berisi nama produk; kalau API ringkasan di-*mock* gagal, kartu angka tidak tampil dan halaman tidak error. Acuan: tes e2e katalog publik di `garda-hijau/e2e`.
- **Checklist manual sebelum go-live** (wajib walau tanpa tes otomatis):
  - [ ] Dibuka di HP Android (Chrome) lebar 360 px: tidak ada scroll horizontal.
  - [ ] Semua tombol WA membuka chat ke nomor yang benar dengan pesan yang benar.
  - [ ] Angka dampak tampil sesuai data BE, dan kartu hilang saat API dimatikan.
  - [ ] Halaman daftar & detail kegiatan bisa dibuka langsung lewat URL (refresh tidak 404).
  - [ ] Tidak ada teks `TODO` / lorem ipsum yang tampil.
  - [ ] Link yang dibagikan ke grup WA menampilkan judul + gambar pratinjau.

## Out of Scope

- Keranjang, checkout, pembayaran, atau pencatatan pesanan. Semua transaksi lewat WhatsApp.
- **Stok angka dan sambungan otomatis panen → stok.** Data panen aktual belum dicatat di sistem (yang ada hanya prediksi), jadi menampilkan stok dari prediksi akan menyesatkan pembeli. Masuk backlog.
- Halaman admin web untuk mengelola produk, kegiatan, atau profil. Untuk sekarang konten diubah lewat file konten.
- Chatbot di landing.
- Prediksi harga.
- Login atau register di web. Login hanya ada di Android.
- Multi-bahasa.

## Further Notes

- Kontrak endpoint ringkasan dan perubahan BE ada di `TUGAS-BE.md`. Selama endpoint belum siap, landing tetap bisa di-deploy karena kartu angka otomatis tersembunyi.
- Proyek `garda-hijau` (React 19 + Vite + Tailwind) sudah punya halaman katalog publik dan detail produk (`frontend/src/pages/public/`). Kalau tim landing memakai React, komponen itu bisa disalin dan disederhanakan (buang pemanggilan API produk, ganti dengan file konten).
- Logo: 3 logo di splash prototipe. Minta file aslinya ke tim desain. Kalau tidak ada, pakai logo teks sementara.
- Setelah backlog "hasil panen aktual" dikerjakan, katalog bisa diubah dari status statis menjadi stok kg otomatis tanpa merombak tampilan. Cukup tambahkan field `stokKg` di kartu.
