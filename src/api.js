"use client";

import { createContext, useContext } from "react";
import { fallbackPublic } from "./content";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/web-api";

const TOKEN_KEY = "gardahijau_admin_token";
const USER_KEY = "gardahijau_admin_user";

/** Hapus sesi admin lalu arahkan ke halaman login. */
export function akhiriSesi(alasan = "berakhir") {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.replace(`/admin/login?sesi=${alasan}`);
}

/** Token JWT admin masih berlaku menurut klaim `exp` (dibaca di browser, tanpa verifikasi tanda tangan). */
export function tokenBerlaku(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(!isFormData ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  // Sesi habis/tidak valid di endpoint admin: langsung ke halaman login, jangan tampilkan halaman kosong.
  if (response.status === 401 && !path.startsWith("/auth/")) {
    akhiriSesi();
    throw new Error("Sesi sudah berakhir. Silakan masuk lagi.");
  }
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message ?? "Permintaan gagal diproses.");
  return payload?.data ?? payload;
}

export async function uploadPhotos(files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("photos", file));
  return apiFetch("/admin/upload", { method: "POST", body: formData });
}

const PublicDataContext = createContext(null);

/**
 * Menyediakan data publik (katalog + angka dampak) yang sudah diambil di server.
 * `catalog` null berarti database tidak tersedia, sehingga data cadangan dipakai.
 */
export function PublicDataProvider({ catalog, impact = null, children }) {
  const value = {
    products: catalog?.products ?? fallbackPublic.products,
    activities: catalog?.activities ?? fallbackPublic.activities,
    settings: { ...fallbackPublic.settings, ...(catalog?.settings ?? {}) },
    impact,
  };
  return <PublicDataContext.Provider value={value}>{children}</PublicDataContext.Provider>;
}

export function usePublicData() {
  return useContext(PublicDataContext) ?? { ...fallbackPublic, impact: null };
}
