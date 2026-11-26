"use client";

// Foto lokal per catatan sampah, sama dengan aplikasi Android v1.3.0 (model/local/FotoLokal.kt).
// Foto TIDAK dikirim ke server (API belum menerima gambar). Kuncinya = tanggalWaktu catatan,
// jadi foto tetap ketemu baik catatan tersimpan langsung maupun lewat antrean offline.
// Disimpan di IndexedDB browser ini.

const DB = "ghm-foto";
const STORE = "foto-sampah";
const SISI_MAKS = 1600; // px; foto HP dikecilkan supaya hemat ruang

/** Kunci yang sama untuk "2026-11-26T07:30:00.000Z" dari server maupun dari isian. */
const kunciFoto = (tanggalWaktu) => {
  const d = new Date(tanggalWaktu);
  return Number.isNaN(d.getTime()) ? String(tanggalWaktu) : d.toISOString();
};

function buka() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB tidak tersedia")); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function transaksi(mode, fn) {
  const db = await buka();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Simpan foto untuk catatan dengan `tanggalWaktu`. Mengembalikan true bila berhasil. */
export async function simpanFoto(tanggalWaktu, blob) {
  try {
    await transaksi("readwrite", (s) => s.put(blob, kunciFoto(tanggalWaktu)));
    return true;
  } catch {
    return false;
  }
}

/** Foto untuk catatan dengan `tanggalWaktu`, atau null bila tidak ada. */
export async function ambilFoto(tanggalWaktu) {
  if (!tanggalWaktu) return null;
  try {
    const blob = await transaksi("readonly", (s) => s.get(kunciFoto(tanggalWaktu)));
    return blob instanceof Blob && blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

export async function hapusFoto(tanggalWaktu) {
  try { await transaksi("readwrite", (s) => s.delete(kunciFoto(tanggalWaktu))); } catch { /* abaikan */ }
}

/** Kecilkan foto (sisi terpanjang maks. 1600 px, JPEG). Bila gagal, file asli dipakai. */
export async function kecilkanFoto(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const skala = Math.min(1, SISI_MAKS / Math.max(bitmap.width, bitmap.height));
    if (skala === 1 && file.size < 1_500_000) { bitmap.close?.(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * skala);
    canvas.height = Math.round(bitmap.height * skala);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob || file;
  } catch {
    return file;
  }
}
