# OCUS di GitHub Pages

Frontend utama: https://mryks.github.io/ocus/ dengan repositori khusus https://github.com/mryks/ocus.

UI berbahasa Inggris; soal dan pembahasan berbahasa Indonesia. Panduan dan privasi memakai bahasa Indonesia. Satu bank gabungan per modul, subset soal pilihan mahasiswa, pengacakan soal/opsi wajib, timer opsional dengan deadline absolut.

## Build

`npm ci`, `npm run lint`, `npm test`, `npm run build:pages`.

Workflow `.github/workflows/pages.yml` membangun dan mengirim hanya `dist-pages/`. Pengaturan Pages menggunakan GitHub Actions. Basis aset `/ocus/`; navigasi memakai hash agar refresh URL latihan dapat bekerja di hosting statis. Worker, PDF sumber, ledger dan secret tidak masuk artefak frontend.

Pages tidak menyediakan konfigurasi header aplikasi. CSP pada meta membatasi skrip dengan hash/SRI, Trusted Types bila didukung, dan koneksi ke backend laporan yang ditentukan. Pembatasan framing/reporting yang membutuhkan header bukan jaminan pada hosting ini. Rujukan: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages dan https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy.

## Backend laporan yang dipertahankan

API: https://ocus-latihan.vinoushawk2.chatgpt.site/api/complaints.

Halaman pengelola: https://mryks.github.io/ocus/#/admin/reports. Kunci hanya dimasukkan saat mengakses halaman tersebut; tidak disimpan dalam bundle, URL atau localStorage. Salinan pemilik berada di `.env.production.local`; jangan unggah atau kirim ke mahasiswa.

Runtime Sites mempunyai `REPORTING_ALLOWED_ORIGIN=https://mryks.github.io`. Origin lain ditolak sebelum autentikasi, preflight hanya mengizinkan metode/header yang diperlukan. Laporan mahasiswa anonim tidak memakai cookie; nama/inisial opsional. Laporan lama tetap dapat dibaca dari snapshot JSON yang sama. D1 tidak direset.

Progres latihan terikat origin dan browser. Progres pada alamat lama tidak otomatis berpindah ke GitHub Pages. Backend Sites dapat diperbarui melalui prosedur pada DEPLOYMENT.md dan project yang sama.

## Kurasi dan pembaruan

Pembaruan tinjauan G:207soal unik (147verified/60ambiguous dengan keputusan per-ID). Dari189soal sebelumnya,41duplikat disatukan dan1konflik nama bab SNARS1 ditahan. Keputusan pengguna menambahkan40wakil unik dan pemeriksaan catatan memulihkan20soal dengan44pengecoh buatan yang dicatat privat.49skip G tetap berlaku. G041/G042 masih menunggu pilihan satu wakil; G185 menunggu persetujuan MKE.

Gunakan `scripts/complete_g_reassessment.py` lalu `scripts/apply_g_review.py` untuk mereproduksi proposal privat dari baseline189, keputusan terikat signature, dan manifest deduplikasi yang ditinjau. Skrip ini tidak mengintegrasikan atau menerbitkan otomatis. `scripts/assemble_gsm.py` di bawah menjelaskan pipeline rilis sebelumnya dan tidak boleh menimpa katalog terbaru. Kode G tetap beku; PDF keputusan lanjutan terpisah dari dokumen212entri terdahulu. Hash katalog terkini: `1f4a40228d3accd47ef41ac5444e7f6e83bf79ab7e398fc9dd4fef4a5cbdbb11`.

Semua delapan PDF ditinjau secara lokal. Review ledger dan laporan lengkap tetap privat. `scripts/assemble_gsm.py` membuat proposal dari baseline47 dan ledger yang telah diperiksa; tidak menerbitkan otomatis. Hanya entri lengkap dengan dukungan verifikasi masuk tambahan bank. Konflik, opsi hilang, dan keputusan skip ditahan.

Setelah tinjauan, validator menghitung hash canonical, menyimpan receipt keputusan yang benar dan menguji katalog sebelum integrasi. Keputusan mengikuti kunci lama tetap terikat per-ID. Mengubah kunci yang diperselisihkan memerlukan keputusan eksplisit; izin deploy bukan pembenaran mengubah status ilmiah.

Pipeline lama `content:prepare-review`/preview47 mereproduksi tinjauan R01–R34; bukan bank akhir semua sumber. Integrasi menolak receipt historis menimpa rilis yang lebih baru. Materi baru harus melalui inventarisasi dan peninjauan baru, bukan langsung disalin ke direktori publik.
