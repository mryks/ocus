import { complaintInputSchema, storedComplaintSchema, type StoredComplaint } from '../src/domain/complaints.ts'
import type { Catalog } from '../src/domain/content'

type Value = string | number | null
export interface SqlDatabase {
  prepare(sql: string): {
    bind(...values: Value[]): {
      first<T>(): Promise<T | null>
      all<T>(): Promise<{ results: T[] }>
      run(): Promise<{ meta?: { changes?: number } }>
    }
  }
}
export interface ReportingEnv { REPORTS_DB?: SqlDatabase; ADMIN_REPORT_TOKEN?: string; REPORTING_ALLOWED_ORIGIN?: string }
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } })
const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
async function authorized(request: Request, secret: string) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
  if (!token || token.length > 256) return false
  const [a, b] = await Promise.all([digest(token), digest(secret)])
  let difference = 0
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i]
  return difference === 0
}
async function readBody(request: Request) {
  const reader = request.body?.getReader()
  if (!reader) throw Error('body')
  const chunks: Uint8Array[] = []; let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > 32768) { await reader.cancel(); throw Error('size') }
    chunks.push(value)
  }
  const bytes = new Uint8Array(length); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}
export async function handleComplaints(request: Request, env: ReportingEnv, catalog: Catalog, clientAddress = 'unknown', localDraftPreview = false): Promise<Response> {
  try {
    const url = new URL(request.url)
    if (url.pathname === '/api/admin/complaints') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET' })
      if (!env.ADMIN_REPORT_TOKEN || env.ADMIN_REPORT_TOKEN.length < 32) return json({ error: 'Administrator access is not configured.' }, 503)
      if (!await authorized(request, env.ADMIN_REPORT_TOKEN)) return json({ error: 'Invalid administrator access key.' }, 401)
      if (!env.REPORTS_DB) return json({ error: 'Report storage is unavailable.' }, 503)
      const cursor = url.searchParams.get('before')
      const parts = cursor?.match(/^(\d{1,16}):([a-f0-9-]{36})$/i)
      if (cursor !== null && !parts) return json({ error: 'Invalid report page.' }, 400)
      const before = parts ? Number(parts[1]) : Date.now() + 1
      if (!Number.isSafeInteger(before) || before < 1) return json({ error: 'Invalid report page.' }, 400)
      const beforeId = parts?.[2] ?? 'ffffffff-ffff-ffff-ffff-ffffffffffff'
      const result = await env.REPORTS_DB.prepare('SELECT snapshot_json FROM complaint_reports WHERE created_at < ? OR (created_at = ? AND id < ?) ORDER BY created_at DESC, id DESC LIMIT 51').bind(before, before, beforeId).all<{ snapshot_json: string }>()
      const reports = result.results.slice(0, 50).map(row => storedComplaintSchema.parse(JSON.parse(row.snapshot_json)))
      const last = reports[reports.length - 1]
      return json({ reports, nextCursor: result.results.length > 50 ? `${Date.parse(last.createdAt)}:${last.id}` : null })
    }
    if (url.pathname !== '/api/complaints') return json({ error: 'Endpoint unavailable.' }, 404)
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' })
    if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin && request.headers.get('Origin') !== env.REPORTING_ALLOWED_ORIGIN) return json({ error: 'Request origin is not allowed.' }, 403)
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Use JSON format.' }, 415)
    if (!env.REPORTS_DB || !env.ADMIN_REPORT_TOKEN || env.ADMIN_REPORT_TOKEN.length < 32) return json({ error: 'Reports are temporarily unavailable. Please try again later.' }, 503)
    let raw: unknown
    try { raw = await readBody(request) } catch { return json({ error: 'The report is invalid or too large.' }, 400) }
    const parsed = complaintInputSchema.safeParse(raw)
    if (!parsed.success) return json({ error: 'Check the reason and suggested answer.' }, 400)
    const input = parsed.data
    const module = catalog.modules.find(m => m.id === input.moduleId)
    const pkg = module?.packages.find(p => p.id === input.packageId && (p.approval.status === 'approved' || localDraftPreview && p.approval.status === 'pending'))
    const question = pkg?.questions.find(q => q.id === input.questionId)
    if (!module || !pkg || !question || pkg.contentVersion !== input.contentVersion) return json({ error: 'This question version is unavailable. Reload the bank before reporting.' }, 409)
    const ids = question.options.map(o => o.id)
    if (input.questionNumber > pkg.questions.length || input.optionOrder.length !== ids.length || new Set(input.optionOrder).size !== ids.length || input.optionOrder.some(id => !ids.includes(id)) || [input.chosenOptionId, input.proposedOptionId].some(id => id !== null && !ids.includes(id))) return json({ error: 'Invalid question or answer identity.' }, 400)
    if (input.context === 'bank' && (input.questionNumber !== pkg.questions.indexOf(question) + 1 || input.chosenOptionId !== null)) return json({ error: 'Question identity is invalid.' }, 400)
    // Preserve idempotent retries from the previous client contract across this release.
    const legacy = typeof raw === 'object' && raw !== null && !('senderName' in raw) && !('context' in raw)
    const oldInput = Object.fromEntries(Object.entries(input).filter(([key]) => !['senderName', 'context'].includes(key)))
    const bodyHash = [...await digest(JSON.stringify(legacy ? oldInput : input))].map(n => n.toString(16).padStart(2, '0')).join('')
    const prior = await env.REPORTS_DB.prepare('SELECT id, body_hash FROM complaint_reports WHERE submission_id = ?').bind(input.submissionId).first<{ id: string; body_hash: string }>()
    if (prior) return prior.body_hash === bodyHash ? json({ accepted: true, id: prior.id }) : json({ error: 'This submission has changed. Reopen the form and try again.' }, 409)
    const id = crypto.randomUUID(); const now = Date.now()
    const report: StoredComplaint = {
      id, createdAt: new Date(now).toISOString(), moduleId: module.id, moduleTitle: module.title,
      packageId: pkg.id, packageTitle: pkg.title, contentVersion: pkg.contentVersion,
      questionId: question.id, questionNumber: input.questionNumber, blocks: question.blocks,
      options: input.optionOrder.map((id, index) => ({ ...question.options.find(o => o.id === id)!, label: String.fromCharCode(65 + index) })),
      correctOptionId: question.correctOptionId, chosenOptionId: input.chosenOptionId, proposedOptionId: input.proposedOptionId,
      reason: input.reason, reference: input.reference, senderName: input.senderName, context: input.context,
    }
    const clientHash = [...await digest(`${env.ADMIN_REPORT_TOKEN}:${clientAddress}`)].map(n => n.toString(16).padStart(2, '0')).join('')
    let inserted: { meta?: { changes?: number } }
    try {
      inserted = await env.REPORTS_DB.prepare('INSERT INTO complaint_reports (id, submission_id, body_hash, created_at, client_hash, snapshot_json) SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM complaint_reports WHERE client_hash = ? AND created_at > ?) < 120')
        .bind(id, input.submissionId, bodyHash, now, clientHash, JSON.stringify(report), clientHash, now - 3600000).run()
    } catch {
      // A concurrent retry may have inserted the same submission while we validated it.
      const existing = await env.REPORTS_DB.prepare('SELECT id, body_hash FROM complaint_reports WHERE submission_id = ?').bind(input.submissionId).first<{ id: string; body_hash: string }>()
      if (existing) return existing.body_hash === bodyHash ? json({ accepted: true, id: existing.id }) : json({ error: 'This submission has changed. Reopen the form and try again.' }, 409)
      return json({ error: 'Your report could not be saved. Please try again later.' }, 503)
    }
    if (!inserted.meta?.changes) return json({ error: 'Report limit reached. Please try again later.' }, 429, { 'Retry-After': '3600' })
    return json({ accepted: true, id }, 201)
  } catch { return json({ error: 'Your report could not be processed. Please try again later.' }, 503) }
}
