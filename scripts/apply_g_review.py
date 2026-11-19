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

# The already published KE wording conflicts with the question's stated SNARS1 edition.
# Hold the existing representative and G185 pending explicit correction approval.
held_existing={labels['Q081']}
# G041/G042 ask the same unqualified referral category for the same case, but the
# approved source keys name different dimensions. Publishing both would reintroduce
# a duplicate; choosing one dimension needs a concrete consolidation decision.
held_approved_pair={queue[c]['id'] for c in ['G-041','G-042']}
kept_ids=[qid for qid in all_questions if qid not in aliases and qid not in held_existing and qid not in held_approved_pair]
pkg['questions']=[all_questions[qid] for qid in kept_ids]
pkg['approval'].update(approvedAt='2026-11-19T12:00:00.000Z',decisionReference='Pengguna memutuskan G001-G101 per kode (52ikuti sumber/49skip), mengizinkan pemulihan catatan yang jawabannya dapat diverifikasi beserta pengecoh, meminta seluruh duplikat disatukan, dan memerintahkan melanjutkan publikasi. G185/soal SNARS1 KE-MKE serta pasangan G041/G042 ditahan sambil menunggu keputusan konsolidasi/koreksi. Sumber mentah dan laporan tetap lokal.')
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
for e in alias_evidence:
    e['resolvedCatalogId']=resolve(e['to'])
    e['targetDisposition']='active' if e['resolvedCatalogId'] in kept_ids else 'held'
summary={'baseline':len(original),'userKept':52,'userSkipped':49,'newUserApprovedUnique':sum(e['disposition']=='included-source-decision' and e['catalogId'] in kept_ids for e in kept),'approvedPendingConsolidation':len(held_approved_pair),
         'newRecoveredUnique':sum(e['action']=='recover' for e in review),'removedBaselineDuplicates':sum(qid in aliases for qid in original),
         'heldPublishedConflict':len(held_existing),'activeQuestions':len(pkg['questions']),'verification':dict(Counter(q['verification'] for q in pkg['questions'])),
         'remainingReassessmentActions':dict(Counter(e['action'] for e in review)), 'generatedDistractorCount':sum(o.get('origin')=='generated-distractor' for e in review if e['action']=='recover' for o in e['options'])}
write(BASE/'g-proposal.json',proposal)
write(BASE/'g-application-ledger.json',{'summary':summary,'keptDecisions':kept,'aliases':alias_evidence,'heldExistingIds':sorted(held_existing),'heldApprovedPairIds':sorted(held_approved_pair),'reassessment':review,'note':'Frozen G codes retained. No source PDF changed. This proposal requires TypeScript schema/hash validation before integration.'})
print(json.dumps(summary,ensure_ascii=False,indent=2))
