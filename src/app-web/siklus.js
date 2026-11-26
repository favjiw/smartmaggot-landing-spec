// Logika siklus maggot, sama dengan aplikasi Android
// (ui/widget/PitaSiklus.kt, ui/prediksi/detail_siklus/DetailSiklusActivity.kt).
import { formatGram, formatKg, parseServerDate, tanggalPendek } from "./format";

export const TAHAP = ["Telur", "Tetas", "Besar", "Panen"];

const jenisDari = (fase) => (fase?.jenis || "").toUpperCase();
export const cariFase = (faseList, jenis) => (faseList || []).find((f) => jenisDari(f) === jenis) || null;

/**
 * Tahap dari jenis fase. Fase PANEN dibuat otomatis bersama fase besar untuk meminta perkiraan,
 * jadi tidak menandakan larva siap panen: tahap "Panen" di pita tidak pernah aktif.
 */
export function tahapDariFase(faseList) {
  const jenis = (faseList || []).map(jenisDari);
  if (jenis.includes("PEMBESARAN")) return "Besar";
  if (jenis.includes("PENETASAN")) return "Tetas";
  return "Telur";
}

const angka = (v) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
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

/** Linimasa: Telur (data siklus), Tetas (PENETASAN), Besar (PEMBESARAN). PANEN tidak ditampilkan. */
export function susunLinimasa(siklus) {
  const fase = siklus?.fase || [];
  const baris = [];
  const mulai = parseServerDate(siklus?.tanggalMulai);
  const isiTelur = [
    siklus?.jumlahTelur && siklus?.mediaTelur ? `${formatGram(siklus.jumlahTelur)} gram telur di media ${siklus.mediaTelur.toLowerCase()}.` : null,
    siklus?.catatan?.trim() || null,
  ].filter(Boolean).join(" ");
  if (mulai || siklus?.jumlahTelur) baris.push({ judul: "Telur", tanggal: tanggalPendek(mulai), keterangan: isiTelur });

  const tetas = cariFase(fase, "PENETASAN");
  if (tetas) baris.push({ judul: "Tetas", tanggal: tanggalPendek(parseServerDate(tetas.tanggal)), keterangan: tetas.keterangan || "" });

  const besar = cariFase(fase, "PEMBESARAN");
  if (besar) {
    const pakanPanen = angka(cariFase(fase, "PANEN")?.jumlahMakanan);
    const pakan = angka(besar.jumlahMakanan) ?? pakanPanen;
    const isi = [pakan && pakan > 0 ? `Pakan ${formatKg(pakan / 1000)} kg.` : null, besar.keterangan?.trim() || null].filter(Boolean).join(" ");
    baris.push({ judul: "Besar", tanggal: tanggalPendek(parseServerDate(besar.tanggal)), keterangan: isi });
  }
  return baris;
}
