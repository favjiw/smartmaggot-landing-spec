# Deploy ke VPS Ubuntu — gardahijaukemdiktisaintek.digital

Panduan memasang landing page + admin Garda Hijau di VPS Ubuntu yang masih kosong, dengan domain dari Hostinger.

Hasil akhirnya:

- `https://gardahijaukemdiktisaintek.digital` → landing page
- `https://gardahijaukemdiktisaintek.digital/admin/login` → admin web
- Next.js berjalan sebagai service `gardahijau-web` di port 3000 (hanya lokal), di belakang Nginx + HTTPS Let's Encrypt
- PostgreSQL di server yang sama, dengan backup otomatis tiap hari
- Angka dampak tetap diambil dari backend Maggot BEM di `https://gardahijau.codelabspace.or.id`

Semua perintah di bawah dijalankan sendiri di VPS; skrip tidak mengirim data ke mana pun selain mengunduh paket dan kode.

## 1. Arahkan domain ke VPS (hPanel Hostinger)

1. Catat **IP publik VPS** (hPanel → VPS → Overview).
2. Buka hPanel → **Domain** → `gardahijaukemdiktisaintek.digital` → **DNS / Nameserver** → **DNS records**.
3. Atur record berikut. Hapus dulu record `A`/`AAAA` lama untuk `@` dan `www` yang mengarah ke parkir Hostinger, supaya tidak bentrok.

   | Type | Name | Points to | TTL |
   |---|---|---|---|
   | A | `@` | IP VPS | 300 |
   | A | `www` | IP VPS | 300 |

4. Cek dari laptop (biasanya beberapa menit, kadang sampai beberapa jam):

   ```bash
   nslookup gardahijaukemdiktisaintek.digital
   ```

   Hasilnya harus IP VPS. Skrip tetap bisa dijalankan sebelum DNS aktif; hanya langkah HTTPS yang ditunda.

Jika firewall VPS di hPanel aktif, buka port **22, 80, dan 443**.

## 2. Masuk ke VPS

```bash
ssh root@IP_VPS
```

Password root ada di hPanel → VPS → pengaturan akses SSH.

## 3. Jalankan skrip setup

```bash
curl -fsSL https://raw.githubusercontent.com/favjiw/smartmaggot-landing-spec/main/deploy/setup-server.sh -o setup-server.sh
less setup-server.sh        # opsional: baca dulu isinya, keluar dengan q
sudo bash setup-server.sh
```

Skrip akan bertanya:

- **Email untuk sertifikat HTTPS**: email aktif untuk notifikasi Let's Encrypt.
- **Email login admin web**: email untuk login di `/admin/login`.
- **GARDAHIJAU_API_USERNAME / PASSWORD**: akun layanan aplikasi Garda Hijau, sama seperti di `.env.local` laptop. Boleh dikosongkan lalu diisi nanti (lihat langkah 5).

Lalu skrip otomatis:

1. Memasang Nginx, PostgreSQL, Node.js 24, certbot, dan firewall (ufw)
2. Menambah swap 2 GB bila RAM kecil, supaya `next build` tidak gagal
3. Membuat user `gardahijau` dan meng-clone repo ke `/srv/gardahijau/app`
4. Membuat database `gardahijau` dan `.env.local` berisi password database, `JWT_SECRET`, dan password admin yang dibuat acak
5. Menjalankan `npm ci`, `npm run db:setup`, `npm run build`
6. Mendaftarkan service systemd `gardahijau-web` (otomatis jalan lagi setelah reboot)
7. Mengatur Nginx, firewall, backup harian, dan HTTPS

Di akhir, skrip menampilkan **password admin**. Password itu juga tersimpan di `/root/gardahijau-admin.txt`.

> Database baru berisi data contoh dari `database/001_initial.sql`. Ganti lewat admin setelah login.

## 4. Cek hasilnya

- `https://gardahijaukemdiktisaintek.digital` → landing tampil, gembok HTTPS aktif
- `https://gardahijaukemdiktisaintek.digital/web-api/health` → `{"success":true,"data":{"database":"connected"}}`
- `https://gardahijaukemdiktisaintek.digital/admin/login` → bisa login dengan email & password dari langkah 3

Jika DNS belum aktif saat skrip berjalan, tunggu DNS mengarah ke VPS, lalu:

```bash
sudo certbot --nginx --redirect -d gardahijaukemdiktisaintek.digital -d www.gardahijaukemdiktisaintek.digital
```

## 5. Mengisi atau mengubah `.env.local`

```bash
sudo nano /srv/gardahijau/app/.env.local
sudo systemctl restart gardahijau-web
```

Untuk akun layanan API, isi dua baris ini:

```
GARDAHIJAU_API_USERNAME=...
GARDAHIJAU_API_PASSWORD=...
```

Jika nilainya mengandung spasi atau `#`, apit dengan tanda kutip ganda. Jika mengandung `$`, tulis sebagai `\$`.

**Mengganti password admin:** ubah `ADMIN_PASSWORD` di `.env.local`, lalu:

```bash
cd /srv/gardahijau/app && sudo -u gardahijau npm run db:seed
```

**Mengubah `NEXT_PUBLIC_SITE_URL`:** nilai ini masuk ke hasil build, jadi jalankan `deploy/update.sh` (langkah 6), bukan sekadar restart.

## 6. Update setelah ada perubahan kode

Di laptop: commit dan push ke branch `main`. Lalu di VPS:

```bash
sudo bash /srv/gardahijau/app/deploy/update.sh
```

Skrip menarik kode terbaru, menjalankan migrasi database baru (jika ada), build ulang, lalu restart service. Situs bisa error beberapa detik selama build sampai restart.

## Perintah yang sering dipakai

| Keperluan | Perintah |
|---|---|
| Status aplikasi | `sudo systemctl status gardahijau-web` |
| Log aplikasi (live) | `sudo journalctl -u gardahijau-web -f` |
| Restart aplikasi | `sudo systemctl restart gardahijau-web` |
| Log Nginx | `sudo tail -f /var/log/nginx/error.log` |
| Daftar backup | `sudo ls -lh /var/backups/gardahijau` |
| Backup manual | `sudo -u postgres pg_dump -Fc gardahijau > /tmp/gardahijau.dump` |
| Restore backup | `sudo -u postgres pg_restore --clean -d gardahijau FILE.dump` |

Backup harian jalan pukul 02.30 (waktu server) dan disimpan 14 hari. Backup ini masih satu mesin dengan database; sesekali salin juga ke tempat lain, misalnya dengan `scp` ke laptop.

## Pemecahan masalah

- **502 Bad Gateway:** aplikasi belum jalan atau crash. Cek `sudo journalctl -u gardahijau-web -n 100`.
- **Build berhenti dengan `Killed`:** RAM habis. Pastikan swap aktif (`free -h`), lalu jalankan ulang `deploy/update.sh`.
- **Certbot gagal:** DNS belum mengarah ke IP VPS, atau port 80 tertutup di firewall hPanel.
- **Angka dampak tidak muncul:** akun layanan API belum diisi atau salah. Cek log, cari `[gardahijau-api]`.
- **Landing menampilkan data contoh:** database tidak tersambung. Buka `/web-api/health` dan periksa `DATABASE_URL`.
