"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, PESAN } from "../api";
import { hariSejak, jam, parseServerDate, tanggalSedang } from "../format";
import { useMuat } from "../hooks";
import { IconChevron, IconKirim } from "../icons";
import { useRequireAuth } from "../session";
import { BilahAtas, GalatMuat, Layar, Memuat } from "../ui";

// ===================================================== GardaBot

const SAPAAN = "Halo! Saya bisa bantu soal maggot BSF dan pemilahan sampah. Mau tanya apa?";
const SARAN = ["Berapa lama telur maggot menetas?", "Pakan apa yang paling bagus?", "Sampah apa yang dilarang untuk maggot?"];
const CHAT_KEY = "ghm_chat";

/** Tebal (**teks**) dan baris baru dari jawaban LLM, tanpa HTML mentah. */
function TeksJawaban({ teks }) {
  return teks.split("\n").map((baris, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {baris.split(/(\*\*[^*]+\*\*)/g).map((bagian, j) =>
        bagian.startsWith("**") && bagian.endsWith("**") ? <strong key={j}>{bagian.slice(2, -2)}</strong> : bagian.replace(/^\s*[-*]\s+/, "• ")
      )}
    </Fragment>
  ));
}

export function GardaBotScreen() {
  const boleh = useRequireAuth();
  const [pesan, setPesan] = useState([]);
  const [teks, setTeks] = useState("");
  const [menunggu, setMenunggu] = useState(false);
  const akhirRef = useRef(null);

  // Riwayat percakapan bertahan selama tab browser terbuka (pindah tab aplikasi tidak menghapusnya).
  useEffect(() => {
    try { setPesan(JSON.parse(sessionStorage.getItem(CHAT_KEY) || "[]")); } catch { /* abaikan */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(pesan.slice(-40))); } catch { /* abaikan */ }
    akhirRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pesan, menunggu]);

  const kirim = async (isi) => {
    const pertanyaan = isi.trim();
    if (!pertanyaan || menunggu) return;
    setTeks("");
    setPesan((p) => [...p, { dari: "saya", teks: pertanyaan }]);
    setMenunggu(true);
    let jawaban;
    try {
      const res = await api("/chatbot/tanya", { method: "POST", timeout: 70000, body: { pertanyaan } });
      jawaban = res?.data?.jawaban?.trim() || "Maaf, GardaBot belum bisa menjawab. Periksa internet lalu coba lagi.";
    } catch (err) {
      // 429: terlalu banyak pertanyaan; 503: layanan AI tidak tersedia; lainnya: jaringan.
      if (err instanceof ApiError && err.status === 429) jawaban = PESAN[429];
      else if (err instanceof ApiError && err.status === 503) jawaban = PESAN[503];
      else if (err instanceof ApiError && err.status === 401) return;
      else jawaban = "Maaf, GardaBot belum bisa menjawab. Periksa internet lalu coba lagi.";
    }
    setPesan((p) => [...p, { dari: "bot", teks: jawaban }]);
    setMenunggu(false);
  };

  if (!boleh) return null;
  const belumBertanya = !pesan.some((p) => p.dari === "saya");
  return (
    <Layar
      nav
      className="ghm-chat-layar"
      footer={
        <form className="ghm-chat-form" onSubmit={(e) => { e.preventDefault(); kirim(teks); }}>
          <label htmlFor="ghm-pertanyaan" className="sr-only">Tulis pertanyaan</label>
          <input id="ghm-pertanyaan" className="ghm-input" value={teks} onChange={(e) => setTeks(e.target.value)} placeholder="Tulis pertanyaan" maxLength={2000} autoComplete="off" />
          <button type="submit" className="ghm-kirim" disabled={!teks.trim() || menunggu} aria-label="Kirim pertanyaan"><IconKirim size={22} /></button>
        </form>
      }
    >
      <header className="ghm-kepala ghm-kepala-bot">
        <img src="/ghm/gardabot.png" alt="" className="ghm-avatar-bot" />
        <div>
          <h1 className="ghm-judul-layar">GardaBot</h1>
          <p className="ghm-kecil">Tanya soal budidaya maggot dan memilah sampah.</p>
        </div>
      </header>

      <div className="ghm-chat" aria-live="polite">
        <div className="gelembung bot">{SAPAAN}</div>
        {belumBertanya && (
          <div className="ghm-saran">
            <p className="ghm-label">Coba tanyakan</p>
            {SARAN.map((s) => <button key={s} type="button" className="ghm-saran-tombol" onClick={() => kirim(s)} disabled={menunggu}>{s}</button>)}
          </div>
        )}
        {pesan.map((p, i) => (
          <div key={i} className={`gelembung ${p.dari === "saya" ? "saya" : "bot"}`}>
            {p.dari === "bot" ? <TeksJawaban teks={p.teks} /> : p.teks}
          </div>
        ))}
        {menunggu && <div className="gelembung bot mengetik"><span className="titik-titik" aria-hidden="true"><i /><i /><i /></span>GardaBot sedang mengetik…</div>}
        <div ref={akhirRef} />
      </div>
    </Layar>
  );
}

// ===================================================== Notifikasi

export function NotifikasiScreen() {
  const boleh = useRequireAuth();
  const notif = useMuat(() => api("/notifikasi"), [], boleh);

  const grup = useMemo(() => {
    const list = [...(notif.data?.data || [])].sort((a, b) => (parseServerDate(b.createdAt)?.getTime() || 0) - (parseServerDate(a.createdAt)?.getTime() || 0));
    const map = new Map();
    for (const n of list) {
      const d = parseServerDate(n.createdAt);
      const selisih = d ? hariSejak(d) : null;
      const judul = selisih === 0 ? "Hari ini" : selisih === 1 ? "Kemarin" : tanggalSedang(d);
      if (!map.has(judul)) map.set(judul, []);
      map.get(judul).push(n);
    }
    return [...map.entries()];
  }, [notif.data]);

  if (!boleh) return null;
  return (
    <Layar>
      <BilahAtas kembali="/app" />
      <h1 className="ghm-judul-layar">Notifikasi</h1>
      {notif.error && !notif.data ? <GalatMuat pesan={notif.error} onCobaLagi={notif.muat} /> : notif.loading && !notif.data ? <Memuat /> : grup.length === 0 ? (
        <p className="ghm-kartu ghm-kecil">Belum ada notifikasi.</p>
      ) : grup.map(([judul, items]) => (
        <section key={judul} className="ghm-grup-notif">
          <h2 className="ghm-label">{judul}</h2>
          <ul className="ghm-kartu ghm-daftar">
            {items.map((n) => (
              <li key={n.id}>
                <Link href={`/app/notifikasi/${n.id}`} className={`ghm-baris-notif ${n.isRead ? "" : "baru"}`}>
                  <span className="ghm-baris-teks">
                    <strong>{n.title}</strong>
                    <small className="ghm-dua-baris">{n.message}</small>
                    <small className="ghm-kecil">{jam(parseServerDate(n.createdAt))}{!n.isRead && <span className="ghm-label-baru">Belum dibaca</span>}</small>
                  </span>
                  <IconChevron className="ghm-chevron" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Layar>
  );
}

export function DetailNotifikasiScreen() {
  const boleh = useRequireAuth();
  const { id } = useParams();
  const notif = useMuat(async () => {
    const res = await api("/notifikasi");
    const item = (res?.data || []).find((n) => String(n.id) === String(id));
    if (!item) throw new ApiError(PESAN[404], 404);
    if (!item.isRead) api(`/notifikasi/${id}/read`, { method: "PATCH" }).catch(() => null);
    return item;
  }, [id], boleh);
  const n = notif.data;

  if (!boleh) return null;
  return (
    <Layar>
      <BilahAtas kembali="/app/notifikasi" judul="Detail notifikasi" />
      {notif.error ? <GalatMuat pesan={notif.error} /> : !n ? <Memuat /> : (
        <article className="ghm-kartu">
          <h1 className="ghm-judul-bagian">{n.title}</h1>
          <p>{n.message}</p>
          <p className="ghm-kecil">{(() => { const d = parseServerDate(n.createdAt); return d ? `${tanggalSedang(d)}, ${jam(d)}` : ""; })()}</p>
        </article>
      )}
    </Layar>
  );
}
