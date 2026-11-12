import { Link, useParams } from "react-router-dom";
import { Footer, Header, Photo, formatDate } from "../components";
import { content, detailCopy } from "../content";

export function ActivityDetailPage() {
  const { slug } = useParams();
  const activity = content.activities.find(item => item.slug === slug) ?? content.activities[0];
  return <><Header /><main className="detail-page"><div className="container"><p className="breadcrumbs">Beranda / Kegiatan / <b>{activity.title}</b></p><div className="detail-meta"><span>{activity.category}</span><time>▣ {formatDate(activity.date)}</time></div><h1>{activity.title}</h1><Photo index={activity.photo} className="detail-hero" /><div className="detail-stats"><div><b>142 kg</b><span>Larva Segar</span></div><div><b>680 kg</b><span>Sampah Terurai</span></div></div><article className="detail-copy"><p>{detailCopy[0]}</p><blockquote>“Kemandirian pakan ternak dan pengurangan sampah dapur di Mengger bukan lagi teori, ini bukti nyata gotong royong warga.”<small>— Tim Pengelola Hanggar Mengger</small></blockquote><p>{detailCopy[1]}</p><p>{detailCopy[2]}</p></article><div className="documentation"><div className="section-heading"><h2>Dokumentasi Terkait</h2><span>3 Foto Lapangan</span></div><div>{[0,4,5].map(index => <Photo index={index} key={index} />)}</div></div><Link className="button button-outline back" to="/kegiatan">← Kembali ke daftar kegiatan</Link></div></main><Footer /></>;
}
