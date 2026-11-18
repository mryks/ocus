import { z } from 'zod'

// Parser deterministik tanpa probe new Function, kompatibel dengan CSP dan Workers.
z.config({ jitless: true })

export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,119}$/)
const text = z.string().trim().min(1)
const publicUrl = z.string().url().refine((value) => value.startsWith('https://'), 'URL harus HTTPS')
export const assetPath = z.string().regex(/^\/assets\/content\/[a-z0-9-]+\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|svg|pdf)$/)
export const blockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('paragraph'), text }),
  z.strictObject({ type: z.literal('image'), src: assetPath, alt: text, width: z.number().int().positive(), height: z.number().int().positive(), caption: text.optional() }),
  z.strictObject({ type: z.literal('table'), caption: text, headers: z.array(text).min(1), rows: z.array(z.array(text).min(1)).min(1) }).superRefine((table, ctx) => {
    if (table.rows.some((row) => row.length !== table.headers.length)) ctx.addIssue({ code: 'custom', message: 'Jumlah kolom tabel tidak konsisten' })
  }),
])
export const referenceSchema = z.strictObject({
  id: idSchema, citation: text, url: publicUrl.optional(),
  material: z.strictObject({ title: text, section: text, href: z.union([publicUrl, assetPath]).optional() }).optional(),
})
export const questionSchema = z.strictObject({
  id: idSchema,
  blocks: z.array(blockSchema).min(1),
  options: z.array(z.strictObject({ id: idSchema, text })).min(2).max(26),
  correctOptionId: idSchema,
  explanation: z.array(blockSchema).min(1),
  references: z.array(referenceSchema),
  verification: z.enum(['verified', 'unverified', 'ambiguous', 'blocked']),
  source: z.strictObject({ file: text, location: text, originalNumber: text, originalKey: text }),
}).superRefine((question, ctx) => {
  if (new Set(question.options.map((option) => option.id)).size !== question.options.length) ctx.addIssue({ code: 'custom', message: 'ID opsi duplikat' })
  if (!question.options.some((option) => option.id === question.correctOptionId)) ctx.addIssue({ code: 'custom', message: 'Kunci tidak ditemukan pada opsi' })
  if (new Set(question.references.map((ref) => ref.id)).size !== question.references.length) ctx.addIssue({ code: 'custom', message: 'ID referensi duplikat' })
})
export const packageSchema = z.strictObject({
  id: idSchema, title: text, description: text.optional(),
  contentVersion: z.string().regex(/^[a-f0-9]{64}$/),
  recommendedMinutes: z.number().int().min(1).max(1440).optional(),
  questions: z.array(questionSchema).min(1),
  approval: z.strictObject({
    status: z.enum(['pending', 'approved']),
    approvedBy: text.optional(), approvedAt: z.iso.datetime().optional(), decisionReference: text.optional(),
    sourceKeyDecisions: z.array(z.strictObject({ questionId: idSchema, decisionReference: text })).optional(),
  }),
}).superRefine((pkg, ctx) => {
  if (new Set(pkg.questions.map((question) => question.id)).size !== pkg.questions.length) ctx.addIssue({ code: 'custom', message: 'ID soal duplikat' })
  const signatures = pkg.questions.map((q) => canonicalJson({ blocks: q.blocks, options: q.options.map(o => o.text.normalize('NFKC').toLowerCase()).sort() }).normalize('NFKC').toLowerCase())
  if (new Set(signatures).size !== signatures.length) ctx.addIssue({ code: 'custom', message: 'Terdapat pertanyaan dengan isi duplikat; perlu pemeriksaan' })
  if (pkg.approval.status === 'approved') {
    if (!pkg.approval.approvedBy || !pkg.approval.approvedAt || !pkg.approval.decisionReference) ctx.addIssue({ code: 'custom', message: 'Bukti persetujuan belum lengkap' })
    const decisions = pkg.approval.sourceKeyDecisions ?? []
    if (new Set(decisions.map(d => d.questionId)).size !== decisions.length || decisions.some(d => !pkg.questions.some(q => q.id === d.questionId && q.verification === 'ambiguous'))) ctx.addIssue({ code: 'custom', message: 'Keputusan kunci sumber tidak cocok dengan soal ambigu' })
    if (pkg.questions.some(q => q.verification !== 'verified' && !(q.verification === 'ambiguous' && decisions.some(d => d.questionId === q.id)))) ctx.addIssue({ code: 'custom', message: 'Paket disetujui masih mengandung soal belum terverifikasi/bermasalah tanpa keputusan pengguna' })
  }
})
export const moduleSchema = z.strictObject({ id: idSchema, title: text, packages: z.array(packageSchema).length(1) })
export const catalogSchema = z.strictObject({ schemaVersion: z.literal(1), modules: z.array(moduleSchema) }).superRefine((catalog, ctx) => {
  if (new Set(catalog.modules.map((module) => module.id)).size !== catalog.modules.length) ctx.addIssue({ code: 'custom', message: 'ID modul duplikat' })
  for (const module of catalog.modules) {
    if (new Set(module.packages.map((pkg) => pkg.id)).size !== module.packages.length) ctx.addIssue({ code: 'custom', message: `ID paket duplikat pada ${module.title}` })
    if (module.packages.some((pkg) => pkg.approval.status !== 'approved')) ctx.addIssue({ code: 'custom', message: 'Katalog publik hanya boleh berisi paket disetujui' })
  }
})
export type Block = z.infer<typeof blockSchema>
export type Question = z.infer<typeof questionSchema>
export type ExamPackage = z.infer<typeof packageSchema>
export type LearningModule = z.infer<typeof moduleSchema>
export type Catalog = z.infer<typeof catalogSchema>

/** Bentuk deterministik untuk mengikat versi dan persetujuan pada isi, termasuk judul modul. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>
    return `{${Object.keys(object).filter((key) => object[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
export function versionPayload(module: Pick<LearningModule, 'id' | 'title'>, pkg: ExamPackage) {
  const content = { id: pkg.id, title: pkg.title, description: pkg.description, recommendedMinutes: pkg.recommendedMinutes, questions: pkg.questions }
  return canonicalJson({ moduleId: module.id, moduleTitle: module.title, package: content })
}
