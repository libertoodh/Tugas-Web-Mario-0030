/**
 * Katalog ruangan IDB Bali.
 *
 * Sumber data dan foto: https://www.idbbali.ac.id/fasilitas-kampus/
 * Hanya ruang yang masuk akal untuk diajukan peminjaman yang dimasukkan.
 * Fasilitas umum seperti kantin, lobby, asrama, loket akademik, dan ruang dosen
 * tidak termasuk karena bukan ruang yang dipinjam lewat sistem ini.
 *
 * - floor 0 dan capacity 0 berarti belum tercatat di sumber resmi.
 * - Foto disimpan di public/images/ruangan/<slug>.jpg.
 */
export type RoomCatalogItem = {
  slug: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  category: string;
  facilities: string[];
  description: string;
  imageUrl: string;
};

export const ROOM_BUILDING = "Kampus IDB Bali";

export const ROOM_CATALOG: RoomCatalogItem[] = [
  {
    slug: "studio-gambar",
    name: "Studio Gambar",
    building: ROOM_BUILDING,
    floor: 0,
    capacity: 0,
    category: "Studio",
    facilities: ["Ruang luas", "AC"],
    description:
      "Ruang studio untuk perkuliahan yang menggunakan sketsa, membuat modeling, dan aktivitas lain yang memerlukan ruang luas. Dilengkapi AC untuk kenyamanan pembelajaran.",
    imageUrl: "/images/ruangan/studio-gambar.jpg",
  },
  {
    slug: "lab-komputer",
    name: "Lab Komputer",
    building: ROOM_BUILDING,
    floor: 1,
    capacity: 36,
    category: "Laboratorium",
    facilities: ["Komputer Intel 12th Gen", "GPU NVIDIA", "Jaringan LAN"],
    description:
      "Komputer dengan CPU Intel generasi ke-12 dan kartu grafis NVIDIA terbaru, terhubung melalui Local Area Network. Setiap kelas diisi maksimum 24–36 mahasiswa dan dapat digunakan seluruh program studi. Berada di lantai 1.",
    imageUrl: "/images/ruangan/lab-komputer.jpg",
  },
  {
    slug: "lab-imac",
    name: "Lab iMac",
    building: ROOM_BUILDING,
    floor: 1,
    capacity: 0,
    category: "Laboratorium",
    facilities: ["iMac M1", "macOS"],
    description:
      "Laboratorium dengan komputer berbasis macOS, iMac dengan chip M1, untuk menunjang praktik desain sesuai standar industri. Dapat digunakan seluruh program studi dan berada di lantai 1.",
    imageUrl: "/images/ruangan/lab-imac.jpg",
  },
  {
    slug: "ruang-kelas",
    name: "Ruang Kelas",
    building: ROOM_BUILDING,
    floor: 0,
    capacity: 0,
    category: "Ruang Kelas",
    facilities: ["LCD Proyektor", "Komputer presentasi", "Whiteboard", "Bangku kuliah"],
    description:
      "Ruang untuk perkuliahan non-praktik dengan LCD proyektor, komputer presentasi untuk dosen dan mahasiswa, whiteboard, serta bangku kuliah. Jumlah mahasiswa disesuaikan dengan kapasitas ruangan.",
    imageUrl: "/images/ruangan/ruang-kelas.jpg",
  },
  {
    slug: "lab-fashion-design",
    name: "Lab Fashion Design",
    building: ROOM_BUILDING,
    floor: 1,
    capacity: 0,
    category: "Laboratorium",
    facilities: ["Peralatan desain mode", "Area kerja praktik"],
    description:
      "Lab untuk mahasiswa Desain Mode dalam mengembangkan produk fashion secara digital maupun manual: eksplorasi teknik, pola, dan proses produksi. Berada di lantai 1.",
    imageUrl: "/images/ruangan/lab-fashion-design.jpg",
  },
  {
    slug: "studio-reproduksi-grafika",
    name: "Studio Reproduksi Grafika",
    building: ROOM_BUILDING,
    floor: 0,
    capacity: 0,
    category: "Studio",
    facilities: ["Peralatan cetak manual", "Media kain, kertas, plastik, kulit"],
    description:
      "Studio metode reproduksi grafika untuk menuangkan karya desain ke berbagai media yang tidak dapat dicetak langsung dengan mesin cetak biasa, seperti kain, kertas, plastik, dan kulit.",
    imageUrl: "/images/ruangan/studio-reproduksi-grafika.jpg",
  },
  {
    slug: "studio-maket",
    name: "Studio Maket",
    building: ROOM_BUILDING,
    floor: 0,
    capacity: 0,
    category: "Studio",
    facilities: ["Area kerja maket", "Peralatan maket"],
    description:
      "Studio untuk mengerjakan maket sebagai purwarupa karya desain interior, baik untuk tugas kuliah maupun tugas akhir, sebelum dieksekusi ke medium nyata.",
    imageUrl: "/images/ruangan/studio-maket.jpg",
  },
  {
    slug: "aula",
    name: "Aula",
    building: ROOM_BUILDING,
    floor: 0,
    capacity: 0,
    category: "Aula & Pertemuan",
    facilities: ["Fasilitas acara lengkap"],
    description:
      "Hall/aula dengan fasilitas lengkap untuk seminar, workshop, pelatihan, kegiatan UKM, dan acara kampus lainnya.",
    imageUrl: "/images/ruangan/aula.jpg",
  },
  {
    slug: "ruang-asistensi",
    name: "Ruang Asistensi",
    building: ROOM_BUILDING,
    floor: 3,
    capacity: 0,
    category: "Aula & Pertemuan",
    facilities: ["Tata ruang outdoor", "Taman mini", "Meja", "Tempat duduk"],
    description:
      "Ruang asistensi dengan tata ruang outdoor dan taman mini, dilengkapi meja serta tempat duduk. Berada di lantai 3.",
    imageUrl: "/images/ruangan/ruang-asistensi.jpg",
  },
  {
    slug: "ruang-meeting",
    name: "Ruang Meeting",
    building: ROOM_BUILDING,
    floor: 2,
    capacity: 0,
    category: "Aula & Pertemuan",
    facilities: ["Proyektor", "AC", "Meja melingkar", "Kursi", "Display karya mahasiswa"],
    description:
      "Ruang pertemuan untuk tamu dan karyawan dengan proyektor, AC, kursi, dan meja besar melingkar. Interiornya dihiasi display karya mahasiswa. Berada di lantai 2.",
    imageUrl: "/images/ruangan/ruang-meeting.jpg",
  },
  {
    slug: "creative-gallery",
    name: "Creative Gallery",
    building: ROOM_BUILDING,
    floor: 1,
    capacity: 0,
    category: "Galeri",
    facilities: ["Area pameran karya"],
    description:
      "Galeri hasil karya mahasiswa dari berbagai program studi, menampilkan bakat, jiwa kewirausahaan, dan kreativitas. Berada di lantai 1.",
    imageUrl: "/images/ruangan/creative-gallery.jpg",
  },
  {
    slug: "studio-pola",
    name: "Studio Pola",
    building: ROOM_BUILDING,
    floor: 1,
    capacity: 0,
    category: "Studio",
    facilities: ["Meja gambar pola", "Area potong bahan"],
    description:
      "Studio untuk mahasiswa Desain Mode menggambar pola sebagai kerangka awal karya fashion dan memotong bahan. Berada di lantai 1.",
    imageUrl: "/images/ruangan/studio-pola.jpg",
  },
  {
    slug: "studio-foto",
    name: "Studio Foto",
    building: ROOM_BUILDING,
    floor: 1,
    capacity: 0,
    category: "Studio",
    facilities: ["Background", "Properti penunjang"],
    description:
      "Studio untuk fotografi dan videografi dengan background serta properti penunjang. Dapat digunakan seluruh program studi. Berada di lantai 1.",
    imageUrl: "/images/ruangan/studio-foto.jpg",
  },
  {
    slug: "lab-software-development",
    name: "Lab Software Development",
    building: ROOM_BUILDING,
    floor: 0,
    capacity: 0,
    category: "Laboratorium",
    facilities: ["Komputer performa tinggi", "Internet cepat", "Peralatan praktikum"],
    description:
      "Laboratorium untuk praktikum, penelitian, dan pengembangan proyek teknologi informasi dan bisnis. Dilengkapi komputer performa tinggi, jaringan internet cepat, pencahayaan baik, dan tata letak ergonomis.",
    imageUrl: "/images/ruangan/ruang-stib.jpg",
  },
  {
    slug: "ruang-kelas-magister",
    name: "Ruang Kelas Magister",
    building: ROOM_BUILDING,
    floor: 0,
    capacity: 0,
    category: "Ruang Kelas",
    facilities: ["Kamera", "Peralatan digital"],
    description:
      "Ruang kelas untuk Program Magister dengan fasilitas modern, kamera, dan peralatan digital sehingga perkuliahan tatap muka maupun daring berjalan lancar.",
    imageUrl: "/images/ruangan/ruang-kelas-magister.jpg",
  },
  {
    slug: "gedung-serba-guna",
    name: "Gedung Serba Guna",
    building: ROOM_BUILDING,
    floor: 0,
    capacity: 0,
    category: "Fasilitas Umum",
    facilities: ["Area luas", "Parkir", "Area olahraga"],
    description:
      "Gedung berukuran besar yang dapat dipakai untuk berbagai aktivitas: parkir, olahraga, ekstrakurikuler, dan kegiatan lain yang memerlukan tempat luas.",
    imageUrl: "/images/ruangan/gedung-serba-guna.jpg",
  },
];
