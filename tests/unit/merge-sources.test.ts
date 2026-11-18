import { describe, expect, it } from 'vitest'
import { mergeExact, parseCandidates, similarCandidates, type ReviewedContinuation } from '../../scripts/merge-sources'

describe('Penggabungan sumber tanpa mengarang soal/kunci', () => {
  const correction: ReviewedContinuation = { file: 'a.pdf', sourceHash: 'hash', section: 'Bagian awal (tanpa judul eksplisit)', originalNumber: '13', fragmentNumber: '14', page: 3, text: 'e. Pilihan kelima', reason: 'Diperiksa pada halaman sumber.' }
  const split = [{ page: 3, text: '13. Pertanyaan lengkap\na. Satu\nb. Dua\nc. Tiga\nd. Empat\n14. e. Pilihan kelima\n15. Pertanyaan berikutnya\na. Ya\nb. Tidak' }]
  it('memulihkan hanya lanjutan bernomor yang ditinjau, mempertahankan teks asli dan deduplikasi', () => {
    const ordinary = parseCandidates('a.pdf', 'hash', split)
    expect(ordinary.candidates[0].options).toHaveLength(4)
    expect(ordinary.fragments).toHaveLength(1)
    const repaired = parseCandidates('a.pdf', 'hash', split, [correction])
    const intact = parseCandidates('b.pdf', 'other', [{ page: 1, text: '7. Pertanyaan lengkap\na. Satu\nb. Dua\nc. Tiga\nd. Empat\ne. Pilihan kelima' }])
    expect(repaired.candidates[0].options).toHaveLength(5)
    expect(repaired.candidates[0].sources[0].rawText).toContain('14. e. Pilihan kelima')
    expect(repaired.candidates[0].sources[0].normalizationNotes).toHaveLength(1)
    expect(mergeExact([...repaired.candidates, ...intact.candidates])).toHaveLength(2)
    expect(repaired.candidates[1].stem).toBe('Pertanyaan berikutnya')
  })
  it('menolak koreksi yang basi atau salah alih-alih menempel opsi ke soal lain', () => {
    for (const changed of [{ sourceHash: 'changed' }, { text: 'e. Berubah' }, { page: 4 }, { originalNumber: '12' }, { text: 'f. Pilihan kelima' }]) {
      expect(() => parseCandidates('a.pdf', 'hash', split, [{ ...correction, ...changed }])).toThrow()
    }
    expect(() => parseCandidates('a.pdf', 'hash', split, [correction, correction])).toThrow()
  })
  it('menghapus duplikat persis setelah normalisasi whitespace, menyimpan semua provenance', () => {
    const a = parseCandidates('a.pdf', 'hash-a', [{ page: 1, text: '1. Berapa 2 + 2?\n a. 4\n b. 5' }])
    const b = parseCandidates('b.pdf', 'hash-b', [{ page: 3, text: '25. Berapa   2 + 2?\n   a. 4\n b. 5' }])
    const merged = mergeExact([...a.candidates, ...b.candidates])
    expect(merged).toHaveLength(1)
    expect(merged[0].sources.map((source) => source.originalNumber)).toEqual(['1', '25'])
    expect(merged[0].sources.map((source) => source.pages)).toEqual([[1], [3]])
    expect(merged[0].correctOptionId).toBeNull()
  })
  it('stem sama dengan opsi berbeda atau catatan berbeda tetap terpisah', () => {
    const a = parseCandidates('a.pdf', 'hash-a', [{ page: 1, text: '1. Berapa 2 + 2?\n a. 4\n b. 5' }])
    const b = parseCandidates('b.pdf', 'hash-b', [{ page: 1, text: '1. Berapa 2 + 2?\n a. 4 (catatan sumber)\n b. 6' }])
    const merged = mergeExact([...a.candidates, ...b.candidates])
    expect(merged).toHaveLength(2)
    expect(similarCandidates(merged)).toHaveLength(1)
  })
  it('nomor kosong/placeholder/fragmen opsi tidak direkonstruksi menjadi soal', () => {
    const parsed = parseCandidates('a.pdf', 'hash', [{ page: 1, text: '1.\n2. x\n3. e. opsi terpisah\n4. Pertanyaan tanpa opsi' }])
    expect(parsed.fragments).toHaveLength(3)
    expect(parsed.candidates).toHaveLength(1)
    expect(parsed.candidates[0].issues).toContain('Opsi kurang dari dua/tidak tersedia; mungkin catatan, bukan soal lengkap')
  })
  it('reset nomor dan bagian baru tidak menimpa kandidat; halaman lintas soal disimpan', () => {
    const parsed = parseCandidates('a.pdf', 'hash', [{ page: 1, text: '1. Pertanyaan A\n a. A\n b. B' }, { page: 2, text: ' c. C\nUTM 6517 (angk 2019)\n1. Pertanyaan B\n a. D\n b. E' }])
    expect(parsed.candidates).toHaveLength(2)
    expect(parsed.candidates[0].sources[0].pages).toEqual([1, 2])
    expect(parsed.candidates[1].sources[0].section).toBe('UTM 6517 (angk 2019)')
    expect(parsed.candidates[0].rawText).not.toContain('UTM 6517')
  })
})
