// Klien server-side untuk API aplikasi Garda Hijau (Maggot BEM API).
// Dokumentasi: https://gardahijau.codelabspace.or.id/api-docs/
//
// Hanya dipakai di server. Kredensial akun layanan tidak boleh sampai ke browser,
// jadi landing page membaca angka dampak lewat /api/public/ringkasan milik aplikasi ini.
import jwt from "jsonwebtoken";

const BASE_URL = (process.env.GARDAHIJAU_API_URL || "https://gardahijau.codelabspace.or.id").replace(/\/+$/, "");
const USERNAME = process.env.GARDAHIJAU_API_USERNAME;
const PASSWORD = process.env.GARDAHIJAU_API_PASSWORD;
const TIMEOUT_MS = 5_000;
const FRESH_MS = 5 * 60_000; // angka dianggap segar selama 5 menit
const RETRY_AFTER_FAIL_MS = 60_000; // setelah gagal, tunggu 1 menit sebelum mencoba lagi

const cache = globalThis.gardahijauApiCache ?? (globalThis.gardahijauApiCache = { token: null, tokenExp: 0, loggingIn: null, impact: null, impactAt: 0, failedAt: 0, pending: null });

export const isExternalApiEnabled = () => process.env.GARDAHIJAU_API_DISABLED !== "true";

async function request(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, payload };
}

// Request paralel berbagi satu proses login supaya tidak memicu rate limit (429) di endpoint login.
function getToken() {
  if (cache.token && Date.now() < cache.tokenExp) return Promise.resolve(cache.token);
  cache.loggingIn ??= login().finally(() => { cache.loggingIn = null; });
  return cache.loggingIn;
}

async function login() {
  const { ok, status, payload } = await request("/api/auth/login", { method: "POST", body: { username: USERNAME, password: PASSWORD } });
  const token = payload?.token ?? payload?.data?.token;
  if (!ok || !token) throw new Error(`Login API Garda Hijau gagal (${status}): ${payload?.message ?? "tanpa pesan"}`);
  const exp = jwt.decode(token)?.exp;
  cache.token = token;
  // Perbarui token 1 jam sebelum kedaluwarsa; jika exp tidak terbaca, simpan 1 hari.
  cache.tokenExp = exp ? exp * 1000 - 60 * 60_000 : Date.now() + 24 * 60 * 60_000;
  return token;
}

async function authed(pathname) {
  const token = await getToken();
  let result = await request(pathname, { token });
  if (result.status === 401) {
    if (cache.token === token) cache.token = null; // token ditolak (mis. sudah logout); login ulang sekali
    result = await request(pathname, { token: await getToken() });
  }
  if (!result.ok) throw new Error(`GET ${pathname} gagal (${result.status}): ${result.payload?.message ?? "tanpa pesan"}`);
  return result.payload;
}

// Respons daftar bisa berupa array langsung atau dibungkus { data: [...] }.
function toList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const value of [payload?.data, payload?.data?.items, payload?.data?.data, payload?.items]) if (Array.isArray(value)) return value;
  return [];
}

const round1 = (value) => Math.round(value * 10) / 10;
const phasesOf = (siklus) => siklus?.fase ?? siklus?.fases ?? siklus?.Fase ?? siklus?.faseList ?? [];

function normalizePublic(data) {
  return {
    totalSampahKg: round1(Number(data.totalSampahKg) || 0),
    jumlahPencacahan: Number(data.jumlahPencacahan) || 0,
    jumlahSiklus: Number(data.jumlahSiklus) || 0,
    jumlahSiklusPanen: Number(data.jumlahSiklusPanen) || 0,
    diperbaruiPada: data.diperbaruiPada ?? new Date().toISOString(),
  };
}

async function loadImpact() {
  // 1. Endpoint publik sesuai kontrak TUGAS-BE.md (T1). Tidak butuh kredensial.
  const publicResult = await request("/api/public/ringkasan").catch(() => null);
  if (publicResult?.ok && publicResult.payload?.data) return { ...normalizePublic(publicResult.payload.data), sumber: "api-publik" };

  // 2. Agregasi dari endpoint terautentikasi memakai akun layanan.
  if (!USERNAME || !PASSWORD) return null;
  const [pencacahan, siklus] = await Promise.all([authed("/api/pencacahan").then(toList), authed("/api/siklus").then(toList)]);
  const totalSampahKg = pencacahan.reduce((sum, item) => sum + (Number(item?.totalSampah) || 0), 0);
  return {
    totalSampahKg: round1(totalSampahKg),
    jumlahPencacahan: pencacahan.length,
    jumlahSiklus: siklus.length,
    jumlahSiklusPanen: siklus.filter((item) => phasesOf(item).some((fase) => fase?.jenis === "PANEN")).length,
    diperbaruiPada: new Date().toISOString(),
    sumber: "api-akun-layanan",
  };
}

function refresh() {
  cache.pending ??= loadImpact()
    .then((value) => {
      if (value) { cache.impact = value; cache.impactAt = Date.now(); cache.failedAt = 0; }
      else cache.failedAt = Date.now();
      return value;
    })
    .catch((error) => {
      console.warn(`[gardahijau-api] ${error.message}`);
      cache.failedAt = Date.now();
      return null;
    })
    .finally(() => { cache.pending = null; });
  return cache.pending;
}

/**
 * Angka dampak dari aplikasi Garda Hijau, atau null jika tidak tersedia.
 * Memakai cache stale-while-revalidate supaya halaman tidak menunggu API eksternal setiap request.
 */
export async function getExternalImpact() {
  if (!isExternalApiEnabled()) return null;
  const now = Date.now();
  if (cache.impact) {
    if (now - cache.impactAt > FRESH_MS && now - cache.failedAt > RETRY_AFTER_FAIL_MS) refresh();
    return cache.impact;
  }
  if (now - cache.failedAt < RETRY_AFTER_FAIL_MS) return null;
  return refresh();
}
