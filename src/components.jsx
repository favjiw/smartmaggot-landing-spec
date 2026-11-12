import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { content } from "./content";

export const formatDate = (iso) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${iso}T00:00:00`));
export const formatPrice = (value) => new Intl.NumberFormat("id-ID").format(value);
export const waLink = (message = "Halo, saya ingin bertanya tentang produk dan program Garda Hijau Mengger.") => `https://wa.me/${content.whatsapp}?text=${encodeURIComponent(message)}`;

export function WhatsAppIcon() {
  return <img className="whatsapp-icon" src="/assets/logos/whatsapp.png" alt="" aria-hidden="true" />;
}

export function Photo({ index = 0, className = "" }) {
  return <div className={`photo photo-${index} ${className}`} role="img" aria-label="Dokumentasi kegiatan Garda Hijau" />;
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header"><div className="header-inner">
    <Link to="/" className="brand"><img className="brand-mark" src="/assets/logos/garda-hijau.png" alt="Logo Garda Hijau" /><span><b>Garda Hijau</b><small>Mengger</small></span></Link>
    <nav className={menuOpen ? "open" : ""} aria-label="Navigasi utama"><a onClick={() => setMenuOpen(false)} href="/#produk">Produk</a><NavLink onClick={() => setMenuOpen(false)} to="/kegiatan">Kegiatan</NavLink><a onClick={() => setMenuOpen(false)} href="/#kontak">Kontak</a></nav>
    <a className="button header-wa" href={waLink()} target="_blank" rel="noreferrer"><WhatsAppIcon /><span>WhatsApp</span></a>
    <button className="menu" aria-label="Buka menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? "×" : "☰"}</button>
  </div></header>;
}

export function Footer() {
  return <footer className="footer" id="kontak"><div className="container footer-grid">
    <div><h2>Hubungi Kami</h2><h3>Hanggar Maggot Mengger</h3><p>{content.address}</p><a className="button button-light" href={waLink()} target="_blank" rel="noreferrer"><WhatsAppIcon /> Chat via WhatsApp</a></div>
    <div className="map-card"><iframe src={content.mapsEmbedUrl} title="Peta lokasi Hanggar Maggot Mengger" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><a className="map-label" href={content.mapsUrl} target="_blank" rel="noreferrer">● Buka di Google Maps</a></div>
  </div><div className="container supporters"><small>DIDUKUNG OLEH</small><div>
    {[
      ["unikom", "UNIKOM"],
      ["bem-unikom", "BEM UNIKOM"],
      ["diktisaintek", "Diktisaintek Berdampak"],
      ["kelurahan-mengger", "Kelurahan Mengger"],
      ["dlh-kota-bandung", "DLH Kota Bandung"],
    ].map(([file, label]) => <figure className="supporter-logo" key={file}><img src={`/assets/logos/${file}.png`} alt={`Logo ${label}`} /><figcaption>{label}</figcaption></figure>)}
  </div></div><p className="copyright">© 2026 Sinergi Garda Hijau Mengger. Hak Cipta Dilindungi.</p></footer>;
}

export function ActivityCard({ activity, compact = false }) {
  return <Link className={`activity-card ${compact ? "compact" : ""}`} to={`/kegiatan/${activity.slug}`} aria-label={`Baca ${activity.title}`}>
    <article>
      <div className="activity-photo"><Photo index={activity.photo} /><span className="category"><i />{activity.category}</span></div>
      <div className="activity-body"><time>{formatDate(activity.date)}</time><h3>{activity.title}</h3><p>{activity.summary}</p><span className="card-link">Baca cerita <b aria-hidden="true">↗</b></span></div>
    </article>
  </Link>;
}
