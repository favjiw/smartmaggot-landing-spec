// Pemantauan sampah masuk untuk web admin kelurahan.
// Data diambil dari backend aplikasi Garda Hijau (BE-BEM) lewat GET /api/monitoring/sampah,
// memakai kunci antar-server GARDAHIJAU_MONITORING_KEY. Hanya dipakai di server.
// GARDAHIJAU_MONITORING_URL: alamat backend (di VPS: http://127.0.0.1:5001); bawaan GARDAHIJAU_API_URL.
import ExcelJS from "exceljs";

const BASE_URL = (process.env.GARDAHIJAU_MONITORING_URL || process.env.GARDAHIJAU_API_URL || "https://gardahijau.codelabspace.or.id").replace(/\/+$/, "");
const TIMEOUT_MS = 15_000;
const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const RW_LIST = ["RW1", "RW2", "RW3", "RW4", "RW5"];
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

// ===================== Export Excel: format "LAP GASLAH, MAGGOT & GOBER" mingguan
// Meniru file laporan mingguan Kecamatan Bandung Kidul (lembar GASLAH dan GOBER & MAGGOT),
// hanya blok Kelurahan Mengger RW 1-5. Angka dari aplikasi masuk ke SAMPAH TERKUMPUL;
// kolom Dokumentasi, Diolah, Keterangan, dan kegiatan Gober dikosongkan untuk diisi manual.

const BULAN = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];

/** Senin dari minggu yang memuat `ymd` (YYYY-MM-DD). */
export function seninDari(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`);
  return tambahHari(ymd, -((d.getUTCDay() + 6) % 7));
}

/** Info minggu: 7 tanggal Senin–Minggu dan label "MINGGU KE 3 NOVEMBER 2026" (bulan & urutan dari hari Senin). */
export function infoMinggu(senin) {
  const hari = Array.from({ length: 7 }, (_, i) => tambahHari(senin, i));
  const [y, m, d] = senin.split("-").map(Number);
  return { senin, minggu: hari[6], hari, ke: Math.ceil(d / 7), bulan: BULAN[m - 1], tahun: y };
}

/** Baca ?minggu=YYYY-MM-DD (tanggal mana pun di minggu itu). Bawaan: minggu berjalan (WIB). */
export function bacaMinggu(searchParams) {
  const v = searchParams.get("minggu") || hariWib(Date.now());
  if (!TANGGAL.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) throw new SampahError("Minggu harus berupa tanggal YYYY-MM-DD.", 400);
  return infoMinggu(seninDari(v));
}

// Kolom hari Minggu diberi merah seperti di laporan kecamatan.
const MINGGU = "FFFF0000";
const HIJAU = "FFB6D7A8", KUNING = "FFFFD966", MERAH = "FFEA9999", UNGU = "FFD5A6BD", HIJAU_TUA = "FF93C47D", BIRU = "FF9FC5E8", LAVENDER = "FFD9D2E9", PUTIH = "FFFFFFFF";
const garis = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
const bookman = (o = {}) => ({ name: "Bookman Old Style", size: 10, ...o });
const arial = (o = {}) => ({ name: "Arial", size: 10, ...o });
const isi = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const tengah = { horizontal: "center", vertical: "middle", wrapText: true };
const kolom = (n) => { let s = ""; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

/** Satu sel: nilai + gaya. Sel gabungan diberi garis di setiap sel penyusunnya supaya bingkainya utuh. */
function tulis(ws, alamat, nilai, { font = arial(), fill, align = tengah, border = garis } = {}) {
  const c = ws.getCell(alamat);
  if (nilai !== undefined) c.value = nilai;
  c.font = font;
  if (fill) c.fill = isi(fill);
  if (align) c.alignment = align;
  if (border) c.border = border;
  return c;
}
function gabung(ws, rentang, nilai, gaya) {
  ws.mergeCells(rentang);
  const [a, b] = rentang.split(":");
  const posisi = (x) => ({ c: ws.getCell(x).col, r: Number(ws.getCell(x).row) });
  const p = posisi(a), q = posisi(b);
  for (let r = p.r; r <= q.r; r++) for (let c = p.c; c <= q.c; c++) tulis(ws, `${kolom(c)}${r}`, r === p.r && c === p.c ? nilai : undefined, gaya);
}
const judul = (ws, rentang, teks, size) => gabung(ws, rentang, teks, { font: bookman({ size, bold: true }), fill: PUTIH, align: { horizontal: "center", vertical: "bottom" }, border: null });

/** Total kg per RW per tanggal (WIB) dari catatan aplikasi. */
function kgPerRwHari(rows) {
  const m = new Map();
  for (const r of rows) {
    if (!r.rw) continue;
    const k = `${r.rw}|${hariWib(r.tanggalWaktu)}`;
    m.set(k, (m.get(k) || 0) + r.totalSampahKg);
  }
  return m;
}

function lembarGaslah(wb, info, rows) {
  const ws = wb.addWorksheet("GASLAH");
  ws.columns = Array.from({ length: 36 }, (_, i) => ({ width: i === 1 ? 15.63 : i === 35 ? 14 : 13 }));
  const label = `MINGGU KE ${info.ke} ${info.bulan} ${info.tahun}`;
  judul(ws, "A1:AJ1", "LAPORAN PENGELOLAAN SAMPAH ORGANIK OLEH PETUGAS GASLAH", 14);
  judul(ws, "A2:AH2", "KECAMATAN BANDUNG KIDUL", 14);
  judul(ws, "A3:AH3", label, 14);

  const kepala = (fill, extra = {}) => ({ font: bookman({ bold: true, ...extra }), fill });
  gabung(ws, "A5:A7", "NO", kepala(HIJAU));
  gabung(ws, "B5:B6", "KELURAHAN", kepala(HIJAU));
  tulis(ws, "B7", "TANGGAL", kepala(HIJAU));
  gabung(ws, "C5:C7", "RW", kepala(HIJAU));
  gabung(ws, "D5:Q5", "JUMLAH SAMPAH TERKUMPUL (Kg)", kepala(MERAH, { size: 11 }));
  gabung(ws, "R5:R7", "TOTAL JUMLAH SAMPAH TERKUMPUL (Kg)", kepala(HIJAU));
  gabung(ws, "S5:AF5", "JUMLAH SAMPAH DIOLAH (Kg)", kepala(UNGU));
  gabung(ws, "AG5:AG7", "TOTAL JUMLAH SAMPAH DIOLAH (Kg)", kepala(HIJAU_TUA));
  gabung(ws, "AH5:AH7", "OVERFLOW", kepala(HIJAU_TUA));
  gabung(ws, "AI5:AI7", "DIANGKUT DLH", kepala(HIJAU_TUA));
  gabung(ws, "AJ5:AJ7", "KETERANGAN", kepala(HIJAU_TUA));
  // Kolom Jumlah per hari: terkumpul D,F,...,P; diolah S,U,...,AE (Dokumentasi di sebelah kanannya)
  const terkumpul = info.hari.map((_, i) => 4 + i * 2);
  const diolah = info.hari.map((_, i) => 19 + i * 2);
  info.hari.forEach((ymd, i) => {
    const tgl = Number(ymd.slice(8));
    const warna = i === 6 ? MINGGU : KUNING;
    for (const c of [terkumpul[i], diolah[i]]) {
      gabung(ws, `${kolom(c)}6:${kolom(c + 1)}6`, tgl, kepala(warna));
      tulis(ws, `${kolom(c)}7`, "Jumlah\n(Kg)", kepala(warna));
      tulis(ws, `${kolom(c + 1)}7`, "Dokumentasi", kepala(warna));
    }
  });
  ws.getRow(7).height = 28.5;

  const kg = kgPerRwHari(rows);
  const sel = (fill = PUTIH) => ({ font: arial(), fill });
  const awal = 8;
  RW_LIST.forEach((rw, i) => {
    const r = awal + i;
    ws.getRow(r).height = 90;
    tulis(ws, `C${r}`, i + 1, { font: bookman(), fill: PUTIH });
    info.hari.forEach((ymd, h) => {
      const nilai = kg.get(`${rw}|${ymd}`);
      const warna = h === 6 ? MINGGU : PUTIH;
      tulis(ws, `${kolom(terkumpul[h])}${r}`, nilai === undefined ? null : bulat2(nilai), sel(warna));
      tulis(ws, `${kolom(terkumpul[h] + 1)}${r}`, null, { ...sel(warna), align: null });
      tulis(ws, `${kolom(diolah[h])}${r}`, null, sel(warna));
      tulis(ws, `${kolom(diolah[h] + 1)}${r}`, null, { ...sel(warna), align: null });
    });
    tulis(ws, `R${r}`, { formula: `(${terkumpul.map((c) => `${kolom(c)}${r}`).join("+")})` }, { font: arial({ bold: true }), fill: HIJAU, align: null });
    tulis(ws, `AG${r}`, { formula: `(${diolah.map((c) => `${kolom(c)}${r}`).join("+")})` }, { font: bookman(), fill: HIJAU });
    tulis(ws, `AH${r}`, { formula: `R${r}-AG${r}` }, { font: bookman(), fill: HIJAU });
    tulis(ws, `AI${r}`, { formula: `(R${r}-AG${r})-AH${r}` }, { font: bookman(), fill: HIJAU });
    tulis(ws, `AJ${r}`, null, { font: arial(), align: { vertical: "middle", wrapText: true } });
  });
  const akhir = awal + RW_LIST.length - 1;
  gabung(ws, `A${awal}:A${akhir}`, 1, { font: bookman({ size: 11 }), fill: PUTIH });
  gabung(ws, `B${awal}:B${akhir}`, "MENGGER", { font: bookman(), fill: PUTIH });

  const t = akhir + 1;
  const tebal = { font: bookman({ bold: true }), fill: KUNING };
  gabung(ws, `A${t}:C${t}`, "TOTAL KEL MENGGER", { ...tebal, align: { horizontal: "center", wrapText: true } });
  for (const cols of [terkumpul, diolah]) cols.forEach((c) => {
    tulis(ws, `${kolom(c)}${t}`, { formula: `SUM(${kolom(c)}${awal}:${kolom(c)}${akhir})` }, tebal);
    tulis(ws, `${kolom(c + 1)}${t}`, null, { font: arial(), fill: KUNING, align: null });
  });
  tulis(ws, `R${t}`, { formula: `(${terkumpul.map((c) => `${kolom(c)}${t}`).join("+")})` }, { font: arial({ bold: true }), fill: KUNING, align: null });
  tulis(ws, `AG${t}`, { formula: `(${diolah.map((c) => `${kolom(c)}${t}`).join("+")})` }, { font: bookman(), fill: KUNING });
  tulis(ws, `AH${t}`, { formula: `SUM(AH${awal}:AH${akhir})` }, tebal);
  tulis(ws, `AI${t}`, { formula: `SUM(AI${awal}:AI${akhir})` }, tebal);
  tulis(ws, `AJ${t}`, null, { font: arial(), fill: KUNING, align: null });
  return ws;
}

/** Total kg per tanggal (WIB) untuk satu kelurahan: semua RW digabung. */
function kgPerHari(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = hariWib(r.tanggalWaktu);
    m.set(k, (m.get(k) || 0) + r.totalSampahKg);
  }
  return m;
}

/** `kgHarian` (opsional): Map tanggal → kg untuk kolom Jumlah (Kg) Petugas Magot. Tanpa itu kolomnya dikosongkan. */
function lembarGoberMaggot(wb, info, kgHarian) {
  const ws = wb.addWorksheet("GOBER & MAGGOT");
  ws.columns = Array.from({ length: 31 }, (_, i) => ({ width: i === 1 ? 15.5 : i === 30 ? 13.5 : 13 }));
  judul(ws, "A1:X1", "LAPORAN KEGIATAN PETUGAS GOBER  & LAPORAN PENGOLAHAN SAMPAH OLEH PETUGAS MAGOT", 12);
  judul(ws, "A2:X2", "KECAMATAN BANDUNG KIDUL", 12);
  judul(ws, "A3:X3", `MINGGU KE - ${info.ke} ${info.bulan} ${info.tahun}`, 12);

  const kepala = (fill) => ({ font: bookman({ bold: true }), fill });
  gabung(ws, "A5:A7", "NO", kepala(HIJAU));
  tulis(ws, "B5", "KELURAHAN", kepala(HIJAU));
  gabung(ws, "B6:B7", "TANGGAL", kepala(HIJAU));
  gabung(ws, "C5:P5", "KEGIATAN PETUGAS GOBER", kepala(BIRU));
  gabung(ws, "Q5:AD5", "PETUGAS MAGOT", kepala(UNGU));
  gabung(ws, "AE5:AE7", "TOTAL JUMLAH PENGOLAHAN SAMPAH\n(KG)", kepala(LAVENDER));
  const gober = info.hari.map((_, i) => 3 + i * 2);
  const maggot = info.hari.map((_, i) => 17 + i * 2);
  info.hari.forEach((ymd, i) => {
    const tgl = Number(ymd.slice(8));
    // Hari Minggu: tanggal merah, baris judul di bawahnya putih (seperti template)
    const minggu = i === 6;
    gabung(ws, `${kolom(gober[i])}6:${kolom(gober[i] + 1)}6`, tgl, kepala(minggu ? MINGGU : KUNING));
    gabung(ws, `${kolom(maggot[i])}6:${kolom(maggot[i] + 1)}6`, tgl, kepala(minggu ? MINGGU : KUNING));
    const baris7 = minggu ? PUTIH : KUNING;
    tulis(ws, `${kolom(gober[i])}7`, "KEGIATAN", kepala(baris7));
    tulis(ws, `${kolom(gober[i] + 1)}7`, "Dokumentasi", kepala(baris7));
    tulis(ws, `${kolom(maggot[i])}7`, "Jumlah (Kg)", kepala(baris7));
    tulis(ws, `${kolom(maggot[i] + 1)}7`, "Dokumentasi", kepala(baris7));
  });
  ws.getRow(7).height = 28.5;

  const r = 8;
  ws.getRow(r).height = 205.5;
  tulis(ws, `A${r}`, 1, { font: bookman({ bold: true }) });
  tulis(ws, `B${r}`, "MENGGER", { font: bookman({ bold: true }) });
  // Kegiatan Gober di sel putih (teks 9pt); kolom Maggot tanpa warna, seperti template
  for (let c = 3; c <= 30; c++) tulis(ws, `${kolom(c)}${r}`, null, { font: bookman({ size: 9 }), fill: c <= 16 ? PUTIH : undefined });
  if (kgHarian) info.hari.forEach((ymd, i) => {
    const nilai = kgHarian.get(ymd);
    if (nilai !== undefined) tulis(ws, `${kolom(maggot[i])}${r}`, bulat2(nilai), { font: bookman({ size: 11 }) });
  });
  tulis(ws, `AE${r}`, { formula: `SUM(${maggot.map((c) => `${kolom(c)}${r}`).join(",")})` }, { font: bookman({ bold: true }), fill: LAVENDER });
  return ws;
}

const bulat2 = (n) => Math.round(n * 100) / 100;

/** Buffer .xlsx format laporan mingguan GASLAH, MAGGOT & GOBER (Kelurahan Mengger). */
export async function buatExcel(rows, info) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Garda Hijau Mengger";
  wb.created = new Date();
  lembarGaslah(wb, info, rows);
  lembarGoberMaggot(wb, info);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/**
 * Versi kelurahan: tidak dipisah per RW. Hanya lembar GOBER & MAGGOT, dengan total sampah
 * semua RW per hari di kolom Jumlah (Kg) Petugas Magot (satu baris Kelurahan Mengger).
 */
export async function buatExcelKelurahan(rows, info) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Garda Hijau Mengger";
  wb.created = new Date();
  lembarGoberMaggot(wb, info, kgPerHari(rows));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export const namaFileExcel = (info, versi = "rw") => `MINGGU ${info.ke} LAP GASLAH, MAGGOT & GOBER ${info.bulan} ${info.tahun} - MENGGER${versi === "kelurahan" ? " (KELURAHAN)" : ""}.xlsx`;
