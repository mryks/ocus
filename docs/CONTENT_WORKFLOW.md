# Workflow bahan dan konten

## 1. Tambahkan bahan lokal

```
modul/
  GSM/
    materi/
    soal/
  Judul modul lain/
```

Setiap subfolder langsung menjadi satu modul. Judul tampil harus persis nama folder, termasuk kapitalisasi, spasi, dan Unicode. File boleh berada lebih dalam. Jangan mengubah sumber untuk memudahkan parser. `modul/`, `content/private/`, dan `reports/` diabaikan Git, tidak disalin ke `dist`, dan diblokir oleh dev server Vite.

## 2. Inventarisasi dan ekstraksi

```powershell
npm run content:inventory
npm run content:extract
```

Inventarisasi menghash setiap file, merekam ukuran/format dari signature bila dikenal, dan melewati symlink/junction. Fungsi dokumen tidak dianggap pasti dari nama folder/file. Output: `content/private/inventory.json` dan `reports/inventory.md`.

Ekstraksi saat ini mendukung PDF dan teks (`txt/md/json/csv/tsv`). PDF memerlukan salah satu:

- `pdftotext` yang berfungsi pada PATH, atau path di environment `PDFTOTEXT_PATH`.
- Python dengan `pypdf`, lalu set `CBT_PYTHON` ke executable Python. Ekstraktor menggunakan pypdf per halaman. Contoh dengan Python lokal:

```powershell
py -3.11 -m pip install pypdf
$env:CBT_PYTHON = (py -3.11 -c "import sys; print(sys.executable)")
npm run content:extract
```

Pada sesi pengembangan awal, pypdf dari runtime bawaan Codex tersedia. Path runtime adalah konfigurasi mesin, tidak dikunci dalam source.

Output teks per halaman masuk `content/private/extracted/<id>/`. Dugaan fungsi berdasarkan pola isi selalu berstatus kandidat. Teks sedikit, gagal baca, dan format belum didukung masuk laporan. DOCX/XLSX/PPTX/gambar perlu skill/ekstraktor yang sesuai; CLI ini tidak berpura-pura mendukung semuanya.

**Ekstraksi teks bukan validasi visual.** Warna/highlight kunci, scan, diagram, dan tata letak tabel harus diperiksa terpisah. Tidak ada OCR otomatis pada fondasi ini. Jangan menganggap satu PDF = satu paket, atau menggabungkan file bernama mirip.

## 3. Normalisasi dan peninjauan

Untuk kelompok sumber yang secara eksplisit diminta pengguna agar digabung, tersedia `npm run content:merge -- <config-internal.json>`. Implementasi membaca sumber dan hash dari hasil ekstraksi, menghapus duplikat teks persis setelah normalisasi NFC/whitespace, menyimpan semua provenance, dan menandai kemiripan tanpa menggabungkannya. Nomor kosong/placeholder/fragmen dilaporkan terpisah. Output ada di `content/private/merged/` serta laporan merge/review; kunci tetap null dan output tidak memenuhi skema paket publik. Kesamaan teks belum membuktikan kesamaan gambar atau highlight jawaban pada PDF.

Kelompok GSM AKT 22/2022 telah mendapat instruksi penggabungan tiga sumber. Config: `content/private/merge-gsm-akt22.json`. Keputusan ini tidak menetapkan satu kunci utama dan bukan izin publikasi. Judul bagian UTM di dalam dokumen tetap disimpan sebagai metadata asal.

Koreksi parsing yang sudah diperiksa visual dapat dicatat di `reviewedContinuations`: nama berkas, hash sumber, bagian, nomor soal/fragmen, halaman, teks opsi persis setelah normalisasi whitespace, dan alasan. Parser tidak menempelkan fragmen tanpa aturan ini; hash/teks/lokasi atau urutan opsi yang tidak cocok ditolak. Teks dengan nomor aslinya dipertahankan dalam `sources.rawText`, beserta catatan koreksi. Identitas hasil pemulihan dihitung ulang dari teks utuh, sehingga hanya duplikat teks persis yang bergabung; ID lama dan hasil sebelum koreksi disimpan di arsip peninjauan privat.

### Pemeriksaan penanda jawaban dan draf review

`scripts/inspect_pdf_markers.py` membaca persegi kuning serta karakter tebal dengan koordinat dan hash sumber. Gunakan Python yang memiliki pdfplumber. Contoh:

```powershell
& $env:CBT_PYTHON scripts/inspect_pdf_markers.py "modul/GSM/soal/UAMm 6517 AKT 22 par 1.pdf" --out "content/private/markers/gsm-akt22-long.json"
npm run content:prepare-review -- content/private/curation/gsm-akt22-review-config.json
```

Ini alat bantu, bukan penentu kunci otomatis: teks dalam gambar, tulisan tangan, jenis penyorotan lain, dan karakter tebal parsial dapat terlewat. Parser indent penomoran disesuaikan dengan tata letak tiga PDF AKT22 yang diperiksa; jangan menganggapnya parser universal. Periksa ulang tata letak sebelum menggunakannya pada sumber lain. Nama bagian dan nomor yang dimulai ulang wajib dibedakan. Halaman bukti adalah halaman opsi yang ditandai, meskipun stem berada di halaman sebelumnya.

Config kurasi internal memuat hasil peninjauan manusia: seluruh keputusan kandidat, halaman yang benar-benar diperiksa visual, marker manual, normalisasi opsi yang dicatat, pembahasan, serta rujukan. Skrip prepare-review menolak sumber berubah, marker tidak cocok dengan stem/provenance/opsi, keputusan kandidat tidak lengkap, rujukan hilang, dan label draf yang bertentangan dengan penanda. Status siap review harus ditetapkan setelah pemeriksaan isi; skrip tidak memutuskan kebenaran ilmiah.

Output hanya ledger dan draf di `content/private/` serta laporan di `reports/`. Draf memiliki `approval.status: pending`, tidak dimasukkan ke katalog, dan tidak menciptakan receipt persetujuan. Kandidat yang ditahan tetap berada di ledger dengan seluruh sumbernya. Pemilihan sementara kandidat yang sudah lolos ke draf bukan pemecahan atau penghapusan bagian paket sumber secara permanen.

Untuk GSM terbaru, mulai dari `reports/GSM-REVIEW.md` dan `reports/review-gsm-user-decisions.md`, kemudian `reports/key-review-queue.md` dan hasil `content:validate`. Laporan tahap kedua/ketiga menjadi riwayat. Asal penanda kuning telah diklarifikasi pengguna sebagai jawaban dari sumber; penanda, usulan, dan keputusan perubahan tetap dicatat terpisah.

### Keputusan pengguna setelah PDF R01-R34

Config review mempunyai `userReviewFile`. Perintah `content:prepare-review` tetap membangun baseline 25 dengan guard bukti sumber ke `content/private/drafts/history/gsm-akt22-stage3.json`, lalu menjalankan `apply-user-review.ts` untuk menghasilkan draf utama terbaru. Subfolder history tidak dibaca sebagai draf aktif oleh pipeline konten.

Overlay keputusan memuat kode R, ID/signature kandidat, instruksi pengguna, kunci sumber yang dipertahankan, perubahan stem, asal opsi tambahan, rujukan, dan izin gambar. Hash PDF serta versi baseline dicocokkan sebelum penerapan. Skip tidak boleh membawa kunci/perubahan aktif. Opsi buatan hanya untuk sumber tanpa opsi, dan jawaban yang dikonfirmasi pengguna dibedakan dari distractor. Source label tidak diubah seolah-olah huruf opsi buatan telah tercantum pada dokumen.

Keputusan mengikuti kunci sumber disimpan terpisah dari hasil ilmiah. Soal yang tetap memiliki ambiguitas tidak otomatis diberi status `verified`; paket pending dapat menyimpan status itu untuk peninjauan. Guard publikasi yang ada tetap berlaku. Jangan membuat receipt versi baru atau mengintegrasikan hanya karena overlay berhasil dibangun.

Aset R18 sudah disetujui pengguna untuk soal tersebut. Draf memuat jalur tujuan aset publik, tetapi file tetap berada pada staging privat beserta hash dan deskripsinya. Pemindahan/copy ke aset publik dilakukan dalam langkah integrasi yang diizinkan, bukan saat menerapkan keputusan.

Buat `content/private/drafts/<id>.json` dengan bentuk:

```json
{
  "sourceInventoryHash": "SHA256 sumber modul dari inventory.json",
  "module": {
    "id": "ID dari inventory.json",
    "title": "Nama folder persis",
    "packages": []
  }
}
```

Array paket perlu berisi minimal satu paket valid; contoh di atas hanya menjelaskan pembungkus, bukan draft siap integrasi. Skema lengkap: `src/domain/content.ts` (`moduleSchema`, `packageSchema`, `questionSchema`). Setiap soal harus menyimpan `source.file` relatif terhadap folder modul, `source.location`, `source.originalNumber`, dan `source.originalKey`.

Blok: paragraph (`text`), image (`src`, `alt`, `width`, `height`, `caption` opsional), table (`caption`, `headers`, `rows`). Semua opsi memiliki ID yang tidak berubah walaupun urutan diacak. Referensi menyimpan sitasi nyata; URL HTTPS opsional dan rujukan materi spesifik opsional.

Gunakan status `unverified`, `ambiguous`, atau `blocked` sesuai temuan; `verified` hanya setelah sumber diperiksa. Catat perubahan redaksi/kunci dan alasannya dalam laporan. Periksa sumber pengguna terlebih dahulu, kemudian sumber ilmiah kredibel yang benar-benar dapat diakses. Jangan membuat DOI atau referensi fiktif.

Untuk menyetel versi, gunakan fungsi `contentHash(module, pkg)` yang diekspor `scripts/content.ts`. Hash pertama dapat dihitung dengan `contentVersion` sementara 64 digit nol karena field versi sendiri tidak termasuk hash. Simpan hash final ke `contentVersion`, lalu:

```powershell
npm run content:validate
```

Laporan teknis memuat fingerprint, status sumber, jumlah/status soal dan kunci asli. Lengkapi laporan dengan soal bermasalah/ambigu, jawaban yang disarankan bila ada, alasan, referensi, file/bagian gagal baca, perubahan, dan keputusan yang diperlukan. Parser/schema error menghentikan validasi; perbaiki struktur tanpa mengubah isi akademik secara diam-diam.

## 4. Persetujuan eksplisit

Tunjukkan laporan dan versi yang ditinjau kepada pengguna. Konfirmasikan konflik kunci, batas paket, izin publikasi soal/pembahasan, serta izin distribusi PDF/gambar secara terpisah bila diperlukan. Jangan meminta seluruh PDF boleh diunggah sebagai syarat membangun aplikasi.

Setelah persetujuan nyata, catat bukti di `content/private/approvals.json`:

```json
[
  {
    "moduleId": "ID modul",
    "packageId": "ID paket",
    "contentVersion": "SHA256 isi final",
    "approvedBy": "Pengguna",
    "approvedAt": "timestamp ISO saat persetujuan nyata",
    "decisionReference": "Referensi keputusan eksplisit untuk laporan dan versi ini"
  }
]
```

Jangan membuat receipt persetujuan dari asumsi, tanggal dokumentasi, atau status hasil tes. Soal `verified` dapat masuk paket approved. Pengecualian khusus keputusan pengguna atas kunci sumber dicatat per ID melalui `sourceKeyDecisions: [{ questionId, decisionReference }]` pada receipt dan approval; hanya status `ambiguous` yang dapat memakai pengecualian ini, tanpa mengubahnya menjadi verified. Unverified/blocked selalu ditahan. Pada 18 November 2026 pengguna mengizinkan deployment publik versi 47 soal yang telah ditinjau; receipt memuat 21 keputusan sumber tersebut. Perubahan isi substansial menghasilkan hash baru dan membutuhkan persetujuan baru. Perubahan sumber menyebabkan fingerprint inventory tidak cocok dan wajib ditinjau ulang.

## 5. Integrasi lokal

Setelah izin didapat:

```powershell
npm run content:integrate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Integrator memeriksa nama folder, fingerprint sumber, provenance, hash isi, status verifikasi, dan receipt versi tepat. Katalog lama tetap dipertahankan; paket dengan ID sama diganti hanya menggunakan versi yang disetujui. Ia tidak menyalin PDF atau asset sumber dan tidak melakukan push/deployment. Jika draft kosong/error, katalog lama tidak ditimpa. Tinjau perubahan katalog sebelum publikasi.

Aset yang diizinkan disalin secara sadar ke `public/assets/content/<id-aman>/<nama-aman>.<format>`; hanya format yang diterima skema. Pastikan izin setiap aset dicatat. Raw PDF yang tidak boleh didistribusikan tetap lokal; rujukan dapat berupa sitasi/bagian tanpa tautan file.

## 6. Publikasi dan update

Integrasi lokal bukan deployment. Tunggu izin push/deploy dan pastikan repository/branch tidak memicu deployment tak disengaja. Untuk update, ulangi inventarisasi → ekstraksi → normalisasi → pemeriksaan teknis/ilmiah → laporan → persetujuan versi → integrasi → QA → deployment setelah izin.

Jangan menghapus/menggabungkan paket lama atau mengganti nama modul secara otomatis. Jika folder diganti nama, konsultasikan migrasi ID dan dampak pada sesi browser.
