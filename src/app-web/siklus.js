// Logika siklus maggot, sama dengan aplikasi Android v1.3.0
// (ui/widget/SiklusSop.kt, ui/widget/PitaSiklus.kt, ui/prediksi/detail_siklus/DetailSiklusActivity.kt).
import { formatKg, geserHari, hariSejak, parseServerDate, tanggalPendek } from "./format";

/**
 * Fase budidaya maggot sesuai SOP (gambar SOP hal. 5-6).
 * Fase berpindah otomatis dari tanggal mulai siklus; operator tidak mencatat perpindahan fase.
 */
export const FASE_SOP = [
  {
    kunci: "TELUR_LARVA",
    label: "Telur",
    nama: "Telur–Larva Awal",
    hariAwal: 0,
    hariAkhir: 12,
    panduan: [
      "Perawatan telur, pengecekan perkembangan larva, dan pemberian pakan awal.",
      "Baki disimpan di rak telur penetasan.",
      "Total pakan sampai hari ke-12 sekitar 6 kg.",
    ],
  },
  {
    kunci: "PEMBESARAN",
    label: "Besar",
    nama: "Pembesaran Larva",
    hariAwal: 13,
    hariAkhir: 20,
    panduan: [
      "Larva usia 13 hari dibagi menjadi beberapa baki dan diberi pakan rutin.",
      "Pakan 1–1,5 kg per baki per hari.",
      "Baki dipindahkan ke rak pembesaran dan reduksi.",
      "Target reduksi 200 kg: 30–40 baki aktif setiap hari.",
      "Target 80–100 gram telur dalam 1 minggu.",
      "Catat pemberian pakan dan kondisi media.",
    ],
  },
  {
    kunci: "PREPUPA",
    label: "Prepupa",
    nama: "Prepupa",
    hariAwal: 21,
    hariAkhir: 27,
    panduan: [
      "Tidak diberi pakan.",
      "Pastikan lingkungan kering dan aman.",
      "Pastikan tidak ada kasgot.",
      "Baki dipindahkan ke rak prepupa dan pupa.",
    ],
  },
  {
    kunci: "PUPA",
    label: "Pupa",
    nama: "Pupa",
    hariAwal: 28,
    hariAkhir: 34,
    panduan: [
      "Tidak diberi pakan.",
      "Pastikan tidak ada kasgot.",
      "Pupa yang sudah sempurna dipindahkan ke insektarium.",
    ],
  },
  {
    kunci: "LALAT_BSF",
    label: "Lalat",
    nama: "Lalat BSF",
    hariAwal: 35,
    hariAkhir: 41,
    panduan: [
      "Tidak diberi pakan, hanya diberi minum dengan penyemprotan.",
      "Fokus menjaga kandang, kelembapan, dan tempat peletakan telur.",
      "Perawatan insektarium dan persiapan produksi telur.",
    ],
  },
];

export const FASE_PEMBESARAN = FASE_SOP[1];
export const TEKS_SIKLUS_SELESAI = "Siklus sudah lewat hari ke-41. Siap panen dan mulai siklus baru.";

/** Fase untuk umur `hari` (0 = hari mulai). null bila sudah lewat hari ke-41. */
export const faseDariHari = (hari) => FASE_SOP.find((f) => hari >= f.hariAwal && hari <= f.hariAkhir) || null;

/** Fase SOP sekarang dari tanggal mulai; null bila tanggal tidak terbaca atau siklus sudah selesai. */
export const faseSopDari = (mulai, hariIni = new Date()) => (mulai ? faseDariHari(hariSejak(mulai, hariIni)) : null);

/** Urutan fase (0–4); fase null (siklus selesai) dianggap sesudah fase terakhir. */
export const urutanFase = (fase) => (fase ? FASE_SOP.indexOf(fase) : FASE_SOP.length);

/** Tanggal mulai fase (hari ke-`hariAwal`) dihitung dari tanggal mulai siklus. */
export const tanggalFase = (mulai, fase) => geserHari(mulai, fase.hariAwal);

const jenisDari = (fase) => (fase?.jenis || "").toUpperCase();
export const cariFase = (faseList, jenis) => (faseList || []).find((f) => jenisDari(f) === jenis) || null;

const angka = (v) => {
  if (v === null || v === undefined || (typeof v === "string" && !v.trim())) return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

/** Hasil perkiraan (kg) dari prediksiPanen; null bila belum ada. */
export function hasilKgDari(prediksi) {
  if (!prediksi) return null;
  const kg = angka(prediksi.hasilKg);
  if (kg !== null) return kg;
  const gram = angka(prediksi.hasilGram);
  return gram !== null ? gram / 1000 : null;
}

/** Perkiraan dari siklus lengkap (GET /siklus/:id): fase PANEN yang punya prediksi. */
export function perkiraanSiklus(siklus) {
  const panen = (siklus?.fase || []).filter((f) => jenisDari(f) === "PANEN" && f.prediksiPanen);
  const terakhir = panen[panen.length - 1] || null;
  const hasilKg = terakhir ? hasilKgDari(terakhir.prediksiPanen) : null;
  return { panen: terakhir, hasilKg: hasilKg && hasilKg > 0 ? hasilKg : null };
}

/** Jumlah pakan (gram) dari fase PANEN atau PEMBESARAN. */
export function pakanGramSiklus(faseList) {
  const panen = cariFase(faseList, "PANEN");
  const besar = cariFase(faseList, "PEMBESARAN");
  const gram = angka(panen?.jumlahMakanan) ?? angka(besar?.jumlahMakanan);
  return gram && gram > 0 ? gram : null;
}

/**
 * Jadwal 5 fase SOP dihitung dari tanggal mulai (hari ke-0, 13, 21, 28, 35).
 * Tanggal fase Pembesaran memakai tanggal yang benar-benar dicatat bila ada.
 */
export function susunJadwal(siklus, faseSekarang) {
  const mulai = parseServerDate(siklus?.tanggalMulai);
  if (!mulai) return [];
  const faseList = siklus?.fase || [];
  const besar = cariFase(faseList, "PEMBESARAN");
  const pakanGram = pakanGramSiklus(faseList);
  const sekarang = urutanFase(faseSekarang);

  return FASE_SOP.map((fase, i) => {
    const status = i < sekarang ? "selesai" : i === sekarang ? "sekarang" : "belum";
    const statusTeks = { selesai: "Selesai", sekarang: "Sedang berjalan", belum: "Belum sampai" }[status];
    const tanggalCatat = fase === FASE_PEMBESARAN ? parseServerDate(besar?.tanggal) : null;
    const keterangan = fase === FASE_PEMBESARAN && pakanGram
      ? `${statusTeks} · Pakan ${formatKg(pakanGram / 1000)} kg tercatat.`
      : statusTeks;
    return { kunci: fase.kunci, judul: fase.nama, tanggal: tanggalPendek(tanggalCatat || tanggalFase(mulai, fase)), keterangan, status };
  });
}
