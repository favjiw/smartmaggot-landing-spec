// Rekapan sampah organik di beranda Sampah, sama dengan aplikasi Android v1.3.0
// (ui/pencatatan_history/RentangRekapan.kt, PencatatanHistoryFragment.renderRekapan).
import { angkaTanggal, capital, formatKg, geserHari, hariSingkat, hariTanggalSingkat, parseServerDate, rentangTanggal, samaHari } from "./format";

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const awalHari = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const akhirHari = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const PILIHAN_RENTANG = [
  { jenis: "TUJUH_HARI", label: "7 hari" },
  { jenis: "TIGA_PULUH_HARI", label: "30 hari" },
  { jenis: "BULAN_INI", label: "Bulan ini" },
  { jenis: "KUSTOM", label: "Kustom" },
];

/**
 * Awal & akhir rentang rekapan (inklusif, zona waktu HP), sama dengan RentangRekapan.kt di Android.
 * KUSTOM yang terbalik dibetulkan otomatis; tanggal kosong dianggap hari ini.
 */
export function batasRentang({ jenis, dari, sampai }, hariIni = new Date()) {
  switch (jenis) {
    case "TIGA_PULUH_HARI": return [awalHari(geserHari(hariIni, -29)), akhirHari(hariIni)];
    case "BULAN_INI": return [new Date(hariIni.getFullYear(), hariIni.getMonth(), 1), akhirHari(hariIni)];
    case "KUSTOM": {
      const a = dari || hariIni;
      const b = sampai || hariIni;
      const [x, y] = a > b ? [b, a] : [a, b];
      return [awalHari(x), akhirHari(y)];
    }
    default: return [awalHari(geserHari(hariIni, -6)), akhirHari(hariIni)];
  }
}

/**
 * Rekapan sesuai rentang (PencatatanHistoryFragment.renderRekapan): total, grafik batang per hari
 * (per minggu bila rentang lebih dari 31 hari), dan hari dengan sampah terbanyak.
 */
export function rekapan(items, rentang, hariIni = new Date()) {
  const [awal, akhir] = batasRentang(rentang, hariIni);
  const dalamRentang = items.filter((item) => {
    const d = parseServerDate(item.tanggalWaktu);
    return d && d >= awal && d <= akhir;
  });
  const totals = new Map();
  for (const item of dalamRentang) {
    const d = parseServerDate(item.tanggalWaktu);
    totals.set(dayKey(d), (totals.get(dayKey(d)) || 0) + (Number(item.totalSampah) || 0));
  }
  const nilai = (d) => totals.get(dayKey(d)) || 0;

  const hari = [];
  for (let d = awalHari(awal); d <= akhir; d = geserHari(d, 1)) hari.push(d);

  let bars;
  let highlight = -1;
  if (hari.length <= 31) {
    bars = hari.map((d) => ({ label: hari.length <= 7 ? hariSingkat(d).replace(/\.$/, "") : angkaTanggal(d), value: nilai(d) }));
    if (samaHari(hari[hari.length - 1], hariIni)) highlight = bars.length - 1;
  } else {
    // Rentang panjang: gabung per minggu (7 hari) supaya batang tetap terbaca.
    bars = [];
    for (let i = 0; i < hari.length; i += 7) {
      const minggu = hari.slice(i, i + 7);
      bars.push({ label: `${minggu[0].getDate()}/${minggu[0].getMonth() + 1}`, value: minggu.reduce((t, d) => t + nilai(d), 0) });
    }
  }

  let terbanyak = null;
  for (const d of hari) if (!terbanyak || nilai(d) > nilai(terbanyak)) terbanyak = d;
  const insight = !terbanyak || nilai(terbanyak) <= 0
    ? "Belum ada sampah organik tercatat di rentang ini."
    : `${capital(hariTanggalSingkat(terbanyak))} paling banyak, ${formatKg(nilai(terbanyak))} kg.`;

  return {
    awal,
    akhir,
    bars,
    highlight,
    total: bars.reduce((t, b) => t + b.value, 0),
    insight,
    keterangan: `${rentangTanggal(awal, akhir)} · ${dalamRentang.length} catatan`,
  };
}
