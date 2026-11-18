# Revisi bank GSM dan GitHub Pages

Jenis produk: aplikasi latihan mahasiswa, satu bank per modul.

## Urutan implementasi

1. Semua delapan sumber: inventarisasi hash/halaman; OCR lokal 50 halaman; ekstraksi teks, penanda jawaban, dan catatan terpisah; pemeriksaan visual; deduplikasi dengan provenance delapan sumber. Keputusan R01–R34 tidak dinomori ulang. Soal incomplete/konflik tetap tercatat dan dikumpulkan untuk tinjauan.
2. Bank tunggal GSM: satu judul, seluruh soal layak yang lolos kurasi; pembahasan pedagogis ringkas. Bukti ilmiah/provenance disimpan untuk audit tanpa ditampilkan sebagai daftar referensi di pembahasan.
3. Mesin sesi: input jumlah soal, pengambilan acak tanpa pengulangan, opsi selalu acak, subset dan order tersimpan, nilai memakai jumlah soal sesi, deadline/resume tetap absolut.
4. UI: chrome Inggris, soal/pembahasan Indonesia; Guide/Storage & privacy Indonesia yang natural. Header stabil, aksen coral/plum terbatas, feedback hover/press dan entry singkat yang mengikuti reduced motion. Tidak ada hero/promosi.
5. Protes: pemilih soal sebelum mulai; form per soal juga pada review; nama/inisial opsional, hapus input sumber. Tambah kontrak/migrasi database secara kompatibel dan CORS terbatas ke origin GitHub Pages serta development; secret tetap server.
6. Pages: repositori baru `mryks/ocus`, basis aset `/ocus/`, routing yang dapat direfresh pada hosting statis, workflow Actions dengan artefak frontend saja. Backend Sites/D1 yang sama dipertahankan. Jangan deploy ulang katalog 47 seolah seluruh sumber selesai.
7. QA: validasi cakupan/duplikasi/kunci, unit subset/scoring/report, browser mobile/tablet/desktop, aksesibilitas, header antarhalaman, refresh URL /ocus, laporan lintas origin, lint/typecheck/build/audit source dan artefak. Publish setelah hasil konkret siap dan periksa URL nyata.

## Keputusan yang sudah jelas

- Nama modul GSM; satu bank gabungan semua materi/soal modul.
- Frontend GitHub Pages dengan repo baru Public, backend laporan lama tetap dipakai.
- Repo baru sudah dibuat dan akses konektor telah disimpan serta diuji.
- Tidak ada izin membeli layanan/domain atau mengunggah PDF/private/secret. Dua belas soal skip lama tetap ditahan.

## Pelacakan sumber

Delapan PDF berjumlah 230 halaman. Dua sumber scan berjumlah 50 halaman; OCR dijalankan lokal dengan Tesseract ind+eng. Hasil ekstraksi/OCR dan koordinat kata ada di `content/private/all-sources/`; data itu belum otomatis menjadi soal terverifikasi atau katalog publik.
