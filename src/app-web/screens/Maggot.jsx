"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, pesanDari } from "../api";
import { bacaAngka, formatGram, formatKg, hariKeTeks, nilaiInputTanggal, parseServerDate, rapikanDesimal, tanggalPendek } from "../format";
import { useMuat } from "../hooks";
import { IconChevron, IconInfo, IconKalender } from "../icons";
import { useRequireAuth, useSession } from "../session";
import { pakanGramSiklus, perkiraanSiklus, susunLinimasa, tahapDariFase } from "../siklus";
import { BilahAtas, GalatMuat, Isian, Layar, Memuat, Pilihan, Pita, Tombol, TombolLink } from "../ui";

// ===================================================== Kandang (tab Maggot)

export function MaggotScreen() {
  const boleh = useRequireAuth();
  const total = useMuat(() => api("/prediksi/total"), [], boleh);
  // Daftar siklus + detail tiap siklus (fase & perkiraan) dalam satu langkah.
  const daftar = useMuat(async () => {
    const res = await api("/siklus");
    const list = [...(res?.data || [])].sort((a, b) => (parseServerDate(b.tanggalMulai)?.getTime() || 0) - (parseServerDate(a.tanggalMulai)?.getTime() || 0));
    const detail = await Promise.all(list.map((s) => api(`/siklus/${s.id}`).then((r) => r.data).catch(() => null)));
    return list.map((s, i) => ({ siklus: s, detail: detail[i] }));
  }, [], boleh);

  const totalKg = total.data ? (Number(total.data.totalKg) || (Number(total.data.totalGram) || 0) / 1000) : 0;
  const kartu = daftar.data || [];

  if (!boleh) return null;
  return (
    <Layar nav footer={<TombolLink href="/app/maggot/mulai">Mulai siklus baru</TombolLink>}>
      <header className="ghm-kepala">
        <div>
          <p className="ghm-kecil">{daftar.data ? `${kartu.length} siklus` : " "}</p>
          <h1 className="ghm-judul-layar">Kandang maggot</h1>
        </div>
      </header>

      <section className="ghm-kartu ghm-kartu-gelap">
        <p className="ghm-label">Perkiraan total panen</p>
        {totalKg > 0 ? (
          <>
            <div className="ghm-angka-baris"><span className="ghm-angka-besar">{formatKg(totalKg)}</span><span className="ghm-judul-bagian">kg</span></div>
            <p className="ghm-kecil">dari {total.data.jumlahPrediksi} siklus yang sudah punya perkiraan</p>
          </>
        ) : (
          <p className="ghm-kecil">{total.loading && !total.data ? "Memuat…" : "Belum ada perkiraan. Catat fase besar di salah satu siklus untuk melihatnya."}</p>
        )}
      </section>

      {daftar.error && !daftar.data ? (
        <GalatMuat pesan={daftar.error} onCobaLagi={daftar.muat} />
      ) : daftar.loading && !daftar.data ? (
        <Memuat />
      ) : kartu.length === 0 ? (
        <p className="ghm-kartu ghm-kecil">Belum ada siklus. Ketuk Mulai siklus baru untuk mulai.</p>
      ) : (
        <ul className="ghm-daftar-siklus">
          {kartu.map(({ siklus, detail }) => <KartuSiklus key={siklus.id} siklus={siklus} detail={detail} />)}
        </ul>
      )}
    </Layar>
  );
}

function KartuSiklus({ siklus, detail }) {
  const mulai = parseServerDate(siklus.tanggalMulai);
  const tahap = detail ? tahapDariFase(detail.fase) : null;
  const { hasilKg } = detail ? perkiraanSiklus(detail) : { hasilKg: null };
  const keteranganMulai = mulai ? `Mulai ${tanggalPendek(mulai)}` : "";
  let perkiraan = "Belum ada perkiraan";
  let keterangan = keteranganMulai;
  if (hasilKg) perkiraan = `Perkiraan ${formatKg(hasilKg)} kg`;
  else if (tahap === "Telur" || tahap === "Tetas") keterangan = "Catat fase besar untuk melihatnya";

  return (
    <li>
      <Link href={`/app/maggot/${siklus.id}`} className="ghm-kartu ghm-kartu-siklus">
        <div className="ghm-kartu-siklus-atas">
          <strong className="ghm-judul-bagian">Siklus {siklus.id}</strong>
          {mulai && <span className="ghm-hari-ke">{hariKeTeks(mulai)}</span>}
        </div>
        {tahap && <Pita tahap={tahap} />}
        <div className="ghm-kartu-siklus-bawah">
          <div>
            <strong>{perkiraan}</strong>
            {keterangan && <small className="ghm-kecil">{keterangan}</small>}
          </div>
          <IconChevron className="ghm-chevron" />
        </div>
      </Link>
    </li>
  );
}

// ===================================================== Mulai siklus baru

export function MulaiSiklusScreen() {
  const boleh = useRequireAuth();
  const { toast } = useSession();
  const router = useRouter();
  const opsi = useMuat(() => api("/prediksi/opsi"), [], boleh);
  const pilihanMedia = opsi.data?.data?.opsi?.mediaTelur || [];
  const [tanggal, setTanggal] = useState(() => nilaiInputTanggal());
  const [jumlah, setJumlah] = useState("");
  const [media, setMedia] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState({});
  const [sibuk, setSibuk] = useState(false);

  const simpan = async () => {
    const telur = bacaAngka(jumlah);
    const g = {};
    if (telur === null || telur <= 0) g.jumlah = "Isi berat telur dalam gram, lebih dari 0 (boleh pakai koma, misal 0,5)";
    if (!media) g.media = "Pilih media telur";
    setGalat(g);
    if (Object.keys(g).length) return;
    setSibuk(true);
    try {
      const res = await api("/siklus", { method: "POST", body: { tanggalMulai: tanggal, jumlahTelur: telur, mediaTelur: media, catatan: catatan.trim() || null } });
      // Seperti aplikasi Android: siklus baru langsung punya fase PENETASAN (jumlah telur dalam gram).
      const siklusId = res?.data?.id;
      if (siklusId) {
        await api(`/siklus/${siklusId}/fase`, { method: "POST", body: { jenis: "PENETASAN", tanggal, jumlahTelur: telur } }).catch(() => null);
      }
      toast("Siklus baru dimulai");
      router.replace(siklusId ? `/app/maggot/${siklusId}` : "/app/maggot");
    } catch (err) {
      toast(`Gagal menyimpan: ${pesanDari(err)}`, 4500);
      setSibuk(false);
    }
  };

  if (!boleh) return null;
  return (
    <Layar footer={<Tombol onClick={simpan} disabled={sibuk}>{sibuk ? "Memproses…" : "Mulai siklus"}</Tombol>}>
      <BilahAtas kembali="/app/maggot" disabled={sibuk} />
      <h1 className="ghm-judul-layar">Mulai siklus baru</h1>

      <Isian label="Tanggal mulai">
        {(attrs) => <div className="ghm-input-wrap"><span className="ghm-input-ikon kiri"><IconKalender size={22} /></span><input {...attrs} className="ghm-input ada-ikon" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>}
      </Isian>
      <Isian label="Jumlah telur (gram)" galat={galat.jumlah} bantuan="Timbang telur sebelum dimasukkan ke media.">
        {(attrs) => <input {...attrs} className="ghm-input" inputMode="decimal" value={jumlah} onChange={(e) => { setJumlah(rapikanDesimal(e.target.value)); setGalat({ ...galat, jumlah: null }); }} placeholder="Contoh: 40 atau 0,5" />}
      </Isian>

      <fieldset className="ghm-fieldset">
        <legend>Media telur</legend>
        {opsi.loading && !opsi.data ? (
          <Memuat teks="Memuat pilihan media…" />
        ) : opsi.error ? (
          <GalatMuat pesan={opsi.error} onCobaLagi={opsi.muat} />
        ) : (
          <div className="ghm-pilihan-grid" role="radiogroup">
            {pilihanMedia.map((m) => <Pilihan key={m} dipilih={media === m} onClick={() => { setMedia(m); setGalat({ ...galat, media: null }); }}>{m}</Pilihan>)}
          </div>
        )}
        {galat.media && <p className="ghm-galat-teks">{galat.media}</p>}
      </fieldset>

      <Isian label="Catatan (boleh dikosongkan)">
        {(attrs) => <textarea {...attrs} className="ghm-input" rows={2} maxLength={1000} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Misal: wadah nomor 3" />}
      </Isian>
    </Layar>
  );
}

// ===================================================== Detail siklus

/** Kirim fase PANEN (memicu prediksi AI di server). Jumlah telur & pakan dalam gram. */
const kirimFasePanen = (siklusId, tanggal, telurGram, pakanGram, keterangan) =>
  api(`/siklus/${siklusId}/fase`, {
    method: "POST",
    timeout: 60000,
    body: { jenis: "PANEN", tanggal, jumlahTelur: telurGram, jumlahMakanan: pakanGram, keterangan: keterangan || null },
  });

export function DetailSiklusScreen() {
  const boleh = useRequireAuth();
  const { toast } = useSession();
  const router = useRouter();
  const { id } = useParams();
  const detail = useMuat(() => api(`/siklus/${id}`), [id], boleh);
  const [menghitung, setMenghitung] = useState(false);
  const siklus = detail.data?.data;

  const info = useMemo(() => {
    if (!siklus) return null;
    const fase = siklus.fase || [];
    const tahap = tahapDariFase(fase);
    const { panen, hasilKg } = perkiraanSiklus(siklus);
    return { tahap, panen, hasilKg, pakanGram: pakanGramSiklus(fase), linimasa: susunLinimasa(siklus) };
  }, [siklus]);

  const telurGram = Number(siklus?.jumlahTelur) || 0;
  const mulai = parseServerDate(siklus?.tanggalMulai);

  // Langkah berikutnya: catat fase besar, atau hitung perkiraan bila fase besar ada tapi perkiraan belum.
  let langkah = null;
  if (info) {
    if (info.tahap !== "Besar") {
      langkah = { teks: "Catat fase besar saat larva mulai diberi pakan. Setelah itu perkiraan hasil panen akan muncul.", tombol: "Catat fase besar", aksi: () => router.push(`/app/maggot/${id}/fase-besar`) };
    } else if (!info.hasilKg && telurGram > 0) {
      langkah = {
        teks: "Fase besar sudah dicatat, tapi perkiraan panen belum ada. Ketuk tombol di bawah untuk menghitungnya.",
        tombol: "Hitung perkiraan panen",
        aksi: async () => {
          if (!info.pakanGram) { router.push(`/app/maggot/${id}/fase-besar?mode=panen`); return; }
          setMenghitung(true);
          try {
            await kirimFasePanen(id, nilaiInputTanggal(), telurGram, info.pakanGram);
            await detail.muat();
          } catch (err) {
            toast(pesanDari(err), 5000);
          } finally {
            setMenghitung(false);
          }
        },
      };
    }
  }

  if (!boleh) return null;
  return (
    <Layar footer={langkah ? <Tombol onClick={langkah.aksi} disabled={menghitung}>{menghitung ? "Menghitung perkiraan panen…" : langkah.tombol}</Tombol> : null}>
      <BilahAtas kembali="/app/maggot" judul={`Siklus ${id}`} sub={mulai ? hariKeTeks(mulai) : undefined} disabled={menghitung} />
      {detail.error && !siklus ? (
        <GalatMuat pesan={detail.error} onCobaLagi={detail.muat} />
      ) : !info ? (
        <Memuat />
      ) : (
        <>
          <h1 className="ghm-angka-sedang">{mulai ? hariKeTeks(mulai) : `Siklus ${id}`}</h1>
          <Pita tahap={info.tahap} />

          {info.hasilKg && (
            <Link href={`/app/maggot/${id}/perkiraan`} className="ghm-kartu ghm-kartu-gelap ghm-kartu-perkiraan" aria-label={`Lihat rincian perkiraan panen, ${formatKg(info.hasilKg)} kg`}>
              <p className="ghm-label">Perkiraan hasil panen</p>
              <div className="ghm-angka-baris"><span className="ghm-angka-besar">{formatKg(info.hasilKg)}</span><span className="ghm-judul-bagian">kg</span></div>
              <span className="ghm-rincian">Rincian <IconChevron size={20} /></span>
            </Link>
          )}

          {langkah && (
            <section className="ghm-kartu ghm-kartu-kuning">
              <p className="ghm-label">Langkah berikutnya</p>
              <p>{langkah.teks}</p>
            </section>
          )}

          <h2 className="ghm-judul-bagian ghm-subjudul">Catatan fase</h2>
          {info.linimasa.length === 0 ? (
            <p className="ghm-kartu ghm-kecil">Belum ada fase yang dicatat.</p>
          ) : (
            <ol className="ghm-kartu ghm-linimasa">
              {info.linimasa.map((b) => (
                <li key={b.judul}>
                  <span className="titik" aria-hidden="true" />
                  <div>
                    <div className="ghm-linimasa-atas"><strong>{b.judul}</strong><small className="ghm-kecil">{b.tanggal}</small></div>
                    {b.keterangan && <p className="ghm-kecil">{b.keterangan}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Layar>
  );
}

// ===================================================== Catat fase besar

export function FaseBesarScreen() {
  const boleh = useRequireAuth();
  const { toast } = useSession();
  const router = useRouter();
  const { id } = useParams();
  const params = useSearchParams();
  const hanyaPanen = params.get("mode") === "panen";
  const detail = useMuat(() => api(`/siklus/${id}`), [id], boleh);
  const siklus = detail.data?.data;
  const mulai = parseServerDate(siklus?.tanggalMulai);
  const [tanggal, setTanggal] = useState(() => nilaiInputTanggal());
  const [pakan, setPakan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [galat, setGalat] = useState(null);
  const [status, setStatus] = useState(null); // null | "simpan" | "hitung"

  useEffect(() => {
    // Fase besar tidak boleh sebelum tanggal mulai siklus.
    if (mulai && tanggal < nilaiInputTanggal(mulai)) setTanggal(nilaiInputTanggal(mulai));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siklus]);

  const simpan = async () => {
    const pakanKg = bacaAngka(pakan);
    if (pakanKg === null || pakanKg <= 0) { setGalat("Isi jumlah pakan dalam kg, lebih dari 0"); return; }
    const telurGram = Number(siklus?.jumlahTelur) || 0;
    if (telurGram <= 0) { toast("Jumlah telur siklus ini tidak ditemukan, jadi perkiraan panen tidak bisa dihitung.", 5000); return; }
    const pakanGram = pakanKg * 1000;

    if (!hanyaPanen) {
      setStatus("simpan");
      try {
        await api(`/siklus/${id}/fase`, { method: "POST", body: { jenis: "PEMBESARAN", tanggal, jumlahMakanan: pakanGram, keterangan: keterangan.trim() || null } });
      } catch (err) {
        setStatus(null);
        toast(`Gagal menyimpan: ${pesanDari(err)}`, 5000);
        return;
      }
    }
    // Prediksi AI bisa ±15 detik: beri tahu pengguna supaya tidak mengira aplikasi macet.
    setStatus("hitung");
    try {
      await kirimFasePanen(id, tanggal, telurGram, pakanGram, keterangan.trim());
      toast("Fase besar tersimpan");
      router.replace(`/app/maggot/${id}/perkiraan`);
    } catch (err) {
      if (hanyaPanen) {
        setStatus(null);
        toast(pesanDari(err), 5000);
        return;
      }
      toast(`Fase besar tersimpan, tapi perkiraan panen belum bisa dihitung: ${pesanDari(err)} Coba lagi dari halaman siklus.`, 7000);
      router.replace(`/app/maggot/${id}`);
    }
  };

  const sibuk = status !== null;
  if (!boleh) return null;
  return (
    <Layar footer={<Tombol onClick={simpan} disabled={sibuk || !siklus}>{status === "simpan" ? "Memproses…" : status === "hitung" ? "Menghitung perkiraan panen…" : "Simpan dan lihat perkiraan"}</Tombol>}>
      <BilahAtas kembali={`/app/maggot/${id}`} judul={`Siklus ${id}`} sub={mulai ? hariKeTeks(mulai) : undefined} disabled={sibuk} />
      <h1 className="ghm-judul-layar">Catat fase besar</h1>
      {detail.error && !siklus ? <GalatMuat pesan={detail.error} onCobaLagi={detail.muat} /> : (
        <>
          <Isian label="Tanggal masuk fase besar">
            {(attrs) => <div className="ghm-input-wrap"><span className="ghm-input-ikon kiri"><IconKalender size={22} /></span><input {...attrs} className="ghm-input ada-ikon" type="date" value={tanggal} min={mulai ? nilaiInputTanggal(mulai) : undefined} onChange={(e) => setTanggal(e.target.value)} disabled={sibuk} /></div>}
          </Isian>
          <Isian label="Jumlah pakan (kg)" galat={galat} bantuan="Total pakan yang diberikan selama fase besar.">
            {(attrs) => <input {...attrs} className="ghm-input" inputMode="decimal" value={pakan} onChange={(e) => { setPakan(e.target.value); setGalat(null); }} placeholder="Contoh: 40" disabled={sibuk} />}
          </Isian>
          <Isian label="Keterangan (boleh dikosongkan)">
            {(attrs) => <textarea {...attrs} className="ghm-input" rows={2} maxLength={1000} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Misal: pakan sisa sayur dari pasar" disabled={sibuk} />}
          </Isian>
          <p className="ghm-info"><IconInfo size={22} />Setelah disimpan, perkiraan hasil panen langsung muncul.</p>
        </>
      )}
    </Layar>
  );
}

// ===================================================== Perkiraan panen

export function PerkiraanScreen() {
  const boleh = useRequireAuth();
  const { id } = useParams();
  const detail = useMuat(() => api(`/siklus/${id}`), [id], boleh);
  const siklus = detail.data?.data;
  const { hasilKg } = siklus ? perkiraanSiklus(siklus) : { hasilKg: null };
  const pakanGram = siklus ? pakanGramSiklus(siklus.fase) : null;

  if (!boleh) return null;
  return (
    <Layar footer={<TombolLink href={`/app/maggot/${id}`} varian="garis">Kembali ke siklus</TombolLink>}>
      <BilahAtas kembali={`/app/maggot/${id}`} judul="Perkiraan panen" />
      {detail.error && !siklus ? <GalatMuat pesan={detail.error} onCobaLagi={detail.muat} /> : !siklus ? <Memuat /> : (
        <>
          <section className="ghm-hasil" aria-label={hasilKg ? `${formatKg(hasilKg)} kg maggot` : undefined}>
            <p>Siklus {siklus.id} diperkirakan menghasilkan</p>
            <span className="ghm-angka-hero">{hasilKg ? formatKg(hasilKg) : "–"}</span>
            <p className="ghm-judul-bagian">kg maggot</p>
          </section>
          {(siklus.jumlahTelur || siklus.mediaTelur || pakanGram) && (
            <section className="ghm-kartu">
              <h2 className="ghm-label">Dihitung dari</h2>
              <dl className="ghm-rincian-daftar">
                {siklus.jumlahTelur ? <><dt>Telur</dt><dd>{formatGram(siklus.jumlahTelur)} gram</dd></> : null}
                {siklus.mediaTelur ? <><dt>Media</dt><dd>{siklus.mediaTelur}</dd></> : null}
                {pakanGram ? <><dt>Pakan fase besar</dt><dd>{formatKg(pakanGram / 1000)} kg</dd></> : null}
              </dl>
            </section>
          )}
          <p className="ghm-kecil ghm-jarak-atas">Angka ini hanya perkiraan. Hasil nyata bisa berbeda, terutama kalau suhu dan kelembapan wadah berubah.</p>
        </>
      )}
    </Layar>
  );
}
