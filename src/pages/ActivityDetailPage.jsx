import { Link, useParams } from "react-router-dom";
import { Footer, Header, Photo, formatDate, waLink, WhatsAppIcon } from "../components";
import { content, detailCopy } from "../content";

export function ActivityDetailPage() {
  const { slug } = useParams();
  const activity = content.activities.find(item => item.slug === slug) ?? content.activities[0];
  return <><Header /><main className="detail-page"><div className="article-shell">
    <p className="breadcrumbs"><Link to="/">Beranda</Link> / <Link to="/kegiatan">Kegiatan</Link> / <b>{activity.title}</b></p><Link className="back-link" to="/kegiatan">← Kembali</Link>
    <div className="detail-meta"><time dateTime={activity.date}>{formatDate(activity.date)}</time><span>{activity.category}</span></div><h1>{activity.title}</h1><p className="byline">Penulis: <b>Tim TPS3R Mengger</b> · Lokasi: <b>Hanggar BSF RW 03</b></p>
    <figure className="hero-figure"><Photo index={activity.photo} className="detail-hero" alt={activity.title} /><figcaption>Pemeriksaan bobot larva Maggot BSF siap panen pada siklus ke-24 di Hanggar TPS3R Mengger.</figcaption></figure>
    <article className="detail-copy"><p>{detailCopy[0]}</p><p>{detailCopy[1]}</p><blockquote>“Siklus ke-24 ini membuktikan sampah organik bukan lagi beban, melainkan pakan alternatif bernilai ekonomi bagi warga Mengger.”</blockquote><p>{detailCopy[2]}</p></article>
    <section className="documentation"><div className="section-heading"><div><span className="kicker">DOKUMENTASI</span><h2>Dokumentasi Pendukung Kegiatan</h2></div></div><div className="gallery">{[2,4].map(index => <Photo index={index} key={index} />)}</div></section>
    <aside className="article-cta"><div><h2>Tertarik hasil maggot & kasgot?</h2><p>Pesan produk hasil pengolahan atau ajukan kunjungan edukasi ke Hanggar Mengger.</p></div><a className="button" href={waLink()} target="_blank" rel="noreferrer"><WhatsAppIcon /> Pesan via WhatsApp</a></aside>
  </div></main><Footer /></>;
}
