import { z } from 'zod'
import { blockSchema, idSchema } from './content.ts'
import type { ExamPackage, LearningModule, Question } from './content'
import type { Session } from './session'

export const complaintInputSchema = z.strictObject({
  submissionId: z.string().regex(/^[a-f0-9-]{36}$/i),
  moduleId: idSchema, packageId: idSchema, contentVersion: z.string().regex(/^[a-f0-9]{64}$/),
  questionId: idSchema, questionNumber: z.number().int().positive(),
  optionOrder: z.array(idSchema).min(2).max(26),
  chosenOptionId: idSchema.nullable(), proposedOptionId: idSchema.nullable(),
  reason: z.string().trim().min(1).max(3000), reference: z.string().trim().max(1000).default(''),
  website: z.literal(''),
  senderName: z.string().trim().max(80).default(''), context: z.enum(['review', 'bank']).default('review'),
})
export type ComplaintInput = z.infer<typeof complaintInputSchema>
export const storedComplaintSchema = z.strictObject({
  id: z.string(), createdAt: z.string(), moduleId: idSchema, moduleTitle: z.string(),
  packageId: idSchema, packageTitle: z.string(), contentVersion: z.string(), questionId: idSchema,
  questionNumber: z.number().int().positive(), blocks: z.array(blockSchema),
  options: z.array(z.object({ id: idSchema, label: z.string(), text: z.string() })),
  correctOptionId: idSchema, chosenOptionId: idSchema.nullable(), proposedOptionId: idSchema.nullable(),
  reason: z.string(), reference: z.string().default(''), senderName: z.string().default(''), context: z.enum(['review', 'bank']).default('review'),
})
export type StoredComplaint = z.infer<typeof storedComplaintSchema>
export const complaintListSchema = z.object({ reports: z.array(storedComplaintSchema), nextCursor: z.string().nullable() })
export const complaintReceiptSchema = z.object({ id: z.string().min(1), accepted: z.literal(true) })

export function complaintInput(module: LearningModule, pkg: ExamPackage, question: Question, session: Session | null, fields: Pick<ComplaintInput, 'submissionId' | 'reason' | 'proposedOptionId'> & Partial<Pick<ComplaintInput, 'reference' | 'senderName'>>): ComplaintInput {
  return complaintInputSchema.parse({ ...fields, moduleId: module.id, packageId: pkg.id, contentVersion: pkg.contentVersion,
    questionId: question.id, questionNumber: (session ? session.order.indexOf(question.id) : pkg.questions.findIndex(q => q.id === question.id)) + 1,
    optionOrder: session?.optionOrder[question.id] ?? question.options.map(o => o.id), chosenOptionId: session?.answers[question.id] ?? null, website: '', context: session ? 'review' : 'bank',
  })
}
