import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { catalogSchema, packageSchema } from '../../src/domain/content'
import { fixtureCatalog } from '../../src/dev/fixture'
import { checkCatalog, contentHash, integrate, inventory, moduleId } from '../../scripts/content'

const temporary: string[] = []
async function workspace() {
  const base = path.resolve('tmp/tests')
  await mkdir(base, { recursive: true })
  const root = await mkdtemp(path.join(base, 'content-'))
  temporary.push(root)
  await mkdir(path.join(root, 'src/content'), { recursive: true })
  await writeFile(path.join(root, 'src/content/catalog.json'), JSON.stringify({ schemaVersion: 1, modules: [] }))
  return root
}
afterEach(async () => {
  for (const root of temporary.splice(0)) {
    if (!path.resolve(root).startsWith(path.resolve('tmp/tests') + path.sep)) throw new Error('Pembersihan di luar direktori tes ditolak')
    await rm(root, { recursive: true, force: true })
  }
})
describe('Validasi data', () => {
  it('menolak kunci di luar opsi, ID duplikat, pertanyaan duplikat, dan paket belum disetujui', () => {
    const pkg = structuredClone(fixtureCatalog.modules[0].packages[0])
    pkg.questions[0].correctOptionId = 'unknown'
    expect(packageSchema.safeParse(pkg).success).toBe(false)
    const dup = structuredClone(fixtureCatalog.modules[0].packages[0])
    dup.questions[0].options[1].id = dup.questions[0].options[0].id
    expect(packageSchema.safeParse(dup).success).toBe(false)
    const catalog = structuredClone(fixtureCatalog)
    catalog.modules[0].packages[0].approval = { status: 'pending' }
    expect(catalogSchema.safeParse(catalog).success).toBe(false)
    const repeat = structuredClone(fixtureCatalog.modules[0].packages[0])
    repeat.questions[1].blocks = repeat.questions[0].blocks
    repeat.questions[1].options.forEach((option, index) => { option.text = repeat.questions[0].options[index].text })
    expect(packageSchema.safeParse(repeat).success).toBe(false)
  })
  it('soal ambigu/belum terverifikasi memblokir status approved', () => {
    const pkg = structuredClone(fixtureCatalog.modules[0].packages[0])
    pkg.questions[0].verification = 'unverified'
    expect(packageSchema.safeParse(pkg).success).toBe(false)
    pkg.approval = { status: 'pending' }
    expect(packageSchema.safeParse(pkg).success).toBe(true)
  })
  it('URL dan path berbahaya tidak diterima', () => {
    const pkg = structuredClone(fixtureCatalog.modules[0].packages[0])
    pkg.questions[0].references = [{ id: 'unsafe', citation: 'Uji', url: 'javascript:alert(1)' }]
    expect(packageSchema.safeParse(pkg).success).toBe(false)
    pkg.questions[0].references = []
    pkg.questions[0].blocks = [{ type: 'image', src: '/modul/sumber.pdf', alt: 'Tidak boleh publik', width: 200, height: 100 }]
    expect(packageSchema.safeParse(pkg).success).toBe(false)
  })
  it('memerlukan keputusan pengguna per soal untuk kunci sumber ambigu tanpa mengubah status ilmiah', () => {
    const pkg = structuredClone(fixtureCatalog.modules[0].packages[0])
    pkg.questions[0].verification = 'ambiguous'
    expect(packageSchema.safeParse(pkg).success).toBe(false)
    pkg.approval.sourceKeyDecisions = [{ questionId: pkg.questions[0].id, decisionReference: 'Pengguna meninjau dan meminta mengikuti kunci sumber.' }]
    expect(packageSchema.parse(pkg).questions[0].verification).toBe('ambiguous')
    pkg.questions[1].verification = 'ambiguous'
    expect(packageSchema.safeParse(pkg).success).toBe(false)
    pkg.questions[1].verification = 'verified'
    pkg.questions[0].verification = 'blocked'
    expect(packageSchema.safeParse(pkg).success).toBe(false)
    pkg.questions[0].verification = 'unverified'
    expect(packageSchema.safeParse(pkg).success).toBe(false)
    pkg.questions[0].verification = 'ambiguous'
    pkg.approval.sourceKeyDecisions.push(pkg.approval.sourceKeyDecisions[0])
    expect(packageSchema.safeParse(pkg).success).toBe(false)
  })
})
describe('Pipeline lokal dan persetujuan', () => {
  it('folder kosong aman, judul persis nama folder Unicode, ID unik dan pembacaan rekursif', async () => {
    const root = await workspace()
    expect((await inventory(root)).modules).toEqual([])
    for (const title of ['Modul É & gigi', 'Modul E & gigi', '空']) {
      await mkdir(path.join(root, 'modul', title, 'sub'), { recursive: true })
      await writeFile(path.join(root, 'modul', title, 'sub', 'sumber.md'), 'Bahan asli')
    }
    const result = await inventory(root)
    expect(result.modules.map((module) => module.title).sort()).toEqual(['Modul É & gigi', 'Modul E & gigi', '空'].sort())
    expect(new Set(result.modules.map((module) => module.id)).size).toBe(3)
    expect(result.modules.every((module) => module.files[0].relativePath === 'sub/sumber.md')).toBe(true)
    expect(moduleId('Modul É & gigi')).toBe(moduleId('Modul É & gigi'))
  })
  it('mendeteksi format dari isi dan perubahan sumber tanpa mengubah file', async () => {
    const root = await workspace()
    const source = path.join(root, 'modul/GSM/salah-nama.txt')
    await mkdir(path.dirname(source), { recursive: true }); await writeFile(source, '%PDF-1.7\ncontent')
    const first = await inventory(root)
    expect(first.modules[0].files[0].format).toBe('pdf')
    expect(await readFile(source, 'utf8')).toBe('%PDF-1.7\ncontent')
    await writeFile(source, '%PDF-1.7\nnew content')
    expect((await inventory(root)).modules[0].sourceHash).not.toBe(first.modules[0].sourceHash)
  })
  it('integrasi membutuhkan approval versi tepat; perubahan isi/sumber membatalkan approval', async () => {
    const root = await workspace()
    await mkdir(path.join(root, 'modul/GSM'), { recursive: true })
    await writeFile(path.join(root, 'modul/GSM/sumber.md'), 'Bahan uji nonmedis')
    const inv = await inventory(root)
    const module = structuredClone(fixtureCatalog.modules[0])
    module.id = inv.modules[0].id; module.title = 'GSM'
    const pkg = module.packages[0]
    pkg.approval = { status: 'pending' }
    for (const q of pkg.questions) q.source.file = 'sumber.md'
    pkg.contentVersion = contentHash(module, pkg)
    await mkdir(path.join(root, 'content/private/drafts'), { recursive: true })
    const draftFile = path.join(root, 'content/private/drafts/gsm.json')
    await writeFile(draftFile, JSON.stringify({ sourceInventoryHash: inv.modules[0].sourceHash, module }))
    const approvalFile = path.join(root, 'content/private/approvals.json')
    await writeFile(approvalFile, '[]')
    await expect(integrate(root, inv)).rejects.toThrow('belum memiliki persetujuan')
    const approval = { moduleId: module.id, packageId: pkg.id, contentVersion: pkg.contentVersion, approvedBy: 'Tes', approvedAt: '2026-11-17T00:00:00Z', decisionReference: 'Persetujuan fixture untuk tes saja' }
    await writeFile(approvalFile, JSON.stringify([approval]))
    await integrate(root, inv)
    expect((await checkCatalog(root)).modules[0].title).toBe('GSM')
    pkg.questions[0].explanation[0] = { type: 'paragraph', text: 'Diubah setelah persetujuan' }
    await writeFile(draftFile, JSON.stringify({ sourceInventoryHash: inv.modules[0].sourceHash, module }))
    await expect(integrate(root, inv)).rejects.toThrow('belum memiliki persetujuan')
    await writeFile(path.join(root, 'modul/GSM/sumber.md'), 'Sumber diubah')
    await expect(integrate(root, await inventory(root))).rejects.toThrow('Sumber GSM tidak cocok')
  })
  it('build menolak perubahan konten tanpa pembaruan fingerprint', async () => {
    const root = await workspace()
    const catalog = structuredClone(fixtureCatalog)
    await expect(checkCatalog(root, catalog)).rejects.toThrow('tidak sesuai isinya')
    const module = catalog.modules[0]
    module.packages[0].contentVersion = contentHash(module, module.packages[0])
    await expect(checkCatalog(root, catalog)).resolves.toEqual(catalog)
    module.title = 'Berubah'
    await expect(checkCatalog(root, catalog)).rejects.toThrow('tidak sesuai isinya')
  })
})
