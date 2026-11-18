import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

async function walk(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await walk(filename))
    else result.push(filename)
  }
  return result
}
const directory = process.argv[2] ?? 'dist'
if (!['dist', 'dist-pages'].includes(directory)) throw Error('Unknown build directory')
const files = await walk(directory)
// Check actual server secrets without printing their values or bundling them.
const secrets = new Set([process.env.ADMIN_REPORT_TOKEN].filter(Boolean))
for (const envFile of ['.env.local', '.env.production.local']) try {
  const localEnv = await readFile(envFile, 'utf8')
  const token = /^ADMIN_REPORT_TOKEN=(.+)$/m.exec(localEnv)?.[1].trim()
  if (token) secrets.add(token)
} catch (error) { if (error.code !== 'ENOENT') throw error }
const catalog = JSON.parse(await readFile('src/content/catalog.json', 'utf8'))
const allowedAssets = new Set()
for (const module of catalog.modules) for (const pkg of module.packages) for (const question of pkg.questions) {
  for (const block of [...question.blocks, ...question.explanation]) if (block.type === 'image') allowedAssets.add(path.normalize(`${directory}${block.src}`))
  for (const reference of question.references) if (reference.material?.href?.startsWith('/assets/content/')) allowedAssets.add(path.normalize(`${directory}${reference.material.href}`))
}
for (const file of files) {
  if (/(?:^|[\\/])(?:modul|private|reports)(?:[\\/]|$)/.test(file)) throw Error(`Bahan internal ditemukan dalam build: ${file}`)
  if ((/\.(pdf|docx|xlsx|pptx)$/i.test(file) || file.startsWith(path.normalize(`${directory}/assets/content/`))) && !allowedAssets.has(path.normalize(file))) throw Error(`Asset tanpa rujukan paket disetujui ditemukan dalam build: ${file}`)
  if (/\.(js|html|json)$/.test(file)) {
    const text = await readFile(file, 'utf8')
    if ([...secrets].some(secret => text.includes(secret))) throw Error(`Secret server ditemukan dalam build: ${file}`)
    if (['fixture-nonmedis', 'uji-1-o1', 'Paket pengujian aplikasi', '/api/dev-preview/', 'draft-preview'].some((marker) => text.includes(marker))) throw Error(`Konten development/preview ditemukan dalam build: ${file}`)
  }
}
console.log(`Audit build: ${files.length} file; tidak ada fixture atau bahan sumber internal.`)
