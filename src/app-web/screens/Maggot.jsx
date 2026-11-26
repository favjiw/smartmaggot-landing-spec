"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { antrekan, JENIS, PESAN_TERSIMPAN_DI_HP, perluDiantrekan, useAntrean } from "../antrean";
import { api, pesanDari } from "../api";
import { bacaAngka, formatGram, formatKg, hariKeTeks, nilaiInputTanggal, parseServerDate, rapikanDesimal, tanggalPanjang, tanggalPendek } from "../format";
import { useMuat } from "../hooks";
import { IconBell, IconChevron, IconInfo, IconKalender } from "../icons";
import { pengingatHariIni, useIzinPengingat } from "../pengingat";
import { useRequireAuth, useSession } from "../session";
import {
  cariFase, FASE_SOP, faseSopDari, pakanGramSiklus, perkiraanSiklus, susunJadwal, TEKS_SIKLUS_SELESAI, urutanFase,
} from "../siklus";
import { BilahAtas, Dialog, GalatMuat, Isian, Layar, Memuat, PenandaAntrean, Pilihan, Pita, Tombol, TombolLink } from "../ui";

// ===================================================== Kandang (tab Maggot)

export function MaggotScreen() {
  const boleh = useRequireAuth();
  const total = useMuat(() => api("/prediksi/total"), [], boleh);
  // Daftar siklus + detail tiap siklus (perkiraan) dalam satu langkah.
  const daftar = useMuat(async () => {
    const res = await api("/siklus");
    const list = [...(res?.data || [])].sort((a, b) => (parseServerDate(b.tanggalMulai)?.getTime() || 0) - (parseServerDate(a.tanggalMulai)?.getTime() || 0));
    const detail = await Promise.all(list.map((s) => api(`/siklus/${s.id}`).then((r) => r.data).catch(() => null)));
    return list.map((s, i) => ({ siklus: s, detail: detail[i] }));
  }, [], boleh);
  // Antrean berkurang = ada data yang baru terkirim: muat ulang daftar & total.
  const menunggu = useAntrean(() => { daftar.muat(); total.muat(); });

  const totalKg = total.data ? (Number(total.data.totalKg) || (Number(total.data.totalGram) || 0) / 1000) : 0;
  const kartu = daftar.data || [];
  const semuaSiklus = useMemo(() => kartu.map((k) => k.siklus), [kartu]);
  const pengingat = useMemo(() => pengingatHariIni(semuaSiklus), [semuaSiklus]);
  const izin = useIzinPengingat(semuaSiklus);
  const adaSiklusAktif = semuaSiklus.some((s) => faseSopDari(parseServerDate(s.tanggalMulai)));

  if (!boleh) return null;
  return (
    <Layar nav footer={<TombolLink href="/app/maggot/mulai">Mulai siklus baru</TombolLink>}>
      <header className="ghm-kepala">
        <div>
          <p className="ghm-kecil">{daftar.data ? `${kartu.length} siklus` : " "}</p>
          <h1 className="ghm-judul-layar">Kandang maggot</h1>
        </div>
      </header>

      <PenandaAntrean jumlah={menunggu} />

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

      {pengingat.length > 0 && (
        <section className="ghm-kartu ghm-kartu-kuning" aria-label="Pengingat hari ini">
          <p className="ghm-label">Pengingat hari ini</p>
          <ul className="ghm-daftar-pengingat">
            {pengingat.map((p) => (
              <li key={p.kunci}>
                <Link href={`/app/maggot/${p.siklusId}`}>
                  <strong>{p.judul}</strong>
                  <span className="ghm-kecil">{p.isiLayar}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {izin.status === "default" && adaSiklusAktif && (
        <section className="ghm-info ghm-info-aksi">
          <IconBell size={22} />
          <div>
            <p>Nyalakan notifikasi supaya HP mengingatkan saat siklus pindah fase dan waktunya memberi pakan.</p>
            <button type="button" className="ghm-tautan-tombol" onClick={izin.minta}>Nyalakan pengingat</button>
          </div>
        </section>
      )}

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

/** Kartu siklus (SiklusAdapter di Android): fase SOP dari umur siklus + perkiraan panen. */
function KartuSiklus({ siklus, detail }) {
  const mulai = parseServerDate(siklus.tanggalMulai);
  const fase = faseSopDari(mulai);
  const { hasilKg } = detail ? perkiraanSiklus(detail) : { hasilKg: null };
  const keteranganMulai = mulai ? `Mulai ${tanggalPendek(mulai)}` : "";
  let perkiraan = "Belum ada perkiraan";
  let keterangan = keteranganMulai;
  if (hasilKg) perkiraan = `Perkiraan ${formatKg(hasilKg)} kg`;
  else if (fase === FASE_SOP[0]) keterangan = "Catat fase besar untuk melihatnya";

  return (
    <li>
      <Link href={`/app/maggot/${siklus.id}`} className="ghm-kartu ghm-kartu-siklus">
        <div className="ghm-kartu-siklus-atas">
          <strong className="ghm-judul-bagian">Siklus {siklus.id}</strong>
          {mulai && <span className="ghm-hari-ke">{hariKeTeks(mulai)}</span>}
        </div>
        {mulai && <Pita fase={fase} />}
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

export const MulaiSiklusScreen = () => <FormSiklus />;

export function UbahSiklusScreen() {
  const { id } = useParams();
  return <FormSiklus ubahId={id} />;
}

/** "2026-11-13T00:00:00.000Z" -> "2026-11-13" (tanggal tanpa jam disimpan sebagai tengah malam UTC). */
const tanggalSaja = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v ? nilaiInputTanggal(new Date(v)) : "");

/** Form mulai siklus; dengan `ubahId` dipakai untuk mengubah siklus yang sudah ada. */
function FormSiklus({ ubahId }) {
  const ubah = !!ubahId;
  const boleh = useRequireAuth();
  const { toast } = useSession();
  const router = useRouter();
  const opsi = useMuat(() => api("/prediksi/opsi"), [], boleh);
  const lama = useMuat(() => (ubah ? api(`/siklus/${ubahId}`) : Promise.resolve(null)), [ubahId], boleh);
  const siklusLama = lama.data?.data;
  // Siklus baru: tanggal mulai = hari ini (otomatis). Saat mengubah, tanggal boleh dibetulkan.
  const [hariIni] = useState(() => new Date());
  const [tanggal, setTanggal] = useState(() => nilaiInputTanggal(hariIni));
  const [jumlah, setJumlah] = useState("");
  const [media, setMedia] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState({});
  const [status, setStatus] = useState(null); // null | "simpan" | "hitung"
  const [terisi, setTerisi] = useState(!ubah);
  const sibuk = status !== null;

  useEffect(() => {
    if (!ubah || !siklusLama || terisi) return;
    setTanggal(tanggalSaja(siklusLama.tanggalMulai));
    setJumlah(String(siklusLama.jumlahTelur ?? "").replace(".", ","));
    setMedia(siklusLama.mediaTelur || null);
    setCatatan(siklusLama.catatan || "");
    setTerisi(true);
  }, [ubah, siklusLama, terisi]);

  const daftarMedia = opsi.data?.data?.opsi?.mediaTelur || [];
  // Media lama yang tidak ada lagi di daftar server tetap bisa dipilih.
  const pilihanMedia = media && !daftarMedia.includes(media) ? [media, ...daftarMedia] : daftarMedia;

  const simpan = async () => {
    const telur = bacaAngka(jumlah);
    const g = {};
    if (ubah && !tanggal) g.tanggal = "Isi tanggal mulai";
    if (telur === null || telur <= 0) g.jumlah = "Isi berat telur dalam gram, lebih dari 0 (boleh pakai koma, misal 0,5)";
    if (!media) g.media = "Pilih media telur";
    setGalat(g);
    if (Object.keys(g).length) return;
    const body = { tanggalMulai: tanggal, jumlahTelur: telur, mediaTelur: media, catatan: catatan.trim() || null };

    if (ubah) {
      // Berat telur berubah & sudah ada perkiraan: server menghitung ulang (bisa ±15 detik).
      const hitungUlang = telur !== Number(siklusLama.jumlahTelur) && !!perkiraanSiklus(siklusLama).panen;
      setStatus(hitungUlang ? "hitung" : "simpan");
      try {
        await api(`/siklus/${ubahId}`, { method: "PUT", body, timeout: 60000 });
        toast("Siklus diperbarui");
        router.replace(`/app/maggot/${ubahId}`);
      } catch (err) {
        toast(`Gagal menyimpan: ${pesanDari(err)}`, 5000);
        setStatus(null);
      }
      return;
    }

    setStatus("simpan");
    try {
      const res = await api("/siklus", { method: "POST", body });
      // Seperti aplikasi Android: siklus baru langsung punya fase PENETASAN (jumlah telur dalam gram).
      const siklusId = res?.data?.id;
      if (siklusId) {
        await api(`/siklus/${siklusId}/fase`, { method: "POST", body: { jenis: "PENETASAN", tanggal, jumlahTelur: telur } }).catch(() => null);
      }
      toast("Siklus baru dimulai");
      router.replace(siklusId ? `/app/maggot/${siklusId}` : "/app/maggot");
    } catch (err) {
      if (perluDiantrekan(err)) {
        // Tidak ada internet: simpan di HP, kirim otomatis saat online.
        antrekan(JENIS.SIKLUS, body);
        toast(PESAN_TERSIMPAN_DI_HP, 4500);
        router.replace("/app/maggot");
        return;
      }
      toast(`Gagal menyimpan: ${pesanDari(err)}`, 4500);
      setStatus(null);
    }
  };

  if (!boleh) return null;
  if (ubah && !terisi) {
    return (
      <Layar>
        <BilahAtas kembali={`/app/maggot/${ubahId}`} />
        {lama.error ? <GalatMuat pesan={lama.error} onCobaLagi={lama.muat} /> : <Memuat />}
      </Layar>
    );
  }
  const teksTombol = status === "hitung" ? "Menghitung ulang perkiraan…" : status ? "Memproses…" : ubah ? "Simpan perubahan" : "Mulai siklus";
  return (
    <Layar footer={<Tombol onClick={simpan} disabled={sibuk}>{teksTombol}</Tombol>}>
      <BilahAtas kembali={ubah ? `/app/maggot/${ubahId}` : "/app/maggot"} disabled={sibuk} />
      <h1 className="ghm-judul-layar">{ubah ? `Ubah siklus ${ubahId}` : "Mulai siklus baru"}</h1>

      {ubah ? (
        <Isian label="Tanggal mulai" galat={galat.tanggal} bantuan="Fase siklus dihitung dari tanggal ini.">
          {(attrs) => <div className="ghm-input-wrap"><span className="ghm-input-ikon kiri"><IconKalender size={22} /></span><input {...attrs} className="ghm-input ada-ikon" type="date" value={tanggal} max={nilaiInputTanggal()} onChange={(e) => { setTanggal(e.target.value); setGalat({ ...galat, tanggal: null }); }} disabled={sibuk} /></div>}
        </Isian>
      ) : (
        <Isian label="Tanggal mulai" bantuan="Terisi otomatis (hari ini). Fase berpindah otomatis sesuai umur siklus.">
          {(attrs) => <div className="ghm-input-wrap"><span className="ghm-input-ikon kiri"><IconKalender size={22} /></span><input {...attrs} className="ghm-input ada-ikon ghm-input-tetap" type="text" value={tanggalPanjang(hariIni)} readOnly tabIndex={-1} /></div>}
        </Isian>
      )}
      <Isian label="Jumlah telur (gram)" galat={galat.jumlah} bantuan={ubah ? "Bila diubah, perkiraan panen dihitung ulang." : "Timbang telur sebelum dimasukkan ke media."}>
        {(attrs) => <input {...attrs} className="ghm-input" inputMode="decimal" value={jumlah} onChange={(e) => { setJumlah(rapikanDesimal(e.target.value)); setGalat({ ...galat, jumlah: null }); }} placeholder="Contoh: 40 atau 0,5" disabled={sibuk} />}
      </Isian>

      <fieldset className="ghm-fieldset" disabled={sibuk}>
        <legend>Media telur</legend>
        {opsi.loading && !opsi.data ? (
          <Memuat teks="Memuat pilihan media…" />
        ) : opsi.error && !pilihanMedia.length ? (
          <GalatMuat pesan={opsi.error} onCobaLagi={opsi.muat} />
        ) : (
          <div className="ghm-pilihan-grid" role="radiogroup">
            {pilihanMedia.map((m) => <Pilihan key={m} dipilih={media === m} onClick={() => { setMedia(m); setGalat({ ...galat, media: null }); }}>{m}</Pilihan>)}
          </div>
        )}
        {galat.media && <p className="ghm-galat-teks">{galat.media}</p>}
      </fieldset>

      <Isian label="Catatan (boleh dikosongkan)">
        {(attrs) => <textarea {...attrs} className="ghm-input" rows={2} maxLength={1000} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Misal: wadah nomor 3" disabled={sibuk} />}
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
  useAntrean(() => detail.muat());
  const [menghitung, setMenghitung] = useState(false);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [sibukHapus, setSibukHapus] = useState(false);
  const siklus = detail.data?.data;
  const mulai = parseServerDate(siklus?.tanggalMulai);

  const info = useMemo(() => {
    if (!siklus) return null;
    const faseList = siklus.fase || [];
    const fase = faseSopDari(parseServerDate(siklus.tanggalMulai));
    const { panen, hasilKg } = perkiraanSiklus(siklus);
    return {
      fase,
      panen,
      hasilKg,
      pembesaran: cariFase(faseList, "PEMBESARAN"),
      pakanGram: pakanGramSiklus(faseList),
      jadwal: susunJadwal(siklus, fase),
    };
  }, [siklus]);

  const telurGram = Number(siklus?.jumlahTelur) || 0;

  /**
   * Kartu kuning + tombol bawah (DetailSiklusActivity.tampilkanLangkahBerikutnya):
   * - perkiraan sudah ada -> disembunyikan;
   * - fase besar sudah dicatat tapi perkiraan belum ada -> "Hitung perkiraan panen";
   * - fase besar belum dicatat dan siklus sudah masuk hari ke-13 -> "Catat fase besar";
   * - selain itu (belum waktunya) -> disembunyikan.
   */
  let langkah = null;
  if (info && !info.panen) {
    if (info.pembesaran && telurGram > 0) {
      langkah = {
        teks: "Fase besar sudah dicatat, tapi perkiraan panen belum ada. Ketuk tombol di bawah untuk menghitungnya.",
        tombol: "Hitung perkiraan panen",
        aksi: async () => {
          if (!info.pakanGram) { router.push(`/app/maggot/${id}/fase-besar?mode=panen`); return; }
          setMenghitung(true);
          const tanggal = nilaiInputTanggal();
          try {
            await kirimFasePanen(id, tanggal, telurGram, info.pakanGram);
            await detail.muat();
          } catch (err) {
            if (perluDiantrekan(err)) {
              antrekan(JENIS.PERKIRAAN, { siklusId: Number(id), tanggal, telurGram, pakanGram: info.pakanGram });
              toast(PESAN_TERSIMPAN_DI_HP, 5000);
            } else {
              toast(pesanDari(err), 5000);
            }
          } finally {
            setMenghitung(false);
          }
        },
      };
    } else if (!info.pembesaran && info.fase && urutanFase(info.fase) >= 1) {
      langkah = { teks: "Catat fase besar saat larva mulai diberi pakan. Setelah itu perkiraan hasil panen akan muncul.", tombol: "Catat fase besar", aksi: () => router.push(`/app/maggot/${id}/fase-besar`) };
    }
  }

  const hapusSiklus = async () => {
    setSibukHapus(true);
    try {
      await api(`/siklus/${id}`, { method: "DELETE" });
      toast(`Siklus ${id} dihapus`);
      router.replace("/app/maggot");
    } catch (err) {
      toast(`Gagal menghapus: ${pesanDari(err)}`, 5000);
      setSibukHapus(false);
      setKonfirmasiHapus(false);
    }
  };

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
          {mulai && <Pita fase={info.fase} />}

          {mulai && (
            <section className="ghm-kartu" aria-label="Fase sekarang">
              <p className="ghm-label ghm-redup">Fase sekarang</p>
              {info.fase ? (
                <>
                  <h2 className="ghm-judul-bagian">{info.fase.nama}</h2>
                  <p className="ghm-kecil">Hari {info.fase.hariAwal}–{info.fase.hariAkhir}</p>
                  <p className="ghm-tebal ghm-jarak-atas">Yang harus dilakukan</p>
                  <ul className="ghm-panduan">
                    {info.fase.panduan.map((baris) => <li key={baris}>{baris}</li>)}
                  </ul>
                </>
              ) : (
                <h2 className="ghm-judul-bagian">{TEKS_SIKLUS_SELESAI}</h2>
              )}
            </section>
          )}

          {langkah && (
            <section className="ghm-kartu ghm-kartu-kuning">
              <p className="ghm-label">Langkah berikutnya</p>
              <p>{langkah.teks}</p>
            </section>
          )}

          {info.hasilKg && (
            <Link href={`/app/maggot/${id}/perkiraan`} className="ghm-kartu ghm-kartu-gelap ghm-kartu-perkiraan" aria-label={`Lihat rincian perkiraan panen, ${formatKg(info.hasilKg)} kg`}>
              <p className="ghm-label">Perkiraan hasil panen</p>
              <div className="ghm-angka-baris"><span className="ghm-angka-besar">{formatKg(info.hasilKg)}</span><span className="ghm-judul-bagian">kg</span></div>
              <span className="ghm-rincian">Rincian <IconChevron size={20} /></span>
            </Link>
          )}

          <h2 className="ghm-judul-bagian ghm-subjudul">Jadwal fase</h2>
          {info.jadwal.length === 0 ? (
            <p className="ghm-kartu ghm-kecil">Belum ada fase yang dicatat.</p>
          ) : (
            <ol className="ghm-kartu ghm-linimasa">
              {info.jadwal.map((b) => (
                <li key={b.kunci} className={b.status}>
                  <span className="titik" aria-hidden="true" />
                  <div>
                    <div className="ghm-linimasa-atas"><strong>{b.judul}</strong><small className="ghm-kecil">{b.tanggal}</small></div>
                    <p className="ghm-kecil">{b.keterangan}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <h2 className="ghm-judul-bagian ghm-subjudul">Kelola siklus</h2>
          <div className="ghm-aksi-kolom">
            <TombolLink href={`/app/maggot/${id}/ubah`} varian="garis">Ubah data siklus</TombolLink>
            {info.pembesaran && <TombolLink href={`/app/maggot/${id}/fase-besar/ubah`} varian="garis">Ubah catatan fase besar</TombolLink>}
            <Tombol varian="bahaya" onClick={() => setKonfirmasiHapus(true)} disabled={menghitung}>Hapus siklus</Tombol>
          </div>
        </>
      )}
      {konfirmasiHapus && (
        <Dialog
          judul={`Hapus siklus ${id}?`}
          pesan="Semua catatan fase dan perkiraan panen siklus ini ikut terhapus dan tidak bisa dikembalikan."
          ya="Hapus"
          sibuk={sibukHapus}
          onBatal={() => setKonfirmasiHapus(false)}
          onYa={hapusSiklus}
        />
      )}
    </Layar>
  );
}

// ===================================================== Catat fase besar

/** Catat fase besar; dengan `ubah` dipakai untuk mengubah / menghapus fase besar yang sudah dicatat. */
export function FaseBesarScreen({ ubah = false }) {
  const boleh = useRequireAuth();
  const { toast } = useSession();
  const router = useRouter();
  const { id } = useParams();
  const params = useSearchParams();
  const hanyaPanen = !ubah && params.get("mode") === "panen";
  const detail = useMuat(() => api(`/siklus/${id}`), [id], boleh);
  const siklus = detail.data?.data;
  const mulai = parseServerDate(siklus?.tanggalMulai);
  const pembesaran = cariFase(siklus?.fase, "PEMBESARAN");
  const [tanggal, setTanggal] = useState(() => nilaiInputTanggal());
  const [pakan, setPakan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [galat, setGalat] = useState(null);
  const [status, setStatus] = useState(null); // null | "simpan" | "hitung" | "hapus"
  const [terisi, setTerisi] = useState(!ubah);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);

  useEffect(() => {
    if (!siklus) return;
    if (ubah && !terisi) {
      // Mode ubah: isi form dari catatan fase besar (sekali saja).
      if (pembesaran) {
        setTanggal(tanggalSaja(pembesaran.tanggal));
        const gram = pakanGramSiklus(siklus.fase);
        setPakan(gram ? String(gram / 1000).replace(".", ",") : "");
        setKeterangan(pembesaran.keterangan || "");
      }
      setTerisi(true);
      return;
    }
    // Fase besar tidak boleh sebelum tanggal mulai siklus.
    if (!ubah && mulai && tanggal < nilaiInputTanggal(mulai)) setTanggal(nilaiInputTanggal(mulai));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siklus]);

  const simpanUbah = async (pakanKg) => {
    const pakanBerubah = Math.abs(pakanKg * 1000 - (pakanGramSiklus(siklus.fase) || 0)) > 0.0001;
    setStatus(pakanBerubah && perkiraanSiklus(siklus).panen ? "hitung" : "simpan");
    try {
      await api(`/siklus/${id}/fase/${pembesaran.id}`, {
        method: "PUT",
        timeout: 60000,
        body: { tanggal, jumlahMakanan: pakanKg * 1000, keterangan: keterangan.trim() || null },
      });
      toast("Catatan fase besar diperbarui");
      router.replace(`/app/maggot/${id}`);
    } catch (err) {
      toast(`Gagal menyimpan: ${pesanDari(err)}`, 5000);
      setStatus(null);
    }
  };

  const hapusFaseBesar = async () => {
    setStatus("hapus");
    try {
      await api(`/siklus/${id}/fase/${pembesaran.id}`, { method: "DELETE" });
      toast("Catatan fase besar dihapus");
      router.replace(`/app/maggot/${id}`);
    } catch (err) {
      toast(`Gagal menghapus: ${pesanDari(err)}`, 5000);
      setStatus(null);
      setKonfirmasiHapus(false);
    }
  };

  const tersimpanDiHp = () => {
    toast(PESAN_TERSIMPAN_DI_HP, 5000);
    router.replace(`/app/maggot/${id}`);
  };

  const simpan = async () => {
    const pakanKg = bacaAngka(pakan);
    if (pakanKg === null || pakanKg <= 0) { setGalat("Isi jumlah pakan dalam kg, lebih dari 0"); return; }
    if (ubah) { await simpanUbah(pakanKg); return; }
    const telurGram = Number(siklus?.jumlahTelur) || 0;
    if (telurGram <= 0) { toast("Jumlah telur siklus ini tidak ditemukan, jadi perkiraan panen tidak bisa dihitung.", 5000); return; }
    const pakanGram = pakanKg * 1000;
    const ket = keterangan.trim();
    const siklusId = Number(id);

    if (!hanyaPanen) {
      setStatus("simpan");
      try {
        await api(`/siklus/${id}/fase`, { method: "POST", body: { jenis: "PEMBESARAN", tanggal, jumlahMakanan: pakanGram, keterangan: ket || null } });
      } catch (err) {
        if (perluDiantrekan(err)) {
          // Tidak ada internet: fase besar + perhitungan perkiraan disimpan di HP.
          antrekan(JENIS.FASE_BESAR, { siklusId, tanggal, pakanKg, telurGram, keterangan: ket });
          tersimpanDiHp();
          return;
        }
        setStatus(null);
        toast(`Gagal menyimpan: ${pesanDari(err)}`, 5000);
        return;
      }
    }
    // Prediksi AI bisa ±15 detik: beri tahu pengguna supaya tidak mengira aplikasi macet.
    setStatus("hitung");
    try {
      await kirimFasePanen(id, tanggal, telurGram, pakanGram, ket);
      toast("Fase besar tersimpan");
      router.replace(`/app/maggot/${id}/perkiraan`);
    } catch (err) {
      if (perluDiantrekan(err)) {
        // Fase besar sudah tersimpan; cukup antrekan perhitungan perkiraannya.
        antrekan(JENIS.PERKIRAAN, { siklusId, tanggal, telurGram, pakanGram, keterangan: ket });
        tersimpanDiHp();
        return;
      }
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
  if (ubah && siklus && !pembesaran) {
    return (
      <Layar footer={<TombolLink href={`/app/maggot/${id}`} varian="garis">Kembali ke siklus</TombolLink>}>
        <BilahAtas kembali={`/app/maggot/${id}`} judul={`Siklus ${id}`} />
        <p className="ghm-kartu ghm-kecil">Fase besar siklus ini belum dicatat.</p>
      </Layar>
    );
  }
  const teksTombol = status === "hitung" ? (ubah ? "Menghitung ulang perkiraan…" : "Menghitung perkiraan panen…")
    : status ? "Memproses…" : ubah ? "Simpan perubahan" : "Simpan dan lihat perkiraan";
  return (
    <Layar footer={<Tombol onClick={simpan} disabled={sibuk || !siklus || (ubah && !terisi)}>{teksTombol}</Tombol>}>
      <BilahAtas kembali={`/app/maggot/${id}`} judul={`Siklus ${id}`} sub={mulai ? hariKeTeks(mulai) : undefined} disabled={sibuk} />
      <h1 className="ghm-judul-layar">{ubah ? "Ubah catatan fase besar" : "Catat fase besar"}</h1>
      {detail.error && !siklus ? <GalatMuat pesan={detail.error} onCobaLagi={detail.muat} /> : ubah && !terisi ? <Memuat /> : (
        <>
          {mulai && <Pita fase={faseSopDari(mulai)} />}
          <Isian label="Tanggal masuk fase besar">
            {(attrs) => <div className="ghm-input-wrap"><span className="ghm-input-ikon kiri"><IconKalender size={22} /></span><input {...attrs} className="ghm-input ada-ikon" type="date" value={tanggal} min={mulai ? nilaiInputTanggal(mulai) : undefined} onChange={(e) => setTanggal(e.target.value)} disabled={sibuk} /></div>}
          </Isian>
          <Isian label="Jumlah pakan (kg)" galat={galat} bantuan="Total pakan yang diberikan selama fase besar.">
            {(attrs) => <input {...attrs} className="ghm-input" inputMode="decimal" value={pakan} onChange={(e) => { setPakan(e.target.value); setGalat(null); }} placeholder="Contoh: 40" disabled={sibuk} />}
          </Isian>
          <Isian label="Keterangan (boleh dikosongkan)">
            {(attrs) => <textarea {...attrs} className="ghm-input" rows={2} maxLength={1000} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Misal: pakan sisa sayur dari pasar" disabled={sibuk} />}
          </Isian>
          <p className="ghm-info"><IconInfo size={22} />{ubah ? "Bila jumlah pakan diubah, perkiraan hasil panen dihitung ulang." : "Setelah disimpan, perkiraan hasil panen langsung muncul."}</p>
          {ubah && (
            <Tombol varian="bahaya" onClick={() => setKonfirmasiHapus(true)} disabled={sibuk}>Hapus catatan fase besar</Tombol>
          )}
        </>
      )}
      {konfirmasiHapus && (
        <Dialog
          judul="Hapus catatan fase besar?"
          pesan="Data pakan dan perkiraan panen siklus ini ikut terhapus. Setelah itu fase besar bisa dicatat lagi."
          ya="Hapus"
          sibuk={status === "hapus"}
          onBatal={() => setKonfirmasiHapus(false)}
          onYa={hapusFaseBesar}
        />
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
