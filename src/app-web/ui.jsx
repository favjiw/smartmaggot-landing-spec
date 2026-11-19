"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { IconCentang, IconChat, IconKembali, IconMaggot, IconSampah } from "./icons";
import { TAHAP } from "./siklus";

/** Kerangka satu layar. `nav` menampilkan navigasi bawah, `footer` area tombol yang menempel di bawah. */
export function Layar({ children, nav = false, footer = null, className = "" }) {
  return (
    <div className={`ghm-layar ${nav ? "with-nav" : ""} ${footer ? "with-footer" : ""} ${className}`}>
      <main className="ghm-isi">{children}</main>
      {footer && <div className={`ghm-footer ${nav ? "above-nav" : ""}`}>{footer}</div>}
      {nav && <NavBawah />}
    </div>
  );
}

const TABS = [
  { href: "/app", label: "Sampah", Icon: IconSampah, match: (p) => p === "/app" || p.startsWith("/app/sampah") },
  { href: "/app/maggot", label: "Maggot", Icon: IconMaggot, match: (p) => p.startsWith("/app/maggot") },
  { href: "/app/gardabot", label: "GardaBot", Icon: IconChat, match: (p) => p.startsWith("/app/gardabot") },
];

export function NavBawah() {
  const pathname = usePathname() || "/app";
  return (
    <nav className="ghm-nav" aria-label="Navigasi aplikasi">
      {TABS.map(({ href, label, Icon, match }) => {
        const aktif = match(pathname);
        return (
          <Link key={href} href={href} className={aktif ? "aktif" : ""} aria-current={aktif ? "page" : undefined}>
            <span className="ghm-nav-ikon"><Icon size={24} /></span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bilah atas layar turunan: tombol kembali + judul kecil opsional. */
export function BilahAtas({ kembali = "/app", judul, sub, disabled = false }) {
  const router = useRouter();
  const back = () => {
    if (disabled) return;
    if (window.history.length > 1) router.back();
    else router.push(kembali);
  };
  return (
    <header className="ghm-bilah">
      <button type="button" className="ghm-bulat" onClick={back} aria-label="Kembali" disabled={disabled}><IconKembali /></button>
      {(judul || sub) && (
        <div className="ghm-bilah-teks">
          {judul && <strong>{judul}</strong>}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </header>
  );
}

export function Tombol({ children, varian = "utama", className = "", ...rest }) {
  return <button type="button" className={`ghm-tombol ${varian} ${className}`} {...rest}>{children}</button>;
}

export function TombolLink({ children, href, varian = "utama", className = "" }) {
  return <Link href={href} className={`ghm-tombol ${varian} ${className}`}>{children}</Link>;
}

/** Label + isian + bantuan/galat. `children` menerima id lewat render prop. */
export function Isian({ label, galat, bantuan, children }) {
  const id = useId();
  const galatId = `${id}-galat`;
  return (
    <div className={`ghm-isian ${galat ? "galat" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": galat ? true : undefined, "aria-describedby": galat ? galatId : undefined })}
      {galat ? <p id={galatId} className="ghm-galat-teks">{galat}</p> : bantuan ? <p className="ghm-bantuan">{bantuan}</p> : null}
    </div>
  );
}

/** Pilihan bercentang (RW, media telur). */
export function Pilihan({ dipilih, children, ...rest }) {
  return (
    <button type="button" role="radio" aria-checked={dipilih} className={`ghm-pilihan ${dipilih ? "dipilih" : ""}`} {...rest}>
      <span>{children}</span>
      <span className="ghm-pilihan-tanda" aria-hidden="true">{dipilih && <IconCentang size={14} />}</span>
    </button>
  );
}

/** Pita siklus: ruas sebelum tahap sekarang hijau, tahap sekarang kuning, sesudahnya abu. */
export function Pita({ tahap }) {
  const aktif = TAHAP.indexOf(tahap);
  return (
    <div className="ghm-pita" role="img" aria-label={`Tahap sekarang: ${tahap}`}>
      {TAHAP.map((nama, i) => (
        <div key={nama} className={`ruas ${i < aktif ? "lewat" : i === aktif ? "sekarang" : ""}`}>
          <span className="batang" />
          <span className="label">{nama}</span>
        </div>
      ))}
    </div>
  );
}

export function Memuat({ teks = "Memuat…" }) {
  return <p className="ghm-memuat" role="status"><span className="ghm-spinner" aria-hidden="true" />{teks}</p>;
}

export function GalatMuat({ pesan, onCobaLagi }) {
  return (
    <div className="ghm-kartu ghm-galat-muat" role="alert">
      <p>Gagal memuat: {pesan}</p>
      {onCobaLagi && <Tombol varian="garis" onClick={onCobaLagi}>Coba lagi</Tombol>}
    </div>
  );
}

/** Dialog konfirmasi (pengganti AlertDialog Android). */
export function Dialog({ judul, pesan, batal = "Batal", ya, onBatal, onYa, sibuk = false }) {
  const yaRef = useRef(null);
  useEffect(() => {
    yaRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape" && !sibuk) onBatal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBatal, sibuk]);
  return (
    <div className="ghm-dialog-latar" onClick={() => !sibuk && onBatal()}>
      <div className="ghm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ghm-dialog-judul" onClick={(e) => e.stopPropagation()}>
        <h2 id="ghm-dialog-judul">{judul}</h2>
        <p>{pesan}</p>
        <div className="ghm-dialog-aksi">
          <button type="button" className="teks" onClick={onBatal} disabled={sibuk}>{batal}</button>
          <button type="button" className="teks kuat" ref={yaRef} onClick={onYa} disabled={sibuk}>{sibuk ? "Memproses…" : ya}</button>
        </div>
      </div>
    </div>
  );
}
