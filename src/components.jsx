import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { content } from "./content";

export const formatDate = (iso) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00`));
export const formatPrice = (value) => new Intl.NumberFormat("id-ID").format(value);
export const waLink = (message = "Halo, saya ingin bertanya tentang produk dan program Garda Hijau Mengger.") => `https://wa.me/${content.whatsapp}?text=${encodeURIComponent(message)}`;

export function WhatsAppIcon() {
  return <img className="whatsapp-icon" src="/assets/logos/whatsapp.png" alt="" aria-hidden="true" />;
}

export function Photo({ index = 0, className = "", alt = "Dokumentasi kegiatan Garda Hijau Mengger" }) {
  const photos = ["panen", "pemilahan", "pelatihan", "sosialisasi", "kasgot", "kunjungan"];
  return <img className={`photo ${className}`} src={`/assets/activities/${photos[index]}.webp`} alt={alt} loading="lazy" />;
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header"><div className="header-inner">
    <Link to="/" className="brand" aria-label="Garda Hijau Mengger, beranda"><img className="brand-mark" src="/assets/logos/garda-hijau.png" alt="" /><span><b><span className="desktop-brand">Sinergi Garda Hijau</span><span className="mobile-brand">Garda Hijau</span></b><small><span className="desktop-brand">Kelurahan Mengger — TPS3R</span><span className="mobile-brand">Mengger</span></small></span></Link>
    <nav className={menuOpen ? "open" : ""} aria-label="Navigasi utama"><a onClick={() => setMenuOpen(false)} href="/#tentang">Tentang Program</a><a onClick={() => setMenuOpen(false)} href="/#produk">Produk</a><NavLink onClick={() => setMenuOpen(false)} to="/kegiatan">Kegiatan</NavLink><a onClick={() => setMenuOpen(false)} href="#kontak">Kontak</a></nav>
    <a className="button header-wa" href={waLink()} target="_blank" rel="noreferrer"><WhatsAppIcon /><span className="desktop-brand">Chat WA</span><span className="mobile-brand">WA</span></a>
    <button className="menu" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><span /><span /><span /></button>
  </div></header>;
}

export function Footer() {
  return <footer className="footer" id="kontak"><div className="container footer-columns">
    <div className="footer-brand"><img src="/assets/logos/garda-hijau.png" alt="" /><div><strong>Sinergi Garda Hijau Mengger</strong><p>Pengelolaan sampah organik berbasis warga dan budidaya maggot BSF.</p></div></div>
    <div><h2>Kontak resmi & layanan</h2><p><b>Rumah Maggot Kelurahan Mengger</b><br />{content.address}</p><a href={waLink()} target="_blank" rel="noreferrer">WhatsApp: hubungi pengelola</a></div>
    <div><h2>Mitra kolaborasi</h2><p>Kelurahan Mengger · TPS3R · UNIKOM · BEM · Diktisaintek · DLH Kota Bandung</p></div>
  </div><div className="container footer-bottom"><span>© 2026 Sinergi Garda Hijau Mengger</span><span>Program edukasi lingkungan Kelurahan Mengger</span></div></footer>;
}

export function ActivityCard({ activity, compact = false }) {
  return <Link className={`activity-card ${compact ? "compact" : ""}`} to={`/kegiatan/${activity.slug}`} aria-label={`Baca ${activity.title}`}><article>
    <div className="activity-photo"><Photo index={activity.photo} alt={activity.title} /><span className="category">{activity.category}</span></div>
    <div className="activity-body"><time dateTime={activity.date}>{formatDate(activity.date)}</time><h3>{activity.title}</h3><p>{activity.summary}</p><span className="card-link">Baca selengkapnya <span aria-hidden="true">→</span></span></div>
  </article></Link>;
}
