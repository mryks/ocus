import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { handleComplaints, type ReportingEnv } from '../../server/complaints'
import { sqliteAdapter } from '../../server/sqlite'
import { fixtureCatalog } from '../../src/dev/fixture'
import { complaintInput } from '../../src/domain/complaints'
import { createSession } from '../../src/domain/session'

const secret = 'unit-only-report-token-'.repeat(3)
const module = fixtureCatalog.modules[0], pkg = module.packages[0], question = pkg.questions[0]
let database: DatabaseSync
let env: ReportingEnv
function input() {
  const session = createSession(module.id, pkg, { timed: false, minutes: 60, shuffleOptions: false, shuffleQuestions: false })
  session.order = [pkg.questions[2].id, pkg.questions[1].id, question.id, pkg.questions[3].id]
  session.optionOrder[question.id].reverse()
  session.answers[question.id] = question.options[2].id
  return complaintInput(module, pkg, question, session, { submissionId: crypto.randomUUID(), reason: 'Kunci ini perlu ditinjau dengan sumber.', reference: 'Buku yang digunakan di kelas.', proposedOptionId: question.options[0].id })
}
const post = (body: unknown) => handleComplaints(new Request('https://ocus.test/api/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://ocus.test' }, body: JSON.stringify(body) }), env, fixtureCatalog, 'unit-client')
const admin = (suffix = '', token = secret) => handleComplaints(new Request(`https://ocus.test/api/admin/complaints${suffix}`, { headers: { Authorization: `Bearer ${token}` } }), env, fixtureCatalog)

beforeEach(() => { database = new DatabaseSync(':memory:'); database.exec(readFileSync('migrations/0001_complaints.sql', 'utf8')); env = { REPORTS_DB: sqliteAdapter(database), ADMIN_REPORT_TOKEN: secret } })
afterEach(() => { database.close(); vi.restoreAllMocks() })

describe('laporan protes dan akses pengelola', () => {
  it('paket pending ditolak API biasa dan hanya diterima dengan konteks preview dari server', async () => {
    const catalog = structuredClone(fixtureCatalog)
    catalog.modules[0].packages[0].approval = { status: 'pending' }
    const body = input()
    const request = () => new Request('https://ocus.test/api/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    expect((await handleComplaints(request(), env, catalog)).status).toBe(409)
    expect((await handleComplaints(request(), env, catalog, 'test-client', true)).status).toBe(201)
    expect(catalog.modules[0].packages[0].approval.status).toBe('pending')
  })
  it('menyimpan snapshot otoritatif dengan ID stabil dan label opsi acak; daftar dilindungi', async () => {
    const body = input()
    const response = await post(body)
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ accepted: true })
    expect((await admin('', '')).status).toBe(401)
    expect((await admin('', 'wrong')).status).toBe(401)
    const list = await admin()
    expect(list.headers.get('Cache-Control')).toBe('no-store')
    const { reports } = await list.json()
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({ questionId: question.id, questionNumber: 3, contentVersion: pkg.contentVersion, correctOptionId: question.correctOptionId, proposedOptionId: question.options[0].id })
    expect(reports[0].options.find((o: { id: string }) => o.id === question.correctOptionId).label).toBe(String.fromCharCode(65 + body.optionOrder.indexOf(question.correctOptionId)))
    expect((await handleComplaints(new Request('https://ocus.test/api/complaints'), env, fixtureCatalog)).status).toBe(405)
  })
  it('menolak versi lama, opsi palsu, kunci kiriman klien dan alasan kosong', async () => {
    const good = input()
    for (const [body, status] of [
      [{ ...good, contentVersion: 'b'.repeat(64) }, 409],
      [{ ...good, proposedOptionId: 'not-an-option' }, 400],
      [{ ...good, optionOrder: good.optionOrder.map(() => good.optionOrder[0]) }, 400],
      [{ ...good, correctOptionId: good.proposedOptionId }, 400],
      [{ ...good, reason: '   ' }, 400],
    ] as const) expect((await post(body)).status).toBe(status)
    expect(database.prepare('SELECT COUNT(*) AS n FROM complaint_reports').get()).toMatchObject({ n: 0 })
  })
  it('percobaan ulang memakai laporan yang sama; isi berbeda tidak menimpa', async () => {
    const body = input()
    const first = await (await post(body)).json()
    const retry = await (await post(body)).json()
    expect(retry.id).toBe(first.id)
    expect((await post({ ...body, reason: 'Isi sudah berubah.' })).status).toBe(409)
    expect(database.prepare('SELECT COUNT(*) AS n FROM complaint_reports').get()).toMatchObject({ n: 1 })
  })
  it('percobaan ulang bersamaan tetap menghasilkan satu laporan', async () => {
    const body = input()
    const responses = await Promise.all([post(body), post(body)])
    expect(responses.every(r => r.ok)).toBe(true)
    const receipts = await Promise.all(responses.map(r => r.json()))
    expect(receipts[0].id).toBe(receipts[1].id)
    expect(database.prepare('SELECT COUNT(*) AS n FROM complaint_reports').get()).toMatchObject({ n: 1 })
  })
  it('membatasi isi, asal dan konfigurasi; gagal tidak mengaku diterima', async () => {
    const oversized = await handleComplaints(new Request('https://ocus.test/api/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(32769) }), env, fixtureCatalog)
    expect(oversized.status).toBe(400)
    const crossOrigin = await handleComplaints(new Request('https://ocus.test/api/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://other.test' }, body: JSON.stringify(input()) }), env, fixtureCatalog)
    expect(crossOrigin.status).toBe(403)
    env.REPORTS_DB = undefined
    const unavailable = await post(input())
    expect(unavailable.status).toBe(503)
    expect(await unavailable.json()).not.toHaveProperty('accepted')
  })
  it('paginasi tidak kehilangan laporan yang waktu penerimaannya sama', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1800000000000)
    for (let n = 0; n < 52; n++) expect((await post(input())).status).toBe(201)
    const first = await (await admin()).json()
    expect(first.reports).toHaveLength(50)
    const second = await (await admin(`?before=${encodeURIComponent(first.nextCursor)}`)).json()
    expect(second.reports).toHaveLength(2)
    expect(new Set([...first.reports, ...second.reports].map(r => r.id)).size).toBe(52)
  })
})

it('accepts named pre-practice reports without a session and validates bank numbering', async () => {
  const body = complaintInput(module, pkg, question, null, { submissionId: crypto.randomUUID(), reason: 'Please check this answer.', senderName: '  AB  ', proposedOptionId: null })
  expect(body.context).toBe('bank')
  expect(body.senderName).toBe('AB')
  expect((await post({ ...body, questionNumber: 2 })).status).toBe(400)
  expect((await post({ ...body, chosenOptionId: question.options[0].id })).status).toBe(400)
  expect((await post(body)).status).toBe(201)
  const { reports } = await (await admin()).json()
  expect(reports[0]).toMatchObject({ senderName: 'AB', context: 'bank', chosenOptionId: null, reference: '' })
})
it('keeps old client retries idempotent and reads legacy report snapshots', async () => {
  const body = input()
  const legacy = Object.fromEntries(Object.entries(body).filter(([key]) => !['senderName', 'context'].includes(key)))
  const first = await (await post(legacy)).json()
  expect((await (await post(legacy)).json()).id).toBe(first.id)
  const row = database.prepare('SELECT snapshot_json FROM complaint_reports WHERE id = ?').get(first.id) as { snapshot_json: string }
  const snapshot = JSON.parse(row.snapshot_json); delete snapshot.senderName; delete snapshot.context
  database.prepare('UPDATE complaint_reports SET snapshot_json = ? WHERE id = ?').run(JSON.stringify(snapshot), first.id)
  const list = await (await admin()).json()
  expect(list.reports[0]).toMatchObject({ senderName: '', context: 'review' })
})
