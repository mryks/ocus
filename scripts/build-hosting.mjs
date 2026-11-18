import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { build } from 'esbuild'

const root = process.cwd()
const hosting = JSON.parse(await readFile('.openai/hosting.json', 'utf8'))
if (!hosting.project_id || hosting.static || hosting.d1 !== 'REPORTS_DB') throw Error('Konfigurasi hosting Worker tidak cocok.')
const catalog = JSON.parse(await readFile('src/content/catalog.json', 'utf8'))
const assets = {}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' }
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) { if (!['server', '.openai'].includes(entry.name)) await walk(file); continue }
    const type = types[path.extname(file)]
    if (!type) continue
    const route = '/' + path.relative('dist', file).split(path.sep).join('/')
    const bytes = await readFile(file)
    assets[route] = { body: bytes.toString('base64'), type, cache: route === '/index.html' ? 'no-cache' : /^\/assets\/.*-[a-zA-Z0-9_-]{8,}\./.test(route) && !route.startsWith('/assets/content/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600' }
  }
}
await walk('dist')
const html = Buffer.from(assets['/index.html'].body, 'base64').toString()
const scriptTags = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]
if (scriptTags.length !== 1) throw Error('Audit template skrip diperlukan sebelum membangun CSP.')
const scriptPath = scriptTags[0][1]
if (!assets[scriptPath]) throw Error('Skrip aplikasi tidak ditemukan.')
const digest = 'sha256-' + createHash('sha256').update(Buffer.from(assets[scriptPath].body, 'base64')).digest('base64')
// Hanya template hasil build tepercaya; tidak memproses HTML dari request atau sumber soal.
assets['/index.html'].body = Buffer.from(html.replace(scriptTags[0][0], scriptTags[0][0].replace(`src="${scriptPath}"`, `integrity="${digest}" src="${scriptPath}"`))).toString('base64')
const csp = `default-src 'none'; script-src '${digest}' 'strict-dynamic' 'report-sample'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; require-trusted-types-for 'script'`
await mkdir('dist/server', { recursive: true })
await build({ stdin: { contents: `import {createSiteWorker} from './server/site-handler.ts'; export default createSiteWorker(${JSON.stringify(catalog)}, ${JSON.stringify(assets)}, ${JSON.stringify(csp)});`, resolveDir: root, sourcefile: 'ocus-site-entry.ts', loader: 'ts' }, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outfile: 'dist/server/index.js', minify: true })
await mkdir('dist/.openai', { recursive: true })
await writeFile('dist/.openai/hosting.json', JSON.stringify(hosting, null, 2) + '\n')
await writeFile('dist/server/wrangler.json', JSON.stringify({ name: 'ocus-local-production', main: 'index.js', compatibility_date: '2026-11-18', d1_databases: [{ binding: 'REPORTS_DB', database_name: 'ocus-reports-local', database_id: '00000000-0000-4000-8000-000000000000' }] }, null, 2) + '\n')
console.log(`Worker hosting siap: ${Object.keys(assets).length} aset publik; ${catalog.modules.flatMap(m => m.packages).reduce((n,p) => n+p.questions.length,0)} soal.`)
