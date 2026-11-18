# Backend laporan OCUS.

Frontend utama dipindah ke GitHub Pages sesuai instruksi terbaru. Lihat GITHUB_PAGES.md untuk build, routing dan URL pengelola. Prosedur di bawah mempertahankan backend Sites/D1 yang sama; keterangan rilis47 merupakan riwayat rilis pertama.

Instruksi pengguna 18 November 2026 mengizinkan melanjutkan hingga selesai, deployment online dan akses publik. Versi GSM 47 soal yang sebelumnya ditinjau menjadi rilis pertama, termasuk gambar R18. Persetujuan terikat hash isi; PDF asli, ekstraksi, ledger kurasi dan database development tetap lokal.

## Hosting

Hosting menggunakan Sites yang tersedia, dengan Cloudflare Worker untuk React/Vite dan API protes serta D1 untuk laporan. Mahasiswa membuka URL tanpa login. Identitas project ada pada `.openai/hosting.json`; gunakan project yang sama untuk update. Ini menggantikan rencana awal membuka akun GitHub–Cloudflare Pages terpisah. Adapter Pages Functions tetap ada untuk migrasi hosting bila diperlukan.

Alamat aplikasi: https://ocus-latihan.vinoushawk2.chatgpt.site. Status, versi, commit dan hasil verifikasi deployment dicatat pada laporan lokal `reports/RELEASE-2026-11-18.md`; URL expected bukan bukti keberhasilan sebelum status hosting mengonfirmasi sukses.

Manifest menyatakan binding `d1: REPORTS_DB`, tanpa R2 atau plugin data eksternal. Migrasi produksi berada di `drizzle/` dengan journal; Sites menerapkannya sebelum Worker diunggah. Migrasi yang sudah diterapkan tidak diedit: tambahkan migrasi baru.

Secret produksi `ADMIN_REPORT_TOKEN` disimpan pada runtime Sites sebagai secret. Salinan lokal untuk pemilik berada pada `.env.production.local`, diabaikan Git. Kunci development `.env.local` terpisah. Halaman pengelola berada pada `/pengelola/laporan`; jangan membagikan kunci kepada mahasiswa. Runtime secret tidak ditanam ke build atau arsip.

## Build dan uji produksi lokal

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx.cmd wrangler d1 execute REPORTS_DB --local --config dist/server/wrangler.json --persist-to tmp/production-state --file migrations/0001_complaints.sql
npx.cmd wrangler dev --local --config dist/server/wrangler.json --ip 127.0.0.1 --port 8788 --persist-to tmp/production-state --env-file C:/Projects/CCCODEXXX/cbt-fkg/.env.production.local
```

Perintah migrasi di atas untuk instalasi lokal pertama. Update skema memakai migrasi baru; jangan mengulang migrasi yang sudah diterapkan. Path env harus absolut pada mesin yang menjalankan Wrangler; sesuaikan bila workspace berpindah. Database lokal terpisah dari hosting.

Pada terminal lain:

```powershell
npx.cmd playwright test --config tests/production/playwright.config.ts
```

`npm run build:client` menghasilkan antarmuka statis; `npm run build` juga membangun Worker mandiri pada `dist/server/index.js`. Hanya aset publik dan katalog yang disetujui disertakan. Tidak ada akses filesystem runtime. Build menetapkan MIME, deep link, CSP berbasis hash skrip dan SRI serta header keamanan. Validator memakai mode jitless sehingga tidak mencoba evaluasi kode dinamis. Respons API no-store dan akses pengelola diperiksa server. `npm run preview` hanya melayani frontend, bukan API.

HTML dikirim dengan `no-cache, no-transform` untuk mencegah penyisipan script CDN yang bertentangan dengan CSP hash/SRI. Cloudflare mendokumentasikan pengecualian JavaScript Detections untuk respons no-transform: https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-the-origin-sends-a-no-transform-header. Jangan mengganti CSP menjadi unsafe-inline untuk mengatasi injeksi infrastruktur.

## Publikasi dan update

1. Bahan baru melalui inventarisasi, kurasi, validasi, dan keputusan pengguna sebelum katalog berubah. Izin rilis ini tidak mencakup soal/modul baru atau penggantian kunci mendatang.
2. Soal ambiguous hanya boleh diterbitkan untuk ID dengan keputusan eksplisit pada `approval.sourceKeyDecisions`; status ilmiah tetap ambiguous. Unverified/blocked selalu ditahan. Integrasi membutuhkan receipt hash isi persis.
3. Jalankan checks/build dan uji produksi. Audit menolak fixture, endpoint preview, secret, PDF sumber, dan aset tanpa rujukan katalog.
4. Gunakan skill Sites untuk sinkronisasi source dan packaging. Kirim hanya source Git, katalog publik dan aset yang diizinkan. Secret, SQLite, serta ekstraksi tidak boleh masuk Git/arsip. Kredensial repository sementara hanya melalui stdin helper.
5. Simpan versi dari commit sumber yang telah di-push, deploy versi tersimpan pada project yang sama, lalu pantau hingga status terminal. Status pending bukan sukses.
6. Verifikasi akses anonim, refresh rute, gambar, submit protes, pembacaan pengelola dan penolakan akses tanpa token. Laporan QA ditandai alasan “Uji deployment OCUS”.

Saat gagal, periksa deployment/log yang sama sebelum retry; jangan membuat project/database pengganti untuk status yang belum jelas. Rollback memakai versi tersimpan sebelumnya. Nilai latihan tetap berada di browser mahasiswa; D1 produksi tidak boleh direset untuk membersihkan laporan pengujian.

Belum ada layanan berbayar atau domain pribadi yang dipesan. Jika kelak membutuhkan paket berbayar/domain baru, minta keputusan pengguna dahulu.
