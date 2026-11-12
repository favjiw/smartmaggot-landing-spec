"use client";

import { useState } from "react";
import Link from "next/link";
import { content } from "./content";
import { usePublicData } from "./api";

export const formatDate = (iso) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00`));
export const formatPrice = (value) => new Intl.NumberFormat("id-ID").format(value);
export const waLink = (message = "Halo, saya ingin bertanya tentang produk dan program Garda Hijau Mengger.", phone = content.whatsapp) => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

export function WhatsAppIcon() {
  return <img className="whatsapp-icon" src="/assets/logos/whatsapp.png" alt="" aria-hidden="true" />;
}

export function Photo({ index = 0, src, className = "", alt = "Dokumentasi kegiatan Garda Hijau Mengger" }) {
  const photos = ["panen", "pemilahan", "pelatihan", "sosialisasi", "kasgot", "kunjungan"];
  return <img className={`photo ${className}`} src={src || `/assets/activities/${photos[index]}.webp`} alt={alt} loading="lazy" />;
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { settings } = usePublicData();
  return <header className="site-header"><div className="header-inner">
    <Link href="/" className="brand" aria-label="Sinergi Garda Hijau, Kelurahan Mengger, beranda"><img className="brand-mark" src="/assets/logos/garda-hijau.png" alt="" /><span><b>Sinergi Garda Hijau</b><small>Kelurahan Mengger</small></span></Link>
    <nav className={menuOpen ? "open" : ""} aria-label="Navigasi utama"><Link onClick={() => setMenuOpen(false)} href="/profil">Profil</Link><a onClick={() => setMenuOpen(false)} href="/#produk">Produk</a><Link onClick={() => setMenuOpen(false)} href="/kegiatan">Kegiatan</Link><a onClick={() => setMenuOpen(false)} href="/#kontak">Kontak</a><a className="app-download" onClick={() => setMenuOpen(false)} href="https://github.com/favjiw/garda-hijau-mengger-mobile/releases/download/v1.1.0/garda-hijau-mengger-v1.1.0.apk" download><img src="/assets/logos/download-app.webp" alt="" aria-hidden="true" />Unduh aplikasi</a><Link className="mobile-menu-login" onClick={() => setMenuOpen(false)} href="/admin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0 17.9 17.9 0 0 1-7.5 1.65 17.9 17.9 0 0 1-7.5-1.65Z" /></svg>Login pengelola</Link></nav>
    <Link className="header-login" href="/admin" aria-label="Login admin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0 17.9 17.9 0 0 1-7.5 1.65 17.9 17.9 0 0 1-7.5-1.65Z" /></svg><span>Login</span></Link>
    <a className="button header-wa" href={waLink(undefined, settings?.whatsapp)} target="_blank" rel="noreferrer"><WhatsAppIcon /><span className="desktop-brand">Chat WA</span><span className="mobile-brand">WA</span></a>
    <button className="menu" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><span /><span /><span /></button>
  </div></header>;
}

export function Footer() {
  const { settings } = usePublicData();
  return <footer className="footer contact-footer" id="kontak"><div className="container">
    <div className="contact-grid"><div className="contact-copy"><h2>Hubungi Kami</h2><p><strong>Hanggar Maggot Mengger</strong><br />Kelurahan Mengger, Kota Bandung</p><a className="contact-wa" href={waLink(undefined, settings?.whatsapp)} target="_blank" rel="noreferrer"><WhatsAppIcon /> Chat via WhatsApp</a></div><div className="contact-map"><iframe src={content.mapsEmbedUrl} width="600" height="450" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" title="Lokasi Rumah Maggot Kelurahan Mengger" /></div></div>
    <div className="footer-info-grid"><div className="footer-identity"><div className="footer-identity-title"><span><img src="/assets/logos/garda-hijau.png" alt="Logo Sinergi Garda Hijau" /></span><strong>Sinergi Garda Hijau Mengger</strong></div><p>Pengelolaan sampah mandiri tingkat kelurahan menuju lingkungan yang lebih bersih melalui budidaya maggot.</p></div><div className="footer-service"><h2>Kontak posko &amp; layanan</h2><p><strong>Hanggar Maggot Kelurahan Mengger</strong><br />{settings?.address ?? content.address}</p></div><div className="footer-partners"><h2>Mitra kolaborasi</h2><ul><li>Kelurahan Mengger</li><li>DLH Kota Bandung</li><li>Petugas Gaslah Kelurahan</li><li>Forum RW 01–05 Mengger</li></ul></div></div>
    <div className="contact-copyright"><span>© 2026 Sinergi Garda Hijau Mengger. Hak cipta dilindungi.</span><span>Program berbasis pemberdayaan masyarakat</span></div>
  </div></footer>;
}

export function ActivityCard({ activity, compact = false }) {
  const activityDate = activity.activity_date ?? activity.date;
  return <Link className={`activity-card ${compact ? "compact" : ""}`} href={`/kegiatan/${activity.slug}`} aria-label={`Baca ${activity.title}`}><article>
    <div className="activity-photo"><Photo index={activity.photo} src={activity.photos?.[0]} alt={activity.title} /><span className="category">{activity.category}</span></div>
    <div className="activity-body"><time dateTime={activityDate}>{formatDate(String(activityDate).slice(0, 10))}</time><h3>{activity.title}</h3><p>{activity.summary}</p><span className="card-link">Baca selengkapnya <span aria-hidden="true">→</span></span></div>
  </article></Link>;
}
