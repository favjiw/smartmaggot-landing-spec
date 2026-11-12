"use client";

import NextLink from "next/link";
import { ActivityCard, Footer, Header, Photo, WhatsAppIcon, formatPrice, productMessage, useWaLink } from "../components";
import { usePublicData } from "../api";

const Link = ({ to, ...props }) => <NextLink href={to} {...props} />;

export function HomePage() {
  const publicData = usePublicData();
  const { impact } = publicData;
  const wa = useWaLink();
  const products = publicData.settings?.show_catalog === false ? [] : publicData.products;
  const activities = publicData.activities;
  const number = (value) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
  return <><Header /><main>
    <section className="hero"><div className="container hero-grid"><div className="hero-copy"><span className="kicker">Kelurahan Mengger, Kota Bandung</span><h1>Sinergi Garda Hijau Mengger</h1><p>Garda Hijau Mengger mengolah sampah organik melalui budidaya maggot BSF, lalu mengembalikannya sebagai pakan dan pupuk untuk lingkungan sekitar.</p><div className="hero-actions"><Link className="button" to="/profil">Kenali gerakan kami</Link><a className="button button-outline" href={wa()} target="_blank" rel="noreferrer">Hubungi pengelola</a></div></div><figure className="hero-visual"><Photo src="/assets/rumah-maggot-mengger.jpeg" alt="Rumah Maggot Kelurahan Mengger" /></figure></div></section>
    {impact && <section className="impact-strip" aria-label="Dampak program"><div className="container impact-inner"><p>Dampak yang Sudah Tercatat</p><div><strong>{number(impact.totalSampahKg)} kg</strong><span>Sampah Organik Diolah</span></div><div><strong>{number(impact.jumlahSiklus)} Siklus</strong><span>Budidaya Maggot</span></div></div></section>}
    <section className="products section" id="produk"><div className="container"><div className="section-heading"><div><span className="kicker">HASIL OLAHAN WARGA</span><h2>Katalog Produk Hasil Olahan</h2></div><p>Pesan langsung ke pengelola melalui WhatsApp.</p></div><div className="product-grid">{products.map(product => <article className="product-card" key={product.id}><Photo index={product.photo} src={product.photo_url} alt={product.name} /><div className="product-info">{publicData.settings?.show_stock_status !== false && <span className={product.stock_status === "Tersedia" ? "status" : "status preorder"}>{product.stock_status ?? product.status}</span>}<h3>{product.name}</h3><p>{product.description}</p><strong>{product.price ? <>Rp {formatPrice(product.price)} <small>/ {product.unit}</small></> : "Tanya harga"}</strong><a className="button" href={wa(productMessage(product))} target="_blank" rel="noreferrer"><WhatsAppIcon /> Pesan via WhatsApp</a></div></article>)}</div>{!products.length && <p className="catalog-empty">Katalog sedang diperbarui. Hubungi pengelola untuk menanyakan produk.</p>}</div></section>
    <section className="latest section"><div className="container"><div className="section-heading"><div><span className="kicker">DOKUMENTASI</span><h2>Kegiatan Terbaru</h2></div><Link to="/kegiatan">Lihat semua kegiatan →</Link></div><div className="activity-grid">{activities.slice(0,3).map(a => <ActivityCard activity={a} compact key={a.slug} />)}</div></div></section>
  </main><Footer /></>;
}
