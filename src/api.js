"use client";

import { useEffect, useState } from "react";
import { content } from "./content";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

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

const fallbackPublic = {
  products: content.products.map((product) => ({ ...product, name: product.name, photo_url: `/assets/activities/${({ 0: "panen", 4: "kasgot", 5: "kunjungan" })[product.photo] ?? "panen"}.webp`, stock_status: product.status })),
  activities: content.activities.map((activity) => ({ ...activity, title: activity.title, activity_date: activity.date, photos: [`/assets/activities/${["panen", "pemilahan", "pelatihan", "sosialisasi", "kasgot", "kunjungan"][activity.photo]}.webp`] })),
  settings: { partner_name: "Sinergi Garda Hijau Mengger", whatsapp: content.whatsapp, address: content.address, show_catalog: true, show_stock_status: true },
};

export function usePublicData() {
  const [data, setData] = useState(fallbackPublic);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/public/catalog", { signal: controller.signal }).then((value) => {
      if (value?.settings?.whatsapp) content.whatsapp = value.settings.whatsapp;
      setData(value);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  return data;
}

export function useImpact() {
  const [impact, setImpact] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    apiFetch("/public/ringkasan", { signal: controller.signal }).then((value) => {
      if (value?.totalSampahKg > 0 || value?.jumlahSiklus > 0) setImpact(value);
    }).catch(() => {}).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);
  return impact;
}
