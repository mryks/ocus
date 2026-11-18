# MASTER PROMPT CODEX — WEBSITE CBT LATIHAN KEDOKTERAN GIGI

> **Konteks:** Instruksi ini diberikan kepada OpenAI Codex yang sedang membuka **folder proyek lokal baru dan masih kosong** di laptop saya. Bangun proyek dari nol di folder tersebut. Bahasa antarmuka, dokumentasi utama, dan komunikasi dengan saya adalah **bahasa Indonesia**.
>
> **Penting:** Baca instruksi sampai selesai sebelum membuat atau mengubah file. Anda **boleh dan diharapkan bertanya** apabila ada instruksi, format bahan, struktur folder, konten ilmiah, atau keputusan penting yang belum jelas. Jangan mengarang asumsi yang berisiko.

## 1. Peran, tujuan, dan prinsip kerja

Anda bertindak sebagai **senior software engineer, frontend architect, UI/UX designer, QA engineer**, dan **asisten kurasi konten akademik** untuk mengembangkan website *Computer-Based Test* (CBT) latihan soal mahasiswa kedokteran gigi.

Saya ingin website publik dan gratis, **tanpa registrasi atau login**, yang memberi pengalaman menyerupai CBT kampus: satu soal per layar, navigasi nomor soal, timer opsional, pengacakan, tanda ragu-ragu, penilaian, dan pembahasan setelah ujian. Website harus ringan, rapi, profesional, serta mudah saya tambahkan modul baru pada masa mendatang.

Ini proyek sungguhan, bukan sekadar mockup. Namun, **jangan langsung deploy atau memublikasikan soal/materi tanpa persetujuan saya**. Anda boleh melanjutkan implementasi teknis yang aman secara mandiri, tetapi wajib berhenti dan bertanya pada titik keputusan penting.

### Aturan komunikasi dan pengambilan keputusan

- **Boleh bertanya kapan saja.** Jika informasi yang diperlukan tidak jelas, tanyakan secara konkret dan ringkas; jika terdapat beberapa ketidakjelasan terkait, kelompokkan menjadi beberapa pertanyaan yang relevan.
- Prioritaskan pertanyaan tentang **struktur bahan, file yang ambigu, kunci jawaban, hak publikasi materi, konflik ilmiah, dan deployment**.
- Jika hal kecil tidak berisiko, pilih default yang wajar, jelaskan singkat, lalu lanjut bekerja; jangan meminta persetujuan untuk setiap detail kecil.
- **Jangan mengaku** telah membaca skill, memverifikasi referensi, menguji browser, atau melakukan deployment jika langkah itu belum benar-benar dilakukan.
- Bila tidak memiliki akses ke internet, referensi berbayar, atau aplikasi tertentu, jelaskan keterbatasannya. Jangan membuat sitasi atau hasil validasi fiktif.
- Jangan menyamakan persetujuan untuk pengembangan dengan persetujuan untuk **mempublikasikan konten** atau **deploy ke produksi**.

## 2. Kondisi awal proyek dan struktur folder lokal — WAJIB

Saya akan memilih satu **folder kosong baru di laptop** sebagai *workspace* proyek Codex. Tidak ada aplikasi lama yang perlu dipertahankan.

Saya juga akan membuat folder utama bernama **`modul`** di dalam folder proyek. Di dalam `modul`, saya akan membuat sejumlah **subfolder**, dan **nama masing-masing subfolder adalah judul modul** yang harus ditampilkan di website.

**Contoh struktur (ilustrasi saja, bukan nama modul asli):**

```text
[NAMA-FOLDER-PROYEK]/
├── modul/
│   ├── Anatomi Kepala dan Leher/
│   │   ├── materi-kuliah.pdf
│   │   ├── latihan-soal.docx
│   │   ├── kunci-jawaban.xlsx
│   │   └── pembahasan.pdf
│   ├── Penyakit Mulut/
│   │   ├── materi-1.pdf
│   │   ├── soal-blok.pdf
│   │   └── catatan-pembahasan.docx
│   └── [Nama Modul Lain]/
│       └── [berbagai file materi, soal, kunci, atau pembahasan]
├── src/                  # dibangun Codex
├── public/               # dibangun Codex
├── scripts/              # bila diperlukan
├── reports/              # laporan validasi/kualitas
├── docs/                 # dokumentasi
├── package.json
└── ...
```

**Aturan membaca folder `modul`:**

1. Perlakukan folder `./modul/` sebagai **sumber bahan utama dari saya**, bukan sebagai direktori kode aplikasi.
2. **Setiap subfolder langsung di dalam `modul` = satu modul pembelajaran.** Gunakan **nama folder persis sebagai judul modul** yang terlihat oleh pengguna; jangan secara sepihak menggantinya dengan nama lain.
3. Isi subfolder merupakan bahan-bahan terkait modul tersebut: bisa materi, soal, kunci jawaban, pembahasan, gambar, tabel, atau file lain. **Nama dan jumlah file tidak harus seragam** antarmodul.
4. Lakukan **inventarisasi rekursif** file di tiap subfolder modul (termasuk subfolder tambahan di dalamnya jika ada), lalu identifikasi fungsi file berdasarkan **isi**, bukan sekadar namanya.
5. Jika satu modul berisi beberapa kelompok/paket soal, identifikasi batas masing-masing paket dari dokumen. **Jangan asal memecah atau menggabungkan paket** tanpa dasar. Jika tidak jelas apakah dokumen adalah satu atau beberapa paket, **tanyakan kepada saya**.
6. Jumlah soal berbeda-beda untuk setiap modul atau paket, dan seluruh soal dalam paket terpilih harus digunakan dalam satu sesi ujian.
7. Jangan memindahkan, menghapus, menimpa, atau mengubah file sumber asli yang saya taruh di `modul` tanpa izin. Perlakukan sebagai **read-only**. Hasil ekstraksi, indeks, dan data olahan ditempatkan di lokasi lain yang terstruktur.
8. Nama folder dapat mengandung spasi, huruf kapital, tanda baca, atau karakter Unicode. Buat ID/slug internal yang stabil dan aman untuk routing; **judul yang ditampilkan tetap berasal dari nama folder**. Hindari bentrok ID.
9. Jika folder `modul` belum ada atau masih kosong saat pertama kali dijalankan, **jangan gagal dan jangan membuat materi kedokteran gigi fiktif sebagai konten nyata**. Bangun fondasi website dan tampilkan *empty state* yang informatif. Data dummy hanya boleh untuk pengujian lokal dan harus jelas dibedakan dari konten terpublikasi.
10. Setiap kali saya menambah atau mengubah subfolder/file di `modul`, Anda harus bisa menjalankan kembali proses inventarisasi, ekstraksi, validasi, dan pembaruan konten **tanpa membangun ulang arsitektur website dari nol**.

### Penting: file sumber lokal vs file website publik

Tidak semua bahan mentah boleh otomatis didistribusikan. **Jangan otomatis mengunggah seluruh folder `modul` ke GitHub, `public/`, atau bundle website**. Beberapa dokumen mungkin memiliki hak cipta, berukuran besar, atau hanya boleh dipakai untuk referensi internal. Buat pemisahan yang tegas antara:

- **Bahan asli lokal:** `modul/`, milik saya, digunakan untuk ekstraksi dan pemeriksaan.
- **Data CBT hasil olahan:** soal, opsi, kunci, pembahasan, metadata, serta tautan ke materi yang **sudah disetujui** untuk publikasi.
- **Laporan internal:** temuan ekstraksi, verifikasi, konflik jawaban, dan catatan pemeriksaan yang tidak perlu terekspos ke pengunjung.

Sebelum mengatur Git/GitHub, tentukan perlakuan `.gitignore` yang aman untuk bahan mentah dan laporan sensitif. Jika saya memang ingin mengarsipkan bahan tertentu ke repository, **tanyakan izin dan visibilitas repository** terlebih dahulu. Jangan membuat raw file bisa diakses lewat URL publik hanya demi kemudahan pengembangan.

## 3. Skill wajib dan kualitas desain anti-*AI slop*

**Gunakan skills yang benar-benar relevan**, terutama dua sumber berikut:

1. **Taste Skill — Leonxlnx**  
   https://github.com/Leonxlnx/taste-skill
2. **Modern Web Guidance — GoogleChrome (resmi)**  
   https://github.com/GoogleChrome/modern-web-guidance

Sebelum implementasi UI:

- Buka dan **baca dokumentasi resmi terbaru** kedua repository, pastikan nama paket/skill, cara instalasi, dukungan Codex, dan cara pemanggilan yang **aktual**. Jangan mengasumsikan perintah instalasi yang belum diverifikasi.
- Instal atau aktifkan skill sesuai instruksi resmi **jika environment memungkinkan**, lalu gunakan secara nyata untuk membuat *design direction*, mengimplementasikan komponen, dan mengevaluasi hasilnya.
- Gunakan skill lain yang tersedia dan benar-benar bermanfaat untuk React, TypeScript, accessibility, testing, atau optimasi frontend. **Jangan menambah dependency hanya karena populer.**
- Jika instalasi/invokasi skill gagal, laporkan apa yang gagal, apa yang sudah dicoba, dan pendekatan alternatifnya.
- Tuliskan dalam laporan implementasi **bagaimana** prinsip skill diterapkan, bukan sekadar mengklaim “menggunakan skill”.

### Arah visual

Buat website edukasi yang **modern, minimalis, tenang, serius, dan matang**. Prioritas adalah pengalaman membaca soal dengan fokus tinggi.

- Tipografi bersih dan jelas; hierarki informasi tegas.
- Spacing konsisten, komposisi proporsional, komponen tidak terlalu ramai.
- Palet netral dengan aksen terbatas untuk aksi dan status.
- Responsif dan nyaman di **laptop/desktop, iPad/tablet, dan smartphone**.
- Ikon hanya jika fungsional; gunakan interaksi sederhana yang mudah dipahami.
- Fokus pada aksesibilitas, state interaksi, dan kejelasan informasi.

**Hindari:** gradient mencolok, glow, glassmorphism berlebihan, ornamen dekoratif, card bertumpuk tanpa fungsi, hero terlalu besar, template dashboard AI yang generik, dan animasi yang mengganggu pengerjaan soal.

Gunakan inspeksi di browser dan iterasi desain bila tool tersedia. Jangan menganggap screenshot pertama sudah final.

## 4. Stack dan arsitektur teknis

**Preferensi:**

- React + Vite + TypeScript.
- Tailwind CSS bila membantu konsistensi desain.
- React Router bila diperlukan.
- IndexedDB atau penyimpanan browser yang sesuai untuk autosave progres.
- GitHub untuk source code; Cloudflare Pages untuk hosting **gratis** jika batas paket masih memenuhi kebutuhan.

Jangan langsung memilih Next.js, server, autentikasi, database cloud, atau layanan berbayar tanpa alasan kebutuhan yang jelas. Saya ingin website yang bisa online tanpa laptop lokal saya menyala.

Pastikan source code terpisah dari data akademik. Buat skema data/validator untuk modul, paket, soal, pilihan jawaban, kunci, pembahasan, referensi, dan status persetujuan. Proses input data harus *repeatable*, bukan perlu menyalin ratusan soal secara manual ke komponen JSX.

**Catatan keamanan:** pada website statis, kunci jawaban yang dikirim ke browser pada prinsipnya dapat diperiksa pengguna yang paham developer tools. Karena ini latihan gratis, kompromi itu dapat diterima. Namun jangan mengklaim ada keamanan ujian anti-curang. Simpan secret/token di tempat yang benar, jangan di source code.

## 5. Homepage dan katalog modul

Homepage menampilkan daftar **modul berdasarkan nama subfolder `modul/`** yang sudah diproses dan disetujui untuk publikasi.

Untuk setiap modul, tampilkan judul yang sama dengan nama foldernya dan daftar paket bila lebih dari satu. Untuk paket, tampilkan jumlah soal, keterangan singkat jika tersedia, dan tombol mulai latihan.

Semua konten yang sudah disetujui dan di-deploy langsung tersedia untuk publik tanpa login; **tidak perlu fitur Coming Soon**. Modul yang belum diproses atau belum disetujui **tidak boleh muncul sebagai paket aktif**.

Jangan membangun dashboard admin, subscription, paywall, leaderboard, atau fitur pencarian kompleks kecuali nanti saya minta.

## 6. Halaman persiapan dan pengaturan CBT

Sebelum ujian, tampilkan nama modul/paket, jumlah soal, dan pengaturan berikut:

- **Timer opsional:** bisa menggunakan timer atau tanpa timer.
- Jika memakai timer, paket boleh punya durasi rekomendasi; pengguna dapat menyesuaikannya sebelum mulai. **Ini default sementara; tanyakan jika perlu penetapan kebijakan khusus per paket.**
- **Acak soal:** aktif/nonaktif.
- **Acak urutan pilihan jawaban:** aktif/nonaktif, terpisah dari pengacakan soal.
- **Seluruh soal dalam paket harus masuk ke sesi**; tidak ada fitur memilih hanya sebagian soal.

Pengacakan harus menjaga relasi kunci jawaban terhadap pilihan yang benar. Simpan urutan acak sepanjang sesi agar tidak berubah ketika browser di-refresh. Saat menampilkan atau menilai, gunakan ID jawaban yang stabil, bukan mengandalkan huruf A/B/C/D semata.

## 7. Halaman pengerjaan ujian

Tampilkan **satu soal per layar**, layaknya CBT kampus. Setiap soal dapat berisi teks, simbol, gambar, atau tabel bila memang ada dalam sumber.

Fitur wajib:

- Tombol **Sebelumnya** dan **Selanjutnya**.
- Navigasi langsung dengan nomor soal.
- Status **belum dijawab**, **sudah dijawab**, **ragu-ragu**, dan **nomor aktif**.
- Tombol **Tandai Ragu-ragu** yang dapat dinyalakan atau dimatikan; status ragu-ragu dapat berdampingan dengan status sudah dijawab.
- Indikator progres soal terjawab.
- Tampilan sisa waktu hanya bila mode timer aktif.
- Tombol Submit dengan konfirmasi, termasuk peringatan jika masih ada soal kosong.

Panel nomor soal boleh di sisi kanan pada desktop dan berubah menjadi drawer/panel yang nyaman pada HP. Jangan hanya mengandalkan warna untuk membedakan status. **Selama ujian berlangsung, kunci jawaban dan pembahasan tidak boleh diperlihatkan melalui UI.**

Pengguna boleh melewati soal, kembali lagi, dan submit walaupun ada pertanyaan kosong.

## 8. Autosave, resume, dan reset

**Tanpa login dan tanpa riwayat nilai permanen di server.** Namun progres sesi wajib tersimpan sementara di browser yang sama.

Simpan setidaknya:

- ID modul dan paket, serta versi kontennya.
- Jawaban pengguna.
- Urutan soal/opsi setelah pengacakan.
- Tanda ragu-ragu.
- Nomor soal terakhir.
- Pengaturan timer, waktu mulai, dan tenggat waktu absolut jika timer aktif.

Saat refresh atau tab ditutup lalu dibuka lagi di **browser/perangkat yang sama**, tawarkan **Lanjutkan Ujian** atau **Mulai Ulang**. Jangan mengulang timer dari awal saat refresh. Jika tenggat sudah lewat, akhiri sesi sesuai kebijakan timer dan tampilkan hasilnya.

Jika data paket berubah versinya sehingga sesi lama tidak kompatibel, tangani secara aman dan berikan pemberitahuan jelas. Sediakan Reset/Mulai Ulang dengan dialog konfirmasi. Jelaskan bahwa data lokal dapat hilang jika pengguna menghapus data browser atau memakai mode privat.

## 9. Hasil ujian dan mode pembahasan

**Setelah submit:** tampilkan dulu ringkasan sederhana:

- Jumlah benar.
- Jumlah salah.
- Jumlah tidak dijawab.
- Skor persentase, default `benar / total_soal × 100%`.

Sediakan tombol **Lihat Pembahasan** dan **Kerjakan Ulang**. Jangan menampilkan pembahasan lengkap langsung sebelum tombol tersebut dipilih.

**Mode pembahasan:** gunakan **layout yang sama dengan pengerjaan CBT** (satu soal per layar, panel nomor, Sebelumnya/Selanjutnya), tetapi **read-only**.

Untuk setiap soal, tunjukkan dengan sangat jelas:

- Opsi yang dipilih pengguna.
- Opsi jawaban yang benar.
- Status jika pengguna salah atau tidak menjawab.
- Pembahasan lengkap **di bawah pilihan jawaban**.
- Alasan jawaban benar, konsep yang relevan, dan mengapa opsi lain kurang tepat **bila informasi tersebut bisa diverifikasi**.
- Referensi ilmiah yang dapat ditelusuri dan tautan ke **bagian materi modul yang relevan**, jika tersedia dan diizinkan untuk dipublikasikan.

Gunakan highlight yang accessible, bukan warna saja. Jangan mengubah jawaban atau nilai yang sudah disubmit ketika pengguna berada di mode review.

## 10. Pengolahan soal, kunci, materi, dan pembahasan per folder modul

Saya akan menyediakan **file asli di subfolder `modul/<Judul Modul>/`**. File yang mungkin ditemui antara lain PDF, DOCX, XLSX, PPTX, TXT/Markdown, gambar, dan format lainnya. Gunakan kemampuan yang tersedia untuk membaca format tersebut dengan benar; jika ada format yang tidak bisa diproses, **tanyakan** atau minta ekspor ke format yang cocok.

### Pipeline yang diharapkan

1. **Inventarisasi:** tampilkan modul yang ditemukan dan daftar file beserta dugaan fungsinya.
2. **Ekstraksi:** ambil pertanyaan, opsi, kunci, materi, pembahasan, gambar/tabel, dan batas paket jika ada.
3. **Normalisasi:** buat data terstruktur dengan ID stabil; jaga referensi ke nama file dan halaman/bagian asal.
4. **Pemeriksaan teknis:** temukan soal terpotong, opsi hilang, duplikasi, salah ekstraksi, gambar tidak terbaca, kunci di luar opsi, dan relasi data yang rusak.
5. **Verifikasi ilmiah:** evaluasi akurasi kunci jawaban terhadap materi saya serta sumber kedokteran gigi yang kredibel jika tersedia.
6. **Pengembangan pembahasan:** susun pembahasan ilmiah berbahasa Indonesia yang jelas, dengan referensi nyata.
7. **Laporan validasi:** paparkan temuan sebelum integrasi publik.
8. **Persetujuan:** tunggu keputusan saya untuk konflik dan publikasi.
9. **Integrasi:** hanya konten yang disetujui masuk ke data publik website.
10. **Testing:** jalankan pemeriksaan data, build, serta uji alur CBT.

**Jika dokumen tidak jelas**, misalnya apakah tulisan yang berdekatan adalah kunci atau pembahasan, soal punya lebih dari satu jawaban yang mungkin benar, nama materi saling bertentangan, atau file tidak dapat dibaca utuh: **berhenti pada bagian yang terdampak dan ajukan pertanyaan spesifik kepada saya**. Bagian lain yang aman boleh tetap diproses.

Jangan pernah diam-diam mengubah redaksi soal atau kunci tanpa mencatat perubahan dan alasannya.

## 11. Standar validasi ilmiah kedokteran gigi

Ini adalah **alat belajar**, sehingga ketepatan ilmiah penting.

- Jangan berasumsi kunci jawaban sumber selalu benar.
- Periksa terlebih dahulu materi yang saya berikan, kemudian lakukan verifikasi silang memakai sumber yang benar-benar tersedia dan kredibel: buku teks, pedoman resmi, organisasi profesi, dan literatur peer-reviewed.
- Pertimbangkan bahwa rekomendasi klinis dapat berubah sesuai perkembangan ilmu.
- Jika soal ambigu atau memiliki lebih dari satu jawaban yang dapat dibenarkan, tandai secara eksplisit.
- Jangan mengarang judul artikel, DOI, halaman, kutipan, URL, atau klaim telah memeriksa referensi.
- Jika tidak dapat memverifikasi suatu jawaban, beri status **belum terverifikasi**, bukan memaksakan kepastian.
- Pembahasan ditulis dengan bahasa Indonesia yang mudah dipahami mahasiswa kedokteran gigi; istilah medis yang perlu tetap menggunakan terminologi ilmiah.

### Laporan validasi sebelum publikasi

Untuk setiap modul/paket baru atau yang diubah, buat laporan Markdown, misalnya `reports/validation-[slug-modul].md`, yang memuat:

- Ringkasan jumlah soal: terproses, lolos pemeriksaan, bermasalah, ambigu, belum terverifikasi.
- Untuk setiap soal bermasalah: ID, nomor, ringkasan soal, **kunci asli**, **jawaban yang disarankan** jika ada, alasan, referensi, dan rekomendasi tindakan.
- Daftar file yang gagal dibaca atau bagian yang membutuhkan konfirmasi.
- Perubahan atau normalisasi yang sudah dilakukan.
- Status persetujuan dan versi data yang diperiksa.

**Aturan keras:** jangan mengubah kunci jawaban yang diperselisihkan, menerbitkan soal bermasalah, atau deploy modul sebelum saya memeriksa laporan dan menyetujuinya secara eksplisit. Jika sesudah disetujui terjadi perubahan substansial, lakukan validasi ulang.

## 12. Materi pembelajaran dan keterkaitan dengan soal

Materi pada tiap subfolder harus dihubungkan dengan soal-soal modul tersebut sebisa mungkin sampai **bagian atau topik spesifik**. Pada halaman pembahasan, tampilkan tautan/rujukan yang membantu pengguna membuka materi relevan **jika materi itu boleh dipublikasikan**.

Tidak semua materi harus otomatis ditampilkan sebagai file unduhan. Sebelum memublikasikan PDF, buku, slide, atau gambar pihak ketiga, tanyakan **apakah saya memiliki izin untuk mendistribusikannya**. Jika tidak, gunakan materi itu untuk analisis internal dan tampilkan ringkasan original atau sitasi/tautan sumber yang sah, bukan salinan penuh.

## 13. Github, hosting, dan workflow update

Target akhir: source code dapat dikelola di **GitHub** dan website dapat di-host melalui **Cloudflare Pages** agar saya tidak perlu menyimpan atau menjalankan server di laptop.

Karena proyek diawali di folder lokal yang masih kosong:

1. Inisialisasi proyek dan Git lokal dengan aman.
2. Siapkan `.gitignore` yang melindungi bahan mentah dan file sementara yang tidak perlu masuk repo.
3. Tanyakan sebelum membuat atau menghubungkan repository GitHub jika informasi/otorisasi belum ada; jangan mengasumsikan repo sudah tersedia.
4. Gunakan `main` untuk produksi dan branch terpisah untuk fitur/paket baru, jika workflow repository mendukungnya.
5. Siapkan konfigurasi Cloudflare Pages untuk Vite/SPA dan dokumentasi deployment.
6. **Jangan push, merge ke produksi, atau deploy tanpa persetujuan eksplisit saya.** Jangan pula menganggap setiap push aman apabila ada automatic deployment.
7. Konten modul yang disetujui harus bisa diproses dan diterbitkan kemudian tanpa merombak struktur kode.

Jika setup GitHub/Cloudflare belum bisa dilakukan, lanjutkan pembangunan lokal, lalu sediakan panduan langkah demi langkah dan jelaskan tindakan yang perlu saya lakukan sendiri.

## 14. Aksesibilitas, performa, dan pengujian

Gunakan praktik modern yang relevan dari GoogleChrome Modern Web Guidance, termasuk:

- Semantic HTML dan navigasi keyboard.
- Label dan *focus indicator* yang jelas.
- Kontras memadai; status tidak bergantung pada warna saja.
- Touch target nyaman untuk tablet/HP.
- Layout tidak overflow, tipografi terbaca pada berbagai ukuran layar.
- Reduced motion dan animasi nonmengganggu.
- Penanganan file gagal diproses, data kosong, kesalahan browser storage, atau konten invalid.

Lakukan tes yang relevan untuk:

1. Memuat modul berdasarkan **nama folder** dan memetakan judul dengan benar.
2. Modul kosong, file hilang, format tak terbaca, dan beberapa paket dalam satu modul.
3. Validasi ID unik, opsi, kunci, dan tautan materi.
4. Navigasi satu soal per layar.
5. Jawab, ubah jawaban, lewati soal, dan tandai ragu-ragu.
6. Randomisasi soal dan opsi tanpa mengubah kebenaran kunci.
7. Autosave/resume dan timer yang tetap benar setelah refresh.
8. Submit dengan soal belum dijawab dan skor yang akurat.
9. Mode pembahasan dengan penanda opsi yang benar dan yang dipilih.
10. Layout desktop, tablet, HP, serta aksesibilitas inti.

Jalankan build produksi dan tes otomatis yang tersedia sebelum menyatakan pekerjaan selesai. Jika browser automation tersedia, lakukan inspeksi dan perbaikan visual nyata sesuai Taste Skill.

## 15. Dokumentasi wajib untuk keberlanjutan proyek

Buat dokumentasi yang akurat dan ringkas:

- `README.md` — cara instal, menjalankan, build, dan gambaran fitur.
- `AGENTS.md` — konteks proyek untuk sesi Codex berikutnya, lokasi `modul/`, aturan validasi/approval, serta instruksi penggunaan skills.
- `docs/ARCHITECTURE.md` — struktur kode, data, state, dan persistence.
- `docs/CONTENT_WORKFLOW.md` — cara saya menambah subfolder modul/file, pipeline ekstraksi, validasi, dan publikasi.
- `docs/DEPLOYMENT.md` — setup GitHub dan Cloudflare Pages (termasuk langkah yang memerlukan tindakan saya).
- `reports/` — laporan validasi dan catatan masalah.

Jangan menulis dokumentasi seolah fitur sudah ada jika belum diimplementasikan.

## 16. Urutan pelaksanaan dan checkpoint persetujuan

**Fase A — Audit folder dan klarifikasi awal**

- Periksa folder kerja saat ini.
- Pastikan proyek memang baru dan kosong.
- Periksa apakah `modul/` sudah ada, kemudian inventarisasi isinya.
- Baca dokumentasi kedua skills dan laporkan ketersediaannya.
- Ajukan pertanyaan **hanya untuk ketidakjelasan yang perlu diselesaikan sekarang**, terutama format bahan atau keputusan yang sulit dibalik.
- Sampaikan rencana singkat berikut arsitektur dan langkah kerja.

**Fase B — Bangun fondasi CBT**

- Buat aplikasi React + Vite + TypeScript yang rapi.
- Implementasikan katalog, persiapan ujian, satu soal per layar, navigasi, ragu-ragu, timer, randomisasi, autosave, submit, hasil, dan mode pembahasan.
- Jika `modul/` belum berisi konten siap pakai, gunakan *empty state* dan fixture khusus development/testing, **bukan konten medis palsu di versi publik**.
- Lakukan inspeksi desain menggunakan skills yang relevan.

**Fase C — Proses bahan modul**

- Ekstrak dan kelompokkan isi setiap folder modul.
- Susun pembahasan dan lakukan verifikasi ilmiah secara bertanggung jawab.
- Buat laporan per modul/paket dan daftar pertanyaan jika ada yang ambigu.
- **Tunggu persetujuan saya** sebelum memasukkan konten ke versi publik.

**Fase D — QA, preview, dan deployment**

- Jalankan tes, lint/typecheck/build, serta inspeksi responsif.
- Berikan ringkasan progres dan cara menjalankan website lokal.
- Jika sudah ada persetujuan untuk deployment, bantu hubungkan GitHub–Cloudflare Pages sesuai akses yang tersedia.
- Jangan memublikasikan sebelum saya mengizinkan.

**Fase E — Update di masa depan**

Ketika saya menambah subfolder di `modul/`, mengunggah file baru, atau memperbaiki bahan lama, ulangi pipeline yang sama: **inventarisasi → ekstraksi → validasi ilmiah → laporan → pertanyaan/approval → integrasi → tes → deployment setelah izin**. Jangan mengganti atau menghapus paket lama tanpa alasan dan persetujuan.

## 17. Definisi selesai (*acceptance criteria*)

Website baru bisa dinyatakan siap ketika setidaknya:

- Proyek benar-benar berjalan dari folder kosong baru yang saya pilih.
- Struktur `modul/<nama folder>/...` dipahami dan judul modul mengikuti nama folder.
- Sumber lokal dan konten publik terpisah dengan aman.
- Tidak ada kewajiban login atau backend berbayar.
- Satu soal per layar, navigasi nomor, penanda ragu-ragu, timer opsional, randomisasi, autosave, submit, penilaian, dan pembahasan bekerja.
- Pembahasan menggunakan layout CBT dan menjelaskan jawaban pengguna vs jawaban benar.
- Setiap paket mencakup seluruh soalnya, berapa pun jumlahnya.
- File bermasalah/soal ambigu menghasilkan laporan, **bukan data buatan atau koreksi tersembunyi**.
- Konten baru tidak dipublikasikan tanpa persetujuan saya.
- Tampilan minimalis, profesional, responsif, accessible, serta sudah dievaluasi secara visual.
- Dokumentasi penambahan modul dan deployment tersedia.
- Tes dan build penting berhasil, atau kegagalan dijelaskan dengan jelas.

---

## Instruksi pertama untuk Anda (Codex)

**Mulai dari memeriksa folder proyek lokal yang sedang terbuka.** Jangan berasumsi sudah ada source code atau repository GitHub. Periksa `./modul/` dan tampilkan hasil inventarisasi awal jika sudah berisi subfolder/file.

Kemudian cek dokumentasi resmi Taste Skill dan Modern Web Guidance, tentukan cara mengaktifkan skills yang didukung environment, serta buat rencana implementasi singkat.

**Jika ada sesuatu yang membingungkan, silakan tanya saya.** Saya lebih memilih Anda mengajukan pertanyaan yang jelas daripada membuat keputusan keliru, khususnya untuk isi modul, kunci jawaban, hubungan soal dengan materi, dan publikasi data.

Setelah hal-hal penting jelas, mulai bangun fondasi website secara bertahap. Pada akhir setiap fase, laporkan apa yang sudah dibuat, apa yang diuji, apa yang masih belum pasti, dan apa yang membutuhkan persetujuan saya.
