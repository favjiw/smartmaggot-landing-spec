# Tugas BE-BEM untuk Landing (Gilang)

> Repo: `gilngns/BE-BEM` · Host: `https://api.smartmaggot.my.id`
> Prioritas: **T1 dan T2 wajib sebelum landing go-live hari ini.** T3 opsional.

## T1 — Endpoint publik ringkasan dampak

Landing butuh angka dampak tanpa login. Buat **satu endpoint baru**, jangan membuka endpoint lama.

**Kontrak**

```
GET /api/public/ringkasan
Auth: tidak perlu
Cache-Control: public, max-age=300
```

Respons `200`:

```json
{
  "success": true,
  "data": {
    "totalSampahKg": 1234.5,
    "jumlahPencacahan": 87,
    "jumlahSiklus": 12,
    "jumlahSiklusPanen": 7,
    "diperbaruiPada": "2026-11-12T03:30:00.000Z"
  }
}
```

| Field | Cara hitung |
|---|---|
| `totalSampahKg` | `SUM(pencacahan.totalSampah)` dari semua user. Android memang mengirim dalam **kg** (hint form: "Masukkan Total Sampah (Kg)"). Bulatkan 1 desimal. |
| `jumlahPencacahan` | `COUNT(pencacahan)` |
| `jumlahSiklus` | `COUNT(siklus)` |
| `jumlahSiklusPanen` | Jumlah siklus yang punya minimal satu fase `PANEN` |
| `diperbaruiPada` | Waktu server saat respons dibuat |

**Aturan**
- Hanya kembalikan angka agregat. Jangan ada `userId`, username, catatan, atau baris data mentah.
- Kalau terjadi error, kembalikan `500 { "success": false }` tanpa pesan error internal.
- Jangan membuat notifikasi (beda dengan controller lain yang memanggil `createNotifikasi`).

**Sketsa implementasi** (±20 baris)

```js
// src/routes/publicRoutes.js
import express from "express";
import prisma from "../lib/prisma.js";
const router = express.Router();

router.get("/ringkasan", async (req, res) => {
  try {
    const [agg, jumlahSiklus, jumlahSiklusPanen] = await Promise.all([
      prisma.pencacahan.aggregate({ _sum: { totalSampah: true }, _count: true }),
      prisma.siklus.count(),
      prisma.siklus.count({ where: { fase: { some: { jenis: "PANEN" } } } }),
    ]);
    res.set("Cache-Control", "public, max-age=300").json({
      success: true,
      data: {
        totalSampahKg: Math.round((agg._sum.totalSampah ?? 0) * 10) / 10,
        jumlahPencacahan: agg._count,
        jumlahSiklus,
        jumlahSiklusPanen,
        diperbaruiPada: new Date().toISOString(),
      },
    });
  } catch {
    res.status(500).json({ success: false });
  }
});
export default router;

// src/app.js — daftarkan SEBELUM route lain yang memakai authMiddleware
// app.use("/api/public", publicRoutes);
```

**Selesai jika**
- [ ] `curl https://api.smartmaggot.my.id/api/public/ringkasan` tanpa header Authorization → `200` dengan bentuk JSON di atas.
- [ ] Angka `totalSampahKg` sama dengan jumlah total di riwayat pencacahan Android.
- [ ] Respons tidak memuat data per user.

## T2 — Kunci endpoint pencacahan

Saat ini `src/routes/pencacahanRoutes.js` hanya memasang `authMiddleware` di `POST`. Akibatnya **siapa pun bisa membaca, mengubah, dan menghapus** semua data pencacahan:

```
GET    /api/pencacahan       ← terbuka
GET    /api/pencacahan/:id   ← terbuka
PUT    /api/pencacahan/:id   ← terbuka
DELETE /api/pencacahan/:id   ← terbuka
```

Setelah landing tayang, domain API mudah ditebak. Tambahkan `authMiddleware` ke keempat route itu.

- Android **tidak rusak**: interceptor di `ApiConfig.kt` sudah mengirim token, dan Android hanya memakai `GET` + `POST` pencacahan.
- Perilaku `GET` tetap mengembalikan data semua user (jangan difilter per user), supaya tampilan riwayat di Android tidak berubah.

**Selesai jika**
- [ ] `curl -X DELETE https://api.smartmaggot.my.id/api/pencacahan/1` tanpa token → `401`.
- [ ] Riwayat pencacahan di Android masih tampil normal setelah login.

`POST /api/auth/register` **dibiarkan terbuka** dulu, karena dipakai Android untuk mendaftar. Masuk backlog: batasi atau matikan setelah akun semua RW dibuat.

## T3 — Temuan kecil (opsional, kalau sempat)

- `pencacahanController.createPencacahan`: teks notifikasi berbunyi *"Total sampah X **gram**"*, padahal input dalam kg. Ganti jadi `kg`.
- `prediksiController.getWadahAktif`: mengecek `lastFase.jenis === "PENDEWASAAN"`, padahal enum `JenisFase` hanya `PENETASAN | PEMBESARAN | PANEN`. Akibatnya jumlah wadah aktif selalu `0`. Kemungkinan maksudnya `PEMBESARAN`.
- `createPencacahan` belum memvalidasi `totalSampah`/`tanggalWaktu`. String tanggal dikirim apa adanya ke Prisma.
