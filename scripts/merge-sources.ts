import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'

interface Page { page: number; text: string }
interface Source { file: string; sourceHash: string; section: string; originalNumber: string; pages: number[]; rawText: string; normalizationNotes?: string[] }
interface Option { label: string; text: string }
export interface Candidate {
  id: string; signature: string; stem: string; options: Option[]; rawText: string; sources: Source[];
  correctOptionId: null; verification: 'unverified'; issues: string[];
}
interface Fragment { file: string; page: number; originalNumber: string; text: string; reason: string }
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
export const normalizeExtractedText = (text: string) => text.normalize('NFC').replace(/\s+/gu, ' ').trim()

/** Hanya kandidat bernomor. Nomor sumber dan pemenggalan baris tidak ikut signature. */
export interface ReviewedContinuation { file: string; sourceHash: string; section: string; originalNumber: string; fragmentNumber: string; page: number; text: string; reason: string }
export function parseCandidates(file: string, sourceHash: string, pages: Page[], continuations: ReviewedContinuation[] = []) {
  const candidates: Candidate[] = []
  const fragments: Fragment[] = []
  let section = 'Bagian awal (tanpa judul eksplisit)'
  const rules = continuations.filter(rule => rule.file === file)
  if (rules.some(rule => rule.sourceHash !== sourceHash)) throw Error(`Sumber koreksi parsing berubah: ${file}`)
  const used = new Set<ReviewedContinuation>()
  let current: { number: string; section: string; lines: string[]; rawLines: string[]; pages: number[]; notes: string[] } | null = null
  const flush = () => {
    if (!current) return
    const record = current
    current = null
    const rawText = record.rawLines.join('\n').trim()
    const compact = normalizeExtractedText(record.lines.join('\n'))
    const source: Source = { file, sourceHash, section: record.section, originalNumber: record.number, pages: [...new Set(record.pages)], rawText, ...(record.notes.length ? { normalizationNotes: record.notes } : {}) }
    if (!compact || /^(?:x|[-–—.]+)$/i.test(compact) || /^[a-z][.)]\s*/i.test(compact)) {
      fragments.push({ file, page: record.pages[0], originalNumber: record.number, text: rawText, reason: !compact || /^(?:x|[-–—.]+)$/i.test(compact) ? 'Nomor kosong/placeholder, tidak dibuat menjadi soal' : 'Fragmen opsi tanpa pertanyaan; tidak ditempelkan ke soal lain tanpa pemeriksaan' })
      return
    }
    const stemLines: string[] = []
    const options: Option[] = []
    for (const line of record.lines) {
      const option = /^\s*([a-z])[.)]\s*(.*)$/i.exec(line)
      if (option) options.push({ label: option[1].toUpperCase(), text: option[2].trim() })
      else if (options.length) options[options.length - 1].text += `\n${line.trim()}`
      else stemLines.push(line.trim())
    }
    const stem = normalizeExtractedText(stemLines.join(' '))
    const issues: string[] = ['Kunci dan pembahasan belum diverifikasi; penanda visual belum ditafsirkan']
    if (options.length < 2) issues.push('Opsi kurang dari dua/tidak tersedia; mungkin catatan, bukan soal lengkap')
    if (options.some((option) => !option.text.trim())) issues.push('Ada opsi kosong/terpotong')
    if (options.some((option, index) => option.label !== String.fromCharCode(65 + index))) issues.push('Label opsi tidak berurutan/duplikat; perlu pemeriksaan visual')
    if (/bagan|gambar|tabel|diagram/i.test(stem)) issues.push('Perlu pemeriksaan gambar/tabel pada halaman sumber')
    const signature = hash(compact)
    candidates.push({ id: `kandidat-${signature.slice(0, 24)}`, signature, stem, options, rawText, sources: [source], correctOptionId: null, verification: 'unverified', issues })
  }
  for (const page of pages) for (const line of page.text.split(/\r?\n/)) {
    if (/^\s*(?:UTM|UAM)\b.*(?:6517|2019|2022)/i.test(line) && !/^\s*\d/.test(line)) {
      flush(); section = normalizeExtractedText(line); continue
    }
    const numbered = /^\s*(\d{1,3})[.)]\s*(.*)$/.exec(line)
    if (numbered) {
      const matches = rules.filter(rule => rule.section === section && rule.fragmentNumber === numbered[1] && rule.page === page.page)
      if (matches.length) {
        const rule = matches[0]
        const labels = current?.lines.flatMap(line => { const m = /^\s*([a-z])[.)]\s*/i.exec(line); return m ? [m[1].toUpperCase()] : [] }) ?? []
        const option = /^([a-z])[.)]\s+\S/i.exec(normalizeExtractedText(numbered[2]))
        if (matches.length !== 1 || used.has(rule) || !current || current.number !== rule.originalNumber || !labels.length || !option || option[1].toUpperCase() !== String.fromCharCode(65 + labels.length) || normalizeExtractedText(numbered[2]) !== rule.text) throw Error(`Koreksi parsing tidak cocok: ${file} halaman ${page.page}, nomor ${numbered[1]}`)
        current.lines.push(numbered[2]); current.rawLines.push(line); current.pages.push(page.page)
        current.notes.push(`Nomor ${rule.fragmentNumber} di halaman PDF ${rule.page} adalah lanjutan opsi soal ${rule.originalNumber}: ${rule.text}. ${rule.reason}`)
        used.add(rule)
      } else { flush(); current = { number: numbered[1], section, lines: [numbered[2]], rawLines: [numbered[2]], pages: [page.page], notes: [] } }
    }
    else if (current) { current.lines.push(line); current.rawLines.push(line); current.pages.push(page.page) }
    else if (line.trim()) fragments.push({ file, page: page.page, originalNumber: '', text: line, reason: 'Teks di luar kandidat bernomor; tetap dipertahankan sebagai fragmen' })
  }
  flush()
  if (used.size !== rules.length) throw Error(`Koreksi parsing tidak ditemukan: ${file}`)
  return { candidates, fragments }
}
export function mergeExact(candidates: Candidate[]) {
  const unique = new Map<string, Candidate>()
  for (const candidate of candidates) {
    const existing = unique.get(candidate.signature)
    if (existing) existing.sources.push(...candidate.sources)
    else unique.set(candidate.signature, structuredClone(candidate))
  }
  return [...unique.values()]
}
function similarity(a: string, b: string) {
  const x = new Set(normalizeExtractedText(a).toLowerCase().split(/\s+/))
  const y = new Set(normalizeExtractedText(b).toLowerCase().split(/\s+/))
  const common = [...x].filter((word) => y.has(word)).length
  return common / (x.size + y.size - common)
}
export function similarCandidates(candidates: Candidate[]) {
  const result: { first: string; second: string; similarity: number; reason: string }[] = []
  for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) {
    const first = candidates[i]; const second = candidates[j]
    const value = similarity(first.stem, second.stem)
    if (value >= .9) result.push({ first: first.id, second: second.id, similarity: Math.round(value * 100), reason: normalizeExtractedText(first.stem) === normalizeExtractedText(second.stem) ? 'Stem sama, tetapi teks lengkap/opsi/catatan berbeda; tidak digabung otomatis' : 'Stem sangat mirip; tidak digabung otomatis' })
  }
  return result
}
const continuationSchema = z.strictObject({ file: z.string(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/), section: z.string(), originalNumber: z.string(), fragmentNumber: z.string(), page: z.number().int().positive(), text: z.string().min(1), reason: z.string().min(1) })
const configSchema = z.strictObject({ id: z.string().regex(/^[a-z0-9-]+$/), moduleId: z.string(), files: z.array(z.string()).min(2), decision: z.string().min(1), reviewedContinuations: z.array(continuationSchema).default([]) })
const extractedSchema = z.object({ source: z.string(), sourceHash: z.string(), status: z.string(), pages: z.array(z.object({ page: z.number().int().positive(), text: z.string() })) })
async function main() {
  const root = process.cwd()
  const input = process.argv[2]
  if (!input) throw Error('Berikan path config internal. Contoh: npm run content:merge -- content/private/merge-gsm-akt22.json')
  const config = configSchema.parse(JSON.parse(await readFile(path.resolve(root, input), 'utf8')))
  if (config.reviewedContinuations.some(rule => !config.files.includes(rule.file))) throw Error('Koreksi parsing merujuk sumber di luar kelompok.')
  const inventory = JSON.parse(await readFile(path.join(root, 'content/private/inventory.json'), 'utf8')) as { modules: { id: string; title: string }[] }
  const module = inventory.modules.find((item) => item.id === config.moduleId)
  if (!module) throw Error('Modul tidak ditemukan pada inventarisasi; inventarisasi ulang diperlukan.')
  const directory = path.join(root, 'content/private/extracted', config.moduleId)
  const available = await Promise.all((await readdir(directory)).filter((file) => file.endsWith('.json')).map(async (file) => JSON.parse(await readFile(path.join(directory, file), 'utf8'))))
  const all: Candidate[] = []; const fragments: Fragment[] = []
  const sources: { file: string; candidates: number; fragments: number; sourceHash: string }[] = []
  for (const file of config.files) {
    const data = extractedSchema.parse(available.find((item) => item.source === file))
    if (data.status !== 'text-extracted-not-verified') throw Error(`Sumber ${file} belum memiliki teks memadai.`)
    const sourcePath = path.resolve(root, 'modul', module.title, file)
    const allowed = path.resolve(root, 'modul', module.title) + path.sep
    if (!sourcePath.startsWith(allowed)) throw Error('Sumber di luar modul ditolak.')
    const currentHash = createHash('sha256').update(await readFile(sourcePath)).digest('hex')
    if (currentHash !== data.sourceHash) throw Error(`Sumber ${file} berubah; ekstraksi ulang diperlukan.`)
    const parsed = parseCandidates(file, data.sourceHash, data.pages, config.reviewedContinuations)
    all.push(...parsed.candidates); fragments.push(...parsed.fragments)
    sources.push({ file, candidates: parsed.candidates.length, fragments: parsed.fragments.length, sourceHash: data.sourceHash })
  }
  const unique = mergeExact(all)
  const similar = similarCandidates(unique)
  await mkdir(path.join(root, 'content/private/merged'), { recursive: true })
  await mkdir(path.join(root, 'reports'), { recursive: true })
  const output = { schemaVersion: 1, status: 'internal-candidates-not-publishable', decision: config.decision, normalization: 'Unicode NFC dan whitespace; nomor sumber dikeluarkan dari signature. Koreksi penomoran opsi hanya melalui reviewedContinuations yang dicocokkan hash, halaman, nomor dan teks setelah pemeriksaan visual. Redaksi, kapitalisasi, tanda baca, urutan opsi, dan catatan dipertahankan.', reviewedContinuations: config.reviewedContinuations, sources, sourceOccurrences: all.length, uniqueCandidates: unique.length, exactDuplicatesRemoved: all.length - unique.length, candidates: unique, similar, fragments }
  await writeFile(path.join(root, `content/private/merged/${config.id}.json`), JSON.stringify(output, null, 2), 'utf8')
  const lines = [`# Gabungan kandidat soal: ${config.id}`, '', `Keputusan pengguna: ${config.decision}`, '', '**Internal — bukan paket CBT tervalidasi dan tidak diintegrasikan ke katalog.**', '', '## Ringkasan', '', `- ${all.length} kemunculan kandidat bernomor dari ${sources.length} sumber.`, `- ${unique.length} kandidat unik sesudah ${all.length - unique.length} duplikat teks persis dihilangkan.`, `- ${similar.length} pasangan sangat mirip ditandai dan tetap terpisah.`, `- ${fragments.length} fragmen/nomor kosong/placeholder dipertahankan di data internal, tidak dibuat menjadi soal.`, '- Semua kunci masih null/belum ditetapkan; semua soal belum diverifikasi ilmiah.', '', output.normalization, '', '## Sumber', '', '| Berkas | Kandidat | Fragmen |', '| --- | ---: | ---: |', ...sources.map((source) => `| ${source.file} | ${source.candidates} | ${source.fragments} |`), '', '## Duplikat teks persis', '']
  for (const candidate of unique.filter((item) => item.sources.length > 1)) lines.push(`- ${candidate.id}: ${candidate.sources.map((source) => `${source.file} · ${source.section} · no. ${source.originalNumber} · hlm. ${source.pages.join(', ')}`).join(' ↔ ')}`)
  lines.push('', '## Koreksi parsing yang sudah diperiksa visual', '', ...config.reviewedContinuations.map(rule => `- ${rule.file}, halaman PDF ${rule.page}, soal ${rule.originalNumber}: nomor ${rule.fragmentNumber} berisi ${rule.text}. ${rule.reason} Hash sumber: ${rule.sourceHash}. Teks sumber sebelum koreksi tetap disimpan pada provenance.`))
  lines.push('', '## Mirip tetapi tetap terpisah', '', '| Kandidat pertama | Kandidat kedua | Kemiripan token stem | Catatan |', '| --- | --- | ---: | --- |', ...similar.map((item) => `| ${item.first} | ${item.second} | ${item.similarity}% | ${item.reason} |`), '', '## Perlu pemeriksaan teknis', '')
  for (const candidate of unique.filter((item) => item.issues.length > 1)) lines.push(`- ${candidate.id}: ${candidate.issues.slice(1).join('; ')}. Sumber ${candidate.sources.map((source) => `${source.file} no. ${source.originalNumber} hlm. ${source.pages.join(',')}`).join(' / ')}.`)
  lines.push('', '## Batas penggabungan', '', 'Duplikat yang dihapus adalah kesamaan teks hasil ekstraksi setelah normalisasi whitespace, bukan klaim seluruh tampilan/penanda jawaban di PDF identik. Setiap kemunculan tetap menyimpan rawText, nomor, halaman, section, dan hash sumber. Gambar, highlight, dan anotasi kunci perlu pemeriksaan visual pada seluruh sumber. Catatan yang menempel pada opsi tidak dipisahkan menjadi pembahasan secara otomatis.', '', 'Judul bagian seperti UTM 6517 (angk 2019) dipertahankan sebagai metadata asal di dalam kumpulan gabungan, sesuai instruksi menggabungkan ketiga berkas. Penetapan nama paket final, kunci, penanganan variasi redaksi, dan publikasi menunggu peninjauan lanjutan.')
  await writeFile(path.join(root, `reports/merge-${config.id}.md`), lines.join('\n'), 'utf8')
  const review = [`# Kandidat gabungan — ${config.id}`, '', 'Internal, belum terverifikasi. Tidak ada kunci yang diasumsikan.', '']
  unique.forEach((candidate, index) => {
    review.push(`## ${index + 1}. ${candidate.id}`, '', ...candidate.sources.map((source) => `Sumber: ${source.file} · ${source.section} · no. ${source.originalNumber} · hlm. ${source.pages.join(', ')}`), '', candidate.rawText, '', `Catatan pemeriksaan: ${candidate.issues.join('; ')}`, '')
  })
  await writeFile(path.join(root, `reports/review-${config.id}.md`), review.join('\n'), 'utf8')
  console.log(JSON.stringify({ sourceOccurrences: all.length, uniqueCandidates: unique.length, exactDuplicatesRemoved: all.length - unique.length, similarPairs: similar.length, fragments: fragments.length }))
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
