"use client";

// Pengingat siklus, setara aplikasi Android v1.3.0 (ui/pengingat/PengingatSiklus.kt):
// - pindah fase (hari ke-13, 21, 28, 35),
// - pakan harian selama fase Pembesaran (hari ke-13 s.d. 20),
// muncul mulai pukul 08.00 waktu HP.
// Bedanya dengan Android: browser tidak bisa menjadwalkan notifikasi saat aplikasi tertutup tanpa
// server push. Jadi pengingat dicek setiap aplikasi dibuka / dibuka kembali (dan tiap 15 menit
// selama terbuka). Notifikasi HP dipakai bila izinnya diberikan; di layar Maggot selalu ada kartunya.
import { useEffect, useState } from "react";
import { api, bacaSesi } from "./api";
import { hariSejak, parseServerDate } from "./format";
import { FASE_PEMBESARAN, FASE_SOP, faseDariHari } from "./siklus";

const JAM_PENGINGAT = 8; // 08.00 waktu HP
const KUNCI_TAMPIL = "ghm_pengingat_tampil";
const SW_URL = "/app/sw-pengingat.js";
const CEK_MS = 15 * 60_000;

const HARI_PINDAH_FASE = FASE_SOP.slice(1).map((f) => f.hariAwal);

/** Pengingat yang berlaku hari ini untuk daftar siklus (GET /siklus). Kosong sebelum pukul 08.00. */
export function pengingatHariIni(daftarSiklus, sekarang = new Date()) {
  if (sekarang.getHours() < JAM_PENGINGAT) return [];
  const hasil = [];
  for (const s of daftarSiklus || []) {
    const mulai = parseServerDate(s?.tanggalMulai);
    if (!mulai || !s?.id) continue;
    const hari = hariSejak(mulai, sekarang);
    if (HARI_PINDAH_FASE.includes(hari)) {
      const fase = faseDariHari(hari) || FASE_SOP[FASE_SOP.length - 1];
      hasil.push({
        kunci: `${s.id}-fase-${hari}-${s.tanggalMulai}`,
        siklusId: s.id,
        ref: s.kode ?? s.id,
        judul: `Siklus ${s.id} masuk fase ${fase.nama}`,
        isi: `Hari ke-${hari}. Buka aplikasi untuk melihat panduan fase ini.`,
        isiLayar: `Hari ke-${hari}. Ketuk untuk melihat panduan fase ini.`,
      });
    }
    if (hari >= FASE_PEMBESARAN.hariAwal && hari <= FASE_PEMBESARAN.hariAkhir) {
      hasil.push({
        kunci: `${s.id}-pakan-${hari}-${s.tanggalMulai}`,
        siklusId: s.id,
        ref: s.kode ?? s.id,
        judul: "Waktunya memberi pakan",
        isi: `Siklus ${s.id} hari ke-${hari}: beri pakan 1–1,5 kg per baki, lalu catat di aplikasi.`,
        isiLayar: `Siklus ${s.id} hari ke-${hari}: beri pakan 1–1,5 kg per baki.`,
      });
    }
  }
  return hasil;
}

export const notifikasiDidukung = () =>
  typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;

async function registrasiSw() {
  if (!notifikasiDidukung()) return null;
  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/app/" });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

function sudahTampil() {
  try { return JSON.parse(window.localStorage.getItem(KUNCI_TAMPIL) || "{}") || {}; } catch { return {}; }
}

/** Tampilkan notifikasi HP untuk pengingat hari ini yang belum pernah ditampilkan. */
async function tampilkanNotifikasi(daftarSiklus) {
  if (!notifikasiDidukung() || Notification.permission !== "granted") return;
  const baru = pengingatHariIni(daftarSiklus);
  if (!baru.length) return;
  const tampil = sudahTampil();
  const belum = baru.filter((p) => !tampil[p.kunci]);
  if (!belum.length) return;
  const reg = await registrasiSw();
  if (!reg) return;
  for (const p of belum) {
    try {
      await reg.showNotification(p.judul, {
        body: p.isi,
        tag: p.kunci,
        icon: "/ghm/icon-192.png",
        badge: "/ghm/icon-192.png",
        data: { url: `/app/maggot/${p.ref}` },
      });
      tampil[p.kunci] = Date.now();
    } catch { /* abaikan; dicoba lagi saat cek berikutnya */ }
  }
  // Simpan tanda 60 hari terakhir saja.
  const batas = Date.now() - 60 * 86_400_000;
  const ringkas = Object.fromEntries(Object.entries(tampil).filter(([, t]) => t > batas));
  try { window.localStorage.setItem(KUNCI_TAMPIL, JSON.stringify(ringkas)); } catch { /* abaikan */ }
}

/** Cek pengingat di latar selama aplikasi terbuka (dipasang sekali di AppSessionProvider). */
export function usePengingatLatar(aktif) {
  useEffect(() => {
    if (!aktif || !notifikasiDidukung()) return undefined;
    let batal = false;
    const cek = async () => {
      if (batal || Notification.permission !== "granted" || !bacaSesi()?.token) return;
      try {
        const res = await api("/siklus");
        if (!batal) await tampilkanNotifikasi(res?.data || []);
      } catch { /* tidak ada internet: dicek lagi nanti */ }
    };
    cek();
    const timer = setInterval(cek, CEK_MS);
    const onVisible = () => { if (document.visibilityState === "visible") cek(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      batal = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [aktif]);
}

/**
 * Status izin notifikasi untuk tombol "Nyalakan pengingat" di layar Maggot.
 * `status`: "tidak-didukung" | "default" | "granted" | "denied".
 */
export function useIzinPengingat(daftarSiklus) {
  const [status, setStatus] = useState("tidak-didukung");
  useEffect(() => {
    if (notifikasiDidukung()) setStatus(Notification.permission);
  }, []);
  const minta = async () => {
    if (!notifikasiDidukung()) return;
    const hasil = await Notification.requestPermission();
    setStatus(hasil);
    if (hasil === "granted") await tampilkanNotifikasi(daftarSiklus || []);
  };
  return { status, minta };
}
