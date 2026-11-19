"""Prepare a deterministic, private catalog proposal; validation/public integration is separate."""
import copy
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'content/private/all-sources'
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
write = lambda p,d: p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
queue = {r['code']: r['entry'] for r in read(BASE/'review-queue.json')}
decisions = read(BASE/'g-user-decisions.json')['decisions']
baseline = read(BASE/'baseline-189-approved.json')
proposal = copy.deepcopy(baseline)
pkg = proposal['modules'][0]['packages'][0]
original = {q['id']:q for q in pkg['questions']}
all_questions = dict(original)
explanations = read(BASE/'g-keep-explanations.json')
labels = {r['label']:r['id'] for r in read(BASE/'dedup-input.json')}
review = [e for f in ['reassessment-102-138.json','reassessment-139-175.json','reassessment-176-212.json'] for e in read(BASE/'review'/f)['entries']]
aliases = {}
alias_evidence = []
for group in read(BASE/'semantic-dedup-g.json'):
    for member in group['members']:
        assert member not in aliases or aliases[member] == group['canonical']
        aliases[member]=group['canonical']
        alias_evidence.append({'from':member,'to':group['canonical'],'reason':group['reason']})

def resolve(qid):
    if qid.startswith('G-'): qid=queue[qid]['id']
    visited=set()
    while qid in aliases:
        assert qid not in visited,'Alias cycle'
        visited.add(qid);qid=aliases[qid]
        if qid.startswith('G-'):qid=queue[qid]['id']
    return qid

def make_question(entry, code, verification):
    source=queue[code];qid=source['id']
    opts=entry['options'];key=entry['correctLabel']
    assert len(opts)>=2 and key in [o['label'] for o in opts],code
    option_ids={o['label']:qid+'-'+str(i+1) for i,o in enumerate(opts)}
    refs=entry.get('references') or source['references'] or [{'citation':source['sourceFile']+', halaman PDF '+', '.join(map(str,source['pages']))+', no. '+str(source.get('originalNumber') or code)+'. Penanda sumber; keputusan pengguna per kode.'}]
    assert refs and entry.get('explanation'),code
    q={'id':qid,'blocks':[{'type':'paragraph','text':entry['stem']}],
       'options':[{'id':option_ids[o['label']],'text':o['text']} for o in opts],
       'correctOptionId':option_ids[key],
       'explanation':[{'type':'paragraph','text':t} for t in entry['explanation']],
       'references':[{'id':'ref-'+str(i+1),**{k:v for k,v in r.items() if k in ['citation','url','material']}} for i,r in enumerate(refs)],
       'verification':verification,
       'source':{'file':'soal/'+source['sourceFile'], 'location':source.get('section','')+'; halaman PDF '+', '.join(map(str,source['pages'])),
                 'originalNumber':str(source.get('originalNumber') or source.get('sourceLocator') or code),
                 'originalKey':key+'; penanda/catatan sumber, jejak pemeriksaan '+code+' disimpan lokal'}}
    return q

source_key_decisions = list(pkg['approval']['sourceKeyDecisions'])
kept = []
scenario='Seorang wanita 75 tahun ke puskesmas, ada penyakit DM dan sering lupa minum obat, banyak karang gigi dan gusi membesar pada gigi 11, 12, 13, 21, 22, 23. Pasien tidak bisa makan dan meminta dicabut giginya. Pasien seorang guru SDN dan punya kartu Jaminan Kesehatan.'
for decision in decisions:
    code=decision['code'];e=copy.deepcopy(queue[code])
    assert e['signature']==decision['signature'] and e['id']==decision['candidateId']
    if decision['action']=='skip':continue
    if e['id'] in aliases:
        kept.append({'code':code,'disposition':'duplicate','catalogId':resolve(e['id'])});continue
    assert code in explanations,code
    e['explanation']=[explanations[code]]
    if code=='G-038':
        e['correctLabel']='D'
        e['references'].append({'citation':'UAM IKGMP  banyak.pdf, halaman PDF6 no18 (G120): padanan lima opsi, D Meningkatkan efisiensi biaya kesehatan bertulisan biru. Bukan verifikasi ilmiah unik.'})
    q=make_question(e,code,'ambiguous')
    if code in ['G-041','G-042']:
        q['blocks'].insert(0,{'type':'paragraph','text':scenario})
    if code=='G-038':q['source']['originalKey']='D dari padanan G120, UAM IKGMP  banyak.pdf halaman PDF6 no18; G038 halaman19 tidak mempunyai penanda tunggal. Keputusan G038 mengikuti sumber, status tetap ambiguous.'
    all_questions[q['id']]=q
    source_key_decisions.append({'questionId':q['id'],'decisionReference':code+': pengguna "biarkan demikian, ikut kunci sumber" pada PDF tinjauan SHA256 '+read(BASE/'g-user-decisions.json')['reviewPdfSha256']+'. '+('Kunci D dipulihkan dari padanan G120; tidak diklaim verified.' if code=='G-038' else 'Tidak mengklaim verifikasi ilmiah; publikasi dalam lingkup instruksi lanjutan pengguna.')})
    kept.append({'code':code,'disposition':'included-source-decision','catalogId':q['id']})

for e in review:
    code=e['code']
    if e['action']=='recover':
        assert e['verification']=='verified',code
        q=make_question(e,code,'verified');all_questions[q['id']]=q
    elif e['action']=='duplicate':
        qid=queue[code]['id'];target=e['duplicateOf']
        aliases[qid]=labels.get(target,target)
        alias_evidence.append({'from':qid,'to':aliases[qid],'reason':e['reason'],'code':code})

# Keep the original release reproducible when no follow-up decision file exists.
held_existing={labels['Q081']}
# G041/G042 ask the same unqualified referral category for the same case, but the
# approved source keys name different dimensions. Publishing both would reintroduce
# a duplicate; choosing one dimension needs a concrete consolidation decision.
held_approved_pair={queue[c]['id'] for c in ['G-041','G-042']}
followup_path=BASE/'g-followup-user-decisions.json'
followup=read(followup_path) if followup_path.exists() else None
followup_skipped=set()
followup_included=[]
if followup:
    for decision in followup['decisions']:
        code=decision['code'];e=copy.deepcopy(queue[code]);qid=e['id']
        assert decision['signature']==e['signature'] and decision['candidateId']==qid,code
        if decision['action']=='skip':
            followup_skipped.add(qid);held_approved_pair.discard(qid)
            for item in review:
                if item['code']==code:item.update(action='user-skip',reason='Keputusan lanjutan pengguna: skip; terikat PDF '+followup['reviewPdfSha256'])
            continue
        assert code in ['G-181','G-185'] and decision['correctLabel']==e['correctLabel'],code
        if code=='G-181':
            assert decision['action']=='keep-source-key' and e['correctLabel']=='C'
            e['explanation']=['Bridging menjembatani hubungan dan peluang kerja sama. Empowering memperkuat kemampuan agar seseorang lebih mandiri, sedangkan enriching memperkaya pengetahuan dan pengalaman. Ketiganya menggambarkan pengembangan kapasitas kewirausahaan.']
            e['references']=[{'citation':'UAM GSM 6517 PASLUL.pdf, halaman PDF14, no24: C ditandai. Pengguna mempertahankan kunci ini dalam tinjauan lanjutan; atribusi nilai ke unit spesifik tetap ambiguous.'},{'citation':'Universitas Trisakti, Laboratorium Pengembangan Organisasi dan Bisnis (POBIS), 22November2021: empowering-bridging-enriching. Unit POBIS bukan konfirmasi identitas Pusat Inkubator Bisnis pada soal.', 'url':'https://industri.fti.trisakti.ac.id/news/laboratorium-pengembangan-organisasi-dan-bisnis-pobis/'}]
            q=make_question(e,code,'ambiguous')
            source_key_decisions.append({'questionId':qid,'decisionReference':'G181: pengguna "biarkan demikian, ikuti kunci" pada PDF SHA256 '+followup['reviewPdfSha256']+'. Kunci C dipertahankan; status ilmiah tetap ambiguous.'})
        else:
            assert decision['action']=='approve-MKE-and-deduplicate' and e['correctLabel']=='E'
            e['explanation']=['Dalam SNARS Edisi 1, Manajemen Komunikasi dan Edukasi (MKE) mencakup komunikasi serta edukasi pasien dan keluarga. Brosur, poster, dan leaflet membantu menjelaskan masalah kesehatan, perawatan, dan pencegahan dengan bahasa yang mudah dipahami.']
            e['references']=[{'citation':'UAM GSM 6517 PASLUL.pdf, halaman PDF25, no45: E Manajemen Komunikasi dan Edukasi; padanan scan UAMm GSM 6517 PASLUL.pdf halaman25.'},{'citation':'KARS, dr. Sutoto, SNARS Ed1 dan KARS Internasional, halaman PDF12 dan14: Manajemen Komunikasi dan Edukasi (MKE). Koreksi nama bab dan satu wakil disetujui pengguna pada tinjauan G185.', 'url':'https://persi.or.id/wp-content/uploads/2018/08/p9-snars-akred-internasional.pdf'}]
            q=make_question(e,code,'verified')
            old=labels['Q081'];aliases[old]=qid;held_existing.discard(old)
            alias_evidence.append({'from':old,'to':qid,'code':code,'reason':'Koreksi KE menjadi MKE sesuai SNARS Edisi1 dan konsolidasi satu soal disetujui pengguna pada PDF tinjauan lanjutan.'})
        all_questions[qid]=q;followup_included.append(qid)
        for item in review:
            if item['code']==code:item.update(action='included-source-decision' if code=='G-181' else 'included-approved-correction',reason='Keputusan eksplisit pengguna pada PDF '+followup['reviewPdfSha256'],verification=q['verification'])
kept_ids=[qid for qid in all_questions if qid not in aliases and qid not in held_existing and qid not in held_approved_pair and qid not in followup_skipped]
pkg['questions']=[all_questions[qid] for qid in kept_ids]
pkg['approval'].update(approvedAt='2026-11-19T12:00:00.000Z',decisionReference='Pengguna memutuskan G001-G101 per kode (52ikuti sumber/49skip), mengizinkan pemulihan catatan yang jawabannya dapat diverifikasi beserta pengecoh, meminta seluruh duplikat disatukan, dan memerintahkan melanjutkan publikasi. G185/soal SNARS1 KE-MKE serta pasangan G041/G042 ditahan sambil menunggu keputusan konsolidasi/koreksi. Sumber mentah dan laporan tetap lokal.')
if followup:
    pkg['approval']['decisionReference']='Keputusan pengguna G001-G101 dan izin pemulihan catatan terverifikasi tetap berlaku. Tinjauan lanjutan PDF SHA256 '+followup['reviewPdfSha256']+': G041/G042/G118/G174/G177/G179/G187/G203/G208 skip; G181 pertahankan kunci C; G185 satu soal dengan E MKE sesuai usulan PDF, menggantikan varian KE. Instruksi publikasi online tetap berlaku. Bahan mentah, laporan dan secret tetap lokal.'
pkg['approval']['sourceKeyDecisions']=[d for d in source_key_decisions if d['questionId'] in kept_ids]
assert len({d['questionId'] for d in pkg['approval']['sourceKeyDecisions']})==len(pkg['approval']['sourceKeyDecisions'])
assert {q['id'] for q in pkg['questions'] if q['verification']=='ambiguous'}=={d['questionId'] for d in pkg['approval']['sourceKeyDecisions']}

def norm(s):return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',s)).strip().casefold()
signatures={}
for q in pkg['questions']:
    sig=json.dumps([norm(' '.join(b.get('text','') for b in q['blocks'])),sorted(norm(o['text']) for o in q['options'])],ensure_ascii=False)
    assert sig not in signatures,(q['id'],signatures.get(sig))
    signatures[sig]=q['id']
    assert 'kunci sumber' not in ' '.join(b.get('text','').lower() for b in q['explanation'])

for e in kept:
    if e['disposition']=='duplicate':assert resolve(e['catalogId']) in kept_ids,e
assert all(qid not in kept_ids for qid in followup_skipped)
for e in alias_evidence:
    e['resolvedCatalogId']=resolve(e['to'])
    e['targetDisposition']='active' if e['resolvedCatalogId'] in kept_ids else 'held'
summary={'baseline':len(original),'userKept':52,'userSkipped':49,'newUserApprovedUnique':sum(e['disposition']=='included-source-decision' and e['catalogId'] in kept_ids for e in kept),'approvedPendingConsolidation':len(held_approved_pair),
         'newRecoveredUnique':sum(e['action']=='recover' for e in review),'removedBaselineDuplicates':sum(qid in aliases for qid in original),
         'heldPublishedConflict':len(held_existing),'activeQuestions':len(pkg['questions']),'verification':dict(Counter(q['verification'] for q in pkg['questions'])),
         'remainingReassessmentActions':dict(Counter(e['action'] for e in review)), 'generatedDistractorCount':sum(o.get('origin')=='generated-distractor' for e in review if e['action']=='recover' for o in e['options'])}
summary.update(followupSkipped=len(followup_skipped),followupAdded=len(followup_included),pendingFocusedDecisions=0 if followup else 10)
write(BASE/'g-proposal.json',proposal)
write(BASE/'g-application-ledger.json',{'summary':summary,'keptDecisions':kept,'aliases':alias_evidence,'heldExistingIds':sorted(held_existing),'heldApprovedPairIds':sorted(held_approved_pair),'reassessment':review,'note':'Frozen G codes retained. No source PDF changed. This proposal requires TypeScript schema/hash validation before integration.'})
print(json.dumps(summary,ensure_ascii=False,indent=2))
