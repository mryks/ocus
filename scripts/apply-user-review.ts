import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { moduleSchema, referenceSchema, type Block, type Question } from '../src/domain/content.ts'
import { contentHash } from './content.ts'

type Source = { file: string; section: string; originalNumber: string; pages: number[] }
type Candidate = { id: string; signature: string; stem: string; options: { label: string; text: string }[]; sources: Source[] }
type Entry = { candidateId: string; status: string; reason: string; sourceMarkedLabels: string[]; sourceKeyEvidence: (Source & { label: string; page: number; visuallyChecked: boolean; method: string })[] }
export type ReviewDecision = { reviewCode: string; candidateId: string; signature: string; action: 'keep' | 'skip'; instruction: string; key?: string; stem?: string; options?: { label: string; text: string; origin: 'user-confirmed-answer' | 'generated-distractor' }[]; explanation?: string[]; references?: string[]; asset?: { manifest: string; publicPath: string }; scientificStatus?: 'verified' | 'ambiguous'; notes?: string[] }
type UserReview = { date: string; baseContentVersion: string; pdf: string; pdfSha256: string; decisions: ReviewDecision[]; references: Record<string, unknown>; output: { draft: string; ledger: string; report: string; queue?: string } }
type AppliedDecision = ReviewDecision & { originalAssessment: Entry; included: boolean; assetApproval?: unknown; syntheticOptions?: ReviewDecision['options']; changes?: { stemBefore: string; stemAfter: string }; publicationApproval?: string }
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const read = async (file: string) => JSON.parse(await readFile(file, 'utf8'))
function within(file: string, parent: string) {
  const result = path.resolve(file), relative = path.relative(path.resolve(parent), result)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error(`Path review tidak aman: ${file}`)
  return result
}
export function validateUserSelection(decisions: ReviewDecision[], candidates: Candidate[], held: Entry[]) {
  if (decisions.length !== held.length || new Set(decisions.map(d => d.candidateId)).size !== held.length || new Set(decisions.map(d => d.reviewCode)).size !== held.length) throw Error('Keputusan harus tepat satu untuk seluruh kode tinjauan.')
  for (const [index, entry] of held.entries()) {
    const code = `R${String(index + 1).padStart(2, '0')}`
    const d = decisions.find(d => d.reviewCode === code), q = candidates.find(q => q.id === entry.candidateId)
    if (!d || !q || d.candidateId !== q.id || d.signature !== q.signature || !d.instruction.trim()) throw Error(`Kode atau versi soal tinjauan tidak cocok: ${code}`)
    if (!['keep', 'skip'].includes(d.action)) throw Error('Keputusan pengguna tidak dikenal.')
    if (d.action === 'skip') {
      if (d.key || d.stem || d.options || d.asset) throw Error(`Soal skip tidak boleh mempunyai perubahan aktif: ${code}`)
      continue
    }
    const options = d.options ?? q.options
    if (!d.key || !options.some(o => o.label === d.key) || options.length < 2 || new Set(options.map(o => o.label)).size !== options.length || options.some(o => !o.text.trim())) throw Error(`Opsi/kunci tinjauan tidak valid: ${code}`)
    if (d.options) {
      if (q.options.length || d.options.filter(o => o.origin === 'user-confirmed-answer').length !== 1 || d.options.find(o => o.label === d.key)?.origin !== 'user-confirmed-answer') throw Error(`Asal opsi tambahan tidak jelas: ${code}`)
    } else if (entry.sourceMarkedLabels.length !== 1 || entry.sourceMarkedLabels[0] !== d.key) throw Error(`Kunci harus mengikuti sumber pada keputusan ini: ${code}`)
    if (!d.explanation?.length || !d.references?.length) throw Error(`Pembahasan/rujukan belum lengkap: ${code}`)
    if (d.scientificStatus !== 'verified' && d.scientificStatus !== 'ambiguous') throw Error(`Status ilmiah tidak jelas: ${code}`)
  }
}
export async function applyUserReview(configFile: string, userFile: string) {
  const config = await read(within(configFile, 'content/private'))
  const review = await read(within(userFile, 'content/private')) as UserReview
  const base = await read(within(config.output.draft, 'content/private/drafts'))
  const ledger = await read(within(config.output.ledger, 'content/private')) as { entries: Entry[] }
  const merged = await read(within(config.merged, 'content/private')) as { candidates: Candidate[] }
  if (hash(await readFile(within(review.pdf, 'output/pdf'))) !== review.pdfSha256) throw Error('PDF yang ditinjau berubah; cocokkan ulang kode R sebelum menerapkan keputusan.')
  const pkg = base.module.packages[0]
  if (base.module.packages.length !== 1 || pkg.contentVersion !== review.baseContentVersion || contentHash(base.module, pkg) !== review.baseContentVersion) throw Error('Versi draf awal tidak cocok dengan keputusan pengguna.')
  const held = ledger.entries.filter(e => e.status !== 'ready-for-user-review')
  validateUserSelection(review.decisions, merged.candidates, held)
  const refs = new Map(Object.entries({ ...config.references, ...review.references }).map(([id, value]) => [id, referenceSchema.parse({ id, ...(value as object) })]))
  const selected = new Map<string, Question>(pkg.questions.map((q: Question) => [q.id, q]))
  const applied: AppliedDecision[] = []
  for (const d of review.decisions) {
    const q = merged.candidates.find(q => q.id === d.candidateId)!
    const prior = held.find(e => e.candidateId === q.id)!
    if (d.action === 'skip') { applied.push({ ...d, originalAssessment: prior, included: false }); continue }
    const source = prior.sourceKeyEvidence.find(e => e.visuallyChecked) ?? q.sources[0]
    const options = d.options ?? q.options
    const blocks: Block[] = [{ type: 'paragraph', text: d.stem ?? q.stem }]
    let assetApproval: unknown
    if (d.asset) {
      const manifest = await read(within(d.asset.manifest, 'content/private'))
      if (manifest.candidateId !== q.id || hash(await readFile(within(manifest.file, 'content/private'))) !== manifest.sha256) throw Error('Aset tinjauan berubah.')
      blocks.push({ type: 'image', src: d.asset.publicPath, alt: manifest.description, width: manifest.width, height: manifest.height })
      assetApproval = { ...d.asset, sha256: manifest.sha256, permission: 'user-approved-for-this-question', reference: `${d.reviewCode}: ${d.instruction}`, stagedOnly: true }
    }
    const question: Question = {
      id: q.id, blocks, options: options.map(o => ({ id: `${q.id}-${o.label.toLowerCase()}`, text: o.text.trim() })),
      correctOptionId: `${q.id}-${d.key!.toLowerCase()}`,
      explanation: d.explanation!.map(text => ({ type: 'paragraph', text })),
      references: d.references!.map(id => { const r = refs.get(id); if (!r) throw Error(`Rujukan tidak ada: ${id}`); return r }),
      verification: d.scientificStatus!,
      source: { file: source.file, location: `${source.section}; halaman PDF ${'page' in source ? source.page : source.pages.join(',')}`, originalNumber: source.originalNumber, originalKey: d.options ? `Jawaban tertulis sumber dan dikonfirmasi pengguna: ${d.options.find(o => o.label === d.key)!.text}; label ${d.key} dibuat saat penambahan opsi` : `${d.key} (penanda kunci sumber; dipertahankan sesuai keputusan pengguna ${d.reviewCode})` },
    }
    selected.set(q.id, question)
    applied.push({ ...d, originalAssessment: prior, included: true, assetApproval, syntheticOptions: d.options ?? [], changes: { stemBefore: q.stem, stemAfter: d.stem ?? q.stem }, publicationApproval: 'pending' })
  }
  pkg.questions = merged.candidates.flatMap(q => selected.has(q.id) ? [selected.get(q.id)!] : [])
  pkg.approval = { status: 'pending' }
  pkg.contentVersion = contentHash(base.module, pkg)
  moduleSchema.parse(base.module)
  const counts = { baseQuestions: selected.size - review.decisions.filter(d => d.action === 'keep').length, includedFromReview: review.decisions.filter(d => d.action === 'keep').length, skipped: review.decisions.filter(d => d.action === 'skip').length, draftQuestions: pkg.questions.length, scientificVerified: pkg.questions.filter((q: Question) => q.verification === 'verified').length, sourceFollowing: pkg.questions.filter((q: Question) => q.verification === 'ambiguous').length }
  const rows = applied.map(d => `| ${d.reviewCode} | ${d.candidateId} | ${d.action === 'skip' ? 'Skip' : 'Dipertahankan'} | ${d.action === 'skip' ? '-' : d.key} | ${d.instruction} |`).join('\n')
  const full = pkg.questions.map((q: Question, i: number) => `## ${i+1}. ${q.id}\n\n${q.source.file}; ${q.source.location}; nomor sumber ${q.source.originalNumber}.\n\n${q.blocks.map(b => b.type === 'paragraph' ? b.text : b.type === 'image' ? `[Gambar disiapkan privat; publikasi paket pending] ${b.alt}` : '').join('\n\n')}\n\n${q.options.map((o,i) => `${String.fromCharCode(65+i)}. ${o.text}`).join('\n\n')}\n\nKunci: ${q.options.find(o => o.id === q.correctOptionId)!.text}. Status pemeriksaan ilmiah: ${q.verification}.\n\n${q.explanation.map(b => b.type === 'paragraph' ? b.text : '').join('\n\n')}\n\n${q.references.map(r => `- ${r.url ? `[${r.citation}](${r.url})` : r.citation}${r.material ? ` - ${r.material.title}; ${r.material.section}` : ''}`).join('\n')}\n`).join('\n')
  const report = `# GSM - penerapan keputusan R01-R34\n\nTanggal: ${review.date}. ${counts.includedFromReview} dipertahankan, ${counts.skipped} skip. Draf menjadi ${counts.draftQuestions} soal (${counts.baseQuestions} dari draf awal). Belum ada publikasi atau integrasi katalog.\n\n${counts.scientificVerified} soal berstatus verified; ${counts.sourceFollowing} dipertahankan sesuai keputusan pengguna dengan catatan ilmiah/ambiguitas yang masih disimpan. Keputusan memakai kunci sumber tidak diubah menjadi klaim bahwa seluruh rujukan mendukung kunci tersebut. Paket tetap pending.\n\nR10 mengikuti balasan terbaru: skip, sehingga tidak dibuat opsi tambahan. R01 dan R12 menggunakan dua distractor buatan serta satu jawaban yang dikonfirmasi pengguna. R04 dirapikan ringan; lainnya mengikuti teks sumber sesuai arahan. R18 dicatat disetujui untuk gambar soal ini, tetapi aset tetap staged privat sampai integrasi paket diizinkan.\n\nHash isi baru: \`${pkg.contentVersion}\`. Hash PDF tinjauan: \`${review.pdfSha256}\`.\n\n| Kode | Kandidat | Keputusan | Kunci yang dipakai | Instruksi pengguna |\n|---|---|---|---|---|\n${rows}\n\n## Perubahan yang dibuat\n\n${applied.filter(d => d.included && (d.stem || d.options)).map(d => `### ${d.reviewCode}\n\nSebelum: ${d.changes!.stemBefore}\n\nSesudah: ${d.changes!.stemAfter}\n\n${(d.options ?? []).map(o => `- ${o.label}. ${o.text} (${o.origin})`).join('\n')}`).join('\n\n')}\n\n## Isi seluruh draf\n\n${full}`
  const outputs: [string, string][] = [[within(review.output.draft, 'content/private/drafts'), JSON.stringify(base, null, 2)+'\n'], [within(review.output.ledger, 'content/private'), JSON.stringify({ status: 'user-reviewed-draft-not-published', date: review.date, pdfSha256: review.pdfSha256, contentVersion: pkg.contentVersion, counts, decisions: applied }, null, 2)+'\n'], [within(review.output.report, 'reports'), report]]
  if (review.output.queue) {
    const conflicts = applied.filter(d => d.originalAssessment.status === 'source-conflict')
    const text = `# Konflik kunci - keputusan pengguna terbaru\n\nCatatan ilmiah sebelumnya dipertahankan. Keputusan memakai kunci sumber tidak dianggap membuktikan seluruh rujukan mendukung kunci tersebut. Tidak ada pergantian kunci otomatis atau publikasi.\n\n${conflicts.map(d => { const q = merged.candidates.find(q => q.id === d.candidateId)!; return `## ${d.reviewCode} - ${d.candidateId}\n\n${q.stem}\n\n${q.sources.map(s => `- ${s.file}; ${s.section}; no.${s.originalNumber}; halaman PDF ${s.pages.join(', ')}.`).join('\n')}\n\nKunci sumber: ${d.originalAssessment.sourceMarkedLabels.join('/')}. Keputusan terbaru: **${d.action === 'skip' ? 'skip; tidak masuk draf' : `pakai kunci sumber ${d.key}; masuk draf pending`}**.\n\nInstruksi pengguna: ${d.instruction}\n\nTemuan ilmiah sebelumnya: ${d.originalAssessment.reason}\n` }).join('\n')}\nRincian bukti ilmiah historis: reports/conflicts-gsm-akt22.md. Seluruh keputusan dan isi draf terbaru: reports/review-gsm-user-decisions.md.\n`
    outputs.push([within(review.output.queue, 'reports'), text])
  }
  for (const [file, text] of outputs) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text, 'utf8') }
  console.log(JSON.stringify({ ...counts, contentVersion: pkg.contentVersion, publication: 'pending' }))
}
