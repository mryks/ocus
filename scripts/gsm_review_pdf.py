"""Build one private review PDF from the reviewed eight-source assembly ledger."""
import hashlib, json, re
import shutil
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
ROOT=Path(__file__).resolve().parents[1];base=ROOT/'content/private/all-sources'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
d=read(base/'assembly-ledger.json');cat=read(ROOT/'src/content/catalog.json');summary=d['summary']
pdfmetrics.registerFont(TTFont('Noto','C:/Windows/Fonts/NotoSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoBold','C:/Windows/Fonts/NotoSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Symbols','C:/Windows/Fonts/seguisym.ttf'))
styles=getSampleStyleSheet()
for name in ['Normal','BodyText','Heading1','Heading2','Heading3']:styles[name].fontName='Noto';styles[name].textColor=colors.HexColor('#29262b')
styles['BodyText'].fontSize=10;styles['BodyText'].leading=15;styles['BodyText'].spaceAfter=7
styles['Heading1'].fontName='NotoBold';styles['Heading1'].fontSize=24;styles['Heading1'].leading=30
styles['Heading2'].fontName='NotoBold';styles['Heading2'].fontSize=16;styles['Heading2'].leading=22;styles['Heading2'].spaceAfter=14
styles['Heading3'].fontName='NotoBold';styles['Heading3'].fontSize=11;styles['Heading3'].leading=16;styles['Heading3'].spaceBefore=10
styles.add(ParagraphStyle(name='SmallText',fontName='Noto',fontSize=8,leading=12,textColor=colors.HexColor('#615c64'),spaceAfter=5))
def text(s):return escape(str(s)).replace('🎸','<font name="Symbols">🎸</font>').replace('\n','<br/>')
def p(s,style='BodyText'):return Paragraph(text(s),styles[style])
def src(e):return e['sourceFile']+' | halaman PDF '+', '.join(map(str,e['pages']))+' | '+str(e.get('section',''))+' | no. '+str(e.get('originalNumber') or 'tanpa nomor')
groups={}
for e in d['entries']:
 if e['disposition']=='held':groups.setdefault(e['signature'],[]).append(e)
records=[]
for signature,occ in groups.items():
 e=occ[0];code='G-'+hashlib.sha256(signature.encode()).hexdigest()[:8].upper()
 complete=len(e['options'])>=2 and all(o['text'].strip() and not re.fullmatch(r'[. …?_-]+',o['text'].strip()) for o in e['options'])
 records.append({'code':code,'entry':e,'occurrences':occ,'section':'A' if complete and e['verification']=='ambiguous' else 'B'})
assert len({r['code'] for r in records})==len(records)
records.sort(key=lambda r:(r['section'],r['entry']['reviewFile'],r['entry']['reviewIndex']))
numbering_path=base/'review-numbering.json'
numbering=read(numbering_path) if numbering_path.exists() else {'schemaVersion':1,'entries':[]}
if not numbering['entries']:
 # Preserve the previous document and ledger before replacing their displayed codes.
 history=base/'history';history.mkdir(exist_ok=True)
 previous_queue=base/'review-queue.json'
 if previous_queue.exists() and not (history/'review-queue-hash-codes.json').exists():shutil.copy2(previous_queue,history/'review-queue-hash-codes.json')
 previous_pdf=ROOT/'output/pdf/GSM-tinjauan-semua-sumber.pdf'
 if previous_pdf.exists() and not (history/'GSM-tinjauan-kode-hash.pdf').exists():shutil.copy2(previous_pdf,history/'GSM-tinjauan-kode-hash.pdf')
by_signature={item['signature']:item for item in numbering['entries']}
assert len(by_signature)==len(numbering['entries'])
next_index=max((item['index'] for item in numbering['entries']),default=0)+1
for record in records:
 signature=record['entry']['signature']
 if signature not in by_signature:
  item={'index':next_index,'code':f'G-{next_index:03d}','legacyCode':record['code'],'signature':signature}
  numbering['entries'].append(item);by_signature[signature]=item;next_index+=1
 item=by_signature[signature]
 record.update({'code':item['code'],'index':item['index'],'legacyCode':item['legacyCode']})
assert len({item['index'] for item in numbering['entries']})==len(numbering['entries'])
numbering_path.write_text(json.dumps(numbering,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(base/'review-queue.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
out=ROOT/'output/pdf/GSM-tinjauan-semua-sumber.pdf';out.parent.mkdir(parents=True,exist_ok=True)
story=[p('OCUS. / GSM','Heading1'),Spacer(1,15),p('Tinjauan seluruh delapan sumber','Heading2'),p('19 November 2026 · dokumen internal pemilik'),p(f"Bank aktif: {summary['catalogQuestions']} soal. Tambahan hasil tinjauan: {summary['newUniqueQuestions']} soal unik, di samping 47 soal sebelumnya. Semua 8 PDF (230 halaman) telah diperiksa. Ini bukan pernyataan bahwa seluruh entri sumber dapat diterbitkan."),p('Soal yang lengkap dan didukung verifikasi masuk bank. Konflik kunci, fragmen, opsi kosong, dan keputusan skip tetap ditahan. Tidak ada kunci yang diganti otomatis.'),p('Cara menggunakan dokumen','Heading3'),p('Bagian A memuat varian dengan opsi yang dapat ditinjau, tetapi jawaban atau maksudnya masih ambigu. Kode ditulis berurutan, mulai G-001. Anda dapat merekap keputusan berdasarkan nomor tersebut. Nomor untuk batch tinjauan ini disimpan agar tetap dapat dilacak. Bagian B adalah arsip entri yang belum siap: opsi/kalimat tidak lengkap, masalah ilmiah, atau dukungan belum cukup. Anda tidak perlu menjawab semuanya sekarang; entri tetap ditahan.'),p('Kode G berbeda dari R01–R34 pada tinjauan sebelumnya. Dua belas keputusan skip R tetap berlaku dan tidak ditanyakan ulang. Varian yang mirip tidak dianggap sama persis secara otomatis.'),p(f"Bagian A: {sum(r['section']=='A' for r in records)} varian. Bagian B: {sum(r['section']=='B' for r in records)} varian. Total {len(records)} varian tertahan dari {summary['heldReviewOccurrences']} kemunculan ledger tambahan sebelum deduplikasi. Angka ini tidak ditambahkan ke jumlah soal aktif."),p('Cakupan sumber','Heading3')]
counts={'23 UAM 6517 GITAR 🎸.pdf':48,'UAM 6517 AKT 22 par 1.pdf':23,'UAM GSM 6517 PASLUL.pdf':378,'UAM IKGMP  banyak.pdf':188,'UAM_206517_20AKT_2022_20par_201.pdf.pdf':56,'UAM_20GSM6517_202022_20-_20par_201.pdf.pdf':27,'UAMm 6517 AKT 22 par 1.pdf':56,'UAMm GSM 6517 PASLUL.pdf':107}
coverage=[]
for f in read(base/'index.json'):
 meta=read(base/(f['key']+'.json'));data=(ROOT/'modul/GSM/soal'/f['file']).read_bytes();assert hashlib.sha256(data).hexdigest()==meta['sha256']
 coverage.append({'file':f['file'],'pages':f['pages'],'sha256':meta['sha256'],'reviewedEntriesIncludingRepeatedOrPlaceholder':counts[f['file']]})
 story.append(p(f"{f['file']} — {f['pages']} halaman; {counts[f['file']]} entri tinjauan (termasuk salinan/placeholder).",'SmallText'))
(base/'source-coverage.json').write_text(json.dumps({'pages':230,'sourceFiles':8,'sourceHashesUnchanged':True,'files':coverage,'overlap':'PASLUL 100 halaman41–55 = AKT22 panjang 15;56–61 =2022 enam;62–100 =IKGMP 39. PASLUL scan40 sejajar halaman1–40 versi bertulisan.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
section_ranges=[]
for section in ['A','B']:
 codes=[r['code'] for r in records if r['section']==section]
 if codes:section_ranges.append('Bagian '+section+' '+codes[0]+' sampai '+codes[-1])
story.insert(8,p('Nomor tinjauan: '+'; '.join(section_ranges)+'.'))
story.extend([p('PASLUL 100 memuat salinan 60 halaman kelompok lain; scan PASLUL 40 sejajar dengan 40 halaman awal versi bertulisan. Provenance seluruh sumber disimpan; salinan tidak dihitung sebagai tambahan soal unik. Angka entri adalah unit kurasi, bukan jaminan soal utuh.'),PageBreak()])
for section,label in [('A','A / Perlu peninjauan jawaban atau maksud'),('B','B / Entri belum siap, tetap ditahan')]:
 story.extend([p(label,'Heading1'),Spacer(1,16),p('Tidak ada perubahan jawaban otomatis. Penanda sumber dituliskan apa adanya. Catatan verifikasi menerangkan alasan penahanan, bukan jawaban pengganti yang sudah disetujui.'),PageBreak()])
 for r in [r for r in records if r['section']==section]:
  e=r['entry'];story.extend([p(r['code'],'Heading2'),p(src(e),'SmallText'),p(e['stem'] or '[Stem tidak tersedia]')])
  for o in e['options']:story.append(p(o['label']+'. '+(o['text'] or '[opsi kosong]')))
  if not e['options']:story.append(p('Tidak ada pilihan jawaban lengkap pada sumber.'))
  story.append(p('Penanda jawaban sumber: '+str(e.get('correctLabel') or 'tidak ditemukan')+' · status: '+e['verification'],'Heading3'))
  for issue in e.get('issues',[])[:5]:story.append(p(issue))
  if not e.get('issues'):story.append(p('Dukungan belum cukup untuk menerbitkan entri ini sebagai soal terverifikasi.'))
  if e.get('notes'):story.append(p('Catatan: '+' '.join(e['notes'][:2]),'SmallText'))
  for ref in e.get('references',[])[:3]:story.append(p(ref.get('citation','')+((' '+ref['url']) if ref.get('url') else ''),'SmallText'))
  if len(r['occurrences'])>1:
   for other in r['occurrences'][1:]:story.append(p('Kemunculan identik lain: '+src(other),'SmallText'))
  story.append(PageBreak() if section=='A' else Spacer(1,22))
story.append(PageBreak())
story.extend([p('Keputusan R yang tetap ditahan','Heading1'),Spacer(1,16)])
decisions=read(ROOT/'content/private/curation/gsm-akt22-user-decisions.json')
for e in decisions['decisions']:
 if e['action']=='skip':story.append(p(e['reviewCode']+' — tetap skip; '+e['candidateId'],'SmallText'))
story.append(p('Termasuk R10 (izin rumah sakit), R28 (kalibrasi intra-examiner), dan seluruh skip lain. Tidak ada opsi buatan baru untuk entri ini. Opsi tambahan hanya pernah disetujui untuk R01 dan R12.'))
def footer(c,doc):
 c.setStrokeColor(colors.HexColor('#e4dfe5'));c.line(42,42,A4[0]-42,42);c.setFont('Noto',8);c.setFillColor(colors.HexColor('#615c64'));c.drawString(42,28,'OCUS. · GSM · internal · 19 November 2026');c.drawRightString(A4[0]-42,28,str(doc.page))
doc=SimpleDocTemplate(str(out),pagesize=A4,rightMargin=45,leftMargin=45,topMargin=45,bottomMargin=55,title='GSM — Tinjauan seluruh sumber',author='OCUS.');doc.build(story,onFirstPage=footer,onLaterPages=footer)
# ReportLab's CMap emits a non-BMP scalar as five hex digits; PDF expects UTF-16BE.
from pypdf import PdfReader, PdfWriter
from io import BytesIO
reader=PdfReader(out);writer=PdfWriter();writer.clone_document_from_reader(reader)
for page in writer.pages:
 for font in page['/Resources'].get('/Font',{}).get_object().values():
  stream=font.get_object().get('/ToUnicode')
  if stream:
   stream=stream.get_object();raw=stream.get_data()
   fixed=re.sub(rb'<([0-9A-Fa-f]{5,6})>',lambda m:b'<'+chr(int(m[1],16)).encode('utf-16-be').hex().upper().encode()+b'>',raw)
   if fixed!=raw:stream.set_data(fixed)
buffer=BytesIO();writer.write(buffer);out.write_bytes(buffer.getvalue())
print(json.dumps({'pdf':str(out),'heldVariants':len(records),'sectionA':sum(r['section']=='A' for r in records),'sectionB':sum(r['section']=='B' for r in records),'sha256':hashlib.sha256(out.read_bytes()).hexdigest()},ensure_ascii=False))
