// Klien API backend Maggot BEM (/api di domain yang sama, lewat Nginx).
// Pesan error mengikuti aplikasi Android (model/remote/network/PesanGalat.kt).

const TOKEN_KEY = "ghm_token";
const USER_KEY = "ghm_user";

export const PESAN = {
  jaringan: "Tidak bisa terhubung ke server. Periksa internet lalu coba lagi.",
  waktuHabis: "Server terlalu lama menjawab. Coba lagi.",
  sesi: "Sesi kamu sudah berakhir. Silakan masuk lagi.",
  404: "Data tidak ditemukan.",
  429: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
  503: "Layanan AI sedang tidak tersedia. Coba lagi nanti.",
  umum: "Terjadi kesalahan. Coba lagi.",
};

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

const safeStorage = {
  get(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* mode privat */ }
  },
  remove(key) {
    try { window.localStorage.removeItem(key); } catch { /* mode privat */ }
  },
};

export function bacaSesi() {
  const token = safeStorage.get(TOKEN_KEY);
  let user = null;
  try { user = JSON.parse(safeStorage.get(USER_KEY) || "null"); } catch { user = null; }
  return token ? { token, user } : null;
}

export function simpanSesi(token, user) {
  safeStorage.set(TOKEN_KEY, token);
  safeStorage.set(USER_KEY, JSON.stringify(user ?? null));
}

export function hapusSesi() {
  safeStorage.remove(TOKEN_KEY);
  safeStorage.remove(USER_KEY);
}

// Dipanggil saat server membalas 401 (token kedaluwarsa / sudah logout).
let onSesiHabis = () => {};
export const setOnSesiHabis = (fn) => { onSesiHabis = fn; };

/**
 * Panggil API. `path` tanpa awalan /api, mis. "/siklus".
 * Prediksi AI bisa ±15 detik dan chatbot sampai 60 detik, jadi batas waktunya diatur per panggilan.
 */
export async function api(path, { method = "GET", body, auth = true, timeout = 30000 } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const sesi = bacaSesi();
    if (sesi?.token) headers.Authorization = `Bearer ${sesi.token}`;
  }

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    throw new ApiError(timedOut ? PESAN.waktuHabis : PESAN.jaringan, 0);
  }

  const data = await res.json().catch(() => null);
  if (res.ok) return data;

  if (res.status === 401 && auth) {
    hapusSesi();
    onSesiHabis();
    throw new ApiError(PESAN.sesi, 401);
  }
  const message = typeof data?.message === "string" && data.message.trim() ? data.message : null;
  throw new ApiError(message || PESAN[res.status] || PESAN.umum, res.status);
}

export const pesanDari = (err) => (err instanceof ApiError ? err.message : PESAN.umum);
