"""Paket tinjauan privat: kandidat ditahan + seluruh halaman tiga sumber asli."""
import hashlib
import io
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, NameObject

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / 'content/private/curation/gsm-akt22-review-config.json'
config = json.loads(CONFIG.read_text(encoding='utf-8'))
ledger = json.loads((ROOT / config['output']['ledger']).read_text(encoding='utf-8'))
merged = json.loads((ROOT / config['merged']).read_text(encoding='utf-8'))
draft = json.loads((ROOT / config['output']['draft']).read_text(encoding='utf-8'))
entries = [e for e in ledger['entries'] if e['status'] != 'ready-for-user-review']
questions = {q['id']: q for q in merged['candidates']}
assert len(entries) == 34 and len(draft['module']['packages'][0]['questions']) == 25

OUT = ROOT / 'output/pdf/GSM-tinjauan-34-kandidat.pdf'
TMP = ROOT / 'tmp/pdfs/gsm-review'
TMP.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
font_dir = Path('C:/Windows/Fonts')
for name, file in [('Arial', 'arial.ttf'), ('Arial-Bold', 'arialbd.ttf'), ('Arial-Italic', 'ariali.ttf'), ('Symbols', 'seguisym.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(font_dir / file)))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial-Italic', boldItalic='Arial-Bold')
glyphs = pdfmetrics.getFont('Arial').face.charToGlyph
symbol_glyphs = pdfmetrics.getFont('Symbols').face.charToGlyph
INK = colors.HexColor('#271F2B')
PLUM = colors.HexColor('#542B50')
MUTED = colors.HexColor('#665E68')
LINE = colors.HexColor('#DAD4DC')
PALE = colors.HexColor('#F6F3F7')
W, H = A4
BODY_W = W - 96

def clean(text):
    return re.sub(r'\s+', ' ', str(text)).strip().translate(str.maketrans({'\u2011': '-', '\u2013': '-', '\u2014': '-', '\u2212': '-'}))

def rich(text):
    result = []
    for ch in clean(text):
        if ord(ch) in glyphs:
            result.append(escape(ch))
        elif ord(ch) in symbol_glyphs:
            result.append(f'<font name="Symbols">{escape(ch)}</font>')
        else:
            raise ValueError(f'Unsupported glyph U+{ord(ch):04X}: {text}')
    return ''.join(result)

styles = {
    'title': ParagraphStyle('title', fontName='Arial-Bold', fontSize=29, leading=34, textColor=INK, spaceAfter=15),
    'h1': ParagraphStyle('h1', fontName='Arial-Bold', fontSize=18, leading=22, textColor=INK, spaceAfter=11),
    'h2': ParagraphStyle('h2', fontName='Arial-Bold', fontSize=10, leading=14, textColor=PLUM, spaceBefore=11, spaceAfter=5, keepWithNext=True),
    'body': ParagraphStyle('body', fontName='Arial', fontSize=10.2, leading=14, textColor=INK, spaceAfter=6, allowWidows=0, allowOrphans=0),
    'small': ParagraphStyle('small', fontName='Arial', fontSize=8.4, leading=11.2, textColor=MUTED, spaceAfter=4, splitLongWords=True),
    'tiny': ParagraphStyle('tiny', fontName='Arial', fontSize=7.2, leading=10, textColor=MUTED, spaceAfter=3, splitLongWords=True),
    'table': ParagraphStyle('table', fontName='Arial', fontSize=9, leading=12, textColor=INK, spaceAfter=0),
    'option': ParagraphStyle('option', fontName='Arial', fontSize=9.7, leading=13, textColor=INK, spaceAfter=0),
}

def p(text, style='body'):
    return Paragraph(rich(text), styles[style])

def link(text, uri, style='small'):
    return Paragraph(f'<link href="{escape(uri, {chr(34): "&quot;"})}" color="#542B50">{rich(text)}</link>', styles[style])

topics = {
    '6913e01368283285164d3f41': 'Tingkat fasilitas kesehatan',
    '6ed2d4ad2815baa795d59934': 'IPAL dan konsep R',
    'ca8083dd8680f1049497fc92': 'Posisi operator - versi pendek',
    'b05682a2b96c84e7599d377b': 'Fungsi manajemen klinik sukses',
    '4b7ec97852c5d61c83d902e7': 'Analisis 5 Whys',
    '7f9815384d3c8faf4a8a8d60': 'Zona penempatan alat',
    '3e0969c4f2a893f0a67828c0': 'Bank dan metode pembayaran',
    'f2af8967acd8e6b30b4fcf5f': 'Pergantian penanggung jawab klinik',
    '3c226acc550e776e19c7efda': 'Faktor fisiologis PAK',
    '6affbdeb4e0887a78f272ac5': 'Catatan izin rumah sakit',
    'f75c7381de4ae39f7d73198f': 'Pengelolaan limbah gypsum',
    '63773a4be7614f4e1bf0e3a0': 'Dekontaminasi kaca mulut',
    '3dbdb4d9e40439bd08ad9521': 'Biaya operasi - soal terpotong',
    '28447ae3d334470e70370d1d': 'Informed consent digital',
    'c018e66bc1f118653b8c4189': 'Wawancara calon tenaga klinik',
    '0f13b55c9a3500cb203a600a': 'Posisi operator - versi panjang',
    '2c68d0d6ad8164f0aa4675a1': 'Triad epidemiologi karies',
    'ddea848f1c795ed719b92fb0': 'Causal Pie dan necessary cause',
    '7269ae9bffe4a930be103a43': 'Desain evaluasi vaksin influenza',
    '2b45bc36e75f20a267ac56cb': 'Populasi Fixed / Closed',
    '208eee740c11e35cebbf63db': 'Desain studi kuesioner Puskesmas',
    'acee9fdcdf36a07c33ec4bdf': 'Sikap atau persepsi siswa',
    'a52eb2f973cc1e01c71ae2e5': 'Skala respons anjuran sayur',
    'e2604c429fcf7a9415966de0': 'Karakteristik orang pada siswa SD',
    'a797c7b56ab63ccb17ffda2e': 'Desain studi kebiasaan siswa SD',
    'c7980f80e4eac15be51131c0': 'Tindakan pengendalian KLB',
    'd613ca5e297bc262d95b75ef': 'Satuan rata-rata DMF-T',
    '412b4b93a89adceb106675dc': 'Kalibrasi intra-examiner',
    'db13b610a04b3c69b6a9e7ef': 'Sampling menurut kelompok umur',
    'da9ed038e52bd3ba6346faa0': 'Jenis observasi perilaku siswa',
    '046eec43788004d7bbe80caf': 'Wawancara siswa kelas 1-2',
    '471a951f58c9aa8aaf2d56fa': 'Skala kepuasan pasien',
    '4b0b425b058a58a9501d7a14': 'Skala penilaian kinerja perawat',
    '6f3e7afcedf83869db0565f6': 'Skala kualitas makanan pasien',
}
status_names = {
    'held-incomplete': 'Teks / opsi tidak lengkap', 'source-conflict': 'Konflik kunci',
    'needs-source-key': 'Kunci sumber belum jelas', 'needs-asset': 'Gambar / izin distribusi',
    'needs-context': 'Konteks belum cukup', 'needs-option-repair': 'Opsi perlu diperbaiki',
    'needs-legal-scope': 'Acuan aturan / opsi', 'needs-terminology': 'Istilah bertumpang tindih',
    'needs-timing': 'Waktu pengukuran belum jelas', 'needs-concept-definition': 'Definisi konsep belum jelas',
    'needs-response-format': 'Format respons belum ada', 'needs-unit-convention': 'Konvensi satuan indeks',
    'needs-population-denominator': 'Ukuran populasi belum ada', 'needs-classification-axis': 'Dimensi klasifikasi belum jelas',
}
requests = {
    'held-incomplete': 'Lengkapi teks dan pilihan dari sumber yang tersedia, atau biarkan ditahan. Bagian kosong belum direkonstruksi.',
    'source-conflict': 'Tinjau kunci sumber dan usulan/masalah opsi. Belum ada penggantian kunci. Bila belum yakin, tetap tahan.',
    'needs-source-key': 'Konfirmasikan kunci untuk varian ini, atau tinjau usulan sebagai penetapan kunci baru.',
    'needs-asset': 'Gambar sudah disertakan untuk tinjauan privat. Konfirmasikan izin distribusinya sebelum soal dapat diaktifkan.',
    'needs-option-repair': 'Konfirmasikan teks opsi C dan E. Teks janggal pada sumber tidak diperbaiki diam-diam.',
    'needs-legal-scope': 'Tentukan tahun/acuan aturan dan pembeda opsi D/E. Konteks aturan lama tidak disamakan dengan materi 2026.',
    'needs-terminology': 'Konfirmasikan definisi Fixed dan Closed yang dipakai serta pembeda satu jawaban terbaik.',
    'needs-timing': 'Konfirmasikan apakah pengukuran dilakukan pada satu periode atau berikan teks waktu dari sumber lengkap.',
    'needs-concept-definition': 'Konfirmasikan pembeda Sikap dan Persepsi menurut materi yang dipakai pembuat soal.',
    'needs-response-format': 'Lengkapi contoh pilihan respons atau format instrumen untuk membedakan jenis skala.',
    'needs-unit-convention': 'Konfirmasikan konvensi skor indeks dan populasi yang dimaksud sebelum menetapkan satuan.',
    'needs-population-denominator': 'Lengkapi ukuran populasi tiap kelompok dan mekanisme acak untuk menilai alokasi proporsional.',
    'needs-classification-axis': 'Konfirmasikan apakah soal menguji struktur pengamatan atau keterlibatan pengamat.',
    'needs-context': 'Perjelas fokus pertanyaan dari sumber lengkap atau revisi yang Anda setujui; jangan hanya menganggap kunci sumber pasti salah.',
}
source_files = [s['file'] for s in merged['sources']]
source_codes = {file: chr(65+i) for i, file in enumerate(source_files)}
source_readers = {}
for source in merged['sources']:
    path = ROOT / 'modul/GSM' / source['file']
    assert path.resolve().is_relative_to((ROOT / 'modul/GSM').resolve())
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source['sourceHash']
    source_readers[source['file']] = PdfReader(path)

class ReviewDoc(SimpleDocTemplate):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.case_pages = {}

    def afterFlowable(self, flowable):
        if hasattr(flowable, 'case_code'):
            self.case_pages[flowable.case_code] = self.page - 1

def furniture(canvas, doc):
    canvas.saveState()
    canvas.setFont('Arial-Bold', 9)
    canvas.setFillColor(PLUM)
    canvas.drawString(48, H-29, 'OCUS.')
    canvas.setFont('Arial', 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(W-48, H-29, 'GSM / Tinjauan privat / 18 November 2026')
    canvas.setStrokeColor(LINE)
    canvas.line(48, 36, W-48, 36)
    canvas.setFont('Arial', 7.5)
    canvas.drawString(48, 23, 'Kunci sumber dan usulan dibedakan. Belum dipublikasikan.')
    canvas.drawRightString(W-48, 23, str(doc.page))
    canvas.restoreState()

def table(data, widths, header=False):
    t = Table(data, colWidths=widths, hAlign='LEFT')
    commands = [('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8), ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6), ('LINEBELOW', (0,0), (-1,-1), .4, LINE)]
    if header:
        commands += [('BACKGROUND', (0,0), (-1,0), PALE)]
    t.setStyle(TableStyle(commands))
    return t

def build_core(index_pages):
    story = [Spacer(1, 15), p('Tinjauan 34 kandidat ditahan', 'title'), p('GSM - tiga sumber AKT22', 'h1'), p('Satu dokumen untuk membaca soal, membandingkan kunci, memahami alasan penahanan, dan memeriksa halaman sumber asli.'), Spacer(1, 10)]
    story += [p('Apakah 25 soal lainnya sudah siap publish?', 'h2'), p('Secara pemeriksaan internal, 25 soal sudah cocok dengan penanda kunci sumber dan mempunyai pembahasan serta rujukan. Belum ditemukan konflik yang membuatnya ditahan. Statusnya tetap draf untuk persetujuan isi Anda; ini bukan klaim bahwa kunci sumber resmi dosen atau pasti bebas kesalahan. Publikasi dan deployment belum disetujui.')]
    groups = [('Tidak lengkap', '4'), ('Konflik kunci', '4'), ('Kunci sumber belum jelas', '3'), ('Gambar / izin distribusi', '1'), ('Konteks, opsi, istilah atau metode', '22'), ('Total ditahan', '34')]
    story += [p('Mengapa 34 kandidat masih ditahan?', 'h2'), table([[p(a,'table'), p(b,'table')] for a,b in groups], [BODY_W-60,60]), Spacer(1, 10), p('Cara meninjau', 'h2'), p('Gunakan kode R01-R34 ketika memberi keputusan. Indeks dan tautan sumber di setiap entri dapat diklik. Lampiran memuat seluruh 35 halaman asli dari tiga PDF; Anda tidak perlu membuka file sumber lain. Bookmark PDF juga tersedia.'), p('Kunci sumber adalah penanda kuning/tebal yang tercatat. Jawaban sementara adalah hasil penelaahan, bukan perubahan yang sudah disetujui. Untuk soal yang belum jelas, keputusan boleh tetap ditahan.'), p('Keputusan sebelumnya tetap berlaku', 'h2'), p('UTM 2019 no.25 (R28): tetap hold. Kunci sumber E dan usulan C belum diubah. Soal-soal bermasalah tidak dimasukkan ke draf 25 soal.')]
    story += [PageBreak(), p('Indeks kandidat ditahan', 'h1')]
    rows = [[p(x,'table') for x in ['Kode', 'Topik', 'Masalah', 'Hal.']]]
    for i,e in enumerate(entries,1):
        code = f'R{i:02}'
        rows.append([link(code, f'ocus-review:case:{code}', 'table'), p(topics[e['candidateId'][9:]], 'table'), p(status_names[e['status']], 'table'), link(str(index_pages.get(code,0)+1) if code in index_pages else '-', f'ocus-review:case:{code}', 'table')])
    t = table(rows, [42,201,214,BODY_W-457], True)
    t.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
    story += [t]
    for i,e in enumerate(entries,1):
        code = f'R{i:02}'
        q = questions[e['candidateId']]
        story.append(PageBreak())
        heading = p(f'{code} / {topics[e["candidateId"][9:]]}', 'h1')
        heading.case_code = code
        story += [heading, p(status_names[e['status']].upper(), 'small')]
        for s in e['sources']:
            source_code = source_codes[s['file']]
            text = f'{source_code}. {Path(s["file"]).name}; {s["section"]}; no.{s["originalNumber"]}; halaman PDF {", ".join(map(str,s["pages"]))}'
            story.append(link(text, f'ocus-review:source:{source_code}:{s["pages"][0]}'))
        story += [Spacer(1,5), table([[p('Kunci sumber: '+('/'.join(e['sourceMarkedLabels']) or 'Tidak terdeteksi'), 'table'), p('Jawaban sementara: '+(e.get('proposedOptionLabel') or 'Belum ditentukan'), 'table')]], [BODY_W/2]*2), p('Teks sumber', 'h2'), p(e['stem'])]
        if q['options']:
            option_rows = [[p(o['label']+'.', 'option'), p(o['text'] or '[Opsi kosong pada sumber]', 'option')] for o in q['options']]
            t = table(option_rows, [28, BODY_W-28])
            t.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
            story.append(t)
        else:
            story.append(p('[Tidak ada pilihan jawaban pada sumber]', 'small'))
        if e['status'] == 'needs-asset':
            img = ROOT / 'content/private/assets/gsm-akt22/causal-pies-utm2019-q3.png'
            story += [Spacer(1,7), Image(str(img), width=BODY_W-8, height=(BODY_W-8)*260/914), p('Diagram sumber untuk tinjauan privat. Distribusi belum disetujui.', 'tiny')]
        story += [p('Mengapa ditahan', 'h2'), p(e['reason']), p('Yang perlu diputuskan / dilengkapi', 'h2'), p(requests[e['status']])]
        if e.get('userDecision'):
            story.append(p('Keputusan Anda sebelumnya: '+e['userDecision']['status']+' - '+e['userDecision']['note'], 'small'))
        if e.get('references'):
            story.append(p('Dasar pemeriksaan', 'h2'))
            for refid in e['references']:
                ref = config['references'][refid]
                cite = ref['citation']
                if ref.get('material'):
                    cite += ' '+ref['material']['title']+'; '+ref['material']['section']
                story.append(link(cite,ref['url']) if ref.get('url') else p(cite,'small'))
        story += [Spacer(1,8), p('Catatan Anda: ___________________________________________________________________', 'small'), p('________________________________________________________________________________', 'small'), p('ID: '+e['candidateId'], 'tiny'), link('Kembali ke indeks', 'ocus-review:index')]
    doc = ReviewDoc(str(TMP/'core.pdf'), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=50, bottomMargin=49, title='GSM - Tinjauan 34 kandidat ditahan', author='OCUS.', pageCompression=1)
    doc.build(story, onFirstPage=furniture, onLaterPages=furniture)
    return doc.case_pages

first = build_core({})
case_pages = build_core(first)
assert first == case_pages, 'Indeks berubah saat build kedua'
core = PdfReader(TMP/'core.pdf')
writer = PdfWriter()
writer.append(core, import_outline=False)
destinations = {'ocus-review:index': 1}
destinations.update({f'ocus-review:case:{key}': value for key,value in case_pages.items()})
writer.add_outline_item('Ringkasan dan cara meninjau', 0)
parent = writer.add_outline_item('Indeks R01-R34', 1)
for i,e in enumerate(entries,1):
    code=f'R{i:02}'
    writer.add_outline_item(code+' - '+topics[e['candidateId'][9:]],case_pages[code],parent=parent)
appendix_manifest = []
for file,reader in source_readers.items():
    code=source_codes[file]
    buffer=io.BytesIO()
    doc=SimpleDocTemplate(buffer,pagesize=A4,leftMargin=48,rightMargin=48,topMargin=70,bottomMargin=60)
    story=[p('Lampiran '+code, 'title'),p(Path(file).name,'h1'),p(f'{len(reader.pages)} halaman sumber asli, urutan halaman dipertahankan.'),p('Halaman berikut adalah salinan PDF sumber untuk peninjauan privat. Warna, diagram, dan catatan pada sumber dipertahankan. Tinjauan serta usulan dalam bagian R01-R34 belum mengubah halaman ini.'),p('Gunakan bookmark untuk kembali ke entri R01-R34 atau indeks.','small')]
    doc.build(story)
    cover_page=len(writer.pages)
    writer.append(PdfReader(buffer),import_outline=False)
    parent=writer.add_outline_item('Lampiran '+code+' - '+Path(file).name,cover_page)
    start=len(writer.pages)
    writer.append(reader,import_outline=False)
    for n in range(1,len(reader.pages)+1):
        destinations[f'ocus-review:source:{code}:{n}']=start+n-1
        writer.add_outline_item(f'{code} / halaman PDF {n}',start+n-1,parent=parent)
    appendix_manifest.append({'code':code,'file':file,'originalPages':len(reader.pages),'firstGlobalPage':start+1})
links=0
for page in writer.pages:
    for annotation_ref in page.get('/Annots',[]):
        annotation=annotation_ref.get_object()
        action=annotation.get('/A')
        if not action:
            continue
        action=action.get_object()
        uri=str(action.get('/URI',''))
        if uri.startswith('ocus-review:'):
            assert uri in destinations, uri
            annotation[NameObject('/A')]=DictionaryObject({NameObject('/S'):NameObject('/GoTo'),NameObject('/D'):ArrayObject([writer.pages[destinations[uri]].indirect_reference,NameObject('/Fit')])})
            links+=1
writer.add_metadata({'/Title':'GSM - Tinjauan 34 kandidat ditahan','/Author':'OCUS.','/Subject':'Tinjauan privat: soal, kunci sumber, usulan, alasan penahanan dan lampiran sumber asli','/Keywords':'GSM, review, internal, pending'})
writer.write(OUT)
result={'file':str(OUT),'pages':len(writer.pages),'corePages':len(core.pages),'cases':len(entries),'casePages':{k:v+1 for k,v in case_pages.items()},'sourceAppendices':appendix_manifest,'internalLinks':links,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()}
(TMP/'manifest.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
