# OCUS.

Bahasa komunikasi dan dokumentasi utama Indonesia. Arahan terbaru: chrome UI berbahasa Inggris; soal/pembahasan tetap Indonesia, isi Guide dan Storage & privacy memakai Indonesia yang natural. Baca `docs/PROJECT_SPEC.md` dan `docs/IMPLEMENTATION_PLAN.md` sebelum mengubah proyek. Dokumen spesifikasi diberikan pengguna sebagai instruksi proyek.

## Keputusan tetap

- React + Vite + TypeScript, frontend statis tanpa akun mahasiswa. Backend kecil laporan telah diizinkan pada keputusan terbaru; layanan berbayar belum disetujui.
- Satu jawaban benar per soal. Arahan terbaru: pengguna memilih jumlah soal sebelum mulai; ambil subset tanpa duplikat dari bank modul. Pengacakan soal dan opsi wajib, tanpa toggle pengguna.
- Timer opsional dengan durasi yang dapat diatur. Deadline absolut; saat habis otomatis submit jawaban terakhir, termasuk saat resume.
- Pengguna memerintahkan tiga PDF AKT 22/2022 GSM digabung, tanpa memilih versi utama; hapus duplikat teks persis, simpan provenance seluruh kemunculan. Config lokal: `content/private/merge-gsm-akt22.json`. Kandidat dengan variasi redaksi/opsi tetap terpisah untuk ditinjau. Ini bukan izin publikasi.
- Pengacakan soal dan opsi wajib dan independen; kunci selalu mengacu ID opsi, bukan huruf. Urutan subset dan opsi disimpan persis untuk resume/review.
- Autosave di localStorage per paket, hasil sesi terakhir tetap dapat ditinjau sampai diganti. Tidak ada riwayat nilai server.

## Bahan dan persetujuan

- `modul/<judul folder>/...` adalah sumber utama lokal read-only. Judul UI harus persis nama subfolder langsung. Jangan mengubah, menghapus, atau memindahkan bahan.
- `content/private/` dan `reports/` hanya lokal, diabaikan Git dan tidak dilayani Vite. Jangan menyalinnya ke `public/` atau bundle.
- Data publik hanya `src/content/catalog.json` dan aset yang secara eksplisit diizinkan di `public/assets/content/`.
- Katalog publik terbaru berisi GSM209soal; bagian47/189/207di bawah adalah riwayat kurasi. Katalog kosong tetap harus ditangani aman untuk instalasi baru. Fixture nonmedis hanya `/dev` saat Vite development; tidak boleh masuk produksi.
- Jangan mengarang soal medis, kunci, penjelasan, sitasi, hasil pengujian, atau persetujuan.
- Konflik kunci, soal ambigu, batas paket tak jelas, dan izin distribusi harus ditanyakan kepada pengguna. Lanjutkan bagian lain yang aman.
- Saat membahas persoalan sumber, selalu sebut nama berkas persis, halaman PDF, bagian/nomor soal, serta opsi terkait agar pengguna mudah memeriksanya. Klarifikasi terbaru: pengguna menyatakan sorotan kuning seharusnya merupakan penanda jawaban, sebagaimana pada banyak soal lain. Catat sebagai kunci dari sumber, dengan verifikasi isi terpisah; jangan menyamakannya otomatis dengan kunci resmi dosen. Tanyakan lanjutan hanya jika ada konflik konkret dengan bukti yang jelas.
- Integrasi perlu laporan validasi dan persetujuan eksplisit yang terikat hash isi. Soal ambiguous hanya dapat dipublikasikan bila terdapat keputusan pengguna per ID pada `approval.sourceKeyDecisions`; jangan mengganti statusnya menjadi verified. Unverified/blocked selalu ditahan. Perubahan substansial membatalkan persetujuan lama.
- Soal UTM 2019 no.25 (kunci sumber E, usulan C) tetap di luar paket; keputusan terbaru pada PDF R28 adalah skip. Kumpulkan temuan peninjauan/ganti kunci dalam `reports/key-review-queue.md`; jangan mengulang pertanyaan yang telah diputuskan atau menganggap usulan lain otomatis disetujui.
- Status tahap 4: pengguna meninjau PDF R01-R34, mempertahankan 22 kandidat dan skip 12. R10 mengikuti balasan terbaru: skip, jangan membuat opsi. Opsi buatan hanya diizinkan untuk R01 dan R12; jawaban masing-masing faskes sekunder dan disinfeksi tingkat tinggi. R04 hanya dirapikan ringan. R02/R05/R14/R15/R22/R23/R25/R26/R27/R29/R30/R31 dipertahankan sesuai instruksi tanpa revisi stem/opsi; kunci mengikuti sumber. R08/R09/R16/R19/R20/R21 juga memakai kunci sumber. R18 gambar disetujui untuk soal ini dan telah disalin ke aset publik setelah izin deployment terbaru.
- Draf menjadi 47 soal (25 awal + 22 hasil tinjauan), 12 skip tetap di ledger. Record keputusan: `content/private/curation/gsm-akt22-user-decisions.json`, hasil `gsm-akt22-stage4.json`, laporan `reports/review-gsm-user-decisions.md`. Catatan ilmiah historis tetap tersimpan; keputusan mengikuti sumber tidak otomatis mengubahnya menjadi verified. Draf 26 verified/21 ambiguous tetap pending sebagai riwayat; katalog publik versi yang sama sudah approved melalui receipt instruksi terbaru. Jangan menyebut seluruh 47 telah terverifikasi ilmiah.
- Kode R tetap mengacu PDF tinjauan lama dan hash-nya; jangan memberi nomor ulang. `content:prepare-review` kini membangun baseline 25 ke `content/private/drafts/history/`, lalu menerapkan overlay keputusan ke draf utama 47. Jangan menyalin baseline 25 ke draf utama atau menganggap laporan tahap 3 sebagai status terbaru.
- Preview privat 47 soal tersedia hanya pada server development di `/preview`. Bootstrap/endpoint preview tidak boleh masuk build. Sesi memakai namespace terpisah. Gambar R18 tersedia dari staging pada preview dan dari aset yang disetujui pada publik. API protes preview mempunyai konteks server tersendiri; API produksi tetap menolak pending. Rincian: `docs/LOCAL_PREVIEW.md`.
- Pengguna meminta protes kunci langsung di website dan halaman pengelola untuk melihat laporan, tanpa balasan kepada mahasiswa. Backend laporan kecil dan deployment telah diizinkan; mahasiswa tetap tanpa login. Lindungi akses pengelola dan jangan simpan kunci akses pada bundle/frontend. Secret produksi tersimpan pada Sites dan salinan lokal `.env.production.local`, terpisah dari development.
- Instruksi terbaru 18 November 2026 memberi izin melanjutkan sampai selesai, deploy online dan akses publik. Persetujuan versi 47 soal dicatat di `content/private/approvals.json`; katalog publik telah diintegrasikan, termasuk aset R18. Draf/ledger lama tetap pending sebagai riwayat. Gunakan Sites yang tersedia (Worker React/Vite + D1), project_id dari `.openai/hosting.json`; jangan membuat project hosting kedua. Tidak perlu meminta ulang izin deploy versi ini. Bahan PDF asli/ledger privat dan secret tetap tidak boleh diunggah. Akun/layanan berbayar belum diizinkan.

## Skill dan desain

## Revisi pengguna terbaru — seluruh sumber dan GitHub Pages

- Tuntaskan delapan PDF pada `modul/GSM/soal`, termasuk OCR lokal dua PDF tanpa lapisan teks. Satu modul mempunyai satu bank gabungan, judul UI cukup GSM. Hilangkan label gabungan tiga sumber dan judul paket yang berulang. Seluruh materi beragam di folder GSM tetap bagian dari modul yang sama. Dua belas skip sebelumnya tetap ditahan kecuali ada keputusan baru eksplisit.
- Target frontend baru `https://mryks.github.io/ocus/`, repo publik baru `mryks/ocus` (sudah dibuat melalui UI GitHub), terpisah dari repo lain. Pengguna menyetujui repo Public dan mempertahankan backend laporan Sites/D1 yang sudah ada. Jangan mengirim PDF sumber/private/secret ke repo publik. Akses konektor GitHub ke ocus sudah disimpan pengguna dan penulisan README terverifikasi. Gunakan konektor Git Data API untuk publikasi hanya ke repo ini.
- UI Inggris; isi soal/pembahasan Indonesia. Isi Guide dan Storage & privacy Indonesia yang natural. Sedikit hidup melalui aksen identitas dan interaksi ringan, tetap serius; stabilkan posisi header antarhalaman.
- Persiapan: jumlah soal, timer opsional, informasi latihan. Pengacakan wajib tanpa toggle. Protes dapat dibuka sebelum mulai melalui pemilihan soal, serta pada pembahasan; nama/inisial opsional, tidak ada field sumber pendukung.
- Pembahasan singkat dan mengajar; tidak menampilkan referensi/materi terkait atau bahasa proses seperti kunci sumber/materi modul. Bukti dan referensi tetap tersimpan internal untuk kurasi; jangan mengarang penjelasan atau mengganti kunci diam-diam.
- Jangan mengklaim seluruh bank selesai hanya karena paket pertama atau website sudah online. Laporkan cakupan tiap berkas, duplikat, siap, dan tertahan secara terpisah. Konflik baru dikumpulkan dalam satu tinjauan, bukan ditanyakan per soal.

- Arahan terbaru pengguna: identitas hanya logo SVG OCUS. yang diberikan pengguna, tanpa tulisan "CBT Kedokteran Gigi" di UI/metadata. Pertahankan path/warna logo. Homepage langsung daftar modul; tanpa hero, slogan, penjelasan manfaat, alur promosi, atau CTA pemasaran. Bahasa singkat untuk mahasiswa; petunjuk fungsional tetap tersedia.
- Keputusan konten terbaru: tahan entri tidak lengkap di laporan internal; soal lengkap boleh lanjut diverifikasi. Ini bukan izin mengarang bagian hilang, mengubah kunci, atau memublikasikan.

- Gunakan `design-taste-frontend` dari Leonxlnx dan `modern-web-guidance` dari GoogleChrome; baca instruksi terpasang dan dokumentasi aktual saat perlu.
- Sebelum perubahan HTML/CSS/client JS, cari panduan spesifik dengan Modern Web Guidance, baca hasil relevan, dan evaluasi penerapannya.
- Ikuti arah CBT: minimalis, fokus membaca, netral dengan aksen terbatas, tanpa hero pemasaran besar, gradient mencolok, shader, animasi dekoratif, atau dashboard generik.
- Prioritaskan native HTML, radio/checkbox, dialog `showModal`, focus ring, label, 44px target utama, status teks/ikon, reduced motion, dan reflow.
- Laporkan bagaimana prinsip skill diterapkan dan batas pemeriksaan browser. Jangan mengklaim gate Taste lulus jika ada temuan atau waiver.

## Perintah

`npm ci`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`.

`npm run content:inventory`, `npm run content:extract`, `npm run content:validate`, `npm run content:check`. Integrasi hanya setelah persetujuan: `npm run content:integrate`.

Detail pipeline, format draft/approval, dan keterbatasan ekstraksi: `docs/CONTENT_WORKFLOW.md`. Target deployment mendatang: GitHub + Cloudflare Pages; lihat `docs/DEPLOYMENT.md`.

## Bank seluruh sumber, revisi 19 November 2026

- Ledger empat kelompok tambahan ada di content/private/all-sources/review; seluruh8PDF/230halaman telah dibaca, termasuk OCR lokal50halaman. PASLUL100 mengulang60halaman tiga kelompok lain; scanPASLUL40 sejajar dengan first40 versi bertulisan. Jangan menghitung ulang salinan sebagai soal unik.
- scripts/assemble_gsm.py menyusun proposal dari ledger ditinjau, hanya status ready+verified. Source-confirmed belum memenuhi verified. Konflik, fragmen, dan12skip lama tetap ditahan. Baseline47 tetap disimpan lokal untuk provenance dan ID stabil; penjelasan boleh diringkas tanpa mengubah kunci.
- Katalog publik kini diperluas; gunakan jumlah aktual katalog dan laporan perakitan, jangan mengasumsikan47. Draf preview47/stage4 adalah arsip tinjauan historis. Integrasi menolak receipt yang lebih tua menimpa rilis baru.
- Build GitHub Pages: npm run build:pages, basis/ocus/, HashRouter. Backend Sites/D1 tetap sama, REPORTING_ALLOWED_ORIGIN=https://mryks.github.io. Nama dan konteks laporan berada dalam snapshot JSON kompatibel dengan laporan lama; jangan reset D1.

## Keputusan G pengguna dan pemulihan catatan

- Pengguna meninjau G-001–G-101 pada PDF bernomor berurutan (hash6738543d2439f8a446c54825ce38f626a654025ed6eccf25dcdaae9109b6bb86):52keep-source-key,49skip. Record terikat signature: content/private/all-sources/g-user-decisions.json. Kode G tetap mengacu registryreview-numbering.json; jangan dinomori ulang setelah keputusan.
- Izin terbaru memperluas pengecoh buatan: catatan jawaban tanpa opsi dapat dipulihkan jika jawaban cukup jelas dan diverifikasi. Jangan memaksakan konteks/soal baru. Catat mana opsi sumber dan mana generated-distractor secara privat.
- Isian bertanda ... adalah bentuk MCQ yang sah; bukan otomatis soal terpotong. G119 harus dicek terhadap catatan(critical)/opsiA di sumber, dan dideduplikasi jika sama soal sterilisasi kritis yang sudah ada.
- Periksa duplikat seluruh bank, termasuk parafrasa dari skenario dan yang ditanyakan sama. Jangan menggabungkan hanya karena topik/jawabannya sama; pertanyaan berbeda pada skenario sama tetap berbeda. Source provenance dan kunci tetap tercatat; konflik kunci tidak dihapus dengan deduplikasi.
- Skip G/R berlaku pada entri yang diputuskan. Varian utuh yang telah disetujui sebelumnya tidak otomatis dicabut karena versi fragmennya skip; varian skip tidak dipakai sebagai rekonstruksi baru.

## Penerapan keputusan G dan deduplikasi

- Katalog terbaru207 soal:147 verified,60 ambiguous dengan keputusan per-ID. Dari189 lama,41 wakil berulang disatukan dan1 konflik edisi akreditasi ditahan;40 tambahan unik dari keputusan G dan20 pemulihan terverifikasi ditambahkan.52 keep pengguna mencakup10 padanan bank dan2 entri rujukan yang ditahan untuk konsolidasi G041/G042;49 skip tetap berlaku.
- Jalur reproduksi baru: scripts/complete_g_reassessment.py lalu scripts/apply_g_review.py menghasilkan proposal privat, bukan integrasi/publikasi otomatis. Baseline189 dan registry G beku; jangan menjalankan assemble_gsm.py untuk menimpa katalog baru. Validator TypeScript menghitung hash dan mengikat receipt nyata sebelum integrasi.
- G038 mengikuti D dari padanan G120 (IKGMP halaman6 no18, tulisan biru), bukan verified. G038 halaman19 tidak memiliki penanda tunggal; provenance ini wajib tetap terbaca privat. G002 menjadi wakil lengkap kaca mulut, menggantikan varian pendek Q014/R12 tanpa mengganti konsep kunci.
- G185 dan wakil lama GITAR48 ditahan karena SNARS1 memakai MKE, bukan KE. Perubahan nama jawaban memerlukan keputusan pengguna. G041/G042 ditahan karena skenario dan sasaran serupa tetapi dimensi/kunci berbeda; jangan menerbitkan dua soal berulang atau memilih salah satu tanpa keputusan konsolidasi.
- Tinjauan lanjutan10 kasus ada pada output/pdf/GSM-keputusan-lanjutan.pdf, kode tetap G. Sisa fragmen tidak dipaksakan; G122/G186/G200 belum dipulihkan hanya dengan membuat pengecoh. Ledger hasil lengkap dan44 pengecoh buatan tersimpan privat pada g-application-ledger.json.

## Keputusan lanjutan pengguna — rilis209

- Seluruh10kasus PDF lanjutan telah diputuskan: G041/G042/G118/G174/G177/G179/G187/G203/G208 skip; G181 mengikuti C; G185 satu wakil dengan E Manajemen Komunikasi dan Edukasi (MKE), sesuai usulan PDF. Jangan menanyakan ulang atau menghidupkan kode skip melalui varian.
- Katalog209soal =207rilis sebelumnya yang tetap identik +G181 ambiguous dengan keputusan per-ID +G185 verified dengan koreksi nama bab disetujui.148verified/61ambiguous. Tidak ada keputusan wajib tersisa dari PDF10kasus;27fragmen/masalah lain tetap ditahan tanpa rekonstruksi paksa.
- Receipt privat: content/private/all-sources/g-followup-user-decisions.json, terikat PDF SHA256380a4fbfded168e1130cda5463ca52eee00232428c9cba313f92866c2014a8eb dan signature setiap kode. apply_g_review.py menerapkan overlay ini setelah ledger lama; pemanggilan ulang tidak boleh membatalkan keputusan.
- Wakil KE lama Q081 menjadi alias G185, bukan pertanyaan kedua; G103/kemunculan sumber lain ikut menunjuk wakil MKE yang sama. Snapshot207 tetap privat sebagai bukti bahwa soal lain tidak berubah.
