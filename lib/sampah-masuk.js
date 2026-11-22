// Pemantauan sampah masuk untuk web admin kelurahan.
// Data diambil dari backend aplikasi Garda Hijau (BE-BEM) lewat GET /api/monitoring/sampah,
// memakai kunci antar-server GARDAHIJAU_MONITORING_KEY. Hanya dipakai di server.
// GARDAHIJAU_MONITORING_URL: alamat backend (di VPS: http://127.0.0.1:5001); bawaan GARDAHIJAU_API_URL.
import ExcelJS from "exceljs";

const BASE_URL = (process.env.GARDAHIJAU_MONITORING_URL || process.env.GARDAHIJAU_API_URL || "https://gardahijau.codelabspace.or.id").replace(/\/+$/, "");
const TIMEOUT_MS = 15_000;
const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const RW_LIST = ["RW4", "RW5"];
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export class SampahError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

/** "YYYY-MM-DD" menurut WIB. */
export const hariWib = (d) => new Date(new Date(d).getTime() + WIB_MS).toISOString().slice(0, 10);
const tambahHari = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** Baca & validasi filter dari query string. Bawaan: 30 hari terakhir (WIB). */
export function bacaFilter(searchParams) {
  const hariIni = hariWib(Date.now());
  const dari = searchParams.get("dari") || tambahHari(hariIni, -29);
  const sampai = searchParams.get("sampai") || hariIni;
  const rw = searchParams.get("rw") || "";
  if (!TANGGAL.test(dari) || !TANGGAL.test(sampai)) throw new SampahError("Tanggal harus format YYYY-MM-DD.", 400);
  if (sampai < dari) throw new SampahError("Tanggal akhir tidak boleh sebelum tanggal awal.", 400);
  if (rw && !RW_LIST.includes(rw)) throw new SampahError("RW tidak dikenal.", 400);
  return { dari, sampai, rw };
}

export async function ambilSampahMasuk({ dari, sampai, rw }) {
  const key = process.env.GARDAHIJAU_MONITORING_KEY;
  if (!key) throw new SampahError("GARDAHIJAU_MONITORING_KEY belum diisi di server web.", 503);
  const qs = new URLSearchParams({ dari, sampai, ...(rw ? { rw } : {}) });
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/monitoring/sampah?${qs}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json", "X-Monitoring-Key": key },
    });
  } catch {
    throw new SampahError("Aplikasi Garda Hijau tidak bisa dihubungi. Coba lagi sebentar.");
  }
  const payload = await res.json().catch(() => null);
  if (res.status === 400) throw new SampahError(payload?.message || "Filter tidak valid.", 400);
  if (!res.ok || !Array.isArray(payload?.data)) {
    console.warn(`[sampah-masuk] backend membalas ${res.status}: ${payload?.message ?? "tanpa pesan"}`);
    throw new SampahError("Data sampah tidak bisa diambil dari aplikasi Garda Hijau.");
  }
  return payload.data.map((r) => ({ ...r, totalSampahKg: Number(r.totalSampahKg) || 0 }));
}

const bulat = (n) => Math.round(n * 10) / 10;

/** Ringkasan untuk dashboard: total, rata-rata, per RW, per hari (semua hari dalam rentang). */
export function ringkas(rows, { dari, sampai, rw }) {
  const jumlahHari = Math.round((Date.parse(`${sampai}T00:00:00Z`) - Date.parse(`${dari}T00:00:00Z`)) / DAY_MS) + 1;
  const rwTampil = rw ? [rw] : RW_LIST;
  const perHari = new Map();
  for (let i = 0; i < jumlahHari; i++) perHari.set(tambahHari(dari, i), Object.fromEntries(rwTampil.map((r) => [r, 0])));
  const perRw = new Map(rwTampil.map((r) => [r, { rw: r, totalKg: 0, jumlahCatatan: 0 }]));

  let totalKg = 0;
  for (const r of rows) {
    totalKg += r.totalSampahKg;
    const hari = perHari.get(hariWib(r.tanggalWaktu));
    if (hari && r.rw) hari[r.rw] = (hari[r.rw] || 0) + r.totalSampahKg;
    if (r.rw) {
      const g = perRw.get(r.rw) ?? perRw.set(r.rw, { rw: r.rw, totalKg: 0, jumlahCatatan: 0 }).get(r.rw);
      g.totalKg += r.totalSampahKg;
      g.jumlahCatatan += 1;
    }
  }

  const harian = [...perHari].map(([tanggal, rwKg]) => ({
    tanggal,
    totalKg: bulat(Object.values(rwKg).reduce((s, v) => s + v, 0)),
    perRw: Object.fromEntries(Object.entries(rwKg).map(([k, v]) => [k, bulat(v)])),
  }));
  const tertinggi = harian.reduce((a, b) => (b.totalKg > (a?.totalKg ?? 0) ? b : a), null);

  return {
    periode: { dari, sampai, rw: rw || null, jumlahHari },
    totalKg: bulat(totalKg),
    jumlahCatatan: rows.length,
    hariAdaCatatan: harian.filter((h) => h.totalKg > 0).length,
    rataPerHariKg: bulat(totalKg / jumlahHari),
    hariTertinggi: tertinggi && tertinggi.totalKg > 0 ? tertinggi : null,
    perRw: [...perRw.values()].map((g) => ({ ...g, totalKg: bulat(g.totalKg) })),
    harian,
  };
}

const tglIndo = (ymd) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ymd}T00:00:00Z`));
const rwTeks = (r) => r.replace("RW", "RW ");
/** Excel menyimpan tanggal tanpa zona waktu; geser ke WIB supaya jam yang tampil sama dengan di lapangan. */
const keWib = (d) => new Date(new Date(d).getTime() + WIB_MS);

function gayaHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF18794E" } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
}

/** Buffer .xlsx berisi lembar Ringkasan, Per Hari, dan Data. */
export async function buatExcel(rows, r) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Garda Hijau Mengger";
  wb.created = new Date();
  const kg = "#,##0.0";

  // --- Ringkasan
  const s = wb.addWorksheet("Ringkasan");
  s.columns = [{ width: 30 }, { width: 22 }, { width: 18 }];
  s.addRow(["Laporan Sampah Masuk"]).font = { bold: true, size: 14 };
  s.addRow(["Kelurahan Mengger, Kecamatan Bandung Kidul"]);
  s.addRow([]);
  [
    ["Periode", `${tglIndo(r.periode.dari)} – ${tglIndo(r.periode.sampai)}`],
    ["RW", r.periode.rw ? rwTeks(r.periode.rw) : "Semua RW"],
    ["Jumlah hari", r.periode.jumlahHari],
    ["Total sampah masuk (kg)", r.totalKg],
    ["Rata-rata per hari (kg)", r.rataPerHariKg],
    ["Jumlah catatan", r.jumlahCatatan],
    ["Hari dengan catatan", r.hariAdaCatatan],
    ["Hari tertinggi", r.hariTertinggi ? `${tglIndo(r.hariTertinggi.tanggal)} (${r.hariTertinggi.totalKg} kg)` : "–"],
    ["Dibuat", new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date()) + " WIB"],
  ].forEach(([k, v]) => {
    const row = s.addRow([k, v]);
    row.getCell(1).font = { bold: true };
    if (typeof v === "number" && String(k).includes("kg")) row.getCell(2).numFmt = kg;
    row.getCell(2).alignment = { horizontal: "left" };
  });
  s.addRow([]);
  gayaHeader(s.addRow(["RW", "Total (kg)", "Jumlah catatan"]));
  for (const g of r.perRw) s.addRow([rwTeks(g.rw), g.totalKg, g.jumlahCatatan]).getCell(2).numFmt = kg;

  // --- Per hari
  const rwKolom = r.periode.rw ? [r.periode.rw] : RW_LIST;
  const h = wb.addWorksheet("Per Hari", { views: [{ state: "frozen", ySplit: 1 }] });
  h.columns = [{ header: "Tanggal", width: 14 }, ...rwKolom.map((x) => ({ header: `${rwTeks(x)} (kg)`, width: 13 })), { header: "Total (kg)", width: 13 }];
  gayaHeader(h.getRow(1));
  for (const d of r.harian) {
    const row = h.addRow([new Date(`${d.tanggal}T00:00:00Z`), ...rwKolom.map((x) => d.perRw[x] ?? 0), d.totalKg]);
    row.getCell(1).numFmt = "dd/mm/yyyy";
    for (let i = 2; i <= rwKolom.length + 2; i++) row.getCell(i).numFmt = kg;
  }
  const jumlah = h.addRow(["Total", ...rwKolom.map((x) => r.perRw.find((g) => g.rw === x)?.totalKg ?? 0), r.totalKg]);
  jumlah.font = { bold: true };
  for (let i = 2; i <= rwKolom.length + 2; i++) jumlah.getCell(i).numFmt = kg;

  // --- Data mentah
  const d = wb.addWorksheet("Data", { views: [{ state: "frozen", ySplit: 1 }] });
  d.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Waktu (WIB)", key: "waktu", width: 18 },
    { header: "RW", key: "rw", width: 8 },
    { header: "Petugas", key: "petugas", width: 18 },
    { header: "Berat (kg)", key: "kg", width: 12 },
    { header: "Catatan", key: "catatan", width: 45 },
  ];
  gayaHeader(d.getRow(1));
  rows.forEach((x, i) => {
    const row = d.addRow({ no: i + 1, waktu: keWib(x.tanggalWaktu), rw: x.rw ? rwTeks(x.rw) : "", petugas: x.petugas ?? "", kg: x.totalSampahKg, catatan: x.catatan ?? "" });
    row.getCell("waktu").numFmt = "dd/mm/yyyy hh:mm";
    row.getCell("kg").numFmt = kg;
  });
  if (rows.length) d.autoFilter = { from: "A1", to: `F${rows.length + 1}` };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export const namaFileExcel = ({ dari, sampai, rw }) => `sampah-masuk_${dari}_sd_${sampai}${rw ? `_${rw}` : ""}.xlsx`;
