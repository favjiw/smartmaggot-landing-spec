// Format tanggal & angka, sama dengan aplikasi Android (ui/util/ServerDate.kt).

const ID = "id-ID";

/** Tanggal dari API (ISO UTC, atau "yyyy-MM-dd" yang juga dianggap UTC). */
export function parseServerDate(value) {
  if (!value || typeof value !== "string") return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 1240 -> "1.240", 12.5 -> "12,5" */
export function formatKg(value) {
  return new Intl.NumberFormat(ID, { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(Number(value) || 0);
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Selisih hari kalender (zona waktu perangkat) dari `mulai` sampai hari ini; tidak pernah negatif. */
export function hariSejak(mulai) {
  return Math.max(0, Math.round((startOfDay(new Date()) - startOfDay(mulai)) / 86_400_000));
}

export const hariKeTeks = (mulai) => {
  if (!mulai) return "";
  const hari = hariSejak(mulai);
  return hari <= 0 ? "Mulai hari ini" : `Hari ke-${hari}`;
};

const fmt = (opts) => (d) => (d ? new Intl.DateTimeFormat(ID, opts).format(d) : "");
/** Kamis, 19 November 2026 */
export const tanggalPanjang = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
/** 19 November 2026 */
export const tanggalSedang = fmt({ day: "numeric", month: "long", year: "numeric" });
/** 19 Nov 2026 */
export const tanggalPendek = fmt({ day: "numeric", month: "short", year: "numeric" });
/** 14.05 */
export const jam = (d) => (d ? new Intl.DateTimeFormat(ID, { hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(":", ".") : "");
export const hariSingkat = fmt({ weekday: "short" });
export const hariPenuh = fmt({ weekday: "long" });
export const angkaTanggal = fmt({ day: "numeric" });
export const bulanSingkat = fmt({ month: "short" });

/** "6–12 November" bila bulannya sama, "28 Okt – 3 Nov" bila berbeda. */
export function rentangTanggal(start, end) {
  if (start.getMonth() === end.getMonth()) {
    return `${angkaTanggal(start)}–${fmt({ day: "numeric", month: "long" })(end)}`;
  }
  const short = fmt({ day: "numeric", month: "short" });
  return `${short(start)} – ${short(end)}`;
}

const pad = (n) => String(n).padStart(2, "0");
/** Nilai untuk <input type="date">, zona waktu perangkat. */
export const nilaiInputTanggal = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Nilai untuk <input type="time">. */
export const nilaiInputJam = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Angka dari isian; koma (keyboard Indonesia) dianggap titik desimal. */
export function bacaAngka(teks) {
  if (teks === null || teks === undefined) return null;
  const s = String(teks).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export { capital };
