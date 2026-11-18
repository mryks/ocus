import { handleComplaints, type ReportingEnv } from './complaints.ts'
import type { Catalog } from '../src/domain/content.ts'

export type SiteAsset = { body: string; type: string; cache: string }
export function createSiteWorker(catalog: Catalog, assets: Record<string, SiteAsset>, csp: string) {
  const routes = new Set(['/', '/guide', '/privacy', '/admin/reports', '/panduan', '/privasi', '/pengelola/laporan'])
  for (const module of catalog.modules) for (const pkg of module.packages) {
    const base = `/modul/${module.id}/paket/${pkg.id}`
    for (const suffix of ['', '/ujian', '/hasil', '/pembahasan']) routes.add(base + suffix)
    for (const suffix of ['', '/exam', '/results', '/review']) routes.add(`/module/${module.id}${suffix}`)
  }
  const headers = {
    'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', 'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'X-Frame-Options': 'DENY',
    Vary: 'Origin, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site',
  }
  return { async fetch(request: Request, env: ReportingEnv) {
    const url = new URL(request.url)
    let response: Response
    if (url.pathname.startsWith('/api/')) {
      const site = request.headers.get('Sec-Fetch-Site')
      const origin = request.headers.get('Origin')
      const explicitlyAllowed = !!origin && (origin === url.origin || origin === env.REPORTING_ALLOWED_ORIGIN)
      if ((origin && !explicitlyAllowed) || (site && !['same-origin', 'none'].includes(site) && !explicitlyAllowed)) response = Response.json({ error: 'Request origin is not allowed.' }, { status: 403 })
      else if (request.method === 'OPTIONS') {
        const expected = url.pathname === '/api/complaints' ? 'POST' : url.pathname === '/api/admin/complaints' ? 'GET' : null
        const method = request.headers.get('Access-Control-Request-Method')
        const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') ?? '').toLowerCase().split(',').map(h => h.trim()).filter(Boolean)
        response = expected && explicitlyAllowed && method === expected && requestedHeaders.every(h => ['content-type', 'authorization'].includes(h))
          ? new Response(null, { status: 204, headers: { 'Access-Control-Allow-Methods': expected, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '600' } })
          : Response.json({ error: 'Preflight request is not allowed.' }, { status: 403 })
      } else response = await handleComplaints(request, env, catalog, request.headers.get('CF-Connecting-IP') ?? 'unknown')
      if (explicitlyAllowed && origin) response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Cache-Control', 'no-store')
    } else if (!['GET', 'HEAD'].includes(request.method)) response = new Response(null, { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } })
    else {
      const asset = assets[url.pathname]
      const document = !asset && routes.has(url.pathname)
      const chosen = asset ?? assets['/index.html']
      const missing = !asset && !document
      if (missing && /\.[^/]+$/.test(url.pathname)) response = new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
      else {
        const bytes = Uint8Array.from(atob(chosen.body), c => c.charCodeAt(0))
        response = new Response(request.method === 'HEAD' ? null : bytes, { status: missing ? 404 : 200, headers: { 'Content-Type': chosen.type, 'Cache-Control': chosen.cache } })
        if (chosen.type.startsWith('text/html')) {
          response.headers.set('Content-Security-Policy', csp)
          // Hindari injeksi JavaScript Detections CDN pada HTML ber-CSP hash/SRI.
          response.headers.set('Cache-Control', 'no-cache, no-transform')
        }
      }
    }
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
    if (url.protocol === 'https:') response.headers.set('Strict-Transport-Security', 'max-age=300')
    return response
  } }
}
