import { describe, expect, it, vi } from 'vitest'
import { fixtureCatalog } from '../../src/dev/fixture'
import { contentHash } from '../../scripts/content'
import { cacheValidatedSnapshot, checkDraftSnapshot, localPreviewRequestAllowed, previewHeaders } from '../../server/draft-preview'
import { sessionKey } from '../../src/domain/storage'

function pending() {
  const module = structuredClone(fixtureCatalog.modules[0])
  module.packages[0].approval = { status: 'pending' }
  module.packages[0].questions[0].verification = 'ambiguous'
  module.packages[0].contentVersion = contentHash(module, module.packages[0])
  return { sourceInventoryHash: 'a'.repeat(64), module }
}
describe('Preview draf tetap terpisah dari izin publikasi', () => {
  it('menggabungkan validasi bersamaan, memakai ulang snapshot, dan memvalidasi ulang ketika sumber berubah', async () => {
    let version = 'one'
    const load = vi.fn(async () => ({ version }))
    const cached = cacheValidatedSnapshot(async () => version, load)
    const [a,b] = await Promise.all([cached(), cached()])
    expect(a).toBe(b)
    expect(await cached()).toBe(a)
    expect(load).toHaveBeenCalledTimes(1)
    version = 'two'
    expect(await cached()).toEqual({ version: 'two' })
    expect(load).toHaveBeenCalledTimes(2)
  })
  it('tidak menyimpan kegagalan atau snapshot yang berubah selama pembacaan', async () => {
    let version = 'one'
    const load = vi.fn(async () => { version = 'two'; return 'content' })
    const cached = cacheValidatedSnapshot(async () => version, load)
    await expect(cached()).rejects.toThrow('Berkas berubah')
    expect(await cached()).toBe('content')
    expect(load).toHaveBeenCalledTimes(2)
  })
  it('memuat pending tanpa mengganti status ilmiah atau membuat persetujuan', () => {
    const draft = pending()
    const result = checkDraftSnapshot(draft, { contentVersion: draft.module.packages[0].contentVersion, decisions: [{ candidateId: 'skipped', included: false }, { candidateId: draft.module.packages[0].questions[0].id, included: true }] })
    expect(result.module.packages[0].approval).toEqual({ status: 'pending' })
    expect(result.module.packages[0].questions[0].verification).toBe('ambiguous')
  })
  it('menolak isi berubah, versi ledger salah, dan soal skip yang kembali masuk', () => {
    const draft = pending()
    const review = { contentVersion: draft.module.packages[0].contentVersion, decisions: [] }
    expect(() => checkDraftSnapshot(draft, { ...review, contentVersion: 'b'.repeat(64) })).toThrow('tidak cocok')
    expect(() => checkDraftSnapshot(draft, { ...review, decisions: [{ candidateId: draft.module.packages[0].questions[0].id, included: false }] })).toThrow('Seleksi')
    draft.module.packages[0].questions[0].correctOptionId = draft.module.packages[0].questions[0].options[0].id
    expect(() => checkDraftSnapshot(draft, review)).toThrow('tidak cocok')
  })
  it('membatasi API dan aset privat ke loopback serta origin yang sama', () => {
    const url = 'http://127.0.0.1:5173/api/dev-preview/catalog'
    expect(localPreviewRequestAllowed(new Request(url), '127.0.0.1')).toBe(true)
    expect(localPreviewRequestAllowed(new Request(url, { headers: { Origin: 'https://elsewhere.test' } }), '127.0.0.1')).toBe(false)
    expect(localPreviewRequestAllowed(new Request(url, { headers: { 'Sec-Fetch-Site': 'cross-site' } }), '127.0.0.1')).toBe(false)
    expect(localPreviewRequestAllowed(new Request(url, { headers: { 'Sec-Fetch-Site': 'same-site' } }), '127.0.0.1')).toBe(false)
    expect(localPreviewRequestAllowed(new Request('http://evil.test/api/dev-preview/catalog'), '127.0.0.1')).toBe(false)
    expect(localPreviewRequestAllowed(new Request(url), '192.168.1.10')).toBe(false)
    expect(previewHeaders).toMatchObject({ 'Cache-Control': 'no-store', 'Cross-Origin-Resource-Policy': 'same-origin' })
  })
  it('memisahkan progres preview dan mempertahankan format kunci sesi biasa', () => {
    expect(sessionKey('module', 'package')).toBe('cbt:v1:module:package')
    expect(sessionKey('module', 'package', 'draft-preview')).not.toBe(sessionKey('module', 'package'))
  })
})
