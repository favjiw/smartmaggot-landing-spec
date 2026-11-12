"use client";

import { useEffect, useId, useState } from "react";
import { apiFetch, uploadPhotos } from "../api";
import { formatPrice } from "../components";

function NavLink({ to, end = false, children, className = "" }) {
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const active = end ? pathname === to : pathname.startsWith(to);
  return <a href={to} className={`${className} ${active ? "active" : ""}`.trim()}>{children}</a>;
}

const navItems = [["/admin", "home", "Ringkasan"], ["/admin/produk", "box", "Produk"], ["/admin/stok", "arrows", "Stok"], ["/admin/kegiatan", "calendar", "Kegiatan"], ["/admin/pengaturan", "settings", "Pengaturan"]];
function Icon({ name, size = 20 }) {
  const paths = { home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>, box: <><path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Z"/><path d="m3.3 7.6 8.7 4.7 8.7-4.7M12 12.3V21"/></>, arrows: <><path d="M12 3v18M7 8l5-5 5 5M17 16l-5 5-5-5"/></>, calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>, settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z"/></>, edit: <><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z"/><path d="m13.8 6.7 3.5 3.5M12 21h9"/></>, stock: <><path d="M4 7h16M4 12h16M4 17h16"/><path d="m8 4-4 3 4 3M16 14l4 3-4 3"/></>, logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></> };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
const dateTime = (value) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const stockClass = (status) => status === "Habis" ? "danger" : status === "Menipis" ? "warning" : "success";

function useLoad(path, seed = null) {
  const [data, setData] = useState(seed);
  const [error, setError] = useState("");
  const load = () => apiFetch(path).then(setData).catch((err) => setError(err.message));
  useEffect(() => {
    void apiFetch(path).then(setData).catch((err) => setError(err.message));
  }, [path]);
  return { data, error, reload: load };
}

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setError("");
    try {
      const result = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("gardahijau_admin_token", result.token);
      localStorage.setItem("gardahijau_admin_user", JSON.stringify(result.user));
      window.location.assign("/admin");
    } catch (err) { setError(err.message); }
  };
  return <main className="admin-login"><form onSubmit={submit} className="login-card"><div className="admin-logo"><img className="admin-logo-image" src="/assets/logos/garda-hijau.png" alt="" /><b>Garda Hijau</b></div><h1>Masuk ke ruang pengelola</h1><p>Kelola stok dan konten situs publik dalam satu tempat.</p>{error && <div className="form-alert error">{error}</div>}<label>Email<input type="email" autoComplete="username" placeholder="Ketik email admin" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Kata sandi<input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><button className="admin-button" type="submit">Masuk</button><a href="/">← Kembali ke situs publik</a></form></main>;
}

function Shell({ children, title }) {
  const user = JSON.parse(localStorage.getItem("gardahijau_admin_user") ?? "null");
  const logout = () => { localStorage.removeItem("gardahijau_admin_token"); localStorage.removeItem("gardahijau_admin_user"); window.location.assign("/admin/login"); };
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <a className="admin-logo" href="/"><img className="admin-logo-image" src="/assets/logos/garda-hijau.png" alt="" /><b>Garda Hijau</b></a>
      <nav aria-label="Menu pengelola">{navItems.map(([to, icon, label]) => <NavLink key={to} end={to === "/admin"} to={to}><span aria-hidden="true"><Icon name={icon} size={19} /></span>{label}</NavLink>)}</nav>
      <div className="admin-account"><small>Masuk sebagai</small><b>{user?.name ?? "Pengelola Katalog"}</b><span>{user?.email}</span><button onClick={logout}><Icon name="logout" size={16} /> Keluar dari akun</button></div>
    </aside>
    <div className="admin-workspace"><header className="admin-topbar"><div><small>Ruang pengelola</small><h1>{title}</h1></div><div className="topbar-actions"><a className="admin-user-chip" href="/admin/pengaturan"><span className="avatar" aria-hidden="true">{user?.name?.[0] ?? "P"}</span><span><b>{user?.name ?? "Pengelola"}</b><small>{user?.email}</small></span></a><button className="mobile-logout" onClick={logout}><Icon name="logout" size={17} /><span>Keluar</span></button></div></header>{children}</div>
  </div>;
}

function Dashboard() {
  const { data, error } = useLoad("/admin/dashboard", { products: [], movements: [], chart: [] });
  const products = data?.products ?? [];
  const totalStock = products.reduce((sum, item) => sum + Number(item.stock), 0);
  const low = products.filter((item) => item.stock_status !== "Tersedia").length;
  return <Shell title="Ringkasan"><main className="admin-main">
    <div className="admin-welcome"><div><span>Gudang mitra</span><h2>Sinergi Garda Hijau Mengger</h2><p>Stok dan katalog diperbarui otomatis dari setiap catatan masuk dan keluar.</p></div><NavLink className="admin-button" to="/admin/stok">＋ Catat stok</NavLink></div>
    {error && <div className="form-alert error" role="alert">{error}</div>}
    <section className="stat-grid" aria-label="Ringkasan gudang"><Stat label="Produk" value={products.length} note={`${products.filter((p) => p.is_visible).length} tampil di katalog`} /><Stat label="Total stok" value={`${new Intl.NumberFormat("id-ID").format(totalStock)} kg`} note="semua produk" /><Stat label="Perlu diperiksa" value={low} note="stok menipis atau habis" tone="warning" /><Stat label="Catatan terbaru" value={data?.movements?.length ?? 0} note="pergerakan stok" /></section>
    <StockChart data={data?.chart ?? []} />
    <div className="dashboard-grid"><section className="admin-panel"><PanelTitle title="Stok produk" subtitle="Jumlah yang tersedia saat ini" action={<NavLink to="/admin/produk">Lihat produk</NavLink>} /><ProductTable products={products} compact /></section><section className="admin-panel"><PanelTitle title="Pergerakan terbaru" action={<NavLink to="/admin/stok">Lihat riwayat</NavLink>} /><div className="movement-list">{data?.movements?.map((item) => <div key={item.id}><span className={`move-icon ${item.type.toLowerCase()}`} aria-hidden="true">{item.quantity > 0 ? "↓" : item.type === "KELUAR" ? "↑" : "≋"}</span><p><b>{item.product_name}</b><small>{item.note || item.type} · {dateTime(item.created_at)}</small></p><strong className={item.quantity < 0 ? "red" : "green"}>{item.quantity > 0 ? "+" : ""}{item.quantity} {item.unit}</strong></div>)}</div>{!data?.movements?.length && <Empty text="Belum ada pergerakan stok." />}</section></div>
    <ImpactEditor />
  </main></Shell>;
}

function StockChart({ data }) {
  const max = Math.max(1, ...data.flatMap((item) => [Number(item.incoming), Number(item.outgoing)]));
  return <section className="admin-panel stock-chart"><PanelTitle title="Pergerakan 7 hari terakhir" subtitle="Perbandingan stok masuk dan stok keluar per hari" action={<div className="chart-legend"><span><i className="incoming" />Masuk</span><span><i className="outgoing" />Keluar</span></div>} /><div className="chart-plot">{data.map((item) => {
    const label = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(`${item.day}T00:00:00`));
    return <div className="chart-day" key={item.day} aria-label={`${label}: masuk ${item.incoming} kilogram, keluar ${item.outgoing} kilogram`}><div className="chart-bars"><span className="chart-bar incoming" style={{ height: `${Math.max(4, Number(item.incoming) / max * 100)}%` }}><b>{Number(item.incoming) || ""}</b></span><span className="chart-bar outgoing" style={{ height: `${Math.max(4, Number(item.outgoing) / max * 100)}%` }}><b>{Number(item.outgoing) || ""}</b></span></div><small>{label}</small></div>;
  })}</div></section>;
}

function ImpactEditor() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    apiFetch("/public/ringkasan").then((value) => setForm({ totalWasteKg: value.totalSampahKg, processingCount: value.jumlahPencacahan, cycleCount: value.jumlahSiklus, harvestCycleCount: value.jumlahSiklusPanen })).catch(() => {});
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    try {
      await apiFetch("/admin/impact", { method: "PUT", body: JSON.stringify(form) });
      setMessage("Angka dampak di landing page sudah diperbarui.");
    } catch (err) { setMessage(err.message); }
  };
  if (!form) return null;
  return <form className="admin-panel impact-editor" onSubmit={submit}><PanelTitle title="Dampak di landing page" subtitle="Cadangan untuk landing page. Jika API aplikasi Garda Hijau tersambung, angka dari aplikasi yang ditampilkan." /><div className="form-grid"><label>Total sampah tereduksi (kg)<input type="number" min="0" step="0.1" value={form.totalWasteKg} onChange={(e) => setForm({ ...form, totalWasteKg: e.target.value })} /></label><label>Jumlah pencacahan<input type="number" min="0" value={form.processingCount} onChange={(e) => setForm({ ...form, processingCount: e.target.value })} /></label><label>Jumlah siklus<input type="number" min="0" value={form.cycleCount} onChange={(e) => setForm({ ...form, cycleCount: e.target.value })} /></label><label>Siklus panen<input type="number" min="0" value={form.harvestCycleCount} onChange={(e) => setForm({ ...form, harvestCycleCount: e.target.value })} /></label></div>{message && <div className={`form-alert ${message.includes("diperbarui") ? "success-bg" : "error"}`}>{message}</div>}<div className="form-actions"><button className="admin-button">Simpan Dampak</button></div></form>;
}

function Stat({ label, value, note, tone = "" }) { return <article className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function PanelTitle({ title, subtitle, action }) { return <header className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>; }

function ProductTable({ products, compact = false, onEdit, onStock }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Produk</th><th>Harga</th><th>Stok</th><th>Status katalog</th>{!compact && <th>Aksi</th>}</tr></thead><tbody>{products.map((item) => <tr key={item.id}><td><div className="product-cell"><img src={item.photo_url || "/assets/activities/panen.webp"} alt="" /><span><b>{item.name}</b><small>Diperbarui {new Date(item.updated_at).toLocaleDateString("id-ID")}</small></span></div></td><td>{item.price ? `Rp ${formatPrice(item.price)} / ${item.unit}` : <b className="green">Tanya harga</b>}</td><td><b className={item.stock <= 0 ? "red" : ""}>{Number(item.stock).toLocaleString("id-ID")} {item.unit}</b><small className={`pill ${stockClass(item.stock_status)}`}>{item.stock_status}</small></td><td><span className={`pill ${item.is_visible ? "success" : "neutral"}`}>{item.is_visible ? "Tampil" : "Tersembunyi"}</span></td>{!compact && <td className="row-actions"><button className="text-button action-edit" onClick={() => onEdit(item)}><Icon name="edit" size={16} />Ubah</button><button className="text-button action-stock" onClick={() => onStock(item)}><Icon name="stock" size={16} />Atur stok</button></td>}</tr>)}</tbody></table>{!products.length && <Empty text="Belum ada produk." />}</div>;
}

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_PHOTO_SIDE = 1600;
const MAX_PHOTOS_PER_UPLOAD = 10;
const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

// Foto kamera HP biasanya 3–10 MB. Perkecil ke sisi terpanjang 1600 px dan kompres
// supaya lolos batas 2 MB server dan cepat dimuat di landing page.
async function compressPhoto(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error(`"${file.name}" tidak bisa dibaca. Gunakan foto JPG, PNG, atau WebP.`); }
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 500 * 1024 && UPLOAD_TYPES.includes(file.type)) { bitmap.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff"; // latar putih untuk PNG transparan
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.82, 0.7, 0.55]) {
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob?.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", quality); // Safari lama tidak bisa membuat WebP
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      const extension = blob.type === "image/webp" ? "webp" : "jpg";
      return new File([blob], `${file.name.replace(/.[^.]+$/, "") || "foto"}.${extension}`, { type: blob.type });
    }
  }
  throw new Error(`"${file.name}" masih terlalu besar setelah dikompres. Coba foto lain.`);
}

function PhotoUploader({ value = [], onChange, onBusyChange, multiple = false, label = "Foto" }) {
  const inputId = useId();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const busy = Boolean(status);
  const setBusy = (next) => { setStatus(next); onBusyChange?.(Boolean(next)); };
  const select = async (event) => {
    const input = event.target;
    const files = Array.from(input.files ?? []);
    input.value = ""; // supaya foto yang sama bisa dipilih lagi
    if (!files.length) return;
    setError("");
    if (multiple && files.length > MAX_PHOTOS_PER_UPLOAD) { setError(`Pilih maksimal ${MAX_PHOTOS_PER_UPLOAD} foto sekaligus.`); return; }
    try {
      setBusy("Menyiapkan foto…");
      const prepared = await Promise.all((multiple ? files : files.slice(0, 1)).map(compressPhoto));
      setBusy("Sedang mengunggah…");
      const urls = (await uploadPhotos(prepared)).map((item) => item.url);
      // Pakai updater supaya tidak menimpa isian form yang diubah selama upload berjalan.
      onChange(multiple ? (current = []) => [...current, ...urls] : urls[0]);
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  };
  const remove = (url) => onChange(multiple ? (current = []) => current.filter((item) => item !== url) : "");
  return <div className="photo-uploader"><span className="field-label">{label}</span><label className={`photo-drop ${busy ? "busy" : ""}`} htmlFor={inputId} aria-busy={busy}><input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} onChange={select} disabled={busy} /><span className="upload-icon" aria-hidden="true">▧</span><b>{status || (values.length ? (multiple ? "Tambah foto lain" : "Ganti foto") : "Pilih foto dari HP")}</b><small>Tekan di sini untuk membuka kamera atau galeri. Foto besar otomatis diperkecil.</small></label>{error && <p className="upload-error" role="alert">{error}</p>}{values.length > 0 && <div className="photo-preview-list">{values.map((url) => <figure key={url}><img src={url} alt="Pratinjau foto yang dipilih" /><button type="button" onClick={() => remove(url)} aria-label="Hapus foto" disabled={busy}>×</button></figure>)}</div>}</div>;
}

const emptyProduct = { name: "", description: "", price: "", unit: "kg", photoUrl: "", lowStockThreshold: 5, isVisible: true };
function Products() {
  const { data: products = [], error, reload } = useLoad("/admin/products", []);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const closeForm = () => { setEditing(null); setForm(emptyProduct); setFormOpen(false); };
  const edit = (item) => { setEditing(item); setForm({ name: item.name, description: item.description, price: item.price ?? "", unit: item.unit, photoUrl: item.photo_url ?? "", lowStockThreshold: item.low_stock_threshold, isVisible: item.is_visible }); setFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async (event) => { event.preventDefault(); setMessage(""); try { await apiFetch(editing ? `/admin/products/${editing.id}` : "/admin/products", { method: editing ? "PATCH" : "POST", body: JSON.stringify(form) }); setMessage("Produk berhasil disimpan dan katalog sudah diperbarui."); closeForm(); reload(); } catch (err) { setMessage(err.message); } };
  return <Shell title="Produk"><main className="admin-main"><PageHeading title="Produk" subtitle="Atur barang yang dapat dilihat dan dipesan warga." action="＋ Tambah produk" onAction={() => { setEditing(null); setForm(emptyProduct); setFormOpen(true); }} />
    {(error || message) && <div className={`form-alert ${message.includes("berhasil") ? "success-bg" : "error"}`} role="status">{error || message}</div>}
    {formOpen && <form className="admin-panel product-form friendly-form" onSubmit={submit}><PanelTitle title={editing ? `Ubah ${editing.name}` : "Tambah produk baru"} subtitle="Isi informasi yang akan dilihat pembeli di halaman utama." /><div className="form-grid"><label>Nama produk <span className="required">Wajib</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Maggot segar" required /></label><label>Harga jual (rupiah)<input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Kosongkan jika harga belum pasti" /><small>Jika kosong, pembeli akan melihat tulisan “Tanya harga”.</small></label><label className="wide">Keterangan singkat <span className="required">Wajib</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan kegunaan produk dengan bahasa sederhana." required /></label><div className="wide"><PhotoUploader value={form.photoUrl} onChange={(photoUrl) => setForm((current) => ({ ...current, photoUrl }))} onBusyChange={setUploading} label="Foto produk" /></div><label>Satuan penjualan<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}><option value="kg">Kilogram (kg)</option><option value="karung">Karung</option><option value="kemasan">Kemasan</option></select></label><label>Peringatan stok menipis<input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /><small>Peringatan muncul saat stok mencapai jumlah ini.</small></label><label className="check wide"><input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} /><span><b>Tampilkan di katalog</b><small>Matikan jika produk sedang tidak dijual.</small></span></label></div><div className="form-actions"><button type="button" className="button-secondary" onClick={closeForm}>Batal</button><button className="admin-button" disabled={uploading}>{uploading ? "Menunggu foto…" : editing ? "Simpan perubahan" : "Tambahkan produk"}</button></div></form>}
    <section className="admin-panel table-panel"><PanelTitle title="Daftar produk" subtitle={`${products.length} produk tersimpan`} /><ProductTable products={products} onEdit={edit} onStock={(item) => location.assign(`/admin/stok?produk=${item.id}`)} /></section>
  </main></Shell>;
}

function Stock() {
  const { data: products = [], reload } = useLoad("/admin/products", []);
  const initial = new URLSearchParams(location.search).get("produk");
  const [productId, setProductId] = useState(initial ?? ""); const [detail, setDetail] = useState(null); const [form, setForm] = useState({ type: "MASUK", quantity: "", note: "" }); const [message, setMessage] = useState("");
  useEffect(() => { if (productId) apiFetch(`/admin/products/${productId}/stock`).then(setDetail).catch((err) => setMessage(err.message)); }, [productId]);
  const submit = async (event) => { event.preventDefault(); try { await apiFetch(`/admin/products/${productId}/stock`, { method: "POST", body: JSON.stringify(form) }); setMessage("Pergerakan stok berhasil dicatat."); setForm({ ...form, quantity: "", note: "" }); const next = await apiFetch(`/admin/products/${productId}/stock`); setDetail(next); reload(); } catch (err) { setMessage(err.message); } };
  return <Shell title="Riwayat Stok"><main className="admin-main"><PageHeading title="Riwayat Stok" subtitle="Setiap perubahan stok tercatat permanen untuk akuntabilitas operasional." /><section className="admin-panel stock-form"><label>Pilih produk<select value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Pilih produk...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.stock} {p.unit}</option>)}</select></label>{detail && <><div className="stock-now"><span>Stok saat ini</span><strong>{Number(detail.product.stock).toLocaleString("id-ID")} <small>{detail.product.unit}</small></strong><em className={`pill ${stockClass(detail.product.stock_status)}`}>{detail.product.stock_status}</em></div><form onSubmit={submit}><h2>Catat Pergerakan Stok</h2><div className="movement-types">{[["MASUK","↓","Panen / Pasokan"],["KELUAR","↑","Penjualan / Pakan"],["PENYESUAIAN","≋","Koreksi opname"]].map(([type, icon, desc]) => <label className={form.type === type ? "active" : ""} key={type}><input type="radio" name="type" value={type} checked={form.type === type} onChange={(e) => setForm({ ...form, type: e.target.value })} /><b>{icon} {type[0] + type.slice(1).toLowerCase()}</b><small>{desc}</small></label>)}</div><label>Jumlah ({detail.product.unit})<input type="number" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></label><label>Keterangan<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Contoh: Penjualan ke peternak RW 3" /></label><button className="admin-button full">⊕ Catat Pergerakan</button></form>{message && <div className={`form-alert ${message.includes("berhasil") ? "success-bg" : "error"}`}>{message}</div>}</>}</section>{detail && <section className="admin-panel table-panel"><PanelTitle title="Riwayat Pergerakan" subtitle={`${detail.movements.length} catatan`} /><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Waktu</th><th>Tipe</th><th>Jumlah</th><th>Keterangan</th><th>Oleh</th></tr></thead><tbody>{detail.movements.map((item) => <tr key={item.id}><td>{dateTime(item.created_at)}</td><td><span className="pill neutral">{item.type}</span></td><td><b className={item.quantity < 0 ? "red" : "green"}>{item.quantity > 0 ? "+" : ""}{Number(item.quantity).toLocaleString("id-ID")} {detail.product.unit}</b></td><td>{item.note || "—"}</td><td>{item.created_by_name || "Sistem"}</td></tr>)}</tbody></table></div></section>}</main></Shell>;
}

const emptyActivity = { title: "", category: "Kegiatan Warga", activityDate: "", summary: "", content: "", photos: [], isPublished: true };
function ActivitiesAdmin() {
  const { data: activities = [], reload } = useLoad("/admin/activities", []); const [editing, setEditing] = useState(null); const [formOpen, setFormOpen] = useState(false); const [form, setForm] = useState(emptyActivity); const [message, setMessage] = useState(""); const [uploading, setUploading] = useState(false);
  const edit = (item) => { setEditing(item); setForm({ title: item.title, category: item.category, activityDate: String(item.activity_date).slice(0,10), summary: item.summary, content: item.content, photos: item.photos, isPublished: item.is_published }); setFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const closeForm = () => { setForm(emptyActivity); setEditing(null); setFormOpen(false); };
  const submit = async (event) => { event.preventDefault(); try { await apiFetch(editing ? `/admin/activities/${editing.id}` : "/admin/activities", { method: editing ? "PATCH" : "POST", body: JSON.stringify(form) }); setMessage("Kegiatan berhasil disimpan."); closeForm(); reload(); } catch (err) { setMessage(err.message); } };
  const remove = async (item) => { if (!confirm(`Hapus “${item.title}”?`)) return; await apiFetch(`/admin/activities/${item.id}`, { method: "DELETE" }); reload(); };
  return <Shell title="Kegiatan"><main className="admin-main"><PageHeading title="Kegiatan" subtitle="Bagikan cerita panen, pelatihan, dan kegiatan warga." action="＋ Tambah kegiatan" onAction={() => { setEditing(null); setForm(emptyActivity); setFormOpen(true); }} />{message && <div className="form-alert success-bg" role="status">{message}</div>}{formOpen && <form className="admin-panel activity-form friendly-form" onSubmit={submit}><PanelTitle title={editing ? `Ubah ${editing.title}` : "Ceritakan kegiatan baru"} subtitle="Tuliskan seperti sedang bercerita kepada warga." /><div className="form-grid"><label className="wide">Judul kegiatan <span className="required">Wajib</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Panen maggot bersama warga RW 03" required /></label><label>Tanggal kegiatan <span className="required">Wajib</span><input type="date" value={form.activityDate} onChange={(e) => setForm({ ...form, activityDate: e.target.value })} required /></label><label>Jenis kegiatan<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Contoh: Panen dan produksi" /></label><label className="wide">Ringkasan singkat <span className="required">Wajib</span><textarea maxLength="200" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Satu atau dua kalimat tentang kegiatan ini." required /></label><label className="wide">Cerita lengkap <span className="required">Wajib</span><textarea className="tall" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Ceritakan siapa yang terlibat, apa yang dilakukan, dan hasilnya." required /></label><div className="wide"><PhotoUploader value={form.photos} multiple onChange={(next) => setForm((current) => ({ ...current, photos: typeof next === "function" ? next(current.photos) : next }))} onBusyChange={setUploading} label="Foto dokumentasi" /></div><label className="check wide"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /><span><b>Tampilkan di situs</b><small>Jika dimatikan, kegiatan disimpan sebagai draf.</small></span></label></div><div className="form-actions"><button type="button" className="button-secondary" onClick={closeForm}>Batal</button><button className="admin-button" disabled={uploading}>{uploading ? "Menunggu foto…" : editing ? "Simpan perubahan" : "Terbitkan kegiatan"}</button></div></form>}
    <section className="admin-panel table-panel"><PanelTitle title="Daftar kegiatan" subtitle={`${activities.length} kegiatan tersimpan`} /><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Kegiatan</th><th>Tanggal</th><th>Foto</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{activities.map((item) => <tr key={item.id}><td><b>{item.title}</b><small>/{item.slug}</small></td><td>{new Date(item.activity_date).toLocaleDateString("id-ID")}</td><td>{item.photos.length} foto</td><td><span className={`pill ${item.is_published ? "success" : "neutral"}`}>{item.is_published ? "Terbit" : "Draf"}</span></td><td><button className="text-button" onClick={() => edit(item)}>Ubah</button><button className="text-button red" onClick={() => remove(item)}>Hapus</button></td></tr>)}</tbody></table></div></section>
  </main></Shell>;
}

function Settings() {
  const { data, error } = useLoad("/admin/settings"); const [form, setForm] = useState(null); const [message, setMessage] = useState("");
  const user = JSON.parse(localStorage.getItem("gardahijau_admin_user") ?? "null");
  useEffect(() => { if (data) setForm({ partnerName: data.partner_name, whatsapp: data.whatsapp, email: data.email ?? "", address: data.address, operationalHours: data.operational_hours, description: data.description, showCatalog: data.show_catalog, showStockStatus: data.show_stock_status, defaultUnit: data.default_unit }); }, [data]);
  const submit = async (event) => { event.preventDefault(); try { await apiFetch("/admin/settings", { method: "PUT", body: JSON.stringify(form) }); setMessage("Perubahan tersimpan dan langsung tersedia untuk situs publik."); } catch (err) { setMessage(err.message); } };
  return <Shell title="Pengaturan"><main className="admin-main narrow"><PageHeading title="Pengaturan" subtitle="Atur identitas, kontak, dan tampilan katalog." />{error && <div className="form-alert error" role="alert">{error}</div>}
    <section className="admin-panel profile-card"><img src="/assets/logos/garda-hijau.png" alt="Logo Garda Hijau" /><div><span>Akun pengelola</span><h2>{user?.name ?? "Pengelola Katalog"}</h2><p>{user?.email ?? "Email belum tersedia"}</p></div><span className="pill success">Aktif</span></section>
    {form && <form onSubmit={submit}><div className="notice">ⓘ Perubahan di bawah akan tampil di situs setelah disimpan.</div><section className="admin-panel settings-card"><PanelTitle title="Kontak yang dapat dihubungi" subtitle="Dipakai pembeli saat menekan tombol pesan." /><label>Nomor WhatsApp<input inputMode="numeric" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "") })} /><small>Gunakan kode negara 62, tanpa tanda +. Contoh: 628123456789.</small></label><label>Email publik<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="kontak@gardahijau.com" /><small>Email ini boleh dilihat pengunjung situs.</small></label></section><section className="admin-panel settings-card"><PanelTitle title="Profil Garda Hijau" subtitle="Informasi yang membantu warga mengenali tempat ini." /><label>Nama mitra<input value={form.partnerName} onChange={(e) => setForm({ ...form, partnerName: e.target.value })} /></label><label>Alamat lengkap<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><label>Jam buka<input value={form.operationalHours} onChange={(e) => setForm({ ...form, operationalHours: e.target.value })} /></label><label>Deskripsi singkat<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label></section><section className="admin-panel settings-card"><PanelTitle title="Tampilan katalog" /><label className="toggle-row"><span><b>Tampilkan katalog</b><small>Produk dapat dilihat oleh pengunjung.</small></span><input type="checkbox" checked={form.showCatalog} onChange={(e) => setForm({ ...form, showCatalog: e.target.checked })} /></label><label className="toggle-row"><span><b>Tampilkan status stok</b><small>Pengunjung dapat melihat Tersedia, Menipis, atau Habis.</small></span><input type="checkbox" checked={form.showStockStatus} onChange={(e) => setForm({ ...form, showStockStatus: e.target.checked })} /></label></section>{message && <div className={`form-alert ${message.includes("tersimpan") ? "success-bg" : "error"}`} role="status">{message}</div>}<div className="sticky-save"><span>Pastikan nomor WhatsApp sudah benar.</span><button className="admin-button">Simpan pengaturan</button></div></form>}
  </main></Shell>;
}

function PageHeading({ title, subtitle, action, onAction }) { return <header className="admin-page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{action && <button className="admin-button" onClick={onAction}>{action}</button>}</header>; }
function Empty({ text }) { return <div className="admin-empty"><b>{text}</b><span>Tambahkan data baru untuk mulai mengelola konten.</span></div>; }

export function AdminPage({ section = "" }) {
  const [session, setSession] = useState({ ready: false, token: null });
  useEffect(() => setSession({ ready: true, token: localStorage.getItem("gardahijau_admin_token") }), []);
  if (!session.ready) return null;
  if (section === "login") return session.token ? <Dashboard /> : <Login />;
  if (!session.token) {
    window.location.replace("/admin/login");
    return null;
  }
  if (section === "produk") return <Products />;
  if (section === "stok") return <Stock />;
  if (section === "kegiatan") return <ActivitiesAdmin />;
  if (section === "pengaturan") return <Settings />;
  return <Dashboard />;
}
