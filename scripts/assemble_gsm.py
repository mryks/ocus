"""Assemble reviewed local GSM ledgers. Never reads/modifies source PDFs or publishes automatically."""
import copy, hashlib, json, re, unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'content/private/all-sources'
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def norm(s): return re.sub(r"\s+", " ", unicodedata.normalize('NFC',s)).strip().casefold()
def signature(stem,opts): return json.dumps([norm(stem),sorted(norm(o['text']) for o in opts)],ensure_ascii=False,separators=(',',':'))
base=read(BASE/'rewritten-baseline.json');pkg=base['modules'][0]['packages'][0]
# The original approved IDs and option keys remain stable.
original=read(BASE/'baseline-approved.json')['modules'][0]['packages'][0]
assert len(pkg['questions'])==47 and [q['id'] for q in pkg['questions']]==[q['id'] for q in original['questions']]
ledger=[]; groups={}; by_stem={}
for q in pkg['questions']:
 s=signature(' '.join(b.get('text','') for b in q['blocks']),q['options']);groups[s]=q
 by_stem.setdefault(norm(q['blocks'][0].get('text','')),[]).append(q)
for filename in ['gitar-review.json','2022-review.json','ikgmp-review.json','paslul-review.json']:
 d=read(BASE/'review'/filename)
 for i,e in enumerate(d['entries']):
  e=copy.deepcopy(e); e['reviewFile']=filename;e['reviewIndex']=i;e['sourceFile']=d['source'];e['sourceSha256']=d['sourceSha256']
  if not isinstance(e['sourceFile'],str):e['sourceFile']=e['sourceFile'].get('file',e['sourceFile'].get('name'))
  e['sourceFile']=e['sourceFile'].replace(chr(92),'/').rsplit('/',1)[-1]
  e['signature']=signature(e['stem'],e['options']);e['id']='gsm-'+hashlib.sha256(e['signature'].encode()).hexdigest()[:24]
  # Ready is insufficient: only independently supported, complete entries can join the approved bank.
  e['eligible']=e['status']=='ready' and e['verification']=='verified' and len(e['options'])>=2 and bool(e['explanation']) and bool(e['references']) and e['correctLabel'] in [o['label'] for o in e['options']]
  ledger.append(e)
# Hold every exact variant if its key differs across reviewed occurrences, regardless of ready labels.
for e in ledger:
 peers=[p for p in ledger if p['signature']==e['signature'] and p.get('correctLabel')]
 if len(set(norm(next(o['text'] for o in p['options'] if o['label']==p['correctLabel'])) for p in peers))>1:
  e['eligible']=False;e['issues'].append('Penanda kunci berbeda pada varian stem dan opsi yang sama persis; perlu keputusan sebelum integrasi.')
for e in ledger:
 if not e['eligible']:
  e['disposition']='held' if e['status']!='not-question' else 'not-question';continue
 if e['signature'] in groups:
  e['disposition']='exact-duplicate';e['catalogId']=groups[e['signature']]['id'];continue
 qid=e['id'];labels={o['label']:qid+'-'+str(j+1) for j,o in enumerate(e['options'])}
 q={'id':qid,'blocks':[{'type':'paragraph','text':e['stem']}], 'options':[{'id':labels[o['label']],'text':o['text']} for o in e['options']], 'correctOptionId':labels[e['correctLabel']], 'explanation':[{'type':'paragraph','text':t} for t in e['explanation']], 'references':[{'id':'ref-'+str(j+1),**{k:v for k,v in r.items() if k in ['citation','url','material']}} for j,r in enumerate(e['references'])], 'verification':'verified', 'source':{'file':'soal/'+e['sourceFile'],'location':(e.get('section','')+'; halaman PDF '+', '.join(map(str,e['pages']))).strip('; '),'originalNumber':str(e['originalNumber'] or ('tanpa nomor; urutan '+str(e.get('provisionalIndex',e['reviewIndex'])+1))), 'originalKey':e['correctLabel']+' (penanda pada sumber; detail bukti pada ledger lokal)'}}
 pkg['questions'].append(q);groups[e['signature']]=q;e['disposition']='included';e['catalogId']=qid
# Preserve exact approved ambiguity decisions, never copy one to a different question.
pkg['title']='GSM';pkg.pop('description',None)
pkg['approval']['decisionReference']='Instruksi pengguna: semua delapan file soal dituntaskan, satu bank gabungan per modul, UI dan pembahasan direvisi, deploy publik ke mryks.github.io/ocus; lanjutkan pekerjaan 19 November 2026. Konflik dan entri tidak lengkap tetap ditahan. Keputusan per-ID lama tetap berlaku tanpa perubahan kunci.'
pkg['approval']['approvedAt']='2026-11-19T00:00:00.000Z'
# contentVersion is calculated by the TypeScript canonical hash before integration.
summary={'reviewedSourceFiles':8,'sourcePages':230,'reviewedNewLedgerOccurrences':len(ledger),'baselineQuestions':47,'newUniqueQuestions':sum(e['disposition']=='included' for e in ledger),'reviewedExactDuplicateOccurrences':sum(e['disposition']=='exact-duplicate' for e in ledger),'heldReviewOccurrences':sum(e['disposition']=='held' for e in ledger),'notQuestions':sum(e['disposition']=='not-question' for e in ledger),'catalogQuestions':len(pkg['questions']),'note':'Occurrence counts are not unique-question counts. All original12 skips remain held. The100-page compilation and40-page scan repeat other reviewed source pages; provenance is retained.'}
(BASE/'assembled-proposal.json').write_text(json.dumps(base,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(BASE/'assembly-ledger.json').write_text(json.dumps({'summary':summary,'entries':ledger},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
