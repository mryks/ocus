import type { Catalog, Question } from '../domain/content'

const make = (id: string, prompt: string, options: string[], correct: number, explanation: string): Question => ({
  id, blocks: [{ type: 'paragraph', text: prompt }], options: options.map((text, i) => ({ id: `${id}-o${i}`, text })),
  correctOptionId: `${id}-o${correct}`, explanation: [{ type: 'paragraph', text: explanation }], references: [],
  verification: 'verified', source: { file: 'fixture-nonmedis', location: 'Pengujian lokal', originalNumber: id, originalKey: String(correct + 1) },
})
const questions = [
  make('uji-1', 'Sebuah perpustakaan memiliki 12 buku. Sebanyak 5 buku sedang dipinjam. Berapa buku yang masih tersedia?', ['5 buku', '7 buku', '12 buku', '17 buku'], 1, 'Jumlah buku yang tersedia adalah 12 − 5 = 7 buku. Soal nonmedis ini hanya digunakan untuk menguji navigasi, penyimpanan, dan penilaian aplikasi.'),
  make('uji-2', 'Urutan bilangan adalah 2, 4, 6, 8. Bilangan berapa yang melanjutkan pola tersebut?', ['9', '10', '11', '12'], 1, 'Setiap bilangan bertambah 2. Bilangan setelah 8 adalah 10.'),
  { ...make('uji-3', 'Berdasarkan tabel berikut, hari apa yang memiliki jumlah pengunjung terbanyak?', ['Senin', 'Selasa', 'Rabu', 'Semua sama'], 1, 'Selasa memiliki 18 pengunjung, lebih banyak daripada Senin (12) dan Rabu (15).'), blocks: [{ type: 'paragraph' as const, text: 'Berdasarkan tabel berikut, hari apa yang memiliki jumlah pengunjung terbanyak?' }, { type: 'table' as const, caption: 'Pengunjung perpustakaan', headers: ['Hari', 'Pengunjung'], rows: [['Senin', '12'], ['Selasa', '18'], ['Rabu', '15']] }] },
  make('uji-4', 'Satu jam sama dengan berapa menit?', ['30 menit', '45 menit', '60 menit', '90 menit'], 2, 'Satu jam terdiri dari 60 menit.'),
]
export const fixtureCatalog: Catalog = {
  schemaVersion: 1,
  modules: [{ id: 'uji-lokal', title: 'Uji lokal · nonmedis', packages: [{
    id: 'paket-uji', title: 'Paket pengujian aplikasi', description: 'Empat soal nonmedis untuk pengujian lokal.',
    contentVersion: 'a'.repeat(64), recommendedMinutes: 5, questions,
    approval: { status: 'approved', approvedBy: 'Fixture pengujian', approvedAt: '2026-11-17T00:00:00Z', decisionReference: 'Hanya development, dihapus dari build produksi' },
  }] }],
}
