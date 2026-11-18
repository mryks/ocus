import { createHash } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { moduleSchema, type Catalog } from '../src/domain/content.ts'
import { contentHash } from '../scripts/content.ts'

export const previewHeaders = { 'Cache-Control': 'no-store', 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff', Vary: 'Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site' }
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const readJson = async (file: string) => JSON.parse(await readFile(file, 'utf8'))
const draftSchema = z.strictObject({ sourceInventoryHash: z.string().regex(/^[a-f0-9]{64}$/), module: moduleSchema })
type Draft = z.infer<typeof draftSchema>
type Review = { contentVersion: string; decisions: { candidateId: string; included: boolean; assetApproval?: { manifest: string; publicPath: string; sha256: string; permission: string } }[] }

/** Rute ini khusus server development, bukan bukti persetujuan publikasi. */
export function localPreviewRequestAllowed(request: Request, address: string) {
  const url = new URL(request.url)
  const origin = request.headers.get('Origin')
  const site = request.headers.get('Sec-Fetch-Site')
  return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)
    && (!origin || origin === url.origin)
    && (!site || site === 'same-origin' || site === 'none')
}

export function checkDraftSnapshot(input: unknown, review: Review): Draft {
  const draft = draftSchema.parse(input)
  if (draft.module.packages.length !== 1) throw Error('Preview memerlukan satu paket draf.')
  const pkg = draft.module.packages[0]
  if (pkg.approval.status !== 'pending' || contentHash(draft.module, pkg) !== pkg.contentVersion || review.contentVersion !== pkg.contentVersion) throw Error('Draf/ledger preview tidak cocok.')
  const questions = new Set(pkg.questions.map(q => q.id))
  if (new Set(review.decisions.map(d => d.candidateId)).size !== review.decisions.length || review.decisions.some(d => questions.has(d.candidateId) !== d.included)) throw Error('Seleksi preview tidak sesuai keputusan pengguna.')
  return draft
}

export async function loadDraftPreview(root = process.cwd()): Promise<{ catalog: Catalog; assets: Map<string, Buffer> }> {
  const config = await readJson(path.join(root, 'content/private/curation/gsm-akt22-user-decisions.json'))
  const review = await readJson(path.join(root, 'content/private/curation/gsm-akt22-stage4.json')) as Review
  const draft = checkDraftSnapshot(await readJson(path.join(root, 'content/private/drafts/gsm-akt22.json')), review)
  const inventory = await readJson(path.join(root, 'content/private/inventory.json')) as { modules: { id: string; title: string; sourceHash: string; files: { relativePath: string; hash: string }[] }[] }
  const module = inventory.modules.find(m => m.id === draft.module.id && m.title === draft.module.title && m.sourceHash === draft.sourceInventoryHash)
  if (!module) throw Error('Inventarisasi preview tidak cocok.')
  const sourceRoot = path.resolve(root, 'modul', module.title)
  for (const source of module.files) {
    const filename = path.resolve(sourceRoot, source.relativePath)
    if (!filename.startsWith(sourceRoot + path.sep) || sha(await readFile(filename)) !== source.hash) throw Error('Sumber preview berubah.')
  }
  const within = async (file: string, directory: string) => {
    const actual = await realpath(path.resolve(root, file))
    if (!actual.startsWith(path.resolve(root, directory) + path.sep)) throw Error('Path preview tidak aman.')
    return actual
  }
  if (sha(await readFile(await within(config.pdf, 'output/pdf'))) !== config.pdfSha256) throw Error('Bukti tinjauan preview berubah.')
  const assets = new Map<string, Buffer>()
  for (const decision of review.decisions) {
    const approval = decision.assetApproval
    if (!decision.included || !approval) continue
    if (approval.permission !== 'user-approved-for-this-question') throw Error('Izin aset preview tidak tersedia.')
    const manifest = await readJson(await within(approval.manifest, 'content/private'))
    const image = await readFile(await within(manifest.file, 'content/private'))
    if (manifest.candidateId !== decision.candidateId || manifest.sha256 !== approval.sha256 || sha(image) !== approval.sha256) throw Error('Aset preview berubah.')
    assets.set(approval.publicPath, image)
  }
  for (const pkg of draft.module.packages) for (const q of pkg.questions) for (const block of [...q.blocks, ...q.explanation]) {
    if (block.type === 'image' && !assets.has(block.src)) throw Error('Gambar preview belum disiapkan.')
  }
  return { catalog: { schemaVersion: 1, modules: [draft.module] }, assets }
}

/** Cache server-side; respons browser tetap no-store dan perubahan file membatalkannya. */
export function createDraftPreviewLoader(root = process.cwd()) {
  const controlFiles = ['content/private/curation/gsm-akt22-user-decisions.json', 'content/private/curation/gsm-akt22-stage4.json', 'content/private/drafts/gsm-akt22.json', 'content/private/inventory.json']
  const fingerprint = async () => {
    const inputs = await Promise.all(controlFiles.map(file => readFile(path.resolve(root, file))))
    const [config, review, draft, inventory] = inputs.map(bytes => JSON.parse(bytes.toString()))
    const source = inventory.modules.find((m: { id: string }) => m.id === draft.module.id)
    if (!source) throw Error('Inventarisasi preview tidak tersedia.')
    const files: string[] = [config.pdf, ...source.files.map((f: { relativePath: string }) => path.join('modul', source.title, f.relativePath))]
    const manifestHashes: string[] = []
    for (const d of review.decisions) if (d.included && d.assetApproval) {
      const filename = path.resolve(root, d.assetApproval.manifest)
      if (!filename.startsWith(path.resolve(root, 'content/private') + path.sep)) throw Error('Path manifest tidak aman.')
      const bytes = await readFile(filename)
      manifestHashes.push(sha(bytes)); files.push(d.assetApproval.manifest, JSON.parse(bytes.toString()).file)
    }
    const stamps = await Promise.all([...new Set(files)].map(async file => {
      const actual = await realpath(path.resolve(root, file))
      if (!actual.startsWith(path.resolve(root) + path.sep)) throw Error('Path fingerprint tidak aman.')
      const info = await stat(actual, { bigint: true })
      return `${actual}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`
    }))
    return sha(Buffer.from(JSON.stringify([inputs.map(sha), manifestHashes, stamps])))
  }
  return cacheValidatedSnapshot(fingerprint, () => loadDraftPreview(root))
}

export function cacheValidatedSnapshot<T>(fingerprint: () => Promise<string>, load: () => Promise<T>) {
  let cached: { version: string; promise: Promise<T> } | undefined
  return async () => {
    const version = await fingerprint()
    if (!cached || cached.version !== version) {
      const promise = (async () => {
        const data = await load()
        if (await fingerprint() !== version) throw Error('Berkas berubah selama validasi preview; coba lagi.')
        return data
      })()
      cached = { version, promise }
    }
    const request = cached
    try { return await request.promise } catch (error) { if (cached === request) cached = undefined; throw error }
  }
}
