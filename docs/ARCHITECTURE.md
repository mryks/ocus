# Arsitektur

## Aplikasi statis

React 19, Vite, TypeScript, React Router, Zod, Lucide (ikon fungsional), serta DM Sans lokal dari Fontsource. Identitas memakai logo SVG OCUS. dari pengguna. Homepage langsung menampilkan katalog, tanpa hero/slogan pemasaran. CSS menggunakan token warna, spasi, dan radius tanpa framework UI tambahan. Alur latihan tetap statis. Sesuai permintaan lanjutan pengguna, pelaporan protes mempunyai API kecil dan penyimpanan terpisah; layanan cloud belum dibuat/dihubungkan. Instalasi dependency dikunci oleh `package-lock.json`.

```
modul/                         sumber lokal, read-only, tidak dilayani web
content/private/               inventarisasi, ekstraksi, draft, approval internal
reports/                       laporan lokal
scripts/content.ts             CLI inventarisasi/ekstraksi/validasi/integrasi
scripts/extract_pdf.py          ekstraktor PDF per halaman (pypdf)
src/content/catalog.json       hanya data akademik disetujui
src/domain/content.ts          skema Zod dan bentuk hash deterministik
src/domain/session.ts          state, pengacakan, deadline, transisi, skor
src/domain/storage.ts          penyimpanan dan validasi runtime sesi
src/hooks/useSession.ts        autosave sinkron, pemulihan, deteksi lintas tab
src/components/                dialog native dan rendering blok konten
src/App.tsx                    alur katalog/persiapan/ujian/hasil/pembahasan
src/dev/fixture.ts             fixture nonmedis khusus Vite development
public/assets/content/         hanya aset yang diizinkan, bila diperlukan
tests/                         unit dan browser
```

## Routing

- `/`: katalog.
- `/panduan`, `/privasi`: petunjuk penggunaan dan data lokal.
- `/modul/:moduleId/paket/:packageId`: persiapan dan tawaran resume.
- Tambahan `/ujian`, `/hasil`, `/pembahasan`: pengerjaan, ringkasan, dan review.
- `/dev/...`: salinan alur dengan fixture hanya saat `import.meta.env.DEV`. Dynamic import dieliminasi pada produksi.

## Data akademik

Modul menyimpan ID internal dan judul persis nama folder. ID dihasilkan dari slug terbaca ditambah 12 digit hash nama asli untuk menghindari bentrok normalisasi Unicode. Penggantian nama folder mengubah ID: perlakukan sebagai migrasi yang perlu ditinjau, bukan penggantian otomatis.

Paket memuat judul, deskripsi, rekomendasi durasi opsional, versi SHA-256, seluruh soal, serta bukti persetujuan. Soal memiliki ID, blok teks/gambar/tabel, opsi ber-ID tetap, satu `correctOptionId`, pembahasan, referensi, status verifikasi, dan provenance (nama file, lokasi, nomor, kunci asli). HTML bebas tidak dirender; React menampilkan teks. URL referensi dibatasi HTTPS dan aset lokal pada direktori khusus.

Hash paket dihitung dari bentuk JSON deterministik yang mencakup ID/judul modul dan seluruh isi akademik paket; tidak memasukkan bukti persetujuan itu sendiri. Build menolak mismatch hash, soal bermasalah, opsi/kunci tidak konsisten, ID duplikat, paket pending, dan aset rujukan yang hilang.

Persetujuan adalah kontrol workflow lokal dengan bukti keputusan pengguna, bukan tanda tangan kriptografis atau sistem otorisasi server.

## State sesi

Satu sesi terakhir per paket memakai key `cbt:v1:<moduleId>:<packageId>` di localStorage. State memuat ID sesi, versi paket, urutan soal dan opsi, jawaban, flags, nomor aktif, settings, waktu mulai, deadline, status/penyebab/waktu selesai, dan revision.

Setiap tindakan memeriksa deadline sebelum diterima. Jawaban yang datang tepat pada/setelah deadline tidak mengubah jawaban terakhir. Tick, focus, dan visibility change memicu pemeriksaan deadline; refresh mengakhiri sesi yang kedaluwarsa. Interval bukan sumber kebenaran waktu.

Transisi setelah selesai tidak mengubah jawaban. Review memiliki indeks navigasi terpisah di memori, sehingga nilai dan data sesi selesai tidak berubah. Skor menggunakan seluruh soal sebagai penyebut.

Perubahan disimpan sinkron sebelum UI diperbarui. Kegagalan baca/tulis storage diberi peringatan; pengguna masih bisa melanjutkan di memori. Saat revisi lebih baru terdeteksi atau event storage dari tab lain muncul, pengeditan ditahan sampai sesi terbaru dimuat. Ini mengurangi konflik lintas tab; localStorage bukan database transaksional dan tidak menjamin penyelesaian race dua penulisan yang benar-benar bersamaan.

localStorage cocok untuk metadata jawaban yang kecil, tanpa gambar/PDF. Belum ada retensi otomatis berbasis usia atau riwayat sesi jamak. Pindah ke IndexedDB dapat dilakukan melalui adapter bila volume di masa depan memerlukannya.

## Batas validasi

Validasi teknis tidak menyimpulkan kebenaran medis. Verifikasi ilmiah, perubahan redaksi/kunci, hak distribusi materi, dan batas paket memerlukan pemeriksaan dan keputusan manusia. Ekstraksi teks tidak mempertahankan penanda warna atau memastikan gambar/tabel terbaca benar.

## Pelaporan protes

`src/domain/complaints.ts` memvalidasi kontrak laporan; `ComplaintButton` hanya ada pada pembahasan. Klien mengirim ID stabil, versi, urutan opsi yang dilihat, pilihan/usulan, dan alasan. Server mencocokkan dengan katalog approved lalu menyimpan snapshot kanonis dari soal dan kunci; kunci kiriman klien tidak diterima.

`server/complaints.ts` dipakai oleh middleware lokal Vite dan Pages Functions. SQL memakai parameter terikat. SQLite lokal disimpan di direktori private; D1 online menggunakan binding REPORTS_DB dan migrations/0001_complaints.sql. Tidak ada penilaian ujian atau penyimpanan seluruh sesi pada server.

POST /api/complaints menyimpan laporan dan mengembalikan tanda terima setelah INSERT berhasil. Submission ID membedakan percobaan baru dari retry, termasuk retry bersamaan. Body dibatasi 32 KiB; alasan 3.000 karakter; sumber 1.000 karakter. Identitas/opsi/version diverifikasi server, origin lintas situs ditolak dan batas pengiriman 120 laporan per penanda koneksi per jam diterapkan atomik. Penanda memakai hash alamat koneksi dengan secret server; IP asli tidak dicatat pada database.

GET /api/admin/complaints memerlukan bearer ADMIN_REPORT_TOKEN minimal 32 karakter, pagination berbasis waktu+ID, dan no-store. Halaman /pengelola/laporan menyimpan kunci akses hanya di memori tab sampai Keluar/reload, tanpa localStorage atau parameter URL. Daftar read-only; tidak ada balasan mahasiswa atau perubahan kunci otomatis. Respons gagal tidak ditampilkan sebagai laporan diterima.

Wrapper online hanya mengimpor katalog publik; fixture hanya di middleware development dan pengujian. _routes.json membatasi eksekusi Functions ke /api/*. Data akademik internal, kode server, database dan file env diblokir oleh Vite.

## Hosting Sites

Rilis publik memakai `server/site-handler.ts`, yang memanggil handler protes yang sama. `scripts/build-hosting.mjs` membuat Worker ESM dengan katalog approved dan aset publik sebagai data terbundel. Rute deep link dipetakan dari ID paket; endpoint development dan file privat tidak tersedia. Binding D1 `REPORTS_DB` serta migrasi `drizzle/` dinyatakan melalui manifest Sites. Secret server tetap berasal dari environment hosting.

HTML hasil build tepercaya mendapat SRI skrip dan CSP berbasis hash, tanpa unsafe-eval. Validator Zod memakai `jitless` agar tidak mencoba probe `new Function` yang diblokir CSP/Workers. Header CORP, COOP, nosniff, referrer/permissions policy dan HSTS awal 300 detik diterapkan pada respons. API menolak Origin/Fetch Metadata lintas situs sebelum autentikasi; responsnya no-store.

HTML memakai `Cache-Control: no-cache, no-transform` agar CDN tidak menyisipkan script JavaScript Detections pada dokumen yang dilindungi CSP hash/SRI. Ini mengikuti perilaku yang didokumentasikan Cloudflare; CSP tidak dilonggarkan untuk menjalankan script inline tambahan. Uji URL publik tetap memeriksa tidak ada pelanggaran CSP.

Persetujuan 47 soal tidak mengubah status ilmiah: 21 soal ambiguous mempunyai keputusan pengguna per ID pada `approval.sourceKeyDecisions`. Skema menolak pengecualian untuk ID salah/duplikat, unverified atau blocked; perubahan isi tetap membatalkan receipt versi lama.
