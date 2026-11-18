import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import type { Plugin } from 'vite'
import { handleComplaints } from './complaints.ts'
import { sqliteAdapter } from './sqlite.ts'
import publicCatalog from '../src/content/catalog.json' with { type: 'json' }
import { fixtureCatalog } from '../src/dev/fixture.ts'
import { catalogSchema } from '../src/domain/content.ts'
import { createDraftPreviewLoader, localPreviewRequestAllowed, previewHeaders } from './draft-preview.ts'

export function localReportingPlugin(secret: string): Plugin {
  return { name: 'ocus-local-reporting', apply: 'serve', configureServer(server) {
    const loadDraftPreview = createDraftPreviewLoader()
    if (!secret) {
      const file = path.join(process.cwd(), '.env.local')
      const current = existsSync(file) ? readFileSync(file, 'utf8') : ''
      secret = randomBytes(32).toString('hex')
      writeFileSync(file, `${current}\nADMIN_REPORT_TOKEN=${secret}\n`, 'utf8')
    }
    const directory = path.join(process.cwd(), 'content/private/runtime')
    mkdirSync(directory, { recursive: true })
    const database = new DatabaseSync(path.join(directory, 'complaints.sqlite'))
    database.exec(readFileSync(path.join(process.cwd(), 'migrations/0001_complaints.sql'), 'utf8'))
    const env = { REPORTS_DB: sqliteAdapter(database), ADMIN_REPORT_TOKEN: secret }
    server.httpServer?.once('close', () => database.close())
    server.middlewares.use(async (req, res, next) => {
      const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
      const draftApi = requestUrl.pathname.startsWith('/api/dev-preview/')
      const draftImage = requestUrl.pathname === '/assets/content/gsm-569a327df59b/causal-pies-utm2019-q3.png'
      if (!draftApi && !draftImage && !['/api/complaints', '/api/admin/complaints'].includes(requestUrl.pathname)) { next(); return }
      try {
        if (draftApi || draftImage) {
          const headers = new Headers()
          for (const [name, value] of Object.entries(req.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
          const request = new Request(requestUrl, { headers })
          if (!localPreviewRequestAllowed(request, req.socket.remoteAddress ?? '')) { res.writeHead(403, previewHeaders); res.end(); return }
          if (!['/api/dev-preview/catalog', '/api/dev-preview/complaints'].includes(requestUrl.pathname) && !draftImage) { res.writeHead(404, previewHeaders); res.end(); return }
          const method = requestUrl.pathname === '/api/dev-preview/complaints' ? 'POST' : 'GET'
          if (req.method !== method) { res.writeHead(405, { ...previewHeaders, Allow: method }); res.end(); return }
          if (method === 'GET') {
            const snapshot = await loadDraftPreview()
            const data = draftImage ? snapshot.assets.get(requestUrl.pathname) : JSON.stringify(snapshot.catalog)
            if (!data) { res.writeHead(404, previewHeaders); res.end(); return }
            res.writeHead(200, { ...previewHeaders, 'Content-Type': draftImage ? 'image/png' : 'application/json' }); res.end(data); return
          }
        }
        const chunks: Buffer[] = []; let length = 0
        for await (const chunk of req) { length += chunk.length; if (length > 32768) { res.writeHead(413); res.end(); return }; chunks.push(Buffer.from(chunk)) }
        const headers = new Headers()
        for (const [name, value] of Object.entries(req.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
        const body = Buffer.concat(chunks)
        if (draftApi) requestUrl.pathname = '/api/complaints'
        const request = new Request(requestUrl, { method: req.method, headers, ...(body.length ? { body } : {}) })
        const catalog = draftApi ? (await loadDraftPreview()).catalog : catalogSchema.parse({ schemaVersion: 1, modules: [...publicCatalog.modules, ...fixtureCatalog.modules] })
        const response = await handleComplaints(request, env, catalog, req.socket.remoteAddress ?? 'local', draftApi)
        if (draftApi) for (const [key, value] of Object.entries(previewHeaders)) response.headers.set(key, value)
        res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text())
      } catch { res.writeHead(503, { ...previewHeaders, 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: draftApi || draftImage ? 'Draf preview belum dapat dimuat. Jalankan ulang validasi konten lalu coba lagi.' : 'Layanan laporan lokal belum tersedia.' })) }
    })
  } }
}
