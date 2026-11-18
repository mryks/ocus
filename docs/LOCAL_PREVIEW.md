# Preview privat draf GSM

Jalankan `npm run dev`, lalu buka **http://127.0.0.1:5173/preview**. Ini preview 47 soal draf lokal, terpisah dari katalog publik di `/` dan fixture empat soal nonmedis di `/dev`.

## Yang dapat dicoba

- Persiapan, timer opsional, pengacakan soal dan opsi, seluruh 47 soal dalam satu sesi.
- Autosave, refresh/resume, navigasi nomor, tanda ragu-ragu, submit, nilai, dan pembahasan.
- Diagram Causal Pie R18 serta protes langsung pada pembahasan.
- Laporan protes dapat dibaca pada `/pengelola/laporan` dengan kunci akses lokal yang sudah tersedia di `.env.local`.

Sesi preview memakai namespace `cbt:draft-preview:v1`, sehingga tidak membaca atau menimpa sesi latihan biasa. Data jawaban tetap lokal pada browser yang digunakan. Tidak ada akun mahasiswa baru atau layanan cloud yang diaktifkan.

## Status konten

Preview memakai draf asli dengan `approval.status: pending`, bukan salinan yang diberi persetujuan fiktif. Status 26 verified dan 21 ambiguous yang dipertahankan sesuai keputusan pengguna tetap sama. Kunci mengikuti 47 soal dalam draf; preview tidak mengoreksi ulang keputusan R01-R34 atau mengembalikan 12 soal yang di-skip.

Menjalankan preview sendiri bukan persetujuan publikasi. Pada instruksi berikutnya, 18 November 2026, pengguna mengizinkan deployment dan akses publik; versi 47 soal kini diintegrasikan pada katalog utama dengan receipt terpisah. Preview tetap membaca draf pending dan memakai sesi terpisah untuk pengembangan.

## Pemisahan teknis

- `src/dev/preview.tsx` hanya dimuat melalui kondisi `import.meta.env.DEV`. Data medis tidak diimpor ke modul client atau ditanam pada fixture.
- `GET /api/dev-preview/catalog` hanya ada dalam middleware Vite development. Server membaca draf privat, mencocokkan versi isi dengan ledger dan seleksi pengguna, memeriksa hash sumber/bukti PDF, serta mengizinkan hanya aset staging yang tercatat disetujui.
- Diagram R18 dilayani dari file staging privat melalui satu jalur aset yang cocok dengan blok soal. Tidak ada penyalinan ke `public/` atau handler unduhan direktori privat.
- API/aset preview membatasi host dan alamat koneksi ke loopback serta menolak origin/Fetch Metadata lintas situs. Respons tidak di-cache dan memakai CORP same-origin serta nosniff. Pemeriksaan dilakukan sebelum memuat sumber privat.
- Server menyimpan snapshot yang sudah lolos validasi di memori. Setiap permintaan tetap memeriksa fingerprint konfigurasi, draf, ledger, manifest, serta metadata berkas sumber/aset/bukti; perubahan membatalkan cache dan memicu validasi hash penuh. Pembacaan bersamaan berbagi satu validasi. Snapshot yang berubah saat dibaca ditolak, dan kegagalan tidak disimpan. Cache ini tidak mengubah kebijakan `no-store` pada browser.
- `POST /api/dev-preview/complaints` memakai konteks server khusus untuk menerima laporan dari paket pending. Endpoint produksi `/api/complaints` tetap menolak pending. Flag ini bukan field body permintaan dan tidak dapat diaktifkan oleh kiriman klien pada API produksi.
- Laporan uji disimpan di SQLite lokal yang sama dengan fitur laporan sebelumnya; ditandai melalui alasan “Uji preview privat” pada pengujian otomatis. Database ini tidak diunggah ke cloud.
- `npm run build` menghapus bootstrap preview melalui dead-code elimination. Audit bundle memeriksa marker API/namespace/ID/aset privat. `npm run preview` tidak menyediakan preview draf ini atau API laporannya; ia hanya melayani hasil build produksi.

Jika draf tidak tersedia atau sumber/aset berubah, layar menampilkan kegagalan dan tombol coba lagi. Jalankan ulang pipeline konten/validasi sebelum memuat ulang; server tidak mengganti data hilang dengan soal buatan.
