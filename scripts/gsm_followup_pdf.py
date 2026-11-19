"""Focused private decision document, preserving frozen G codes and prior PDF."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'content/private/all-sources'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
queue={r['code']:r['entry'] for r in read(BASE/'review-queue.json')}
review={e['code']:e for f in ['reassessment-102-138.json','reassessment-139-175.json','reassessment-176-212.json'] for e in read(BASE/'review'/f)['entries']}
selected=['G-118','G-174','G-177','G-179','G-181','G-185','G-187','G-203','G-208']
pdfmetrics.registerFont(TTFont('Noto','C:/Windows/Fonts/NotoSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoBold','C:/Windows/Fonts/NotoSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Symbols','C:/Windows/Fonts/seguisym.ttf'))
styles={k:ParagraphStyle(k,fontName='NotoBold' if k in ['title','heading'] else 'Noto',fontSize=size,leading=leading,textColor=colors.HexColor('#302a32'),spaceAfter=8) for k,size,leading in [('title',24,30),('heading',14,20),('body',10,15),('small',8,12)]}
def p(s,style='body'):
    return Paragraph(escape(str(s)).replace('🎸','<font name="Symbols">🎸</font>').replace('\n','<br/>'),styles[style])
def source(e):return e['sourceFile']+' | halaman PDF '+', '.join(map(str,e['pages']))+' | '+e.get('section','')+' | no. '+str(e.get('originalNumber') or 'tanpa nomor')
story=[p('OCUS. / GSM','title'),p('Keputusan lanjutan','heading'),p('19 November 2026 - dokumen internal'),p('Pemeriksaan ulang G102-G212 selesai. Kode G tetap mengacu dokumen tinjauan sebelumnya; tidak dinomori ulang. Dokumen ini hanya memuat 10 keputusan yang belum dapat diselesaikan lewat pemeriksaan sumber.'),p('Anda tidak perlu membuka delapan PDF satu per satu. Setiap kasus memuat teks soal, pilihan, penanda jawaban dan lokasi asalnya. Catatan verifikasi membedakan jawaban sumber dari kepastian ilmiah.'),p('Cara merekap','heading'),p('Untuk kasus selain G185 dan pasangan G041/G042, cukup tulis kode + "ikuti sumber" atau "skip". Anda juga boleh memberi koreksi. Untuk G185 diperlukan persetujuan nama MKE. Pasangan G041/G042 membutuhkan pilihan satu wakil agar tidak menjadi dua pertanyaan yang sama.'),p('Kasus yang masih menunggu','heading')]
for c in ['G-041/G-042']+selected:story.append(p(c,'small'))
story.extend([Spacer(1,12),p('Entri yang tetap berupa fragmen, tidak memiliki fakta penentu, atau sudah skip tidak diminta diputuskan ulang. Ringkasan penahanan ada di bagian akhir. Tidak ada koreksi kunci yang diterapkan otomatis.'),PageBreak()])
story.extend([p('G-041 / G-042','title'),p('Satu skenario, dua kunci dari dimensi berbeda','heading'),p(source(queue['G-041']),'small'),p('Skenario sumber: Seorang wanita 75 tahun ke puskesmas, ada penyakit DM dan sering lupa minum obat, banyak karang gigi dan gusi membesar pada gigi 11,12,13,21,22,23. Pasien tidak bisa makan dan meminta dicabut giginya. Pasien seorang guru SDN dan punya kartu Jaminan Kesehatan.')])
for c in ['G-041','G-042']:
    e=queue[c];story.extend([p(c,'heading'),p(e['stem'])])
    for o in e['options']:story.append(p(o['label']+'. '+o['text']))
    story.append(p('Penanda sumber: '+e['correctLabel'],'small'))
story.extend([p('Mengapa perlu pilihan','heading'),p('Keduanya bertanya kategori rujukan internis untuk skenario yang sama. Vertikal menjelaskan arah/jenjang, sedangkan medik menjelaskan jenis layanan. Karena stem belum membatasi dimensi, menerbitkan keduanya akan menghasilkan pertanyaan berulang dengan jawaban berbeda. Keputusan mengikuti sumber sebelumnya tetap tercatat; tidak diganti diam-diam.'),p('Pilih: pertahankan hanya G041 (A vertikal), hanya G042 (D medik), tahan keduanya, atau berikan batas dimensi yang Anda inginkan.'),PageBreak()])
for c in selected:
    e=queue[c];r=review[c]
    story.extend([p(c,'title'),p(source(e),'small'),p(r['stem'])])
    for o in e['options']:story.append(p(o['label']+'. '+o['text']))
    story.extend([p('Penanda sumber: '+str(e['correctLabel']),'heading'),p(r['reason'])])
    if c=='G-185':
        story.extend([p('Pembanding dalam bank sebelumnya','heading'),p('23 UAM 6517 GITAR 🎸.pdf | halaman PDF10 | no.48: skenario brosur/poster, menyebut SNARS Edisi1, opsi E Komunikasi dan Edukasi (KE). G185 di atas memakai opsi E Manajemen Komunikasi dan Edukasi (MKE).'),p('Dokumen KARS oleh dr. Sutoto, SNARS Ed1 dan KARS Internasional, halaman PDF12 dan14 mencantumkan Manajemen Komunikasi dan Edukasi (MKE). KE merupakan nama pada standar edisi lain; keduanya tidak boleh dicampur tanpa konteks edisi.'),p('https://persi.or.id/wp-content/uploads/2018/08/p9-snars-akred-internasional.pdf','small'),p('Usulan: gunakan satu soal G185 dengan E MKE, sesuai SNARS Edisi1; gantikan wakil lama KE. Pilih setuju MKE atau tahan soal.')])
    elif c=='G-181':
        story.extend([p('Situs resmi POBIS Trisakti memuat empowering-bridging-enriching dan kegiatan inkubator bisnis, tetapi identitas unit pada soal tidak sama persis. Temuan ini mendukung istilahnya, belum membuktikan nilai resmi Pusat Inkubator Bisnis yang dimaksud.'),p('https://industri.fti.trisakti.ac.id/news/laboratorium-pengembangan-organisasi-dan-bisnis-pobis/','small'),p('Pilih: ikuti sumber C atau skip/tahan.')])
    else:story.append(p('Pilih: ikuti sumber '+str(e['correctLabel'])+' atau skip/tahan. Koreksi khusus juga dapat Anda tuliskan.'))
    story.append(PageBreak())
story.extend([p('Tetap ditahan','title'),p('Bagian ini adalah laporan, bukan daftar keputusan wajib. Soal yang memerlukan penulisan kasus baru atau fakta yang tidak tersedia tidak dipaksakan masuk bank.')])
for c,r in review.items():
    if r['action']=='hold' and c not in selected:story.append(p(c+' - '+r['reason'],'small'))
story.append(p('Sepuluh varian lain mengikuti skip terdahulu. Empat puluh lima varian adalah duplikat dan tidak menjadi pertanyaan baru. Dua puluh kandidat berhasil dipulihkan dengan dukungan verifikasi; rincian pengecoh buatan dan provenance disimpan dalam ledger lokal.'))
out=ROOT/'output/pdf/GSM-keputusan-lanjutan.pdf';out.parent.mkdir(exist_ok=True,parents=True)
def footer(canvas,doc):
    canvas.setStrokeColor(colors.HexColor('#e8e2e8'));canvas.line(44,41,A4[0]-44,41)
    canvas.setFont('Noto',8);canvas.setFillColor(colors.HexColor('#6a606a'));canvas.drawString(44,27,'OCUS. / GSM - tinjauan privat');canvas.drawRightString(A4[0]-44,27,str(doc.page))
SimpleDocTemplate(str(out),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=43,bottomMargin=54,title='OCUS GSM - keputusan lanjutan',author='OCUS').build(story,onFirstPage=footer,onLaterPages=footer)
# ReportLab emits non-BMP glyph mappings as single codepoints. Correct the emoji
# ToUnicode mapping so source filenames survive extraction as well as rendering.
from pypdf import PdfReader,PdfWriter
reader=PdfReader(out);writer=PdfWriter();writer.clone_document_from_reader(reader)
for page in writer.pages:
    for font_ref in page['/Resources'].get('/Font',{}).values():
        font=font_ref.get_object(); cmap=font.get('/ToUnicode')
        if cmap:
            obj=cmap.get_object();data=obj.get_data()
            if b'<1F3B8>' in data:obj.set_data(data.replace(b'<1F3B8>',b'<D83CDFB8>'))
with out.open('wb') as f:writer.write(f)
print(str(out))
