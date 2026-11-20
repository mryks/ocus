"""Prepare the privately reviewed editorial overlay. Never publishes or changes keys."""
import copy
import json
import re
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'content/private/editorial'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
write=lambda p,d:p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
baseline=read(BASE/'baseline-209.json')
assert baseline['modules'][0]['packages'][0]['contentVersion']=='5eef6959c78ac0d9fb73da4da5a4a64c6c610e93198f8f2e0f7b22f2f4b73fad'
catalog=copy.deepcopy(baseline);pkg=catalog['modules'][0]['packages'][0]
stems={}
for line in (BASE/'stems.txt').read_text(encoding='utf-8').splitlines():
    n,text=line.split('|',1);assert int(n) not in stems;stems[int(n)]=text
assert set(stems)==set(range(1,210))

# Only lexical/evident spelling changes. Clinical acronyms, numbers and deliberately
# wrong distractor concepts are preserved; uncertain terms require a user decision.
word_map={
 'yg':'yang','tsb':'tersebut','dgn':'dengan','dg':'dengan','drg':'dokter gigi',
 'utk':'untuk','tdk':'tidak','ga':'tidak','gaada':'tidak ada','jd':'jadi',
 'bbrp':'beberapa','cth':'contoh','hrs':'harus','tp':'tetapi','ttg':'tentang',
 'th':'tahun','thn':'tahun','org':'orang','kab':'kabupaten','faskes':'fasilitas kesehatan',
 'sdm':'sumber daya manusia','rs':'rumah sakit','ic':'informed consent',
 'sosmed':'media sosial','update':'memperbarui','diprint':'dicetak',
 'resiko':'risiko','beresiko':'berisiko','efektifitas':'efektivitas','efesiensi':'efisiensi',
 'ijin':'izin','perijinan':'perizinan','praktek':'praktik','terapist':'terapis',
 'staff':'staf','meterial':'material','medic':'medis','medik':'medis',
 'kassa':'kasa','setinel':'sentinel','conscent':'consent','normayif':'normatif',
 'ekological':'ekologis','kuisioner':'kuesioner','diagnosa':'diagnosis',
 'deviden':'dividen','dentralpreneur':'dentalpreneur','govermentpreneur':'governmentpreneur',
 'planing':'planning','desinfeksi':'disinfeksi','autoclave':'autoklaf',
 'hygene':'higiene','hygine':'higiene','hygiene':'higiene','hihiene':'higiene',
 'industry':'industri','altruistic':'altruistik','endemic':'endemik','degenerative':'degeneratif',
 'vaksinisasi':'vaksinasi','antiseptic':'antiseptik','hokum':'hukum',
 'cidera':'cedera','assesment':'assessment','kementrian':'kementerian',
 'keschatan':'kesehatan','assosiasi':'asosiasi','ditandangani':'ditandatangani',
 'ilfitrasi':'infiltrasi','anastesi':'anestesi','keselamtan':'keselamatan',
 'mengimlementasikan':'mengimplementasikan','ingkatkan':'ingatkan',
 'melakukkan':'melakukan','meakukkan':'melakukan','sambal':'sambil',
 'disetiap':'di setiap','scalling':'scaling','scaller':'scaler','sodium':'natrium',
 'incinerator':'insinerator','sutnik':'suntik','analisa':'analisis','soap':'SOAP',
 'dokument':'dokumen','magnetic':'magnetik','perawatanya':'perawatannya','lab':'laboratorium',
}
phrase_map={
 'non- random':'nonrandom','non infeksius':'noninfeksius','non medis':'nonmedis',
 'di keringkan':'dikeringkan','di bilas':'dibilas','ditanah':'di tanah',
 'hand piece':'handpiece','hand pice':'handpiece','ultra-sonic':'ultrasonik',
 'followup':'follow-up','hygineindustri':'higiene industri','nilai ergonomic':'nilai ergonomis',
 'ergonomic':'ergonomi','kegawat daruratan':'kegawatdaruratan',
 'blood borne disease':'bloodborne disease','water borne disease':'waterborne disease',
 'air borne disease':'airborne disease','vector borne disease':'vector-borne disease',
 'di ke dalam':'ke dalam','tahapan2':'tahapan-tahapan',
 'Cost-cash-capital-conservation':'Cost – cash – capital – conservation',
 'Cost-modal-capital-credit':'Cost – modal – capital – credit',
 'Cost-cash-credit-coordination':'Cost – cash – credit – coordination',
 'Capital-Modal-Credit':'Capital – modal – credit','Cash-credit-capital':'Cash – credit – capital',
 'Jkt':'Jakarta','JakBar':'Jakarta Barat','grogol':'Grogol','palmerah':'Palmerah',
 'biaya sdm':'biaya sumber daya manusia','SDM, Keuangan, materi, metoda':'Sumber daya manusia, keuangan, materi, metode',
 'sumber daya manusia':'sumber daya manusia','proses manajemen':'proses manajemen',
 'fasilitas kesehatan primer':'fasilitas kesehatan primer','dokter praktik swasta perorangan':'dokter praktik swasta perorangan',
 'rumah sakit rujukan':'rumah sakit rujukan','kerja keras':'kerja keras',
 'rencana usaha':'rencana usaha','kemauan untuk kerja keras':'kemauan untuk bekerja keras',
 'kejadian sentinel':'kejadian sentinel','kejadian tidak diharapkan':'kejadian tidak diharapkan',
 'kejadian potensial cidera':'kejadian potensial cedera','kejadian nyaris cidera':'kejadian nyaris cedera',
 'kejadian tidak cidera':'kejadian tidak cedera','kejadian potensial cedera':'kejadian potensial cedera',
 'kejadian nyaris cedera':'kejadian nyaris cedera','kejadian tidak cedera':'kejadian tidak cedera',
 'disinfeksi tingkat tinggi':'disinfeksi tingkat tinggi','disinfeksi tingkat rendah':'disinfeksi tingkat rendah',
 'kurva epidemi':'kurva epidemi','pengawasan eksternal':'pengawasan eksternal',
 'kepemimpinan demokratis':'kepemimpinan demokratis','kepemimpinan delegatif':'kepemimpinan delegatif',
 'kepemimpinan karismatik':'kepemimpinan karismatik','kepemimpinan transaksional':'kepemimpinan transaksional',
 'kepemimpinan strategis':'kepemimpinan strategis','INA CBGs':'INA-CBGs',
 'hepatitis b':'hepatitis B','hepatitis c':'hepatitis C',
 'menetapkan diagnostik':'menetapkan diagnosis','teknik perawatan yang asepsis':'teknik perawatan yang aseptik',
 'flowrate air':'laju aliran air (flowrate)',
}

def clean(text):
    text=re.sub(r'\s+',' ',text).strip().replace('&','dan')
    for old,new in phrase_map.items():text=re.sub(r'(?<!\w)'+re.escape(old)+r'(?!\w)',lambda _:new,text,flags=re.I)
    for old,new in word_map.items():text=re.sub(r'(?<!\w)'+re.escape(old)+r'(?!\w)',lambda _:new,text,flags=re.I)
    text=re.sub(r'kementerian kesehatan','Kementerian Kesehatan',text,flags=re.I)
    text=re.sub(r'dinas kesehatan','Dinas Kesehatan',text,flags=re.I)
    text=re.sub(r'\b(dokter gigi|kabupaten|tahun)\.(?=\s|$)',r'\1',text,flags=re.I)
    text=re.sub(r'\s+([,;:?.])',r'\1',text)
    # A comma between digits is an Indonesian decimal separator, not punctuation.
    text=re.sub(r'(?<!\d),(?=\S)|,(?=[^\d\s])',', ',text)
    text=re.sub(r'\(\s+','(',text);text=re.sub(r'\s+\)',')',text)
    text=text.rstrip(' ,.:')
    return text[:1].upper()+text[1:]

option_overrides={
 8:{2:'Identifikasi solusi penyelesaian masalah; identifikasi kemungkinan penyebab masalah',4:'Mengedukasi pasien tentang waktu, metode, dan frekuensi menyikat gigi yang baik'},
 23:{0:'Open: populasi dapat bertambah atau berkurang',2:'Closed: populasi tidak dapat bertambah atau berkurang'},
 26:{0:'Eksperimental: randomisasi',2:'Kasus kontrol: menelusuri kembali masa lampau',3:'Potong-silang: faktor risiko dan outcome diukur pada saat bersamaan',4:'Kohort: pada awal penelitian hanya ada faktor risiko, belum ada outcome'},
 37:{2:'Mempersiapkan data, termasuk izin dari instansi terkait'},
 41:{1:'Stratified random sampling: berdasarkan strata (contoh: SD, SMP, SMA)',2:'Cluster random sampling: Jakarta terdiri atas 6 bagian (contoh: Grogol dan Palmerah di Jakarta Barat)',3:'Multistage random sampling',4:'Proportional random sampling'},
 55:{2:'Media sosial yang baik'},
 63:{2:'Memperbarui odontogram'},
 74:{1:'Digabung dengan limbah domestik',2:'Digabung dengan limbah noninfeksius'},
 85:{3:'Memberikan antiseptik, seperti Betadine'},
 94:{0:'Membantu dokter gigi menegakkan diagnosis',1:'Membantu dokter menentukan prognosis',2:'Membantu dokter gigi merencanakan perawatan',3:'Mempermudah dokter gigi menetapkan tarif jasa perawatannya'},
 101:{},
 108:{0:'Menggunakan air yang telah disaring',1:'Membilas air dalam sistem dental unit untuk membersihkan plankton dan mikroorganisme',2:'Menggunakan air biasa yang dimasukkan ke saluran air atau botol untuk menghambat pembentukan biofilm',3:'Menggunakan bahan kimia pembasmi mikroorganisme secara berkala dan berkelanjutan untuk mencegah terbentuknya biofilm'},
 114:{},
 124:{},
 138:{0:'Dikumpulkan dari komunitas',1:'Diperoleh dari asuransi swasta',2:'Dikumpulkan BPJS dari iuran peserta',3:'Dikumpulkan BPJS dari APBN dan iuran peserta',4:'Diperoleh dari Anggaran Pendapatan dan Belanja Negara (APBN)'},
 139:{0:'Seorang pasien perempuan berusia 8 tahun datang ke IGD RSGM',2:'Seorang pasien perempuan berusia 8 tahun datang ke IGD RSGM dengan gigi patah dan laserasi bibir',3:'Menurut orang tuanya, pasien sering kejang dan sedang menjalani pengobatan epilepsi',4:'Meminta dokter gigi spesialis segera datang'},
 140:{0:'Interaksi searah antara dokter gigi dan pasien',1:'Interaksi interpersonal antara dokter gigi dan pasien yang berfokus pada kebutuhan khusus pasien',2:'Interaksi antara dokter gigi dan pasien dalam transaksi jasa',3:'Hubungan dokter gigi dengan sejawatnya yang berfokus pada kebutuhan khusus pasien',4:'Hubungan dokter gigi dengan sejawatnya untuk mencapai kepuasan pasien'},
 141:{0:'Pelayanan kedokteran gigi jarak jauh oleh dokter dan dokter gigi melalui asisten klinik',1:'Pelayanan kedokteran gigi yang menggabungkan bidang kedokteran gigi dengan teknologi dan telekomunikasi',2:'Pelayanan kedokteran jarak jauh oleh dokter dan dokter gigi melalui foto'},
 146:{0:'Fasilitas pelayanan tingkat pertama dan fee for service',1:'Fasilitas pelayanan tingkat kedua dan kapitasi',2:'Fasilitas pelayanan tingkat pertama dan kapitasi',3:'Fasilitas pelayanan tingkat kedua dan cost sharing',4:'Fasilitas pelayanan tingkat kedua dan fee for service'},
 147:{0:'Unit cost, pesaing, kebijakan stakeholder, jenis fasilitas kesehatan (puskesmas atau rumah sakit pemerintah), dan profit'},
 154:{0:'Dibuang ke dalam needle disposal box khusus'},
 157:{0:'Melepas handpiece dari kabel dan membersihkan bagian luarnya dengan disinfektan',1:'Membilas handpiece dengan disinfektan, kemudian membilas dan mengeringkannya',2:'Memutar handpiece selama 20–30 detik untuk membersihkan saluran air',3:'Menyemprotkan pelumas ke dalam handpiece',4:'Mensterilkan handpiece dengan metode ultrasonik'},
 162:{2:'Standar pelayanan kesehatan umum'},
 163:{0:'Saran kesehatan'},
 174:{0:'Mengetahui tahapan yang perlu dilakukan untuk menyelesaikan suatu proses kerja',1:'Mengetahui mekanisme pergerakan pelayanan agar berfungsi secara efektif dan efisien',2:'Menjadi pedoman dalam menjalankan tahapan standar pelayanan medis',3:'Memastikan proses pelayanan berjalan dengan baik dan sesuai ketentuan',4:'Menghindari variasi dalam pelaksanaan kegiatan pelayanan'},
 189:{0:'Dikumpulkan dalam jeriken dan diserahkan kepada pihak ketiga'},
 190:{0:'Memasang spanduk klinik berukuran sangat besar di setiap jalan masuk klinik',1:'Membuat neon sign berukuran besar dengan dasar putih dan dikelilingi lampu warna-warni',2:'Mengikuti bakti sosial warga kompleks dan memberikan penyuluhan kesehatan gigi dan mulut',3:'Mengikuti bakti sosial warga kompleks sambil membagikan kartu nama pribadi',4:'Memasang umbul-umbul warna-warni berisi informasi diskon promosi'},
 196:{0:'Keahlian dokter gigi ortodonti di klinik',1:'Keahlian dokter gigi konservasi gigi di klinik'},
 201:{0:'Strengths, Weaknesses, Opportunities, Threats'},
}

changes=[]
for n,q in enumerate(pkg['questions'],1):
    before=copy.deepcopy(q)
    paragraphs=[b for b in q['blocks'] if b['type']=='paragraph'];assert len(paragraphs)==1,n
    paragraphs[0]['text']=stems[n]
    for i,o in enumerate(q['options']):o['text']=clean(option_overrides.get(n,{}).get(i,o['text']))
    for protected in ['id','correctOptionId','source','verification','references','explanation']:
        assert q[protected]==before[protected],(n,protected)
    assert [o['id'] for o in q['options']]==[o['id'] for o in before['options']]
    assert [b for b in q['blocks'] if b['type']!='paragraph']==[b for b in before['blocks'] if b['type']!='paragraph']
    if q!=before:changes.append({'index':n,'id':q['id'],'beforeBlocks':before['blocks'],'afterBlocks':q['blocks'],'beforeOptions':before['options'],'afterOptions':q['options']})

# These six lexical decisions are kept local until the user confirms their meaning.
clarifications=[{'code':c,'index':n,'questionId':pkg['questions'][n-1]['id'],'term':term,'status':'awaiting-user'} for c,n,term in [('L01',17,'OK'),('L02',194,'Proekso'),('L03',143,'pos'),('L04',132,'ketenangan'),('L05',138,'JKN/SJSN'),('L06',204,'SPPI')]]
answer_path=BASE/'user-clarifications.json'
if answer_path.exists():
    answers=read(answer_path)
    assert answers['baselineVersion']==baseline['modules'][0]['packages'][0]['contentVersion']
    for answer in answers['answers']:
        item=next(c for c in clarifications if c['code']==answer['code'])
        assert item['questionId']==answer['questionId']
        item.update(status='resolved-preserve-term',instruction=answer['instruction'])
pending=sum(c['status']=='awaiting-user' for c in clarifications)
# Numeric exceptions are editorial notation, not a change of a clinical value.
# Every other numeric token, including decimal commas, must be preserved.
def numbers(s):return Counter(re.findall(r'\d+(?:[.,]\d+)*',s.replace('1.000','1000')))
numeric_exceptions=[]
for n,(old,new) in enumerate(zip(baseline['modules'][0]['packages'][0]['questions'],pkg['questions']),1):
    a=' '.join(b.get('text','') for b in old['blocks']);b=' '.join(b.get('text','') for b in new['blocks'])
    assert a.lower().count('kecuali')==b.lower().count('kecuali'),n
    if numbers(a)!=numbers(b):
        assert n in [117,158],(n,'changed numeric stem')
        numeric_exceptions.append({'index':n,'field':'stem','reason':'Pihak ke-3 menjadi pihak ketiga' if n==117 else 'M3 menjadi molar ketiga; bukan perubahan nomor gigi'})
    for i,(a,b) in enumerate(zip(old['options'],new['options'])):
        if numbers(a['text'])!=numbers(b['text']):
            assert (n,i) in [(37,2),(174,0),(174,2)],(n,i,'changed numeric option')
            numeric_exceptions.append({'index':n,'field':'option-'+chr(65+i),'reason':'Hapus anotasi (1) pada sumber' if n==37 else 'Notasi percakapan tahapan2 diperjelas menjadi tahapan'})
write(BASE/'proposal.json',catalog)
write(BASE/'editorial-diff.json',{'baselineVersion':baseline['modules'][0]['packages'][0]['contentVersion'],'reviewedQuestions':209,'changedQuestions':len(changes),'keysAndIdsUnchanged':True,'scientificStatusUnchanged':dict(Counter(q['verification'] for q in pkg['questions'])),'clarifications':clarifications,'numericAudit':{'passed':True,'editorialNotationExceptions':numeric_exceptions},'changes':changes})
print(json.dumps({'reviewed':209,'changed':len(changes),'pendingTerms':pending,'publicCatalogModified':False}))
