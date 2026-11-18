import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, lstat, writeFile, rename, realpath } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { z } from 'zod'
import { catalogSchema, moduleSchema, versionPayload, type Catalog, type ExamPackage, type LearningModule } from '../src/domain/content.ts'

const exec = promisify(execFile)
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
export const moduleId = (title: string) => `${title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'modul'}-${sha(title).slice(0, 12)}`
export const contentHash = (module: Pick<LearningModule, 'id' | 'title'>, pkg: ExamPackage) => sha(versionPayload(module, pkg))
const portable = (value: string) => value.split(path.sep).join('/')
export interface InventoryFile { relativePath: string; bytes: number; hash: string; format: string; role: string; error?: string }
export interface InventoryModule { id: string; title: string; sourceHash: string; files: InventoryFile[] }
export interface Inventory { modules: InventoryModule[]; issues: string[] }
async function writeJson(filename: string, value: unknown) { await mkdir(path.dirname(filename), { recursive: true }); await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }
async function exists(filename: string) { try { await lstat(filename); return true } catch { return false } }
function sniff(data: Buffer, filename: string) {
  if (data.subarray(0, 5).toString() === '%PDF-') return 'pdf'
  if (data.subarray(0, 2).toString() === 'PK') return 'zip/office (perlu ekstraktor khusus)'
  if (/\.(txt|md|json|csv|tsv)$/i.test(filename) && !data.includes(0)) return 'text'
  return 'unknown'
}
export async function inventory(root: string): Promise<Inventory> {
  const source = path.join(root, 'modul')
  const result: Inventory = { modules: [], issues: [] }
  if (!await exists(source)) return result
  if ((await lstat(source)).isSymbolicLink()) throw new Error('Folder modul tidak boleh berupa symlink/junction.')
  for (const entry of (await readdir(source, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) { result.issues.push(`Tautan dilewati: ${entry.name}`); continue }
    if (!entry.isDirectory()) { result.issues.push(`File di akar modul tidak diproses sebagai modul: ${entry.name}`); continue }
    const module: InventoryModule = { id: moduleId(entry.name), title: entry.name, sourceHash: '', files: [] }
    async function walk(directory: string) {
      for (const file of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        const absolute = path.join(directory, file.name)
        if (file.isSymbolicLink()) { result.issues.push(`Tautan dilewati: ${portable(path.relative(source, absolute))}`); continue }
        if (file.isDirectory()) { await walk(absolute); continue }
        if (!file.isFile()) continue
        const relativePath = portable(path.relative(path.join(source, entry.name), absolute))
        try {
          const data = await readFile(absolute)
          module.files.push({ relativePath, bytes: data.length, hash: sha(data), format: sniff(data, file.name), role: 'Belum ditentukan dari isi' })
        } catch (error) { module.files.push({ relativePath, bytes: 0, hash: '', format: 'unreadable', role: 'Belum ditentukan', error: String(error) }) }
      }
    }
    await walk(path.join(source, entry.name))
    module.sourceHash = sha(JSON.stringify(module.files.map(({ relativePath, hash }) => ({ relativePath, hash }))))
    result.modules.push(module)
  }
  if (new Set(result.modules.map((module) => module.id)).size !== result.modules.length) throw new Error('ID modul bentrok; perlu konfirmasi pemetaan ID.')
  return result
}
function guessedRole(text: string) {
  if (/(?:^|\n)\s*\d{1,3}[.)]\s+/m.test(text) && /(?:^|\n)\s*[a-eA-E][.)]\s+/m.test(text)) return 'Kandidat soal (berdasarkan pola pertanyaan/opsi; belum dinormalisasi)'
  if (/kunci\s+jawaban/i.test(text)) return 'Kandidat kunci/pembahasan (perlu pemeriksaan konteks)'
  if (/pembahasan|penjelasan\s+jawaban/i.test(text)) return 'Kandidat pembahasan (perlu pemeriksaan konteks)'
  if (text.trim().length >= 120) return 'Kandidat materi/teks lain (belum diperiksa utuh secara visual)'
  return 'Teks terlalu sedikit; mungkin scan/gambar, memerlukan OCR atau pemeriksaan visual'
}
async function inventoryReport(root: string, inv: Inventory) {
  await writeJson(path.join(root, 'content/private/inventory.json'), inv)
  await mkdir(path.join(root, 'reports'), { recursive: true })
  const lines = ['# Inventarisasi bahan lokal', '', 'Bahan sumber diperlakukan read-only. Tidak ada izin publikasi atau validasi ilmiah dari inventarisasi ini.', '']
  for (const module of inv.modules) {
    lines.push(`## ${module.title}`, '', `ID: \`${module.id}\`. ${module.files.length} file. Fingerprint sumber: \`${module.sourceHash}\`.`, '', '| File | Format terdeteksi | Ukuran | Fungsi |', '| --- | --- | ---: | --- |')
    for (const file of module.files) lines.push(`| ${file.relativePath.replaceAll('|', '\\|')} | ${file.format} | ${file.bytes} B | ${file.role}${file.error ? `; ${file.error}` : ''} |`)
    lines.push('')
  }
  if (!inv.modules.length) lines.push('Belum ada subfolder modul. Aplikasi menggunakan katalog kosong.')
  lines.push('## Temuan', '', ...inv.issues.map((issue) => `- ${issue}`), '', 'Batas paket, kunci, hubungan materi, dan izin distribusi harus diperiksa dari isi sebelum integrasi.')
  await writeFile(path.join(root, 'reports/inventory.md'), lines.join('\n'), 'utf8')
}
async function extract(root: string, inv: Inventory) {
  for (const module of inv.modules) {
    const report = ['# Ekstraksi awal: ' + module.title, '', 'Status: internal; belum ada soal ternormalisasi, kunci tervalidasi, atau persetujuan publikasi.', '', '| Sumber | Halaman teks | Status | Dugaan fungsi dari isi |', '| --- | ---: | --- | --- |']
    for (const file of module.files) {
      const source = path.join(root, 'modul', module.title, file.relativePath)
      const output = path.join(root, 'content/private/extracted', module.id, `${sha(file.relativePath).slice(0, 16)}.json`)
      try {
        if (file.format !== 'pdf' && file.format !== 'text') throw new Error(`Format ${file.format} belum didukung ekstraktor ini; gunakan skill format yang sesuai.`)
        let text: string
        let extractedPages: { page: number; text: string }[] | undefined
        if (file.format === 'pdf') {
          if (process.env.CBT_PYTHON) {
            const result = await exec(process.env.CBT_PYTHON, [path.join(root, 'scripts/extract_pdf.py'), source], { timeout: 120000, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8', windowsHide: true })
            extractedPages = JSON.parse(result.stdout).pages
            text = extractedPages!.map((page) => page.text).join('\f')
          } else {
            const result = await exec(process.env.PDFTOTEXT_PATH || 'pdftotext', ['-layout', '-enc', 'UTF-8', source, '-'], { timeout: 60000, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8', windowsHide: true })
            text = result.stdout
          }
        } else text = await readFile(source, 'utf8')
        const pages = text.split('\f'); if (pages.at(-1)?.trim() === '') pages.pop()
        file.role = guessedRole(text)
        const status = text.replace(/\s/g, '').length < 120 ? 'needs-ocr-or-visual-review' : 'text-extracted-not-verified'
        await writeJson(output, { source: file.relativePath, sourceHash: file.hash, status, role: file.role, pages: extractedPages ?? pages.map((text, index) => ({ page: index + 1, text })) })
        report.push(`| ${file.relativePath.replaceAll('|', '\\|')} | ${pages.length} | ${status} | ${file.role} |`)
        console.log(`${module.title}: ${file.relativePath} → ${status}`)
      } catch (error) {
        await writeJson(output, { source: file.relativePath, sourceHash: file.hash, status: 'failed', error: String(error) })
        report.push(`| ${file.relativePath.replaceAll('|', '\\|')} | — | Gagal | ${String(error).replaceAll('|', '\\|').replaceAll('\n', ' ')} |`)
      }
    }
    report.push('', '## Tindak lanjut', '', '- Pemeriksaan visual diperlukan untuk opsi yang ditandai warna, gambar, tabel, dan halaman scan. Ekstraksi teks tidak mempertahankan makna warna.', '- Belum ada jumlah soal yang bisa dinyatakan tervalidasi; tidak ada soal yang diintegrasikan.', '- Identifikasi batas paket dan sumber kunci; jangan menganggap satu file selalu satu paket.', '- Kesamaan nama file bukan bukti duplikasi; bandingkan isi sebelum menggabungkan.', '- Verifikasi ilmiah dan pembahasan belum dilakukan. Seluruh bahan tetap internal.', '- Izin pendistribusian PDF/gambar perlu persetujuan terpisah.')
    await writeFile(path.join(root, `reports/extraction-${module.id}.md`), report.join('\n'), 'utf8')
  }
}
const draftSchema = z.strictObject({ sourceInventoryHash: z.string().regex(/^[a-f0-9]{64}$/), module: moduleSchema })
const approvalSchema = z.array(z.strictObject({ moduleId: z.string(), packageId: z.string(), contentVersion: z.string(), approvedBy: z.string().min(1), approvedAt: z.iso.datetime(), decisionReference: z.string().min(1), sourceKeyDecisions: z.array(z.strictObject({ questionId: z.string().min(1), decisionReference: z.string().min(1) })).optional() }))
async function drafts(root: string) {
  const directory = path.join(root, 'content/private/drafts')
  if (!await exists(directory)) return []
  const files = (await readdir(directory)).filter((file) => file.endsWith('.json')).sort()
  return Promise.all(files.map(async (file) => ({ file, data: draftSchema.parse(JSON.parse(await readFile(path.join(directory, file), 'utf8'))) })))
}
export async function checkCatalog(root: string, input?: unknown): Promise<Catalog> {
  const catalog = catalogSchema.parse(input ?? JSON.parse(await readFile(path.join(root, 'src/content/catalog.json'), 'utf8')))
  for (const module of catalog.modules) for (const pkg of module.packages) {
    if (contentHash(module, pkg) !== pkg.contentVersion) throw new Error(`Versi paket ${module.title}/${pkg.title} tidak sesuai isinya. Validasi dan persetujuan ulang diperlukan.`)
    for (const question of pkg.questions) for (const block of [...question.blocks, ...question.explanation]) {
      if (block.type === 'image') await checkAsset(root, block.src)
    }
    for (const question of pkg.questions) for (const ref of question.references) {
      if (ref.material?.href?.startsWith('/assets/content/')) await checkAsset(root, ref.material.href)
    }
  }
  return catalog
}
async function checkAsset(root: string, href: string) {
  const target = path.resolve(root, 'public', href.slice(1))
  const allowed = path.resolve(root, 'public/assets/content') + path.sep
  if (!target.startsWith(allowed)) throw new Error('Path asset tidak aman')
  const actual = await realpath(target)
  if (!actual.startsWith(allowed)) throw new Error(`Asset mengarah keluar direktori yang diizinkan: ${href}`)
}
async function validate(root: string, inv: Inventory) {
  await mkdir(path.join(root, 'reports'), { recursive: true })
  const inputs = await drafts(root)
  if (!inputs.length) { console.log('Belum ada draft terstruktur; belum ada soal yang divalidasi.'); return }
  for (const { data } of inputs) {
    const { module } = data
    const source = inv.modules.find((item) => item.id === module.id)
    const lines = [`# Validasi: ${module.title}`, '', 'Laporan teknis ini tidak menggantikan verifikasi ilmiah atau persetujuan pengguna.', '', `Sumber cocok: ${!!source && source.title === module.title && source.sourceHash === data.sourceInventoryHash}`, '']
    for (const pkg of module.packages) {
      const hash = contentHash(module, pkg)
      const verified = pkg.questions.filter((q) => q.verification === 'verified').length
      lines.push(`## ${pkg.title}`, '', `Soal: ${pkg.questions.length}; berstatus terverifikasi: ${verified}; perlu pemeriksaan: ${pkg.questions.length - verified}.`, `Hash isi yang diperiksa: \`${hash}\`. Versi tercatat cocok: ${hash === pkg.contentVersion}.`, `Persetujuan draft: ${pkg.approval.status}.`, '', '| ID | Nomor sumber | Kunci asli | Kunci terstruktur | Status |', '| --- | --- | --- | --- | --- |')
      for (const q of pkg.questions) lines.push(`| ${q.id} | ${q.source.originalNumber} | ${q.source.originalKey} | ${q.correctOptionId} | ${q.verification} |`)
      lines.push('', 'Jawaban yang disarankan, alasan perubahan, referensi, dan keputusan konflik perlu dicatat oleh peninjau sebelum persetujuan. Tidak ada koreksi ilmiah otomatis.', '')
    }
    await writeFile(path.join(root, `reports/validation-${module.id}.md`), lines.join('\n'), 'utf8')
  }
}
export async function integrate(root: string, inv: Inventory) {
  const inputs = await drafts(root)
  if (!inputs.length) throw new Error('Belum ada draft; katalog yang ada tidak diubah.')
  const approvals = approvalSchema.parse(JSON.parse(await readFile(path.join(root, 'content/private/approvals.json'), 'utf8')))
  const catalog = await checkCatalog(root)
  for (const { data } of inputs) {
    const module = data.module
    const source = inv.modules.find((item) => item.id === module.id)
    if (!source || source.title !== module.title || source.sourceHash !== data.sourceInventoryHash || source.files.some((file) => file.error)) throw new Error(`Sumber ${module.title} tidak cocok atau berubah. Inventarisasi, validasi, dan persetujuan ulang diperlukan.`)
    const target = catalog.modules.find((item) => item.id === module.id) ?? { id: module.id, title: module.title, packages: [] }
    if (target.title !== module.title) throw new Error('Judul modul publik berbeda dari nama folder sumber.')
    for (const pkg of module.packages) {
      const version = contentHash(module, pkg)
      const approval = approvals.find((item) => item.moduleId === module.id && item.packageId === pkg.id && item.contentVersion === version)
      if (pkg.contentVersion !== version || !approval) throw new Error(`Paket ${pkg.title} belum memiliki persetujuan untuk versi isi saat ini.`)
      const receipt = { approvedBy: approval.approvedBy, approvedAt: approval.approvedAt, decisionReference: approval.decisionReference, ...(approval.sourceKeyDecisions ? { sourceKeyDecisions: approval.sourceKeyDecisions } : {}) }
      const approved: ExamPackage = { ...pkg, approval: { status: 'approved', ...receipt } }
      if (approved.questions.some((q) => !source.files.some((file) => file.relativePath === q.source.file))) throw new Error(`Sumber soal pada ${pkg.title} tidak tercatat dalam inventarisasi.`)
      const existing = target.packages.findIndex((item) => item.id === pkg.id)
      if (existing >= 0 && target.packages[existing].contentVersion !== version && Date.parse(target.packages[existing].approval.approvedAt ?? '') > Date.parse(approval.approvedAt)) throw new Error('Draf historis tidak boleh menimpa rilis dengan persetujuan yang lebih baru. Gunakan draf tinjauan terkini; rollback melalui versi rilis yang tersimpan.')
      if (existing >= 0) target.packages[existing] = approved
      else target.packages.push(approved)
    }
    if (!catalog.modules.some((item) => item.id === module.id)) catalog.modules.push(target)
  }
  await checkCatalog(root, catalog)
  const destination = path.join(root, 'src/content/catalog.json')
  const temporary = destination + '.tmp'
  await writeJson(temporary, catalog)
  // Windows dapat menahan handle sebentar saat antivirus/file watcher membaca file.
  // Retry rename atomik; jangan menghapus katalog lama untuk mengatasi lock.
  for (let attempt = 0; ; attempt++) {
    try { await rename(temporary, destination); break } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(code ?? '') || attempt >= 4) throw error
      await delay(50 * (attempt + 1))
    }
  }
  console.log('Data dengan persetujuan versi yang cocok diintegrasikan secara lokal. Tidak ada push/deployment.')
}
async function main() {
  const root = process.cwd()
  const action = process.argv[2]
  if (action === 'check') { const data = await checkCatalog(root); console.log(`Katalog valid: ${data.modules.length} modul; tidak ada bahan mentah yang disalin.`); return }
  const inv = await inventory(root)
  if (action === 'inventory') await inventoryReport(root, inv)
  else if (action === 'extract') { await extract(root, inv); await inventoryReport(root, inv) }
  else if (action === 'validate') await validate(root, inv)
  else if (action === 'integrate') await integrate(root, inv)
  else throw new Error('Gunakan inventory, extract, validate, check, atau integrate.')
  console.log(`${inv.modules.length} modul, ${inv.modules.reduce((total, module) => total + module.files.length, 0)} file sumber.`)
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
