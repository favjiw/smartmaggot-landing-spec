import { ActivityCard, Footer, Header, WhatsAppIcon, waLink } from "../components";
import { content } from "../content";

export function ActivitiesPage() {
  return <><Header /><main className="activities-page"><div className="container"><p className="breadcrumbs">Beranda / <b>Kegiatan</b></p><div className="activities-heading"><div><span>Kabar dari Mengger</span><h1>Kegiatan</h1></div><p>Dokumentasi kegiatan terbaru Sinergi Garda Hijau Mengger</p></div><div className="activity-grid">{content.activities.map(a => <ActivityCard activity={a} key={a.slug} />)}</div><aside className="action-banner"><span className="action-mark" aria-hidden="true">+</span><div><small>Kolaborasi warga</small><h2>Ingin mengadakan aksi bersama?</h2><p>Ceritakan gagasan kegiatan lingkunganmu. Tim Garda Hijau akan membantu merancang langkah pertamanya.</p></div><a className="button action-link" href={waLink("Halo, saya ingin mengusulkan kegiatan lingkungan bersama Garda Hijau Mengger.")} target="_blank" rel="noreferrer"><WhatsAppIcon /> Usulkan kegiatan</a></aside></div></main><Footer /></>;
}
