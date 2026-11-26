"use client";

// Antrean kirim offline, sama dengan aplikasi Android v1.3.0 (model/local/antrean/*, AntreanRepository.kt):
// input yang gagal karena tidak ada internet (atau server sedang bermasalah) disimpan di HP,
// lalu dikirim otomatis saat jaringan tersedia. Disimpan di localStorage per perangkat.
import { useEffect, useRef, useState } from "react";
import { api, bacaSesi } from "./api";

const KUNCI = "ghm_antrean";
const EVENT = "ghm-antrean";
const MAKS_PERCOBAAN = 5;
const JEDA_DASAR_MS = 30_000; // diulang dengan jeda 30 dtk, 1, 2, 4 menit (seperti backoff WorkManager)

export const PESAN_TERSIMPAN_DI_HP = "Tersimpan di HP. Akan dikirim otomatis saat ada internet.";

export const JENIS = { SAMPAH: "SAMPAH", SIKLUS: "SIKLUS", FASE_BESAR: "FASE_BESAR", PERKIRAAN: "PERKIRAAN" };

/**
 * Nasib satu permintaan dari galatnya (KlasifikasiAntrean di Android):
 * jaringan / waktu habis / 429 / 5xx -> ULANGI, 401 -> BERHENTI (tunggu masuk lagi), 4xx lain -> BUANG.
 */
export function aksiGalat(err) {
  const status = Number(err?.status) || 0;
  if (status === 401) return "BERHENTI";
  if (status === 0 || status === 429 || status >= 500) return "ULANGI";
  if (status >= 400) return "BUANG";
  return "ULANGI";
}

/** true bila permintaan yang gagal sebaiknya disimpan di antrean, bukan ditampilkan sebagai galat. */
export const perluDiantrekan = (err) => aksiGalat(err) === "ULANGI";

// Antrean dicatat per akun: item akun lain (mis. sesi habis lalu masuk dengan akun berbeda) tidak dikirim.
const pemilikSekarang = () => {
  const user = bacaSesi()?.user;
  return user?.id ?? user?.username ?? null;
};

function baca() {
  try {
    const list = JSON.parse(window.localStorage.getItem(KUNCI) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function tulis(list) {
  try {
    if (list.length) window.localStorage.setItem(KUNCI, JSON.stringify(list));
    else window.localStorage.removeItem(KUNCI);
  } catch { /* penyimpanan penuh / mode privat */ }
  window.dispatchEvent(new Event(EVENT));
}

const ubahItem = (id, fn) => tulis(baca().flatMap((it) => (it.id === id ? fn(it) : [it])));

/** Jumlah item milik akun yang sedang masuk. */
export function jumlahAntrean() {
  if (typeof window === "undefined") return 0;
  const pemilik = pemilikSekarang();
  return baca().filter((it) => it.pemilik === pemilik).length;
}

/** Simpan satu permintaan ke antrean lalu coba kirim (akan diulang otomatis bila masih gagal). */
export function antrekan(jenis, payload) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    jenis,
    payload,
    pemilik: pemilikSekarang(),
    dibuatPada: Date.now(),
    percobaan: 0,
  };
  tulis([...baca(), item]);
  jadwalkanUlang(3000);
}

/** Kosongkan antrean (saat keluar akun, supaya tidak terkirim atas nama akun lain). */
export function bersihkanAntrean() {
  clearTimeout(timerUlang);
  tulis([]);
}

const kirimPanen = (siklusId, tanggal, telurGram, pakanGram, keterangan) =>
  api(`/siklus/${siklusId}/fase`, {
    method: "POST",
    timeout: 60000,
    body: { jenis: "PANEN", tanggal, jumlahTelur: telurGram, jumlahMakanan: pakanGram, keterangan: keterangan || null },
  });

async function kirimSatu(item) {
  const p = item.payload || {};
  switch (item.jenis) {
    case JENIS.SAMPAH:
      await api("/pencacahan", { method: "POST", body: { tanggalWaktu: p.tanggalWaktu, totalSampah: p.totalSampah, catatan: p.catatan || null } });
      return;

    case JENIS.SIKLUS: {
      const res = await api("/siklus", { method: "POST", body: { tanggalMulai: p.tanggalMulai, jumlahTelur: p.jumlahTelur, mediaTelur: p.mediaTelur, catatan: p.catatan || null } });
      const siklusId = res?.data?.id;
      // Sama seperti saat online: fase PENETASAN menyusul. Gagal di sini tidak mengulang siklusnya
      // (supaya siklus tidak tercatat dua kali).
      if (siklusId) {
        await api(`/siklus/${siklusId}/fase`, { method: "POST", body: { jenis: "PENETASAN", tanggal: p.tanggalMulai, jumlahTelur: p.jumlahTelur } }).catch(() => null);
      }
      return;
    }

    case JENIS.FASE_BESAR: {
      const pakanGram = p.pakanKg * 1000;
      await api(`/siklus/${p.siklusId}/fase`, { method: "POST", body: { jenis: "PEMBESARAN", tanggal: p.tanggal, jumlahMakanan: pakanGram, keterangan: p.keterangan || null } });
      // Fase besar sudah tersimpan: sisanya tinggal perhitungan perkiraan. Item diubah dulu
      // supaya fase besar tidak terkirim dua kali bila perhitungan gagal.
      const sisa = { siklusId: p.siklusId, tanggal: p.tanggal, telurGram: p.telurGram, pakanGram, keterangan: p.keterangan };
      ubahItem(item.id, (it) => [{ ...it, jenis: JENIS.PERKIRAAN, payload: sisa }]);
      await kirimPanen(sisa.siklusId, sisa.tanggal, sisa.telurGram, sisa.pakanGram, sisa.keterangan);
      return;
    }

    case JENIS.PERKIRAAN:
      await kirimPanen(p.siklusId, p.tanggal, p.telurGram, p.pakanGram, p.keterangan);
      return;

    default:
      throw Object.assign(new Error("Jenis antrean tidak dikenal"), { status: 400 });
  }
}

let berjalan = null;
let timerUlang = null;

function jadwalkanUlang(ms = 0) {
  clearTimeout(timerUlang);
  timerUlang = setTimeout(() => { kirimAntrean(); }, ms);
}

async function prosesAntrean() {
  if (!bacaSesi()?.token) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return; // tunggu event "online"
  const pemilik = pemilikSekarang();
  let percobaanTerbanyak = 0;

  for (const awal of baca().filter((it) => it.pemilik === pemilik)) {
    const item = baca().find((it) => it.id === awal.id); // bisa sudah diubah oleh langkah sebelumnya
    if (!item) continue;
    try {
      await kirimSatu(item);
      ubahItem(item.id, () => []);
    } catch (err) {
      const aksi = aksiGalat(err);
      if (aksi === "BERHENTI") return; // sesi habis: tunggu pengguna masuk lagi
      if (aksi === "BUANG") {
        ubahItem(item.id, () => []);
        continue;
      }
      const terkini = baca().find((it) => it.id === item.id) || item;
      if ((terkini.percobaan || 0) + 1 >= MAKS_PERCOBAAN) {
        ubahItem(item.id, () => []);
      } else {
        ubahItem(item.id, (it) => [{ ...it, percobaan: (it.percobaan || 0) + 1 }]);
        percobaanTerbanyak = Math.max(percobaanTerbanyak, (terkini.percobaan || 0) + 1);
      }
    }
  }
  if (percobaanTerbanyak) jadwalkanUlang(JEDA_DASAR_MS * 2 ** (percobaanTerbanyak - 1));
}

/** Kirim isi antrean, satu per satu dari yang paling lama. Aman dipanggil berkali-kali (juga dari beberapa tab). */
export function kirimAntrean() {
  if (typeof window === "undefined") return Promise.resolve();
  if (berjalan) return berjalan;
  const jalan = navigator.locks?.request
    ? navigator.locks.request("ghm-antrean", { ifAvailable: true }, (lock) => (lock ? prosesAntrean() : null))
    : prosesAntrean();
  berjalan = Promise.resolve(jalan).catch(() => null).finally(() => { berjalan = null; });
  return berjalan;
}

/** Pasang pengirim otomatis: saat aplikasi dibuka, kembali online, atau tab kembali terlihat. */
export function usePengirimAntrean(aktif) {
  useEffect(() => {
    if (!aktif) return undefined;
    kirimAntrean();
    const onOnline = () => kirimAntrean();
    const onVisible = () => { if (document.visibilityState === "visible") kirimAntrean(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [aktif]);
}

/**
 * Jumlah catatan yang menunggu dikirim. `onTerkirim` dipanggil saat jumlahnya berkurang
 * (ada data yang baru sampai di server), untuk memuat ulang layar.
 */
export function useAntrean(onTerkirim) {
  const [jumlah, setJumlah] = useState(0);
  const sebelumnya = useRef(null);
  const onTerkirimRef = useRef(onTerkirim);
  onTerkirimRef.current = onTerkirim;

  useEffect(() => {
    const perbarui = () => setJumlah(jumlahAntrean());
    perbarui();
    window.addEventListener(EVENT, perbarui);
    window.addEventListener("storage", perbarui);
    return () => {
      window.removeEventListener(EVENT, perbarui);
      window.removeEventListener("storage", perbarui);
    };
  }, []);

  useEffect(() => {
    if (sebelumnya.current !== null && jumlah < sebelumnya.current) onTerkirimRef.current?.();
    sebelumnya.current = jumlah;
  }, [jumlah]);

  return jumlah;
}
