import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { moduleSchema, referenceSchema, type ExamPackage } from '../src/domain/content.ts'
import { contentHash } from './content.ts'
import { applyUserReview } from './apply-user-review.ts'

type Source = { file: string; sourceHash: string; section: string; originalNumber: string; pages: number[] }
type Candidate = { id: string; signature: string; stem: string; options: { label: string; text: string }[]; sources: Source[] }
type Marker = { section: string; originalNumber: string; firstPage: number; yellowLabels: string[]; boldLabels: string[]; firstLine: string; options: { label: string; lines: { page: number; yellowChars: number; boldChars: number; totalChars: number }[] }[] }
type Decision = { candidateId: string; status: string; reason: string; proposedOptionLabel?: string; explanation?: string[]; references?: string[]; options?: Record<string, string>; normalizationNotes?: string[]; userDecision?: { status: 'hold'; note: string; reference: string } }
type Hint = { file: string; sourceHash: string; section: string; originalNumber: string; page: number; label: string; method: string; visuallyChecked: boolean }
type Config = {
  userReviewFile?: string;
  reviewStage?: number;
  merged: string; moduleId: string; packageId: string; title: string;
  markerFiles: { path: string; visuallyCheckedPages: number[] }[];
  manualMarkers: { file: string; section: string; number: string; page: number; label: string }[];
  references: Record<string, unknown>; decisions: Decision[];
  output: { ledger: string; draft: string; report: string; queue?: string; heldReport?: string };
}
const readJson = async (file: string) => JSON.parse(await readFile(file, 'utf8'))
const compact = (text: string) => text.normalize('NFC').replace(/\s+/gu, ' ').trim()
const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')
function local(file: string, prefix: string) {
  const root = path.resolve(prefix)
  const target = path.resolve(file)
  const relative = path.relative(root, target)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error(`Path harus di dalam ${prefix}: ${file}`)
  return target
}
async function main() {
  const input = process.argv[2]
  if (!input) throw Error('Berikan config review internal.')
  const config = await readJson(local(input, 'content/private')) as Config
  const mergedBytes = await readFile(local(config.merged, 'content/private'))
  const merged = JSON.parse(mergedBytes.toString()) as { candidates: Candidate[] }
  const inventory = await readJson('content/private/inventory.json') as { modules: { id: string; title: string; sourceHash: string; files: { relativePath: string; hash: string }[] }[] }
  const sourceModule = inventory.modules.find(m => m.id === config.moduleId)
  if (!sourceModule) throw Error('Modul tidak ada dalam inventarisasi.')
  for (const file of sourceModule.files) {
    const bytes = await readFile(local(path.join('modul', sourceModule.title, file.relativePath), 'modul'))
    if (sha(bytes) !== file.hash) throw Error(`Sumber berubah: ${file.relativePath}`)
  }
  const decisions = new Map(config.decisions.map(d => [d.candidateId, d]))
  if (decisions.size !== config.decisions.length || decisions.size !== merged.candidates.length || merged.candidates.some(q => !decisions.has(q.id))) throw Error('Keputusan harus tepat satu untuk setiap kandidat.')
  const references = new Map(Object.entries(config.references).map(([id, ref]) => [id, referenceSchema.parse({ id, ...(ref as object) })]))
  const hints = new Map<string, Hint[]>()
  const addHint = (candidate: Candidate, hint: Hint) => hints.set(candidate.id, [...(hints.get(candidate.id) ?? []), hint])
  for (const markerFile of config.markerFiles) {
    const data = await readJson(local(markerFile.path, 'content/private')) as { source: string; sourceHash: string; records: Marker[] }
    const relative = path.relative(path.resolve('modul', sourceModule.title), path.resolve(data.source)).replaceAll('\\', '/')
    if (!sourceModule.files.some(f => f.relativePath === relative && f.hash === data.sourceHash)) throw Error('Marker tidak cocok dengan sumber inventarisasi.')
    for (const record of data.records) {
      const candidates = merged.candidates.filter(q => q.sources.some(s => s.file === relative && s.sourceHash === data.sourceHash && s.section === record.section && s.originalNumber === record.originalNumber && s.pages.includes(record.firstPage)))
      const labels = record.yellowLabels.length ? record.yellowLabels : record.boldLabels
      if (!labels.length) continue
      if (candidates.length !== 1) throw Error(`Marker ambigu/tidak terpetakan: ${relative} ${record.section} ${record.originalNumber}`)
      const q = candidates[0]
      if (!compact(q.stem).startsWith(compact(record.firstLine).slice(0, 24))) throw Error(`Stem marker tidak cocok: ${q.id}`)
      for (const label of labels) {
        if (!q.options.some(o => o.label === label)) throw Error(`Label marker tidak ada pada kandidat ${q.id}`)
        const lines = record.options.find(o => o.label === label)?.lines ?? []
        const mark = lines.find(l => record.yellowLabels.length ? l.yellowChars > 0 : l.totalChars >= 4 && l.boldChars / l.totalChars >= .8)
        if (!mark) throw Error('Koordinat halaman marker tidak tersedia.')
        addHint(q, { file: relative, sourceHash: data.sourceHash, section: record.section, originalNumber: record.originalNumber, page: mark.page, label, method: record.yellowLabels.length ? 'yellow-rectangle' : 'bold-option', visuallyChecked: markerFile.visuallyCheckedPages.includes(mark.page) })
      }
    }
  }
  for (const override of config.manualMarkers) {
    const q = merged.candidates.find(q => q.sources.some(s => s.file === override.file && s.section === override.section && s.originalNumber === override.number && s.pages.includes(override.page)))
    if (!q || !q.options.some(o => o.label === override.label)) throw Error('Marker manual tidak terpetakan.')
    const source = q.sources.find(s => s.file === override.file)!
    if (!(hints.get(q.id) ?? []).some(h => h.file === override.file && h.label === override.label)) addHint(q, { file: override.file, sourceHash: source.sourceHash, section: override.section, originalNumber: override.number, page: override.page, label: override.label, method: 'bold-option-manual-visual', visuallyChecked: true })
  }
  const questions: ExamPackage['questions'] = []
  const entries = merged.candidates.map(q => {
    const d = decisions.get(q.id)!
    const evidence = hints.get(q.id) ?? []
    const sourceLabels = [...new Set(evidence.map(h => h.label))]
    for (const ref of d.references ?? []) if (!references.has(ref)) throw Error(`Rujukan tidak ditemukan: ${ref}`)
    if (d.proposedOptionLabel && !q.options.some(o => o.label === d.proposedOptionLabel)) throw Error('Usulan opsi tidak ditemukan.')
    if (d.status === 'ready-for-user-review') {
      if (d.userDecision?.status === 'hold') throw Error(`Kandidat masih ditahan oleh pengguna: ${q.id}`)
      if (!d.proposedOptionLabel || sourceLabels.length !== 1 || sourceLabels[0] !== d.proposedOptionLabel || !evidence.some(h => h.visuallyChecked) || !d.explanation?.length || !d.references?.length) throw Error(`Bukti siap review belum lengkap: ${q.id}`)
      const source = evidence.find(h => h.visuallyChecked)!
      questions.push({
        id: q.id, blocks: [{ type: 'paragraph', text: q.stem }],
        options: q.options.map(o => ({ id: `${q.id}-${o.label.toLowerCase()}`, text: compact(d.options?.[o.label] ?? o.text) })),
        correctOptionId: `${q.id}-${d.proposedOptionLabel.toLowerCase()}`,
        explanation: d.explanation.map(text => ({ type: 'paragraph' as const, text })),
        references: d.references.map(id => references.get(id)!), verification: 'verified',
        source: { file: source.file, location: `${source.section}; halaman PDF ${source.page}`, originalNumber: source.originalNumber, originalKey: `${source.label} (${source.method}; kunci dari sumber)` },
      })
    }
    return { ...d, signature: q.signature, stem: q.stem, sources: q.sources, sourceKeyEvidence: evidence, sourceMarkedLabels: sourceLabels, publicIntegration: 'not-approved' }
  })
  const pkg: ExamPackage = { id: config.packageId, title: config.title, contentVersion: '0'.repeat(64), approval: { status: 'pending' }, questions }
  const module = { id: sourceModule.id, title: sourceModule.title, packages: [pkg] }
  pkg.contentVersion = contentHash(module, pkg)
  moduleSchema.parse(module)
  const counts = Object.fromEntries([...new Set(entries.map(e => e.status))].map(s => [s, entries.filter(e => e.status === s).length]))
  const ledger = { schemaVersion: 1, status: 'internal-review-not-published', date: '2026-11-18', mergedSha256: sha(mergedBytes), sourceInventoryHash: sourceModule.sourceHash, counts, markedCandidates: entries.filter(e => e.sourceKeyEvidence.length).length, markerEvidenceCount: entries.reduce((n, e) => n + e.sourceKeyEvidence.length, 0), entries }
  const draft = { sourceInventoryHash: sourceModule.sourceHash, module }
  const rows = entries.map(e => `| ${e.candidateId} | ${e.sources.map(s => `${s.file}, ${s.section}, no.${s.originalNumber}, p${s.pages.join(',')}`).join('<br>')} | ${e.sourceMarkedLabels.join('/') || 'Tidak terdeteksi'} | ${e.proposedOptionLabel ?? '—'} | ${e.status} | ${e.reason} |`).join('\n')
  const reviewQuestions = questions.map(q => {
    const decision = decisions.get(q.id)!
    return `### ${q.id}\n\nSumber: ${q.source.file}; ${q.source.location}; no. ${q.source.originalNumber}. Kunci sumber: ${q.source.originalKey}.\n\n${q.blocks.map(b => b.type === 'paragraph' ? b.text : '').join('\n\n')}\n\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.text}`).join('\n\n')}\n\n**Pembahasan:**\n\n${q.explanation.map(b => b.type === 'paragraph' ? b.text : '').join('\n\n')}\n\n${q.references.map(r => `- ${r.url ? `[${r.citation}](${r.url})` : r.citation}${r.material ? ` — ${r.material.title}, ${r.material.section}` : ''}`).join('\n')}${decision.normalizationNotes?.length ? `\n\nNormalisasi tercatat: ${decision.normalizationNotes.join(' ')}` : ''}\n`
  }).join('\n')
  const report = `# GSM — pemeriksaan tiga sumber tahap ${config.reviewStage ?? 2}\n\nStatus: internal, belum diintegrasikan atau dipublikasikan.\n\nRingkasan: ${questions.length} siap ditinjau pengguna; ${counts['held-incomplete'] ?? 0} tidak lengkap; ${counts['source-conflict'] ?? 0} konflik isi dengan kunci sumber; kandidat lain masih memerlukan konteks, rujukan, peninjauan opsi atau aset. Status siap review berarti pemeriksaan internal telah dilakukan, bukan izin publikasi.\n\n${Object.entries(counts).map(([s,n]) => `- ${s}: ${n}`).join('\n')}\n- Kandidat dengan penanda jawaban: ${ledger.markedCandidates}; bukti marker: ${ledger.markerEvidenceCount}.\n\nSorotan kuning dicatat sebagai kunci sumber sesuai klarifikasi pengguna. Huruf tebal dicatat dengan metode bukti terpisah. Bukti otomatis pada versi kedua bukan klaim seluruh halamannya telah ditinjau visual. Kunci sumber dan usulan penelaah tidak saling menimpa.\n\nDraf pending: ${questions.length} soal dari kumpulan gabungan yang lolos peninjauan tahap ini. Ini bukan pemecahan paket permanen atau perubahan batas sumber. Kandidat lainnya tetap tersimpan dan dapat ditambahkan setelah masalahnya selesai. Semua soal yang kelak berada pada paket aktif akan dipakai dalam satu sesi. Hash isi draf: \`${pkg.contentVersion}\`.\n\n## Daftar seluruh kandidat\n\n| Kandidat | Sumber lengkap | Penanda sumber | Usulan | Status | Alasan |\n|---|---|---|---|---|---|\n${rows}\n\n## Soal dan pembahasan dalam draf pending\n\n${reviewQuestions}\n## Batas pemeriksaan\n\nPeninjauan ini mencakup ${entries.length} kandidat dari tiga berkas AKT22 yang diminta digabung, bukan seluruh ${sourceModule.files.length} PDF GSM. Dua PDF scan yang sebelumnya dilaporkan masih memerlukan pemrosesan terpisah. Tidak ada receipt persetujuan yang dibuat. File asli, katalog publik, dan aset publik tidak diubah.\n`
  const outputFiles = [[local(config.output.ledger, 'content/private'), JSON.stringify(ledger, null, 2) + '\n'], [local(config.output.draft, 'content/private/drafts'), JSON.stringify(draft, null, 2) + '\n'], [local(config.output.report, 'reports'), report]]
  if (config.output.heldReport) {
    const held = entries.filter(e => e.status !== 'ready-for-user-review')
    const requests: Record<string, string> = {
      'held-incomplete': 'Lengkapi stem dan opsi dari sumber lain yang sah, atau tetap tahan; jangan membuat kelanjutan sendiri.',
      'source-conflict': 'Tinjau kunci sumber dan usulan bersama bukti. Pertahankan hold sampai ada keputusan eksplisit.',
      'needs-source-key': 'Berikan kunci sumber untuk varian ini, atau tinjau usulan sebagai penetapan kunci baru. Jangan meminjam penanda varian lain.',
      'needs-asset': 'Tinjau gambar/deskripsi privat dan putuskan izin distribusi gambar sebelum integrasi.',
      'needs-option-repair': 'Konfirmasikan teks opsi C dan E yang janggal; belum ada penggantian redaksi.',
      'needs-legal-scope': 'Tentukan tahun/acuan aturan dan pembeda opsi D/E; jangan mencampur konteks lama dan materi 2026.',
      'needs-terminology': 'Tentukan definisi Fixed/Closed yang dipakai sumber dan pembeda satu jawaban terbaik.',
      'needs-timing': 'Konfirmasikan satu periode pengukuran atau berikan redaksi waktu yang memang ada pada sumber.',
      'needs-concept-definition': 'Tentukan pembeda operasional Sikap/Persepsi pada materi yang dipakai pembuat soal.',
      'needs-response-format': 'Lengkapi contoh pilihan respons/format instrumen sebelum menetapkan satu jenis skala.',
      'needs-unit-convention': 'Konfirmasikan konvensi skor indeks dan populasi yang dimaksud; jangan mengganti menjadi gigi/anak tanpa dasar.',
      'needs-population-denominator': 'Lengkapi ukuran populasi tiap kelompok dan mekanisme acak agar alokasi proporsional dapat diuji.',
      'needs-classification-axis': 'Tentukan apakah pertanyaan menguji struktur pengamatan atau keterlibatan pengamat.',
      'needs-context': 'Perjelas fokus/pertanyaan melalui sumber lengkap atau revisi yang disetujui; usulan kunci belum diaktifkan.',
    }
    const details = held.map(e => {
      const q = merged.candidates.find(q => q.id === e.candidateId)!
      return `## ${e.candidateId}\n\nStatus: **${e.status}**. Kunci sumber: **${e.sourceMarkedLabels.join('/') || 'tidak terdeteksi'}**. Usulan: **${e.proposedOptionLabel ?? 'belum ada'}**.\n\n${e.sources.map(s => `- ${s.file}; ${s.section}; no.${s.originalNumber}; halaman PDF ${s.pages.join(', ')}.`).join('\n')}\n\n${e.stem}\n\n${q.options.length ? q.options.map(o => `${o.label}. ${compact(o.text) || '[kosong pada sumber]'}`).join('\n\n') : '[Opsi tidak tersedia pada sumber]'}\n\n**Hasil pemeriksaan:** ${e.reason}\n\n**Penanganan yang diperlukan:** ${requests[e.status] ?? 'Tinjau konteks sebelum digunakan.'}\n\n${e.userDecision ? `Keputusan pengguna yang tetap berlaku: ${e.userDecision.status} — ${e.userDecision.note}\n\n` : ''}${(e.references ?? []).map(id => { const r = references.get(id)!; return `- ${r.url ? `[${r.citation}](${r.url})` : r.citation}${r.material ? ` — ${r.material.title}; ${r.material.section}` : ''}` }).join('\n')}\n`
    }).join('\n')
    const text = `# GSM — soal ditahan dan kebutuhan peninjauan tahap ${config.reviewStage ?? 2}\n\n${held.length} dari ${entries.length} kandidat tetap ditahan. Ini kumpulan untuk ditinjau bertahap, bukan permintaan mengubah semua soal atau menganggap semua kunci salah. ${questions.length} soal dalam draf pending dapat ditinjau terpisah. Tidak ada opsi/redaksi/kunci yang diganti tanpa catatan dan keputusan yang diperlukan.\n\n${Object.entries(counts).filter(([status]) => status !== 'ready-for-user-review').map(([status, n]) => `- ${status}: ${n}`).join('\n')}\n\nRujukan lengkap, nama berkas, halaman, serta pilihan yang perlu dibandingkan tercantum per entri berikut.\n\n${details}`
    outputFiles.push([local(config.output.heldReport, 'reports'), text])
  }
  if (config.output.queue) {
    const queue = entries.filter(e => e.status === 'source-conflict')
    const text = `# Antrean peninjauan kunci GSM\n\nTemuan dikumpulkan untuk peninjauan bersama sesuai arahan pengguna. Tidak ada pergantian kunci otomatis. Keputusan hold tetap berlaku sampai pengguna menyatakan keputusan lain.\n\n${queue.map(e => `## ${e.candidateId}\n\n${e.stem}\n\n${e.sources.map(s => `- ${s.file}; bagian ${s.section}; no. ${s.originalNumber}; halaman PDF ${s.pages.join(', ')}`).join('\n')}\n\nKunci sumber: **${e.sourceMarkedLabels.join('/') || 'tidak terdeteksi'}**. Usulan: **${e.proposedOptionLabel ?? 'belum ditentukan; perlu perbaikan konteks/opsi'}**.\n\n${e.reason}\n\nKeputusan pengguna: ${e.userDecision ? `${e.userDecision.status} — ${e.userDecision.note}` : 'belum diminta secara terpisah; masuk kumpulan tinjauan'}\n\n${(e.references ?? []).map(id => { const r = references.get(id)!; return `- ${r.url ? `[${r.citation}](${r.url})` : r.citation}${r.material ? ` — ${r.material.title}; ${r.material.section}` : ''}` }).join('\n')}\n`).join('\n')}\nRincian opsi dan bukti halaman: reports/conflicts-gsm-akt22.md. Kandidat dengan ketidakjelasan redaksi/aset lainnya tetap di ledger tahap 2; tidak semuanya merupakan usulan mengganti kunci.\n`
    outputFiles.push([local(config.output.queue, 'reports'), text])
  }
  for (const [file, value] of outputFiles) {
    await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, value, 'utf8')
  }
  console.log(JSON.stringify({ counts, markedCandidates: ledger.markedCandidates, evidence: ledger.markerEvidenceCount, draftQuestions: questions.length, contentVersion: pkg.contentVersion, unchangedSourceFiles: sourceModule.files.length }))
  if (config.userReviewFile) await applyUserReview(input, config.userReviewFile)
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
