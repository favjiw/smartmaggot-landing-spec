"use client";

import { createContext, useContext } from "react";
import { fallbackPublic } from "./content";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/web-api";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("gardahijau_admin_token");
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(!isFormData ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
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
