# Sistem Peminjaman Ruangan â€” IDB Bali

Aplikasi web untuk sivitas akademika **Institut Desain dan Bisnis Bali (IDB Bali)**:
melihat katalog dan ketersediaan ruangan, mengajukan peminjaman, memantau status,
serta membantu admin sarana prasarana mengambil keputusan tanpa jadwal bertabrakan.

- Seluruh antarmuka berbahasa Indonesia.
- Seluruh tanggal dan jam ditampilkan dalam **WITA (Asia/Makassar)**.
- Stack: **Next.js 15 (App Router) + TypeScript + Tailwind CSS + PostgreSQL + Prisma + Zod + React Hook Form**.

> **Catatan kejujuran data & integrasi**
> - Data ruangan pada `prisma/rooms-data.ts` mengikuti **laman resmi Fasilitas Kampus IDB Bali**
>   (https://www.idbbali.ac.id/fasilitas-kampus/), termasuk nama, deskripsi, dan foto di
>   `public/images/ruangan/`. Hanya ruang yang relevan untuk peminjaman yang dimasukkan;
>   fasilitas umum seperti kantin, lobby, asrama, dan loket akademik tidak termasuk.
> - Nilai `floor = 0` atau `capacity = 0` berarti data tersebut **belum tercatat** di
>   sumber resmi, bukan angka sebenarnya. UI menampilkannya sebagai "belum tercatat".
> - **SSO kampus belum terintegrasi.** Autentikasi yang berjalan adalah login lokal
>   (email + kata sandi, bcrypt, sesi JWT httpOnly). Titik integrasi SSO disediakan
>   di `src/server/auth/sso.ts` tetapi belum ada adapter yang diimplementasikan.
> - **Email belum terkirim sungguhan** selama `EMAIL_PROVIDER=log`. Pada mode ini
>   email hanya dicatat metadatanya di server dan status pengiriman ditandai
>   `SKIPPED`. Kirim nyata baru terjadi setelah SMTP dikonfigurasi.
> - Aturan H-2, maksimal 30 hari, dan durasi maksimal 8 jam adalah **draf
>   pengembangan**, bukan kebijakan resmi yang telah disahkan.

---

## 1. Fitur MVP

### Pemohon
- Login/logout, sesi aman, pembatasan percobaan login.
- Dashboard ringkasan (menunggu/disetujui/ditolak/dibatalkan), jadwal mendatang.
- Katalog ruangan + pencarian + ketersediaan per tanggal.
- Detail ruangan: fasilitas, kapasitas, jadwal, status per jam.
- Kalender ketersediaan seluruh ruangan (hijau/kuning/merah/abu-abu).
- Form pengajuan dengan validasi klien + server, ringkasan sebelum kirim,
  deteksi bentrok, dan saran jadwal alternatif.
- Riwayat pengajuan sendiri (filter status + pencarian), detail, pembatalan.
- Notifikasi in-app + email (bila SMTP dikonfigurasi).

### Admin sarana prasarana
- Dashboard statistik ruangan dan pengajuan, daftar menunggu keputusan.
- Manajemen pengajuan: filter tanggal/ruangan/status/pencarian, detail pemohon.
- Persetujuan dengan pemeriksaan ulang bentrok; penolakan **wajib beralasan**.
- Manajemen ruangan: tambah, ubah, aktif/nonaktif (tanpa hapus permanen).
- Jadwal seluruh ruangan per jam + blokir jadwal (manual / jadwal akademik).

---

## 2. Arsitektur singkat

```
src/
â”œâ”€ app/
â”‚  â”œâ”€ (app)/                  halaman setelah login (dashboard, ruangan, kalender,
â”‚  â”‚                          pengajuan, riwayat, admin)
â”‚  â”œâ”€ api/                    route handler REST (validasi, otorisasi, error aman)
â”‚  â””â”€ login/                  halaman & form login
â”œâ”€ components/                komponen UI (server-safe & client interaktif)
â”œâ”€ lib/                       prisma, konfigurasi, validasi zod, waktu WITA, API helper
â”œâ”€ middleware.ts              guard rute berbasis token sesi (edge)
â””â”€ server/
   â”œâ”€ auth/                   password, sesi, autentikasi, rate limit, stub SSO
   â””â”€ services/               logika bisnis: booking, room, availability,
                              notification, email, audit
prisma/
â”œâ”€ schema.prisma
â”œâ”€ migrations/                termasuk constraint EXCLUDE anti double-booking
â””â”€ seed.ts
tests/                        pengujian integrasi terhadap PostgreSQL sungguhan
scripts/                      database lokal, E2E browser
```

Prinsip penting:
- **Halaman** membaca data langsung melalui service (server component), sehingga
  data awal cepat tampil.
- **Mutasi** memakai endpoint `/api/*` dengan validasi Zod, pemeriksaan peran, dan
  penanganan error yang tidak membocorkan detail internal.
- **Aturan bisnis** berada di `src/server/services/*`, bukan di komponen UI.

---

## 3. Prasyarat

- Node.js 20+ (diuji dengan Node 24)
- PostgreSQL 14+ (produksi/pengembangan mandiri), **atau** PostgreSQL lokal
  bawaan proyek untuk pengembangan tanpa instalasi server.

---

## 4. Instalasi

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Isi `.env` minimal:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/idb_booking?schema=public"
AUTH_SECRET="<string acak minimal 32 karakter>"
```

Membuat `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Opsi A â€” PostgreSQL lokal bawaan (tanpa instalasi)

Proyek menyertakan binary PostgreSQL untuk Windows melalui `@embedded-postgres`.
Data cluster disimpan **di luar** folder proyek (default `~/.idb-room-booking/pgdata`)
agar tidak ikut tersinkronisasi OneDrive.

```bash
npm run db:local:init     # sekali: buat cluster + database idb_booking & idb_test
npm run db:local:start    # jalankan server di port 55432
npm run db:local:stop     # hentikan
```

### Opsi B â€” PostgreSQL yang sudah ada

Buat database lalu arahkan `DATABASE_URL` ke server tersebut, contoh:

```sql
CREATE DATABASE idb_booking;
CREATE DATABASE idb_test;   -- dipakai pengujian otomatis
```

```dotenv
DATABASE_URL="postgresql://user:password@localhost:5432/idb_booking?schema=public"
```

### Migrasi & seed

```bash
npx prisma generate
npx prisma migrate deploy     # menerapkan semua migrasi
npm run db:seed               # katalog ruangan IDB Bali + akun demo
```

Jika database sudah berisi katalog lama dan ingin diselaraskan tanpa menghapus
riwayat peminjaman (ruangan dipetakan ke padanan barunya):

```bash
npx tsx scripts/sync-rooms.ts
```

Untuk pengembangan dengan pembuatan migrasi baru:

```bash
npx prisma migrate dev --name nama_perubahan
```

---

## 5. Menjalankan aplikasi

```bash
npm run dev          # http://localhost:3000
```

Produksi:

```bash
npm run build
npm run start
```

Cookie sesi ditandai `Secure` bila `APP_URL` diawali `https://`. Untuk uji
produksi lokal di `http://localhost:3000`, biarkan `APP_URL` http agar login tetap
berfungsi; di server nyata selalu gunakan HTTPS.

### Akun demo (hanya non-produksi)

Dibuat oleh seed bila `SEED_DEMO_ACCOUNTS=true` **dan** `NODE_ENV !== production`.

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Pemohon | `mariodharma@gmail.com` | `mariodharma` |
| Admin | `admin@demo.idb.ac.id` | `Admin123!` |

Seed menolak membuat akun demo di produksi. Ganti kata sandi bila lingkungan
pengembangan dipakai bersama.

---

## 6. Aturan bisnis

| Aturan | Implementasi |
| --- | --- |
| Tidak boleh ada dua peminjaman **disetujui** yang bertumpang tindih | Pemeriksaan di service + `EXCLUDE USING gist` pada tabel `Booking` (hanya status `APPROVED`) |
| Pemeriksaan saat pengajuan dan saat persetujuan | `createBooking()` dan `approveBooking()` memanggil pemeriksaan bentrok |
| Pemeriksaan di server & database | `findApprovedConflicts()` + constraint PostgreSQL, bukan hanya UI |
| Aman terhadap permintaan bersamaan | Transaksi + `SELECT ... FOR UPDATE` pada baris `Room` + exclusion constraint |
| Penolakan wajib beralasan | `bookingRejectSchema` (min. 5 karakter) divalidasi di service & API |
| Pemohon hanya membatalkan miliknya | `cancelBooking()` memeriksa `booking.userId === actor.id` |
| Ruangan tersedia lagi setelah pembatalan | Status `CANCELLED`; constraint hanya mengunci `APPROVED` |
| Pengajuan menunggu â‰  disetujui | Status `PENDING` ditampilkan kuning, tidak mengunci jadwal |
| Zona waktu konsisten | Disimpan `timestamptz`, dihitung/ditampilkan lewat `date-fns-tz` (Asia/Makassar) |
| Prioritas jadwal kuliah | Tabel `RoomScheduleBlock` (sumber `MANUAL`/`ACADEMIC_SCHEDULE`) sudah tersedia |
| Batas pengajuan mudah diubah | Env `BOOKING_MIN_LEAD_DAYS`, `BOOKING_MAX_ADVANCE_DAYS`, `BOOKING_MAX_DURATION_HOURS`, jam operasional |

Batasan yang perlu diketahui:
- Blokir jadwal mencegah **pengajuan baru** dan **persetujuan**; blokir tidak
  membatalkan peminjaman yang sudah disetujui sebelumnya. Admin harus
  membatalkannya secara eksplisit agar jejaknya tercatat.
- Pengajuan `PENDING` yang bertumpang tindih satu sama lain tetap diperbolehkan
  (sesuai PRD: yang dilarang adalah dua peminjaman **disetujui**). Persetujuan
  hanya berhasil untuk satu pengajuan.

---

## 7. Email

Konfigurasi melalui environment:

```dotenv
EMAIL_PROVIDER="smtp"        # log | smtp
SMTP_HOST="smtp.contoh.ac.id"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="..."
SMTP_PASSWORD="..."
EMAIL_FROM="Sistem Peminjaman Ruangan IDB Bali <no-reply@idb.ac.id>"
ADMIN_NOTIFICATION_EMAIL="sarpras@idb.ac.id"
```

- `EMAIL_PROVIDER=log` (default): email **tidak dikirim**, hanya dicatat
  metadatanya; status notifikasi `SKIPPED`.
- `EMAIL_PROVIDER=smtp`: pengiriman nyata, status `SENT`/`FAILED` disimpan pada
  kolom `Notification.emailStatus`.
- Penyedia dapat diganti tanpa menyentuh logika bisnis: implementasikan
  `EmailProvider` di `src/server/services/email.ts`.
- Kegagalan email tidak menggagalkan peminjaman; tidak ada klaim "email terkirim"
  bila status bukan `SENT`.

---

## 8. Keamanan & privasi

- Kata sandi di-hash **bcrypt (12 rounds)**, tidak pernah disimpan/di-log mentah.
- Sesi berupa JWT HS256 di cookie `httpOnly`, `SameSite=Lax`, `Secure` di produksi.
- Peran diperiksa di setiap endpoint (`requireUser`, `requireAdmin`) dan di guard
  rute; menyembunyikan tombol bukan satu-satunya kontrol.
- Data pengajuan hanya dapat dibaca pemilik atau admin.
- Validasi ganda: Zod di form dan di service/API.
- Pemeriksaan origin untuk permintaan mutasi (CSRF tambahan).
- Rate limit percobaan login (in-memory, 8 percobaan/15 menit per email+IP).
- Pesan error API tidak membocorkan detail internal; detail teknis hanya di log server.
- Audit log mencatat login, pembuatan, keputusan, pembatalan, dan perubahan ruangan.
- Notifikasi email mencatat status pengiriman; isi email tidak ditulis ke log.
- Kepatuhan UU PDP: minimalkan data pribadi, batasi akses ke pemilik/admin, dan
  sediakan dasar untuk retensi/penghapusan data pada tahap operasional.

**Wajib untuk produksi:** jalankan di balik HTTPS (`APP_URL=https://...`), gunakan
`AUTH_SECRET` acak yang kuat, nonaktifkan `SEED_DEMO_ACCOUNTS`, dan batasi akses
database.

---

## 9. Pengujian

### Tes integrasi (database sungguhan)

```bash
npm run db:local:start   # bila memakai PostgreSQL lokal bawaan
npm test
```

Menggunakan database terpisah `idb_test` (dapat diubah lewat `TEST_DATABASE_URL`).
`tests/global-setup.ts` menjalankan `prisma migrate deploy` pada database uji.

Cakupan (27 tes):

| Berkas | Isi |
| --- | --- |
| `tests/auth.test.ts` | login berhasil/gagal, akun nonaktif, pemohon ditolak dari `/admin`, token dimodifikasi ditolak |
| `tests/bookings.test.ts` | pengajuan valid, jam selesai < mulai, kapasitas, bentrok dengan yang disetujui, persetujuan, penolakan tanpa alasan, isolasi data, pembatalan & ruangan kembali tersedia |
| `tests/concurrency.test.ts` | banyak pengajuan `PENDING` tidak dianggap disetujui; 5 persetujuan bersamaan â†’ tepat 1 berhasil; constraint DB menolak insert bentrok |
| `tests/availability.test.ts` | status hijau/kuning/merah/abu-abu, blokir jadwal menolak pengajuan, jam operasional |

### Lint & pemeriksaan tipe

```bash
npm run lint         # ESLint (next/core-web-vitals + TypeScript)
npm run typecheck    # tsc --noEmit
```

### Build produksi

```bash
npm run build
```

### End-to-end browser (opsional)

Menjalankan Chrome melalui Playwright untuk alur login â†’ ajukan â†’ setujui â†’
batalkan, lalu menyimpan tangkapan layar ke `docs/screenshots/`.

```bash
npm run dev            # terminal 1
npm run test:e2e       # terminal 2
```

Membutuhkan akun demo hasil seed dan Chrome terpasang. Tangkapan layar hasil
pemeriksaan tersimpan di `docs/screenshots/`.

### Tangkapan layar

| Berkas | Halaman |
| --- | --- |
| `docs/screenshots/01-dashboard-pemohon.png` | Dashboard pemohon |
| `docs/screenshots/02-katalog-ruangan.png` | Katalog ruangan |
| `docs/screenshots/04-kalender.png` | Kalender ketersediaan |
| `docs/screenshots/05-detail-pengajuan.png` | Detail pengajuan |
| `docs/screenshots/06-dashboard-admin.png` | Dashboard admin |
| `docs/screenshots/07-admin-persetujuan.png` | Admin menyetujui pengajuan |
| `docs/screenshots/09-dashboard-ponsel.png` | Tampilan ponsel |
| `docs/screenshots/10-kalender-ponsel.png` | Kalender pada ponsel |

---

## 10. Tujuan non-fungsional & operasional

- **Responsif**: tata letak mobile-first, navigasi bawah pada ponsel, tabel dapat
  digeser horizontal.
- **Aksesibilitas dasar**: label form, fokus keyboard terlihat, `aria-*` pada
  dialog/notifikasi, kontras memadai, tombol nonaktif jelas.
- **Kinerja**: halaman ketersediaan hanya mengambil data satu hari; indeks
  `Booking(roomId, startAt, endAt)` dan `Booking(status, startAt)` tersedia.
- **Skala**: arsitektur stateless + PostgreSQL; 500 pengguna aktif/100 pengajuan
  per hari adalah target yang perlu divalidasi dengan uji beban pada infrastruktur
  nyata, bukan jaminan dari kode.
- **Uptime 99,5% & backup harian**: tanggung jawab deployment/operasional
  (bukan otomatis terpenuhi oleh aplikasi). Gunakan `pg_dump` terjadwal + uji
  restore berkala.

---

## 11. Deployment (ringkas)

1. Sediakan PostgreSQL terkelola + database `idb_booking`.
2. Set environment produksi: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` (HTTPS),
   `EMAIL_PROVIDER=smtp` + kredensial, `SEED_DEMO_ACCOUNTS=false`.
3. `npm ci && npx prisma migrate deploy && npm run build && npm run start`.
4. Jalankan di balik reverse proxy HTTPS; batasi akses database.
5. Siapkan backup harian dan monitoring.

---

## 12. Batasan MVP & pengembangan lanjutan

Belum termasuk (sesuai batasan MVP): pembayaran sewa, peminjam luar kampus,
peminjaman peralatan, persetujuan berjenjang, aplikasi native, WhatsApp,
sinkronisasi Google Calendar/iCal, impor jadwal kuliah otomatis, QR check-in,
analitik lanjutan/ekspor.

Titik perluasan yang sudah disiapkan:
- `RoomScheduleBlock.source = ACADEMIC_SCHEDULE` untuk impor jadwal kuliah.
- `src/server/auth/sso.ts` untuk SSO kampus (peran tetap dari database).
- `EmailProvider` untuk penyedia email lain.
- `AuditLog` untuk kebutuhan pelaporan/forensik.
- `Booking.status` memungkinkan penambahan alur (mis. `CHECKED_IN`) melalui migrasi.
