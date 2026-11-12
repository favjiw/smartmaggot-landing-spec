"use client";

import { ActivityCard, Footer, Header } from "../components";
import { content } from "../content";
import { usePublicData } from "../api";

export function ActivitiesPage() {
  const { activities } = usePublicData();
  return <><Header /><main className="activities-page"><div className="container">
    <p className="breadcrumbs"><a href="/">Beranda</a> / <b>Kegiatan</b></p><a className="back-link" href="/">← Kembali</a>
    <header className="page-heading"><span className="kicker">DOKUMENTASI</span><h1>Kegiatan Garda Hijau</h1><p>Catatan operasional biokonversi dan aksi sirkular warga Kelurahan Mengger.</p></header>
    <div className="filters" aria-label="Kategori kegiatan"><button className="active">Semua</button><button>Panen & Produksi</button><button>Sosialisasi Warga</button><button>Kunjungan</button></div>
    <div className="activity-grid">{activities.map(a => <ActivityCard activity={a} key={a.slug} />)}</div>
  </div></main><Footer /></>;
}
