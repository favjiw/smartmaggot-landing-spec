"use client";

import { useState } from "react";
import NextLink from "next/link";
import { ActivityCard, Footer, Header } from "../components";
import { usePublicData } from "../api";

export function ActivitiesPage() {
  const { activities } = usePublicData();
  const [category, setCategory] = useState("Semua");
  const categories = ["Semua", ...new Set(activities.map((activity) => activity.category).filter(Boolean))];
  const visible = category === "Semua" ? activities : activities.filter((activity) => activity.category === category);
  return <><Header /><main className="activities-page"><div className="container">
    <p className="breadcrumbs"><NextLink href="/">Beranda</NextLink> / <b>Kegiatan</b></p><NextLink className="back-link" href="/">← Kembali</NextLink>
    <header className="page-heading"><span className="kicker">DOKUMENTASI</span><h1>Kegiatan Garda Hijau</h1><p>Catatan operasional biokonversi dan aksi sirkular warga Kelurahan Mengger.</p></header>
    {categories.length > 2 && <div className="filters" role="group" aria-label="Kategori kegiatan">{categories.map((item) => <button type="button" key={item} className={item === category ? "active" : ""} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div>}
    <div className="activity-grid">{visible.map(a => <ActivityCard activity={a} key={a.slug} />)}</div>
    {!activities.length && <p className="catalog-empty">Belum ada kegiatan yang dipublikasikan.</p>}
  </div></main><Footer /></>;
}
