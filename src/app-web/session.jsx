"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, bacaSesi, hapusSesi, setOnSesiHabis, simpanSesi } from "./api";

const SessionContext = createContext(null);

export function AppSessionProvider({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sesi, setSesi] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const tampilkanToast = useCallback((pesan, ms = 3200) => {
    clearTimeout(toastTimer.current);
    setToast(pesan);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => {
    setSesi(bacaSesi());
    setReady(true);
    setOnSesiHabis(() => {
      setSesi(null);
      router.replace("/app/masuk?sesi=habis");
    });
  }, [router]);

  const masuk = useCallback((token, user) => {
    simpanSesi(token, user);
    setSesi({ token, user });
  }, []);

  // Token di-blacklist di server; kalau server gagal dihubungi, token tetap dihapus di perangkat.
  const keluar = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST", timeout: 8000 }); } catch { /* tetap keluar */ }
    hapusSesi();
    setSesi(null);
    router.replace("/app/masuk");
  }, [router]);

  const value = useMemo(() => ({ ready, sesi, masuk, keluar, toast: tampilkanToast }), [ready, sesi, masuk, keluar, tampilkanToast]);

  return (
    <SessionContext.Provider value={value}>
      {children}
      <div className="ghm-toast-wrap" aria-live="polite">{toast && <div className="ghm-toast">{toast}</div>}</div>
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

/** Layar yang butuh login: arahkan ke Masuk bila belum ada sesi. Mengembalikan true bila boleh tampil. */
export function useRequireAuth() {
  const { ready, sesi } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (ready && !sesi) router.replace(`/app/masuk${pathname && pathname !== "/app" ? `?lanjut=${encodeURIComponent(pathname)}` : ""}`);
  }, [ready, sesi, router, pathname]);
  return ready && !!sesi;
}

/** Layar Masuk/Daftar: bila sudah login (termasuk sesaat setelah berhasil masuk), pindah ke `tujuan`. */
export function useRedirectIfLoggedIn(tujuan = "/app") {
  const { ready, sesi } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready && sesi) router.replace(tujuan);
  }, [ready, sesi, router, tujuan]);
  return ready && !sesi;
}
