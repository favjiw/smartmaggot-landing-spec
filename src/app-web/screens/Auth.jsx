"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, pesanDari } from "../api";
import { IconMata } from "../icons";
import { useRedirectIfLoggedIn, useSession } from "../session";
import { Isian, Layar, Pilihan, Tombol } from "../ui";

function Hero({ subjudul }) {
  return (
    <div className="ghm-hero">
      <div className="ghm-logo-pill">
        <img src="/ghm/logos/logo_diktisaintek.png" alt="Logo Diktisaintek Berdampak" />
        <img src="/ghm/logos/logo_wow.png" alt="Logo Wise on Waste" />
        <img src="/ghm/logos/logo_unikom.png" alt="Logo Universitas Komputer Indonesia" />
      </div>
      <h1 className="ghm-angka-sedang">Garda Hijau<br />Mengger</h1>
      <p>{subjudul}</p>
    </div>
  );
}

function IsianSandi({ label, value, onChange, galat, placeholder, autoComplete }) {
  const [tampil, setTampil] = useState(false);
  return (
    <Isian label={label} galat={galat}>
      {(attrs) => (
        <div className="ghm-input-wrap">
          <input {...attrs} className="ghm-input" type={tampil ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} />
          <button type="button" className="ghm-input-ikon" onClick={() => setTampil(!tampil)} aria-label={tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
            <IconMata tertutup={tampil} size={22} />
          </button>
        </div>
      )}
    </Isian>
  );
}

export function MasukScreen() {
  const params = useSearchParams();
  const lanjut = params.get("lanjut");
  // Hanya halaman di dalam aplikasi (mencegah pengalihan ke situs lain).
  const tujuan = lanjut && /^\/app(\/[\w\-/]*)?$/.test(lanjut) ? lanjut : "/app";
  const boleh = useRedirectIfLoggedIn(tujuan);
  const { masuk, toast } = useSession();
  const [username, setUsername] = useState(params.get("nama") || "");
  const [password, setPassword] = useState("");
  const [galat, setGalat] = useState({});
  const [pesan, setPesan] = useState(
    params.get("sesi") === "habis" ? "Sesi kamu sudah berakhir. Silakan masuk lagi." : params.get("daftar") ? "Akun dibuat. Silakan masuk." : ""
  );
  const [sibuk, setSibuk] = useState(false);

  const kirim = async (e) => {
    e.preventDefault();
    const g = {};
    if (!username.trim()) g.username = "Isi nama pengguna dulu";
    if (!password) g.password = "Isi kata sandi dulu";
    setGalat(g);
    if (Object.keys(g).length) return;
    setSibuk(true);
    setPesan("");
    try {
      const res = await api("/auth/login", { method: "POST", auth: false, body: { username: username.trim(), password } });
      toast(`Halo, ${res.user?.username ?? "pengelola"}!`);
      masuk(res.token, res.user); // useRedirectIfLoggedIn memindahkan ke `tujuan`
    } catch (err) {
      setPesan(pesanDari(err));
      setSibuk(false);
    }
  };

  if (!boleh) return null;
  return (
    <Layar className="ghm-auth">
      <Hero subjudul="Catat sampah yang masuk dan pantau kandang maggot di RW-mu." />
      <form className="ghm-auth-form" onSubmit={kirim} noValidate>
        <h2 className="ghm-judul-bagian">Masuk ke akunmu</h2>
        {pesan && <p className={`ghm-pemberitahuan ${pesan.startsWith("Akun dibuat") ? "sukses" : ""}`} role="alert">{pesan}</p>}
        <Isian label="Nama pengguna" galat={galat.username}>
          {(attrs) => <input {...attrs} className="ghm-input" value={username} onChange={(e) => { setUsername(e.target.value); setGalat({ ...galat, username: null }); }} placeholder="Contoh: pengelola.rw5" autoComplete="username" autoCapitalize="none" spellCheck={false} />}
        </Isian>
        <IsianSandi label="Kata sandi" value={password} onChange={(e) => { setPassword(e.target.value); setGalat({ ...galat, password: null }); }} galat={galat.password} placeholder="Masukkan kata sandi" autoComplete="current-password" />
        <Tombol type="submit" disabled={sibuk}>{sibuk ? "Memproses…" : "Masuk"}</Tombol>
        <p className="ghm-tautan-auth">Belum punya akun? <Link href="/app/daftar">Daftar</Link></p>
      </form>
    </Layar>
  );
}

export function DaftarScreen() {
  const boleh = useRedirectIfLoggedIn();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rw, setRw] = useState(null);
  const [galat, setGalat] = useState({});
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const kirim = async (e) => {
    e.preventDefault();
    const g = {};
    if (!username.trim()) g.username = "Isi nama pengguna dulu";
    if (!password) g.password = "Isi kata sandi dulu";
    if (!rw) g.rw = "Pilih RW yang kamu kelola";
    setGalat(g);
    if (Object.keys(g).length) return;
    setSibuk(true);
    setPesan("");
    try {
      await api("/auth/register", { method: "POST", auth: false, body: { username: username.trim(), password, rw } });
      router.replace(`/app/masuk?daftar=1&nama=${encodeURIComponent(username.trim())}`);
    } catch (err) {
      setPesan(pesanDari(err));
      setSibuk(false);
    }
  };

  if (!boleh) return null;
  return (
    <Layar className="ghm-auth">
      <Hero subjudul="Satu akun untuk tiap pengelola. Data sampah yang kamu catat akan masuk ke RW yang dipilih." />
      <form className="ghm-auth-form" onSubmit={kirim} noValidate>
        <h2 className="ghm-judul-bagian">Buat akun baru</h2>
        {pesan && <p className="ghm-pemberitahuan" role="alert">{pesan}</p>}
        <Isian label="Nama pengguna" galat={galat.username} bantuan="3–30 karakter: huruf, angka, titik, garis bawah, atau strip.">
          {(attrs) => <input {...attrs} className="ghm-input" value={username} onChange={(e) => { setUsername(e.target.value); setGalat({ ...galat, username: null }); }} placeholder="Contoh: pengelola.rw5" autoComplete="username" autoCapitalize="none" spellCheck={false} />}
        </Isian>
        <IsianSandi label="Kata sandi" value={password} onChange={(e) => { setPassword(e.target.value); setGalat({ ...galat, password: null }); }} galat={galat.password} placeholder="Buat kata sandi" autoComplete="new-password" />
        <fieldset className="ghm-fieldset">
          <legend>Kamu mengelola RW berapa?</legend>
          <div className="ghm-pilihan-grid tiga" role="radiogroup">
            {["RW1", "RW2", "RW3", "RW4", "RW5"].map((v) => (
              <Pilihan key={v} dipilih={rw === v} onClick={() => { setRw(v); setGalat({ ...galat, rw: null }); }}>{v.replace("RW", "RW ")}</Pilihan>
            ))}
          </div>
          {galat.rw && <p className="ghm-galat-teks">{galat.rw}</p>}
        </fieldset>
        <Tombol type="submit" disabled={sibuk}>{sibuk ? "Memproses…" : "Daftar"}</Tombol>
        <p className="ghm-tautan-auth">Sudah punya akun? <Link href="/app/masuk">Masuk</Link></p>
      </form>
    </Layar>
  );
}
