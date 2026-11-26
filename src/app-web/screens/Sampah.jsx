"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { antrekan, JENIS, PESAN_TERSIMPAN_DI_HP, perluDiantrekan, useAntrean } from "../antrean";
import { api, pesanDari } from "../api";
import { ambilFoto, hapusFoto, kecilkanFoto, simpanFoto } from "../foto";
import { angkaTanggal, bacaAngka, bulanSingkat, formatKg, jam, nilaiInputJam, nilaiInputTanggal, parseServerDate, tanggalPanjang, tanggalSedang } from "../format";
import { useMuat } from "../hooks";
import { IconBell, IconChevron, IconJam, IconKalender, IconKeluar, IconKurang, IconTambah } from "../icons";
import { PILIHAN_RENTANG, rekapan } from "../rekapan";
import { useRequireAuth, useSession } from "../session";
import { BilahAtas, Dialog, GalatMuat, Isian, Layar, Memuat, PenandaAntrean, Tombol, TombolLink } from "../ui";

const awalHari = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dariInput = (v) => { const d = new Date(`${v}T00:00`); return Number.isNaN(d.getTime()) ? null : d; };

/** Grafik batang rekapan (WeeklyBarChartView): 7–31 batang; hari ini kuning terpal. */
function GrafikRekapan({ bars, highlight }) {
  const max = Math.max(...bars.map((b) => b.value), 0) || 1;
  let busiest = -1;
  bars.forEach((b, i) => { if (b.value > 0 && (busiest < 0 || b.value > bars[busiest].value)) busiest = i; });
  const n = bars.length;
  const gap = n > 20 ? 3 : n > 12 ? 5 : 10;
  // Rentang panjang: label ditampilkan berselang-seling supaya tidak bertumpuk.
  const langkahLabel = n <= 8 ? 1 : Math.ceil(n / 6);
  return (
    <div
      className={`ghm-grafik ${n > 12 ? "rapat" : ""}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: `${gap}px` }}
      role="img"
      aria-label={`Grafik sampah organik masuk: ${bars.map((b) => `${b.label} ${formatKg(b.value)} kilogram`).join(", ")}`}
    >
      {bars.map((b, i) => {
        const tinggi = b.value > 0 ? Math.max(6, (b.value / max) * 100) : 4;
        const kuat = i === highlight;
        const tampilLabel = n <= 8 || kuat || i === 0 || i === n - 1 || i % langkahLabel === 0;
        return (
          <div key={i} className={`kolom ${kuat ? "hari-ini" : ""} ${b.value <= 0 ? "kosong" : ""}`}>
            <span className="nilai">{b.value > 0 && (kuat || i === busiest) ? formatKg(b.value) : ""}</span>
            <span className="area"><span className="batang" style={{ height: `${tinggi}%` }} /></span>
            <span className="hari">{tampilLabel ? b.label : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SampahScreen() {
  const boleh = useRequireAuth();
  const { keluar } = useSession();
  const riwayat = useMuat(() => api("/pencacahan"), [], boleh);
  const notif = useMuat(() => api("/notifikasi"), [], boleh);
  // Antrean berkurang = ada data yang baru terkirim: muat ulang riwayat.
  const menunggu = useAntrean(() => riwayat.muat());
  const [rentang, setRentang] = useState({ jenis: "TUJUH_HARI", dari: null, sampai: null });
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const [sibukKeluar, setSibukKeluar] = useState(false);

  const items = useMemo(() => {
    const list = riwayat.data?.data || [];
    return [...list].sort((a, b) => (parseServerDate(b.tanggalWaktu)?.getTime() || 0) - (parseServerDate(a.tanggalWaktu)?.getTime() || 0));
  }, [riwayat.data]);
  const rekap = useMemo(() => rekapan(items, rentang), [items, rentang]);

  const pilihRentang = (jenis) => {
    if (jenis !== "KUSTOM") { setRentang({ jenis, dari: null, sampai: null }); return; }
    if (rentang.jenis === "KUSTOM") return;
    // Kustom dimulai dari rentang yang sedang tampil, lalu bisa diubah tanggalnya.
    setRentang({ jenis, dari: awalHari(rekap.awal), sampai: awalHari(rekap.akhir) });
  };
  const adaNotifBaru = (notif.data?.data || []).some((n) => !n.isRead);

  if (!boleh) return null;
  return (
    <Layar nav footer={<TombolLink href="/app/sampah/catat">Catat sampah organik</TombolLink>}>
      <header className="ghm-kepala">
        <div>
          <p className="ghm-kecil">Halo, pengelola</p>
          <h1 className="ghm-judul-layar">Rekapan sampah organik</h1>
        </div>
        <div className="ghm-kepala-aksi">
          <Link href="/app/notifikasi" className="ghm-bulat putih" aria-label={adaNotifBaru ? "Notifikasi, ada yang belum dibaca" : "Notifikasi"}>
            <IconBell />{adaNotifBaru && <span className="ghm-titik-baru" />}
          </Link>
          <button type="button" className="ghm-bulat putih" aria-label="Keluar dari akun" onClick={() => setKonfirmasiKeluar(true)}><IconKeluar /></button>
        </div>
      </header>

      <PenandaAntrean jumlah={menunggu} />

      <div className="ghm-chip-grup" role="radiogroup" aria-label="Rentang rekapan">
        {PILIHAN_RENTANG.map((p) => (
          <button key={p.jenis} type="button" role="radio" aria-checked={rentang.jenis === p.jenis} className={`ghm-chip ${rentang.jenis === p.jenis ? "dipilih" : ""}`} onClick={() => pilihRentang(p.jenis)}>
            {p.label}
          </button>
        ))}
      </div>
      {rentang.jenis === "KUSTOM" && (
        <div className="ghm-dua-kolom">
          <Isian label="Dari tanggal">
            {(attrs) => <input {...attrs} className="ghm-input" type="date" value={rentang.dari ? nilaiInputTanggal(rentang.dari) : ""} max={nilaiInputTanggal()} onChange={(e) => setRentang({ ...rentang, dari: dariInput(e.target.value) })} />}
          </Isian>
          <Isian label="Sampai tanggal">
            {(attrs) => <input {...attrs} className="ghm-input" type="date" value={rentang.sampai ? nilaiInputTanggal(rentang.sampai) : ""} max={nilaiInputTanggal()} onChange={(e) => setRentang({ ...rentang, sampai: dariInput(e.target.value) })} />}
          </Isian>
        </div>
      )}

      <section className="ghm-kartu ghm-ringkasan">
        <div className="ghm-angka-baris">
          <span className="ghm-angka-besar">{formatKg(rekap.total)}</span>
          <span className="ghm-judul-bagian">kg</span>
        </div>
        <p className="ghm-kecil">{rekap.keterangan}</p>
        <GrafikRekapan bars={rekap.bars} highlight={rekap.highlight} />
        <p className="ghm-kecil">{rekap.insight}</p>
      </section>

      <h2 className="ghm-judul-bagian ghm-subjudul">Riwayat</h2>
      {riwayat.error && !riwayat.data ? (
        <GalatMuat pesan={riwayat.error} onCobaLagi={riwayat.muat} />
      ) : riwayat.loading && !riwayat.data ? (
        <Memuat />
      ) : items.length === 0 ? (
        <p className="ghm-kartu ghm-kecil">Belum ada catatan. Ketuk Catat sampah organik untuk mulai.</p>
      ) : (
        <ul className="ghm-kartu ghm-daftar">
          {items.map((item) => {
            const d = parseServerDate(item.tanggalWaktu);
            const pukul = jam(d);
            return (
              <li key={item.id}>
                <Link href={`/app/sampah/${item.id}`} className="ghm-baris-riwayat">
                  <span className="ghm-tanggal-kotak"><b>{d ? angkaTanggal(d) : "-"}</b><small>{d ? bulanSingkat(d).replace(/\.$/, "") : ""}</small></span>
                  <span className="ghm-baris-teks">
                    <strong>{formatKg(item.totalSampah)} kg masuk</strong>
                    <small>{item.catatan?.trim() ? `Pukul ${pukul}. ${item.catatan.trim()}` : `Pukul ${pukul}`}</small>
                  </span>
                  <IconChevron className="ghm-chevron" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {konfirmasiKeluar && (
        <Dialog
          judul="Keluar dari akun?"
          pesan="Kamu perlu masuk lagi untuk mencatat sampah."
          ya="Keluar"
          sibuk={sibukKeluar}
          onBatal={() => setKonfirmasiKeluar(false)}
          onYa={async () => { setSibukKeluar(true); await keluar(); }}
        />
      )}
    </Layar>
  );
}

/** URL objek untuk pratinjau foto; dilepas otomatis saat foto berganti / layar ditutup. */
function useUrlFoto(blob) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return undefined; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

const INFO_FOTO = "Foto disimpan di HP, belum dikirim ke server.";

export function CatatSampahScreen() {
  const boleh = useRequireAuth();
  const { toast } = useSession();
  const router = useRouter();
  const [tanggal, setTanggal] = useState(() => nilaiInputTanggal());
  const [pukul, setPukul] = useState(() => nilaiInputJam());
  const [berat, setBerat] = useState("");
  const [catatan, setCatatan] = useState("");
  const [foto, setFoto] = useState(null);
  const urlFoto = useUrlFoto(foto);
  const inputFoto = useRef(null);
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);

  const ubahBerat = (langkah) => {
    const baru = Math.max(0, (bacaAngka(berat) ?? 0) + langkah);
    setBerat(String(Math.round(baru * 1000) / 1000));
    setGalat(null);
  };
  const onBerat = (e) => {
    // "055" -> "55" (nol di depan tidak berarti), tapi "0,5" tetap.
    setBerat(e.target.value.replace(/^0+(?=\d)/, ""));
    setGalat(null);
  };
  const onFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // supaya foto yang sama bisa dipilih lagi
    if (file) setFoto(await kecilkanFoto(file));
  };

  const simpan = async () => {
    const kg = bacaAngka(berat);
    if (kg === null || kg <= 0) { setGalat("Isi berat sampah organik, lebih dari 0 kg"); return; }
    const waktu = new Date(`${tanggal}T${pukul || "00:00"}`);
    if (Number.isNaN(waktu.getTime())) { setGalat("Tanggal atau pukul tidak valid"); return; }
    setSibuk(true);
    const body = { tanggalWaktu: waktu.toISOString(), totalSampah: kg, catatan: catatan.trim() || null };
    // Foto disimpan lokal dengan kunci tanggalWaktu (API belum menerima gambar).
    if (foto) await simpanFoto(body.tanggalWaktu, foto);
    try {
      await api("/pencacahan", { method: "POST", body });
      toast("Catatan sampah tersimpan");
      router.replace("/app");
    } catch (err) {
      if (perluDiantrekan(err)) {
        // Tidak ada internet: catatan disimpan di HP dan dikirim otomatis.
        antrekan(JENIS.SAMPAH, body);
        toast(PESAN_TERSIMPAN_DI_HP, 4500);
        router.replace("/app");
        return;
      }
      if (foto) await hapusFoto(body.tanggalWaktu);
      toast(`Gagal menyimpan: ${pesanDari(err)}`, 4500);
      setSibuk(false);
    }
  };

  if (!boleh) return null;
  return (
    <Layar footer={<Tombol onClick={simpan} disabled={sibuk}>{sibuk ? "Memproses…" : "Simpan catatan"}</Tombol>}>
      <BilahAtas kembali="/app" disabled={sibuk} />
      <h1 className="ghm-judul-layar">Catat sampah organik</h1>
      <p className="ghm-kecil ghm-subjudul-layar">Isi setelah sampah organik selesai ditimbang.</p>

      <div className="ghm-dua-kolom">
        <Isian label="Tanggal">
          {(attrs) => <div className="ghm-input-wrap"><span className="ghm-input-ikon kiri"><IconKalender size={22} /></span><input {...attrs} className="ghm-input ada-ikon" type="date" value={tanggal} max={nilaiInputTanggal()} onChange={(e) => setTanggal(e.target.value)} /></div>}
        </Isian>
        <Isian label="Pukul">
          {(attrs) => <div className="ghm-input-wrap"><span className="ghm-input-ikon kiri"><IconJam size={22} /></span><input {...attrs} className="ghm-input ada-ikon" type="time" value={pukul} onChange={(e) => setPukul(e.target.value)} /></div>}
        </Isian>
      </div>

      <Isian label="Berat sampah organik" galat={galat}>
        {(attrs) => (
          <div className="ghm-stepper">
            <button type="button" className="ghm-stepper-tombol" onClick={() => ubahBerat(-1)} aria-label="Kurangi 1 kg"><IconKurang size={26} /></button>
            <div className="ghm-stepper-nilai">
              <input {...attrs} className={`ghm-stepper-input ${berat.length > 4 ? "sedang" : ""}`} style={{ width: `${Math.max(1, berat.length) + 0.3}ch` }} inputMode="decimal" value={berat} onChange={onBerat} placeholder="0" />
              <span className="ghm-judul-bagian">kg</span>
            </div>
            <button type="button" className="ghm-stepper-tombol" onClick={() => ubahBerat(1)} aria-label="Tambah 1 kg"><IconTambah size={26} /></button>
          </div>
        )}
      </Isian>

      <Isian label="Catatan (boleh dikosongkan)">
        {(attrs) => <textarea {...attrs} className="ghm-input" rows={3} maxLength={1000} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Misal: banyak sisa sayur dari pasar" />}
      </Isian>

      {/* Foto (opsional; tersimpan di HP, belum dikirim ke server) */}
      <div className="ghm-isian">
        <span className="ghm-label-isian">Foto (boleh dikosongkan)</span>
        {urlFoto && <img className="ghm-foto pratinjau" src={urlFoto} alt="Foto catatan sampah" />}
        <div className="ghm-foto-aksi">
          <button type="button" className="ghm-saran-tombol" onClick={() => inputFoto.current?.click()} disabled={sibuk}>{foto ? "Ganti foto" : "Pilih foto"}</button>
          {foto && <button type="button" className="ghm-saran-tombol" onClick={() => setFoto(null)} disabled={sibuk}>Hapus foto</button>}
        </div>
        <input ref={inputFoto} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFoto} />
        {foto && <p className="ghm-bantuan">{INFO_FOTO}</p>}
      </div>
    </Layar>
  );
}

export function DetailSampahScreen() {
  const boleh = useRequireAuth();
  const { id } = useParams();
  const detail = useMuat(() => api(`/pencacahan/${id}`), [id], boleh);
  const item = detail.data?.data;
  const waktu = parseServerDate(item?.tanggalWaktu);
  // Foto lokal (kalau ada) dengan kunci tanggalWaktu catatan.
  const [foto, setFoto] = useState(null);
  const urlFoto = useUrlFoto(foto);
  useEffect(() => {
    let batal = false;
    if (item?.tanggalWaktu) ambilFoto(item.tanggalWaktu).then((b) => { if (!batal) setFoto(b); });
    return () => { batal = true; };
  }, [item?.tanggalWaktu]);

  if (!boleh) return null;
  return (
    <Layar>
      <BilahAtas kembali="/app" judul="Detail catatan sampah" />
      {detail.error ? <GalatMuat pesan={detail.error} onCobaLagi={detail.muat} /> : !item ? <Memuat /> : (
        <>
          <p className="ghm-kecil">{tanggalPanjang(waktu)}</p>
          <p className="ghm-kecil">{waktu ? `Pukul ${jam(waktu)}` : ""}</p>
          <div className="ghm-angka-baris ghm-jarak-atas">
            <span className="ghm-angka-besar">{formatKg(item.totalSampah)}</span>
            <span className="ghm-judul-bagian">kg</span>
          </div>
          <section className="ghm-kartu ghm-jarak-atas">
            <h2 className="ghm-label">Catatan</h2>
            <p>{item.catatan?.trim() || "Tidak ada catatan."}</p>
          </section>
          {urlFoto && (
            <section className="ghm-jarak-atas">
              <h2 className="ghm-label ghm-label-isian">Foto</h2>
              <img className="ghm-foto" src={urlFoto} alt="Foto catatan sampah" />
              <p className="ghm-kecil ghm-jarak-atas">{INFO_FOTO}</p>
            </section>
          )}
          {item.createdAt && <p className="ghm-kecil ghm-jarak-atas">Dicatat {tanggalSedang(parseServerDate(item.createdAt))}</p>}
        </>
      )}
    </Layar>
  );
}
