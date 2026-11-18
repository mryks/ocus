import { describe, expect, it } from 'vitest'
import { validateUserSelection, type ReviewDecision } from '../../scripts/apply-user-review'

const source = { file: 'soal.pdf', section: 'Bagian awal', originalNumber: '1', pages: [1] }
const candidate = { id: 'candidate-a', signature: 'version-a', stem: 'Pertanyaan', options: [{ label: 'A', text: 'Satu' }, { label: 'B', text: 'Dua' }], sources: [source] }
const held = { candidateId: candidate.id, status: 'needs-context', reason: 'Konteks singkat', sourceMarkedLabels: ['B'], sourceKeyEvidence: [] }
const keep: ReviewDecision = { reviewCode: 'R01', candidateId: candidate.id, signature: candidate.signature, action: 'keep', instruction: 'ikuti kunci sumber', key: 'B', scientificStatus: 'ambiguous', explanation: ['Kunci sumber dipertahankan.'], references: ['source'] }

describe('Keputusan pengguna tidak menimpa bukti atau identitas soal', () => {
  it('menerima kunci sumber tanpa mengharuskan klaim ilmiah verified', () => {
    expect(() => validateUserSelection([keep], [candidate], [held])).not.toThrow()
    expect(held.status).toBe('needs-context')
    expect(keep.scientificStatus).toBe('ambiguous')
    expect(() => validateUserSelection([{ ...keep, key: 'A' }], [candidate], [held])).toThrow('mengikuti sumber')
  })
  it('menolak kode, versi, keputusan hilang dan keputusan ganda', () => {
    for (const patch of [{ reviewCode: 'R02' }, { signature: 'old' }, { candidateId: 'wrong' }]) {
      expect(() => validateUserSelection([{ ...keep, ...patch }], [candidate], [held])).toThrow('tidak cocok')
    }
    expect(() => validateUserSelection([], [candidate], [held])).toThrow('tepat satu')
    expect(() => validateUserSelection([keep, keep], [candidate], [held])).toThrow('tepat satu')
  })
  it('soal skip tidak dapat ikut membawa kunci atau perubahan aktif', () => {
    const skip: ReviewDecision = { reviewCode: 'R01', candidateId: candidate.id, signature: candidate.signature, action: 'skip', instruction: 'skip' }
    expect(() => validateUserSelection([skip], [candidate], [held])).not.toThrow()
    expect(() => validateUserSelection([{ ...skip, key: 'B' }], [candidate], [held])).toThrow('perubahan aktif')
  })
  it('opsi tambahan hanya untuk sumber tanpa opsi dan jawaban pengguna harus jelas', () => {
    const empty = { ...candidate, options: [] }, unknown = { ...held, sourceMarkedLabels: [] }
    const synthetic: ReviewDecision = { ...keep, options: [{ label: 'A', text: 'Pengecoh', origin: 'generated-distractor' }, { label: 'B', text: 'Jawaban sumber', origin: 'user-confirmed-answer' }] }
    expect(() => validateUserSelection([synthetic], [empty], [unknown])).not.toThrow()
    expect(() => validateUserSelection([synthetic], [candidate], [held])).toThrow('Asal opsi')
    expect(() => validateUserSelection([{ ...synthetic, key: 'A' }], [empty], [unknown])).toThrow('Asal opsi')
  })
})
