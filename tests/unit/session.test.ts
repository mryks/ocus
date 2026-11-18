import { describe, expect, it } from 'vitest'
import { fixtureCatalog } from '../../src/dev/fixture'
import { compatible, createSession, formatTime, score, shuffle, transition } from '../../src/domain/session'
import { readSession, sessionKey, writeSession, type StorageLike } from '../../src/domain/storage'

const pkg = fixtureCatalog.modules[0].packages[0]
const settings = { timed: true, minutes: 5, shuffleQuestions: false, shuffleOptions: false }
describe('Mesin CBT', () => {
  it('mengambil subset unik, selalu mengacak, menilai subset, serta menolak jawaban di luar sesi', () => {
    let session = createSession('uji-lokal', pkg, { ...settings, questionCount: 2 }, 1000)
    expect(session.order).toHaveLength(2)
    expect(new Set(session.order).size).toBe(2)
    expect(session.settings).toMatchObject({ shuffleQuestions: true, shuffleOptions: true, questionCount: 2 })
    expect(compatible(session, 'uji-lokal', pkg)).toBe(true)
    const first = pkg.questions.find(q => q.id === session.order[0])!
    session = transition(session, pkg, { type: 'answer', questionId: first.id, optionId: first.correctOptionId }, 2000)
    expect(score(session, pkg)).toEqual({ correct: 1, incorrect: 0, unanswered: 1, total: 2, percentage: 50 })
    const excluded = pkg.questions.find(q => !session.order.includes(q.id))!
    expect(transition(session, pkg, { type: 'answer', questionId: excluded.id, optionId: excluded.correctOptionId }, 2000)).toBe(session)
    expect(compatible({ ...session, answers: { [excluded.id]: excluded.correctOptionId } }, 'uji-lokal', pkg)).toBe(false)
    expect(compatible({ ...session, settings: { ...session.settings, questionCount: 3 } }, 'uji-lokal', pkg)).toBe(false)
    expect(() => createSession('uji-lokal', pkg, { ...settings, questionCount: 0 })).toThrow()
    expect(() => createSession('uji-lokal', pkg, { ...settings, questionCount: 5 })).toThrow()
  })
  it('seluruh soal tercakup, urutan acak tersimpan, dan kunci tetap merujuk ID opsi', () => {
    const session = createSession('uji-lokal', pkg, { ...settings, shuffleQuestions: true, shuffleOptions: true }, 1000)
    expect(new Set(session.order)).toEqual(new Set(pkg.questions.map((q) => q.id)))
    expect(compatible(session, 'uji-lokal', pkg)).toBe(true)
    let answered = session
    for (const question of pkg.questions) answered = transition(answered, pkg, { type: 'answer', questionId: question.id, optionId: question.correctOptionId }, 2000)
    expect(score(answered, pkg).percentage).toBe(100)
    expect(JSON.parse(JSON.stringify(answered)).optionOrder).toEqual(session.optionOrder)
  })
  it('acak Fisher-Yates menghasilkan permutasi dan tidak mengubah input', () => {
    const original = [1, 2, 3, 4]
    expect(shuffle(original, () => 0)).toEqual([2, 3, 4, 1])
    expect(original).toEqual([1, 2, 3, 4])
  })
  it('tanda ragu berdampingan dengan jawaban; dapat dihapus secara independen', () => {
    let session = createSession('uji-lokal', pkg, settings, 1000)
    session = transition(session, pkg, { type: 'answer', questionId: 'uji-1', optionId: 'uji-1-o1' }, 2000)
    session = transition(session, pkg, { type: 'flag', questionId: 'uji-1' }, 2000)
    expect(session.answers['uji-1']).toBe('uji-1-o1'); expect(session.flagged).toEqual(['uji-1'])
    session = transition(session, pkg, { type: 'answer', questionId: 'uji-1', optionId: null }, 2000)
    expect(session.answers).toEqual({}); expect(session.flagged).toEqual(['uji-1'])
    session = transition(session, pkg, { type: 'flag', questionId: 'uji-1' }, 2000)
    expect(session.flagged).toEqual([])
  })
  it('nilai menggunakan seluruh soal sebagai penyebut, termasuk soal kosong', () => {
    let session = createSession('uji-lokal', pkg, settings, 1000)
    session = transition(session, pkg, { type: 'answer', questionId: 'uji-1', optionId: 'uji-1-o1' }, 2000)
    session = transition(session, pkg, { type: 'answer', questionId: 'uji-2', optionId: 'uji-2-o0' }, 2000)
    expect(score(session, pkg)).toEqual({ correct: 1, incorrect: 1, unanswered: 2, total: 4, percentage: 25 })
  })
  it('deadline absolut tidak bergeser dan jawaban di/selewat tenggat ditolak', () => {
    let session = createSession('uji-lokal', pkg, settings, 1000)
    session = transition(session, pkg, { type: 'answer', questionId: 'uji-1', optionId: 'uji-1-o1' }, 300999)
    const finished = transition(session, pkg, { type: 'answer', questionId: 'uji-2', optionId: 'uji-2-o1' }, 301000)
    expect(finished.deadline).toBe(301000)
    expect(finished.finishedAt).toBe(301000)
    expect(finished.answers).toEqual({ 'uji-1': 'uji-1-o1' })
    expect(finished.finishReason).toBe('timeout')
    expect(transition(finished, pkg, { type: 'answer', questionId: 'uji-1', optionId: 'uji-1-o0' }, 310000)).toBe(finished)
  })
  it('sesi kedaluwarsa yang dipulihkan otomatis selesai; tanpa timer tidak kedaluwarsa', () => {
    const saved = createSession('uji-lokal', pkg, settings, 1000)
    const restored = JSON.parse(JSON.stringify(saved))
    expect(transition(restored, pkg, { type: 'tick' }, 999999).finishReason).toBe('timeout')
    const untimed = createSession('uji-lokal', pkg, { ...settings, timed: false }, 1000)
    expect(transition(untimed, pkg, { type: 'tick' }, 999999)).toBe(untimed)
  })
  it('menolak versi berubah, urutan rusak, jawaban asing, dan manipulasi deadline', () => {
    const session = createSession('uji-lokal', pkg, settings, 1000)
    expect(compatible({ ...session, contentVersion: 'lama' }, 'uji-lokal', pkg)).toBe(false)
    expect(compatible({ ...session, order: ['uji-1', 'uji-1', 'uji-1', 'uji-1'] }, 'uji-lokal', pkg)).toBe(false)
    expect(compatible({ ...session, answers: { 'uji-1': 'asing' } }, 'uji-lokal', pkg)).toBe(false)
    expect(compatible({ ...session, deadline: 999999 }, 'uji-lokal', pkg)).toBe(false)
    expect(compatible({ ...session, current: 99 }, 'uji-lokal', pkg)).toBe(false)
  })
  it('submit manual membekukan jawaban dan mengabaikan opsi ilegal', () => {
    const session = createSession('uji-lokal', pkg, settings, 1000)
    expect(transition(session, pkg, { type: 'answer', questionId: 'uji-1', optionId: 'asing' }, 2000)).toBe(session)
    const finished = transition(session, pkg, { type: 'finish' }, 2000)
    expect(finished.finishReason).toBe('manual')
    expect(transition(finished, pkg, { type: 'flag', questionId: 'uji-1' }, 3000)).toBe(finished)
  })
  it('validasi durasi dan format sisa waktu', () => {
    expect(() => createSession('uji-lokal', pkg, { ...settings, minutes: 0 })).toThrow()
    expect(formatTime(61000)).toBe('01:01'); expect(formatTime(-100)).toBe('00:00'); expect(formatTime(3600000)).toBe('1:00:00')
  })
})
describe('Penyimpanan', () => {
  it('memulihkan seluruh state dan membedakan data rusak dari storage terblokir', () => {
    const map = new Map<string, string>()
    const storage: StorageLike = { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value) }, removeItem: (key) => { map.delete(key) } }
    const key = sessionKey('uji-lokal', pkg.id)
    const session = createSession('uji-lokal', pkg, settings, 1000)
    expect(readSession(storage, key).kind).toBe('empty')
    expect(writeSession(storage, key, session)).toBe(true)
    expect(readSession(storage, key)).toEqual({ kind: 'ok', session })
    map.set(key, '{rusak'); expect(readSession(storage, key).kind).toBe('invalid')
    const blocked: StorageLike = { ...storage, getItem: () => { throw Error('blocked') }, setItem: () => { throw Error('quota') } }
    expect(readSession(blocked, key).kind).toBe('unavailable')
    expect(writeSession(blocked, key, session)).toBe(false)
  })
})
