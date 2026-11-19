# Rencana implementasi

Jenis produk: software, aplikasi latihan CBT kedokteran gigi.

## Keputusan pengguna

- Satu jawaban benar per soal.
- Tenggat habis: otomatis submit jawaban terakhir, termasuk setelah tab dibuka kembali.
- React + Vite + TypeScript; frontend statis, mahasiswa tanpa akun. Pengguna kemudian mengizinkan backend kecil untuk protes langsung di website dan halaman pengelola; layanan berbayar belum disetujui.
- Instruksi terbaru 18 November 2026 mengizinkan publikasi versi yang ditinjau, deployment online dan akses publik; sumber asli dan catatan privat tetap lokal.

## Tahapan

1. Fondasi: skema dan validator, data publik terpisah, inventarisasi berulang.
2. Mesin sesi: semua soal, ID opsi stabil, acak tersimpan, deadline absolut, autosave dan pemulihan.
3. Antarmuka: katalog → persiapan → pengerjaan → hasil → pembahasan; panduan dan error states.
4. QA: unit, integrasi browser, responsive, aksesibilitas, lint, typecheck, build dan pemeriksaan bundle.
5. Bahan GSM: ekstraksi internal dan laporan awal; normalisasi/validasi ilmiah dan persetujuan terpisah.

## Arah desain

Arahan terbaru pengguna menggantikan arah visual awal: aplikasi utilitas mahasiswa dengan identitas logo SVG OCUS. saja. Homepage langsung menampilkan modul; tidak ada hero, slogan, panel manfaat, ajakan komersial, atau alur pemasaran. Kanvas abu netral, panel putih dengan kedalaman tipis, DM Sans untuk seluruh UI, kontrol plum gelap dari identitas OCUS. serta fokus magenta. Path dan warna logo pengguna dipertahankan. Status tetap memiliki teks/ikon. Skala spasi 4/8/12/16/24/32/48/64; radius utama 10/16/20. Panel navigasi desktop di kanan, panel modal pada HP. Petunjuk hanya yang membantu mengerjakan soal. Kartu modul memakai grid intrinsik dan container query agar susunan isi mengikuti lebar kartu.

Keputusan konten lanjutan: entri tidak lengkap tetap di laporan internal dan ditahan dari paket aktif sampai lengkap. Kandidat yang lengkap secara struktur dapat lanjut verifikasi ilmiah, tanpa persetujuan publikasi otomatis.

Taste Skill 2.5.1 dibaca: prinsip satu sistem visual, equal edges, kontras, focus ring, touch target dan pemeriksaan screenshot diterapkan. Aturan hero satu layar, efek shader, foto pemasaran, dan scroll moments dikesampingkan karena bertentangan dengan instruksi pengguna untuk CBT yang fokus. Fixture nonmedis wajib diberi label sesuai instruksi pengguna, meskipun skill pemasaran melarang label contoh. Jangan menyalin seluruh kit visual ke bundle.

Modern Web Guidance: cari dan baca panduan yang relevan sebelum implementasi komponen; dokumentasikan penerapan nyata pada laporan QA. Data medis belum dinyatakan terverifikasi.

## Status dan urutan berikutnya — 18 November 2026

1. Fondasi CBT tersedia. Polesan UI kedua sudah diterapkan dan diperiksa di browser, termasuk katalog kosong serta katalog fixture nonmedis. Laporan: `reports/UI-OCUS-polish.md`.
2. Pemeriksaan GSM berjalan terpisah dari katalog publik. Ledger internal membedakan entri tidak lengkap, draf jawaban berujukan, persoalan konteks/kunci/aset, dan kandidat yang belum diperiksa. Draf jawaban tidak otomatis menjadi verified.
3. Tahap 4 menerapkan keputusan pengguna R01-R34: 22 dipertahankan, 12 skip (termasuk balasan terbaru R10). Draf utama 47 soal; opsi tambahan hanya R01/R12, polesan ringan hanya R04, gambar R18 disetujui. Catatan ilmiah terpisah: 26 verified, 21 ambiguous yang dipertahankan mengikuti keputusan sumber. Mulai dari `reports/GSM-REVIEW.md` dan `reports/review-gsm-user-decisions.md`. Baseline 25 dan ledger tahap 3 tetap menjadi riwayat; izin publikasi terbaru diterapkan pada tahap 9.
4. Isi/aset versi 47 soal telah diizinkan pada instruksi publikasi terbaru dan diintegrasikan. QA produksi memakai katalog nyata, termasuk diagram dan laporan protes.
5. Hosting disiapkan melalui Sites yang tersedia, menggunakan Cloudflare Worker dan D1 tanpa login mahasiswa. Project sudah terdaftar pada `.openai/hosting.json`. React/Vite dan API laporan yang sama dipakai ulang; tidak perlu membuka akun hosting/GitHub baru. Rincian di `docs/DEPLOYMENT.md`.
6. Protes langsung di pembahasan dan halaman `/pengelola/laporan` dikembangkan dengan SQLite lokal serta adapter Functions/D1 untuk hosting mendatang. Akses pengelola memakai secret server; tidak ada fitur balasan. Petunjuk: `docs/REPORTING.md`.
7. UTM 2019 no.25 tetap hold sesuai keputusan pengguna. Usulan perubahan kunci dikumpulkan di `reports/key-review-queue.md`, tidak ditanyakan satu per satu. Katalog publik hanya berisi 47 soal yang sudah melalui seleksi pengguna.
8. Preview privat `/preview` memuat 47 soal pending melalui server development, beserta gambar staging R18 dan endpoint protes khusus lokal. Namespace sesi terpisah; data/route preview tidak masuk hasil build. QA selesai: 40 unit, 30 regresi browser, 9 skenario preview di tiga viewport, build/audit dan isolasi produksi lulus. Batas pemeriksaan serta bukti visual ada di `reports/QA-private-preview.md`. Ini memungkinkan peninjauan konten nyata sebelum izin integrasi/publikasi.
9. Instruksi publikasi terbaru telah diikat ke versi `ea497ac93f7364814f45871e2c448666fc7d8a97b63c9e4e9a77e6fad97fc825`. Katalog berisi 47 soal dan aset R18; 21 keputusan kunci sumber dicatat pada approval tanpa menyatakan semuanya verified. Menyelesaikan build Worker, QA produksi, migrasi D1 dan deployment publik melalui Sites.

10. Revisi seluruh8sumber19November2026:230halaman ditinjau termasuk50halaman OCR lokal; bank GSM menjadi189soal (168verified/21ambiguous dengan keputusan lama),142tambahan unik. Ledger tambahan370kemunculan:155eligible,13duplikat persis (termasuk urutan opsi berbeda),214tertahan,1bukan soal. PASLUL100 dan scan40 dicatat sebagai provenance berulang. Tinjauan G terpisah dari R lama; PDF internal tidak masuk repo/build.
11. Frontend Inggris, Guide/privasi Indonesia, subset pilihan mahasiswa, pengacakan wajib, protes sebelum latihan dengan nama opsional, penjelasan pedagogis. GitHub Pages/ocus memakai HashRouter; Sites/D1 lama dipertahankan untuk laporan dengan CORS terbatas. Lihat GITHUB_PAGES.md untuk alur deploy terkini.
12. Tinjauan G diterapkan: katalog207soal (147verified/60ambiguous dengan keputusan per-ID), setelah41duplikat bank lama disatukan,1konflik akreditasi ditahan,40tambahan dari keputusan pengguna dan20pemulihan terverifikasi. Pasangan G041/G042 menunggu konsolidasi,49skip tetap. Pemeriksaan G102–G212 selesai;10kasus keputusan dihimpun pada PDF lanjutan privat. Skrip apply_g_review.py memakai baseline189 beku, bukan pipeline arsip47.
