import { describe, it, expect } from 'vitest'
import { createSiteWorker } from '../../server/site-handler'
import { fixtureCatalog } from '../../src/dev/fixture'

const worker = createSiteWorker(fixtureCatalog, {
  '/index.html': { body: btoa('<main>OCUS.</main>'), type: 'text/html; charset=utf-8', cache: 'no-cache' },
  '/assets/app-12345678.js': { body: btoa('export {}'), type: 'application/javascript', cache: 'public, max-age=31536000, immutable' },
}, "default-src 'none'")
describe('Worker hosting produksi', () => {
  it('melayani deep link latihan dan HEAD dengan header keamanan', async () => {
    const pkg = fixtureCatalog.modules[0].packages[0]
    const route = `https://ocus.test/modul/${fixtureCatalog.modules[0].id}/paket/${pkg.id}/pembahasan`
    const response = await worker.fetch(new Request(route), {})
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('OCUS.')
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'none'")
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
    expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=300')
    expect(await (await worker.fetch(new Request(route, { method: 'HEAD' }), {})).text()).toBe('')
  })
  it('melayani aset yang dibundel; file privat, route preview dan API tak dikenal tidak tersedia', async () => {
    const asset = await worker.fetch(new Request('https://ocus.test/assets/app-12345678.js'), {})
    expect(asset.headers.get('Content-Type')).toBe('application/javascript')
    expect(await asset.text()).toBe('export {}')
    for (const path of ['/content/private/drafts/gsm.json', '/reports/inventory.md', '/.env.local', '/preview', '/api/dev-preview/catalog']) {
      const response = await worker.fetch(new Request('https://ocus.test' + path), {})
      expect(response.status).toBe(404)
      expect(await response.text()).not.toContain('ADMIN_REPORT_TOKEN')
    }
    expect((await worker.fetch(new Request('https://ocus.test/', { method: 'POST' }), {})).status).toBe(405)
  })
  it('menolak permintaan API lintas situs sebelum autentikasi dan tetap melindungi pengelola', async () => {
    const url = 'https://ocus.test/api/admin/complaints'
    const cases: Record<string, string>[] = [{ 'Sec-Fetch-Site': 'cross-site' }, { 'Sec-Fetch-Site': 'same-site' }, { Origin: 'https://other.test' }]
    for (const headers of cases) {
      const response = await worker.fetch(new Request(url, { headers }), {})
      expect(response.status).toBe(403)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
    }
    expect((await worker.fetch(new Request(url), { ADMIN_REPORT_TOKEN: 'x'.repeat(64) })).status).toBe(401)
  })
})

it('allows only the configured Pages origin and exact preflight method/headers', async () => {
  const env = { REPORTING_ALLOWED_ORIGIN: 'https://mryks.github.io', ADMIN_REPORT_TOKEN: 'x'.repeat(64) }
  const preflight = (origin: string, method = 'POST', headers = 'content-type') => new Request('https://ocus.test/api/complaints', { method: 'OPTIONS', headers: { Origin: origin, 'Sec-Fetch-Site': 'cross-site', 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': headers } })
  const good = await worker.fetch(preflight(env.REPORTING_ALLOWED_ORIGIN), env)
  expect(good.status).toBe(204)
  expect(good.headers.get('Access-Control-Allow-Origin')).toBe(env.REPORTING_ALLOWED_ORIGIN)
  expect(good.headers.has('Access-Control-Allow-Credentials')).toBe(false)
  for (const request of [preflight('https://evil.test'), preflight(env.REPORTING_ALLOWED_ORIGIN, 'DELETE'), preflight(env.REPORTING_ALLOWED_ORIGIN, 'POST', 'x-forged')]) expect((await worker.fetch(request, env)).status).toBe(403)
  const admin = await worker.fetch(new Request('https://ocus.test/api/admin/complaints', { headers: { Origin: env.REPORTING_ALLOWED_ORIGIN, 'Sec-Fetch-Site': 'cross-site' } }), env)
  expect(admin.status).toBe(401)
  expect(admin.headers.get('Access-Control-Allow-Origin')).toBe(env.REPORTING_ALLOWED_ORIGIN)
})
