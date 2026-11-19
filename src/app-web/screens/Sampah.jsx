"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api, pesanDari } from "../api";
import {
  angkaTanggal, bacaAngka, bulanSingkat, capital, formatKg, hariPenuh, hariSingkat, jam, nilaiInputJam,
  nilaiInputTanggal, parseServerDate, rentangTanggal, tanggalPanjang, tanggalSedang,
} from "../format";
import { useMuat } from "../hooks";
import { IconBell, IconChevron, IconJam, IconKalender, IconKeluar, IconKurang, IconTambah } from "../icons";
import { useRequireAuth, useSession } from "../session";
import { BilahAtas, Dialog, GalatMuat, Isian, Layar, Memuat, Tombol, TombolLink } from "../ui";

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Ringkasan 7 hari terakhir (termasuk hari ini), sama dengan PencatatanHistoryFragment.bindWeeklySummary. */
function ringkasanMingguan(items) {
  const totals = new Map();
  for (const item of items) {
    const d = parseServerDate(item.tanggalWaktu);
    if (!d) continue;
    totals.set(dayKey(d), (totals.get(dayKey(d)) || 0) + (Number(item.totalSampah) || 0));
  }
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const bars = days.map((d) => ({ label: hariSingkat(d).replace(/\.$/, ""), value: totals.get(dayKey(d)) || 0, date: d }));
  const total = bars.reduce((s, b) => s + b.value, 0);
  let busiest = 0;
  bars.forEach((b, i) => { if (b.value > bars[busiest].value) busiest = i; });
  const insight = bars[busiest].value <= 0
    ? "Belum ada sampah tercatat dalam 7 hari terakhir."
    : `${capital(hariPenuh(days[busiest]))} paling banyak, ${formatKg(bars[busiest].value)} kg.`;
  return { bars, total, busiest, insight, rentang: rentangTanggal(days[0], days[6]) };
}

function GrafikMingguan({ bars, busiest }) {
  const max = Math.max(...bars.map((b) => b.value), 0) || 1;
  const today = bars.length - 1;
  return (
    <div className="ghm-grafik" role="img" aria-label={`Grafik sampah masuk 7 hari terakhir: ${bars.map((b) => `${b.label} ${formatKg(b.value)} kilogram`).join(", ")}`}>
      {bars.map((b, i) => {
        const tinggi = b.value > 0 ? Math.max(6, (b.value / max) * 100) : 4;
        const kuat = i === today;
        return (
          <div key={i} className={`kolom ${kuat ? "hari-ini" : ""} ${b.value <= 0 ? "kosong" : ""}`}>
            <span className="nilai">{b.value > 0 && (kuat || i === busiest) ? formatKg(b.value) : ""}</span>
            <span className="area"><span className="batang" style={{ height: `${tinggi}%` }} /></span>
            <span className="hari">{b.label}</span>
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
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const [sibukKeluar, setSibukKeluar] = useState(false);

  const items = useMemo(() => {
    const list = riwayat.data?.data || [];
    return [...list].sort((a, b) => (parseServerDate(b.tanggalWaktu)?.getTime() || 0) - (parseServerDate(a.tanggalWaktu)?.getTime() || 0));
  }, [riwayat.data]);
  const minggu = useMemo(() => ringkasanMingguan(items), [items]);
  const adaNotifBaru = (notif.data?.data || []).some((n) => !n.isRead);

  if (!boleh) return null;
  return (
    <Layar nav footer={<TombolLink href="/app/sampah/catat">Catat sampah hari ini</TombolLink>}>
      <header className="ghm-kepala">
        <div>
          <p className="ghm-kecil">Halo, pengelola</p>
          <h1 className="ghm-judul-layar">Sampah minggu ini</h1>
        </div>
        <div className="ghm-kepala-aksi">
          <Link href="/app/notifikasi" className="ghm-bulat putih" aria-label={adaNotifBaru ? "Notifikasi, ada yang belum dibaca" : "Notifikasi"}>
            <IconBell />{adaNotifBaru && <span className="ghm-titik-baru" />}
          </Link>
          <button type="button" className="ghm-bulat putih" aria-label="Keluar dari akun" onClick={() => setKonfirmasiKeluar(true)}><IconKeluar /></button>
        </div>
      </header>

      <section className="ghm-kartu ghm-ringkasan">
        <div className="ghm-angka-baris">
          <span className="ghm-angka-besar">{formatKg(minggu.total)}</span>
          <span className="ghm-judul-bagian">kg</span>
        </div>
        <p className="ghm-kecil">masuk dalam 7 hari terakhir, {minggu.rentang}</p>
        <GrafikMingguan bars={minggu.bars} busiest={minggu.busiest} />
        <p className="ghm-kecil">{minggu.insight}</p>
      </section>

      <h2 className="ghm-judul-bagian ghm-subjudul">Riwayat</h2>
      {riwayat.error && !riwayat.data ? (
        <GalatMuat pesan={riwayat.error} onCobaLagi={riwayat.muat} />
      ) : riwayat.loading && !riwayat.data ? (
        <Memuat />
      ) : items.length === 0 ? (
        <p className="ghm-kartu ghm-kecil">Belum ada catatan. Ketuk Catat sampah hari ini untuk mulai.</p>
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

export function CatatSampahScreen() {
  const boleh = useRequireAuth();
  const { toast } = useSession();
  const router = useRouter();
  const [tanggal, setTanggal] = useState(() => nilaiInputTanggal());
  const [pukul, setPukul] = useState(() => nilaiInputJam());
  const [berat, setBerat] = useState("");
  const [catatan, setCatatan] = useState("");
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

  const simpan = async () => {
    const kg = bacaAngka(berat);
    if (kg === null || kg <= 0) { setGalat("Isi berat sampah, lebih dari 0 kg"); return; }
    const waktu = new Date(`${tanggal}T${pukul || "00:00"}`);
    if (Number.isNaN(waktu.getTime())) { setGalat("Tanggal atau pukul tidak valid"); return; }
    setSibuk(true);
    try {
      await api("/pencacahan", { method: "POST", body: { tanggalWaktu: waktu.toISOString(), totalSampah: kg, catatan: catatan.trim() || null } });
      toast("Catatan sampah tersimpan");
      router.replace("/app");
    } catch (err) {
      toast(`Gagal menyimpan: ${pesanDari(err)}`, 4500);
      setSibuk(false);
    }
  };

  if (!boleh) return null;
  return (
    <Layar footer={<Tombol onClick={simpan} disabled={sibuk}>{sibuk ? "Memproses…" : "Simpan catatan"}</Tombol>}>
      <BilahAtas kembali="/app" disabled={sibuk} />
      <h1 className="ghm-judul-layar">Catat sampah</h1>
      <p className="ghm-kecil ghm-subjudul-layar">Isi setelah sampah selesai ditimbang.</p>

      <div className="ghm-dua-kolom">
        <Isian label="Tanggal">
          {(attrs) => <div className="ghm-input-wrap"><span className="ghm-input-ikon kiri"><IconKalender size={22} /></span><input {...attrs} className="ghm-input ada-ikon" type="date" value={tanggal} max={nilaiInputTanggal()} onChange={(e) => setTanggal(e.target.value)} /></div>}
        </Isian>
        <Isian label="Pukul">
          {(attrs) => <div className="ghm-input-wrap"><span className="ghm-input-ikon kiri"><IconJam size={22} /></span><input {...attrs} className="ghm-input ada-ikon" type="time" value={pukul} onChange={(e) => setPukul(e.target.value)} /></div>}
        </Isian>
      </div>

      <Isian label="Berat sampah" galat={galat}>
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
    </Layar>
  );
}

export function DetailSampahScreen() {
  const boleh = useRequireAuth();
  const { id } = useParams();
  const detail = useMuat(() => api(`/pencacahan/${id}`), [id], boleh);
  const item = detail.data?.data;
  const waktu = parseServerDate(item?.tanggalWaktu);

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
          {item.createdAt && <p className="ghm-kecil ghm-jarak-atas">Dicatat {tanggalSedang(parseServerDate(item.createdAt))}</p>}
        </>
      )}
    </Layar>
  );
}
