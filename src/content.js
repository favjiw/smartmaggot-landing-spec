export const content = {
  whatsapp: "6281234567890",
  address: "Jl. Sukamulya A, Mengger, Kec. Bandung Kidul, Kota Bandung, Jawa Barat 40267",
  mapsUrl: "https://www.google.com/maps?q=-6.960887,107.636193",
  mapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.4099187932807!2d107.633479775846!3d-6.96087606815471!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e68e9006795b20b%3A0x91b6bda2825f6fc3!2sRumah%20Maggot%20Kelurahan%20Mengger!5e0!3m2!1sid!2sid!4v1794484691598!5m2!1sid!2sid",
  programs: [
    ["01", "Program 1", ""],
    ["02", "Program 2", ""],
    ["03", "Program 3", ""],
  ],
  products: [
    { id: "maggot-segar", name: "Maggot Segar", description: "Larva BSF segar berprotein tinggi untuk pakan ikan dan unggas.", price: 8000, unit: "kg", status: "Tersedia", photo: 0, photoUrl: "/assets/products/maggot-segar.webp" },
    { id: "kasgot", name: "Kasgot (Pupuk Organik)", description: "Pupuk organik padat kaya mikroba untuk menyuburkan tanaman sayur dan hias.", price: 15000, unit: "karung", status: "Tersedia", photo: 4 },
    { id: "maggot-kering", name: "Maggot Kering", description: "Pakan bernutrisi dengan masa simpan lebih panjang dan mudah didistribusikan.", price: 45000, unit: "kg", status: "Pre-order", photo: 5 },
  ],
  activities: [
    { slug: "panen-perdana-maggot", category: "Panen & Produksi", date: "2026-11-10", title: "Panen Raya Maggot Siklus ke-24 di Hanggar Mengger", summary: "Keberhasilan panen biomassa maggot BSF seberat 420 kg untuk kebutuhan pakan peternak lokal.", photo: 0 },
    { slug: "sosialisasi-biokonversi", category: "Sosialisasi Warga", date: "2026-11-04", title: "Sosialisasi Pemilahan Sampah RW 03", summary: "Edukasi intensif pemilahan sampah organik dapur bersama kader PKK warga Mengger.", photo: 1 },
    { slug: "uji-coba-panen-sayur", category: "Panen & Produksi", date: "2026-10-28", title: "Uji Coba Panen Sayur Pupuk Kasgot", summary: "Penerapan kasgot pada kebun warga menunjukkan hasil panen yang lebih sehat.", photo: 2 },
    { slug: "pelatihan-budidaya-maggot", category: "Bimtek Warga", date: "2026-10-17", title: "Pelatihan Budidaya Maggot Tingkat RT", summary: "Pelatihan teknis operasional BSF untuk kader lingkungan dan pengurus RT.", photo: 3 },
    { slug: "kunjungan-edukasi", category: "Kunjungan & Studi", date: "2026-10-11", title: "Kunjungan Studi Banding DLH Bandung", summary: "Apresiasi dan penguatan jejaring program sirkular berbasis komunitas.", photo: 5 },
    { slug: "penyaluran-kasgot", category: "Panen & Produksi", date: "2026-10-03", title: "Pengemasan & Distribusi Kasgot Batch 12", summary: "Penyaluran pupuk organik untuk kebun produktif dan urban farming warga.", photo: 4 },
  ],
};

export const detailCopy = [
  "Kegiatan panen raya siklus ke-24 di Hanggar TPS3R Kelurahan Mengger kembali menorehkan capaian penting. Selama siklus pemeliharaan 18 hari, hanggar berhasil mendekomposisi total 1.234,5 kg sampah organik dapur dari 5 RW, menghasilkan 420 kg biomassa larva BSF segar berprotein tinggi.",
  "Kandungan protein mencapai 42% menjadikan larva panen langsung dipasok ke peternak lele dan unggas lokal dengan harga ramah peternak tanpa perantara.",
  "Selain menekan timbunan ke TPA Sarimukti, proses ini memproduksi 350 kg pupuk kasgot padat kaya hara untuk kebutuhan urban farming warga Mengger.",
];

const activityPhotos = ["panen", "pemilahan", "pelatihan", "sosialisasi", "kasgot", "kunjungan"];

// Data cadangan ketika database belum tersedia, berbentuk sama dengan respons /api/public/catalog.
export const fallbackPublic = {
  products: content.products.map((product) => ({ ...product, photo_url: product.photoUrl ?? `/assets/activities/${activityPhotos[product.photo] ?? "panen"}.webp`, stock_status: product.status })),
  activities: content.activities.map((activity) => ({ ...activity, activity_date: activity.date, photos: [`/assets/activities/${activityPhotos[activity.photo]}.webp`] })),
  settings: { partner_name: "Sinergi Garda Hijau Mengger", whatsapp: content.whatsapp, address: content.address, show_catalog: true, show_stock_status: true },
};
