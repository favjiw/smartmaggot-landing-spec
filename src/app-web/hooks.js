"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pesanDari } from "./api";

/** Muat data saat layar dibuka (dan saat `aktif` berubah jadi true). Data lama tetap tampil saat memuat ulang. */
export function useMuat(fn, deps = [], aktif = true) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const muat = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false });
    } catch (err) {
      if (err?.status === 401) return; // diarahkan ke halaman Masuk
      setState((s) => ({ ...s, error: pesanDari(err), loading: false }));
    }
  }, []);

  useEffect(() => {
    if (aktif) muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, muat, ...deps]);

  // Muat ulang saat kembali ke tab browser (setara onResume di Android).
  useEffect(() => {
    if (!aktif) return undefined;
    const onVisible = () => { if (document.visibilityState === "visible") muat(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [aktif, muat]);

  return { ...state, muat };
}
