"use client";

import NextLink from "next/link";
import { Footer, Header, Photo, formatDate, useWaLink, WhatsAppIcon } from "../components";
import { detailCopy } from "../content";
import { usePublicData } from "../api";

const Link = ({ to, ...props }) => <NextLink href={to} {...props} />;

export function ActivityDetailPage({ slug }) {
  const { activities } = usePublicData();
  const wa = useWaLink();
  // Slug sudah divalidasi di server (404 jika tidak ada).
  const activity = activities.find(item => item.slug === slug) ?? activities[0];
  const activityDate = String(activity.activity_date ?? activity.date).slice(0, 10);
  const paragraphs = activity.content ? activity.content.split(/\n\s*\n/).filter(Boolean) : detailCopy;
  return <><Header /><main className="detail-page"><div className="article-shell">
    <p className="breadcrumbs"><Link to="/">Beranda</Link> / <Link to="/kegiatan">Kegiatan</Link> / <b>{activity.title}</b></p><Link className="back-link" to="/kegiatan">← Kembali</Link>
    <div className="detail-meta"><time dateTime={activityDate}>{formatDate(activityDate)}</time><span>{activity.category}</span></div><h1>{activity.title}</h1><p className="byline">Penulis: <b>Tim TPS3R Mengger</b> · Lokasi: <b>Hanggar BSF RW 03</b></p>
    <figure className="hero-figure"><Photo index={activity.photo} src={activity.photos?.[0]} className="detail-hero" alt={activity.title} /><figcaption>Dokumentasi kegiatan Sinergi Garda Hijau Mengger.</figcaption></figure>
    <article className="detail-copy">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>
    {activity.photos?.length > 1 && <section className="documentation"><div className="section-heading"><div><span className="kicker">DOKUMENTASI</span><h2>Dokumentasi Pendukung Kegiatan</h2></div></div><div className="gallery">{activity.photos.slice(1).map((src) => <Photo src={src} key={src} />)}</div></section>}
    <aside className="article-cta"><div><h2>Tertarik hasil maggot & kasgot?</h2><p>Pesan produk hasil pengolahan atau ajukan kunjungan edukasi ke Hanggar Mengger.</p></div><a className="button" href={wa()} target="_blank" rel="noreferrer"><WhatsAppIcon /> Pesan via WhatsApp</a></aside>
  </div></main><Footer /></>;
}
