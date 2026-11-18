# Protes kunci jawaban

Mahasiswa membuka **Report an answer** pada persiapan sebelum latihan atau pada pembahasan. Dari persiapan, cari dan pilih soal terlebih dahulu. Alasan wajib; jawaban usulan serta nama/inisial opsional. Tidak ada field sumber pendukung. Formulir tetap berada di website. Tidak ada akun mahasiswa, pengiriman email, tautan formulir eksternal, atau fitur balasan. Laporan tidak mengubah kunci maupun nilai.

## Memeriksa secara lokal

1. Jalankan `npm run dev` dan buka fixture nonmedis melalui `/dev` untuk menguji alur untuk menguji mesin sesi tanpa konten medis.
2. Selesaikan latihan, buka pembahasan, lalu kirim protes.
3. Buka `http://127.0.0.1:5173/admin/reports`.
4. Salin **nilai** `ADMIN_REPORT_TOKEN` dari `.env.local` ke kolom kunci akses. Jangan membagikan kunci ini kepada mahasiswa. Saat development pertama kali dijalankan tanpa kunci, server membuatnya secara acak.

Laporan lokal tersimpan di `content/private/runtime/complaints.sqlite`. File ini bertahan ketika server dimulai ulang dan diabaikan Git. Laporan uji memakai fixture nonmedis dan dapat dibedakan dari judul paket serta alasan pengujian. Backup database saat server berhenti bila diperlukan; jangan menghapusnya untuk mereset aplikasi mahasiswa.

`npm run preview` hanya menyediakan hasil build statis, sehingga API laporan tidak tersedia di sana. Untuk mencoba pengiriman lokal gunakan server development. Frontend GitHub Pages mengirim laporan ke backend Sites/D1 yang sama. CORS hanya mengizinkan origin https://mryks.github.io serta permintaan asal backend sendiri. UI mempertahankan formulir saat koneksi atau penyimpanan gagal.

Untuk menguji laporan dengan 47 soal nyata pada draf, gunakan `/preview`. Rute protes preview khusus development menerima snapshot pending yang sudah dicocokkan server; endpoint produksi tetap hanya menerima paket approved. Laporan memakai database lokal dan halaman pengelola yang sama. Rincian isolasi: `docs/LOCAL_PREVIEW.md`.

## Data dan akses

- Server mencocokkan modul, paket yang disetujui, versi isi, ID soal, dan ID opsi dengan katalog. Teks soal dan kunci diambil dari katalog server; klien tidak dapat mengirim kunci pengganti.
- Laporan menyimpan salinan soal saat pengiriman, label opsi sesuai pengacakan mahasiswa, pilihan mahasiswa, usulan, alasan, nama/inisial opsional, konteks bank/review, waktu UTC, dan identitas versi. Nomor soal adalah posisi pada sesi mahasiswa untuk review, atau nomor bank untuk laporan sebelum latihan; ID soal tetap stabil. Field reference lama tetap dapat dibaca untuk kompatibilitas database, tetapi tidak ditawarkan pada form baru.
- Tanda terima diberikan setelah insert berhasil. ID pengiriman membuat retry dengan isi sama mengembalikan tanda terima yang sama. Kegagalan jaringan/penyimpanan tidak mengosongkan formulir. Draf hanya berada di memori halaman; muat ulang dapat menghilangkan draf yang belum dikirim.
- Endpoint baca membutuhkan bearer token; token tidak disertakan dalam bundle, URL, atau localStorage. Halaman menyimpannya di memori sampai keluar/muat ulang. Tidak ada endpoint daftar laporan untuk mahasiswa. Respons API menggunakan `Cache-Control: no-store`.
- Tidak ada permintaan nama, email, atau nomor mahasiswa. Alamat IP tidak disimpan mentah di database aplikasi; hash dengan secret dipakai untuk batas 120 laporan/jam per koneksi. Beberapa pengguna satu jaringan dapat berbagi batas. Log infrastruktur hosting merupakan konfigurasi terpisah yang perlu ditinjau saat aktivasi.
- Input dibatasi ukuran dan panjangnya, ditampilkan sebagai teks React, bukan HTML. Tidak ada unggahan berkas. Laporan terbaru ditampilkan dahulu, 50 per halaman dengan cursor stabil.

Rute API: `POST /api/complaints` dan `GET /api/admin/complaints`. Implementasi bersama berada di `server/complaints.ts`; development menggunakan SQLite, Cloudflare Functions menggunakan binding D1. Fixture hanya diaktifkan oleh plugin development dan tidak diimpor oleh Functions produksi.

## Hosting online

Izin deployment dan akses publik diberikan pada instruksi terbaru 18 November 2026. Hosting menggunakan Sites/Cloudflare Worker dan D1, dengan binding `REPORTS_DB`, migrasi `drizzle/`, serta secret runtime produksi baru. Kunci lokal untuk pemilik berada pada `.env.production.local`; gunakan pada halaman pengelola situs online. Jangan memakai kunci development `.env.local`. Tidak ada laporan SQLite development yang dimigrasikan ke hosting.

Project hosting sudah terdaftar pada `.openai/hosting.json`. Keberhasilan rilis dan verifikasi D1 dicatat di `reports/RELEASE-2026-11-18.md`. Laporan uji rilis mempunyai alasan berawalan “Uji deployment OCUS”. Prosedur build, testing, dan pembaruan: `docs/DEPLOYMENT.md`.

## Alternatif Cloudflare Pages — belum diaktifkan

Setelah izin deployment terpisah, siapkan database D1, binding bernama `REPORTS_DB`, migrasi `migrations/0001_complaints.sql`, dan secret `ADMIN_REPORT_TOKEN` yang baru serta acak (minimal 32 karakter). Jangan menambahkan prefiks `VITE_`, menyalin `.env.local`, atau mengunggah SQLite lokal. Atur binding untuk environment yang benar; preview sebaiknya memakai database dan secret terpisah dari produksi.

Sertakan `functions/` ketika membangun/deploy Cloudflare Pages, bukan hanya mengunggah `dist/`. `public/_routes.json` membatasi pemanggilan Functions ke `/api/*`. Handler sengaja menolak penerimaan ketika DB atau secret belum dikonfigurasi. Katalog produksi tetap hanya `src/content/catalog.json` yang telah disetujui.

Sebelum aktivasi nyata, periksa dokumentasi Cloudflare terbaru, kuota/harga, binding, serta secret. Uji submit sampai terlihat di halaman pengelola, akses tanpa/salah token, retry, dan penyimpanan setelah permintaan berikutnya. Rotasi secret memerlukan pemuatan ulang akses pengelola dan mengganti hash pembatas koneksi. Pengaturan retensi/backup D1 ditentukan saat hosting disiapkan.

Alternatif Pages terpisah ini belum diaktifkan. Untuk hosting Sites yang dipilih, gunakan konfigurasi dan status rilis pada bagian Hosting online.

Rujukan konfigurasi (diperiksa 18 November 2026): [binding D1 dan environment Pages](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases), [routing Functions dan `_routes.json`](https://developers.cloudflare.com/pages/functions/routing/#functions-invocation-routes).
