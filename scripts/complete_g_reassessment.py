"""Complete the bounded private re-review. Source PDFs and frozen G numbering are read-only."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'content/private/all-sources'
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
queue = {r['code']: r['entry'] for r in read(BASE / 'review-queue.json')}
labels = {r['label']: r['id'] for r in read(BASE / 'dedup-input.json')}

def code(n): return f'G-{n:03d}'

duplicates = {
    120: 'G-038', 145: 'Q143', 148: 'Q167', 149: 'Q012', 150: 'Q146',
    151: 'Q004', 153: 'Q060', 154: 'Q004', 159: 'Q004', 161: 'G-157',
    162: 'G-034', 166: 'Q060', 167: 'Q139', 168: 'Q140', 171: 'G-038',
    183: 'Q090', 189: 'G-104', 196: 'Q076', 202: 'G-015', 206: 'Q064', 210: 'G-015',
}
reasons = {
    108: 'Diminta contoh ujaran Tulbakon, tetapi ujaran/kasus yang harus dipilih tidak ada. Berbeda sasaran dari G191 yang menanyakan nama metode; tidak mengarang dialog.',
    110: 'Konflik dimensi pengawasan dengan G006 yang sudah diputuskan: sumber D berkala, sedangkan G006 A internal. Kedua dimensi dapat berlaku sekaligus. Tidak menambah varian atau menanyakan ulang G006.',
    113: 'Varian konflik G110/G006; tidak menerbitkan pengawasan berkala dan internal sebagai dua soal dengan skenario sama.',
    118: 'A pelayanan kesehatan ditandai, namun istilah subsistem SKN adalah upaya kesehatan; stem juga menyebut tata kelola/manajemen. Perlu pilihan sumber A atau tetap tahan, tanpa mengganti kunci otomatis.',
    122: 'B SOP dan standar profesi ditandai; D SOP dan standar pelayanan juga masuk akal, sementara C belum lengkap. Mengisi C tidak menghilangkan ambiguitas B/D.',
    126: 'Penyakit jantung saja tidak menentukan arah/jenjang rujukan tanpa kondisi klinis dan kemampuan fasilitas.',
    128: 'Keterangan pasien kurang mampu belum menetapkan tindakan/tujuan pertanyaan. Tidak mengarang kasus finansial atau rujukan.',
    129: 'Perencanaan merujuk skenario yang tidak tersedia; tujuan tidak dapat ditentukan tanpa kasus.',
    130: 'Imunisasi/vaksin tidak selalu merupakan perencanaan jangka panjang; rentang waktu dan sasaran tidak tersedia.',
    133: 'Catatan pengawasan/evaluasi/controlling belum menetapkan yang ditanyakan atau pilihan jawaban.',
    135: 'Disebut tiga alternatif gigi tiruan tanpa daftar alternatif atau sasaran pertanyaan; tidak memaksakan rekonstruksi.',
    139: 'Dental unit mencakup permukaan dan komponen beragam; disinfeksi tingkat rendah tidak sama dengan sterilisasi seluruh unit. Komponen yang dimaksud tidak disebut.',
    141: 'Catatan credibility atau intelligent memuat dua kandidat jawaban tanpa ciri pembeda yang memadai.',
    143: 'RS D menjadi C dan catatan transisi belum menetapkan yang ditanyakan; bukan dasar membuat klasifikasi baru.',
    144: 'Menerima BPJS tidak membuktikan rumah sakit publik: rumah sakit swasta juga dapat bekerja sama. Tidak menguatkan klaim universal dengan opsi buatan.',
    152: 'Hampir salah rekam medis belum menjelaskan apakah insiden dicegah sebelum mencapai pasien; tidak menyimpulkan kategori insiden dari fragmen.',
    155: 'Handpiece/scaler dan DTT bertentangan dengan pemrosesan panas alat yang sesuai. Tidak memulihkan catatan ini atau mengubah keputusan sumber G070 secara diam-diam.',
    158: 'Varian G155; alkohol/DTT tidak menggantikan sterilisasi panas handpiece. Ditahan sebagai konflik ilmiah.',
    163: 'Langkah persetujuan merujuk bagian kasus yang hilang; tidak menulis pertanyaan baru dari kata IC saja.',
    164: 'Kalimat yang dilakukan ke pasien tidak menyebut tindakan atau sasaran; catatan tulis rekam medis belum cukup.',
    165: '11-12 adalah placeholder/penunjuk nomor, bukan soal yang dapat dipulihkan.',
    169: 'Drg bekerja dengan drg lain belum menjelaskan umum/spesialis; tidak memaksakan klasifikasi klinik pratama.',
    170: 'Lingkup layanan dokter gigi primer hanya dicatat gatau, tanpa daftar layanan atau kunci yang dapat diperiksa.',
    172: 'Rute/paparan HIV tidak disebut. Risiko tinggi tidak dapat diverifikasi hanya dari kata ekspos; elipsis di sini menghilangkan fakta penentu.',
    173: 'Fragmen kontribusi pinjaman belum menetapkan pertanyaan. Kontribusi ekuitas dikenal dalam materi, tetapi tidak memaksakan stem yang hilang.',
    174: 'D pelayanan operasional ditandai. Batas SOP pelayanan profesi/operasional belum menetapkan pengecualian tunggal secara kuat; perlu keputusan sumber D atau tahan.',
    176: 'Tidak ada kunci tunggal; A dokter gigi keluarga dan E primer+keluarga beririsan, serta rujukan KepPres 2005 tidak jelas.',
    177: 'D clearance medik ditandai, tetapi A rujukan medik dan E konsultasi juga mendeskripsikan kasus. Perlu keputusan sumber D atau tahan; konsultasi tidak memindahkan tanggung jawab pencabutan.',
    179: 'E peningkatan kesehatan murid ditandai, B kesadaran murid juga sesuai masalah. Stem belum menanyakan goal atau tujuan khusus; perlu keputusan, bukan menambahkan pertanyaan baru.',
    181: 'Tiga nilai ditemukan pada situs resmi laboratorium POBIS Trisakti, tetapi belum dapat diatribusikan pasti ke Pusat Inkubator Bisnis yang ditanyakan. C ditandai sumber; belum verified.',
    185: 'Konflik nama bab untuk SNARS Edisi1: G185 E Manajemen Komunikasi dan Edukasi (MKE), bank aktif/GITAR48 E Komunikasi dan Edukasi (KE). Dokumen KARS SNARS1 PDF12/14 mendukung MKE. Tahan kedua varian sampai persetujuan koreksi; satu soal saja setelah keputusan.',
    186: 'E misi kemitraan profesional ditandai; C mengandung bagian hilang dan teks misi resmi unit yang sama belum ditemukan. Tidak membuat misi universitas baru.',
    187: 'C kepemimpinan ditandai; kemauan kuat/tahan uji didukung sebagai ciri wirausaha dalam materi, tetapi pemetaan ke kategori kepemimpinan tidak ditetapkan. Perlu sumber C atau tahan.',
    200: 'Asuransi Inhealth adalah produk komersial, tetapi label swasta dapat ditafsir kepemilikan, E placeholder dan pertanyaan belum eksplisit. Tidak menyamakan badan usaha komersial dengan kepemilikan swasta secara otomatis.',
    203: 'A planning ditandai, tetapi akan mengadakan pelatihan saja belum membedakan perencanaan dari penggerakan staf; elipsis mengikuti dan, bukan isian jawaban. Perlu keputusan sumber A atau tahan.',
    208: 'C tersier ditandai; nama tiga rumah sakit saja belum memastikan kemampuan subspesialistik/kelas semuanya. Perlu keputusan sumber C atau tahan.',
}

recoveries = {
    182: dict(explanation=['Sikap pesimistis dapat menghambat inisiatif dan keyakinan tim untuk mencapai tujuan. Kepercayaan diri, kompetensi, antusiasme, dan ketegasan justru mendukung kepemimpinan ketika diterapkan secara tepat.'], references=[{'citation': 'OpenStax, Organizational Behavior, 12.4 The Trait Approach to Leadership: drive, self-confidence, cognitive ability, knowledge dan efektivitas kepemimpinan.', 'url': 'https://openstax.org/books/organizational-behavior/pages/12-4-the-trait-approach-to-leadership'}]),
    184: dict(stem='Menurut Permenkes No. 3 Tahun 2020, sebuah rumah sakit tipe C sedang mengajukan izin mendirikan. Apa saja persyaratannya?', explanation=['Dalam ketentuan tahun 2020, izin mendirikan memerlukan kajian dan perencanaan bangunan serta pemenuhan pelayanan alat kesehatan. Kajian tersebut mencakup feasibility study, detail engineering design, dan master plan; persyaratan izin operasional merupakan kelompok dokumen yang berbeda.'], references=[{'citation': 'Permenkes3/2020, Pasal31, halaman PDF17. Kerangka historis soal; tidak dinyatakan sebagai prosedur perizinan terkini.', 'url': 'https://jdih.kemkes.go.id/storage/documents/pdfs/2020permenkes003.pdf'}]),
    191: dict(stem='Komunikasi resep/instruksi antar tenaga kesehatan melalui telepon menggunakan metode ….', answer='Tulbakon (tulis, baca ulang, konfirmasi)', distractors=['SOAP (subjective, objective, assessment, plan)', 'PDCA (plan, do, check, act)', 'SWOT (strengths, weaknesses, opportunities, threats)'], explanation=['Tulbakon berarti menulis instruksi secara lengkap, membacanya kembali, lalu meminta konfirmasi pemberi instruksi. Langkah ini membantu mencegah salah dengar saat komunikasi lisan atau melalui telepon.'], references=[{'citation':'KMK HK.01.07/MENKES/1596/2024, PKPO4, halaman PDF309: instruksi lisan/telepon, tulis lengkap, baca ulang, konfirmasi.', 'url':'https://jdih.kemkes.go.id/storage/documents/pdfs/2024kepmenkes1596.pdf'}]),
    205: dict(stem='Suction tip stainless yang dapat dipakai ulang disterilisasi untuk digunakan kembali. Prinsip green dentistry yang diterapkan adalah ….', answer='Reuse', distractors=['Reduce', 'Recycle', 'Rethink'], explanation=['Reuse memperpanjang pemakaian alat yang memang dirancang untuk digunakan kembali. Alat diproses ulang sesuai petunjuk produsen, termasuk sterilisasi bila diperlukan; prinsip ini tidak berlaku untuk alat sekali pakai.'], references=[{'citation':'Green Dentistry.pdf, halaman PDF11: reuse; CDC, Sterilization and Disinfection: pemrosesan instrumen reusable dan petunjuk produsen.', 'url':'https://www.cdc.gov/dental-infection-control/hcp/summary/sterilization-disinfection.html'}]),
    211: dict(stem='Data sepuluh penyakit yang paling banyak ditemukan digunakan dalam analisis ….', answer='Derajat kesehatan', distractors=['Sumber daya kesehatan', 'Kebijakan organisasi', 'Ketersediaan sarana'], explanation=['Pola penyakit menggambarkan keadaan kesehatan masyarakat. Data penyakit terbanyak membantu menilai derajat kesehatan dan menentukan masalah kesehatan yang perlu diprioritaskan.'], references=[{'citation':'✅2 - Dasar Manajemen - Dok Ilod.pdf, halaman PDF47: analisis derajat kesehatan, morbiditas dan penyakit terbanyak; halaman dirender dan ditinjau.'}]),
}

for filename in ['reassessment-102-138.json', 'reassessment-139-175.json', 'reassessment-176-212.json']:
    path = BASE / 'review' / filename
    doc = read(path)
    for e in doc['entries']:
        n = int(e['code'][2:]); original = queue[e['code']]
        if n in duplicates:
            target = duplicates[n]
            e.update(action='duplicate', duplicateOf=labels.get(target, target), reason='Skenario/konsep yang ditanyakan sama dengan '+target+'. Simpan kemunculan sumber sebagai provenance; tidak membuat soal kedua.')
        elif n in reasons:
            e.update(action='hold', reason=reasons[n], verification='ambiguous' if n in [118,122,174,177,179,181,185,186,187,200,203,208] else 'blocked')
        if n in recoveries:
            data = recoveries[n].copy()
            e.update(action='recover', verification='verified', reason='Kunci/catatan sumber ditinjau ulang; jawaban didukung rujukan dan konteks yang tersedia. Perubahan serta pengecoh dicatat privat.')
            answer=data.pop('answer',None);distractors=data.pop('distractors',None)
            if answer:
                e['options']=[{'label':chr(65+i),'text':t,'origin':'source' if i==0 else 'generated-distractor'} for i,t in enumerate([answer]+distractors)]
                e['correctLabel']='A'
            else:
                e['options']=[{**o,'origin':'source'} for o in original['options']]
                e['correctLabel']=original['correctLabel']
            e.update(data)
        e['reviewed']=True
        assert 'sedang diselesaikan' not in e.get('reason','') and 'masih berjalan' not in e.get('reason',''),e['code']
    doc['status']='complete-private-review'
    doc['summary']={'total':len(doc['entries']),'actions':dict(Counter(e['action'] for e in doc['entries']))}
    path.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(filename,doc['summary'])
