import { z } from 'zod'
import { idSchema, type ExamPackage } from './content'

export const settingsSchema = z.strictObject({ timed: z.boolean(), minutes: z.number().int().min(1).max(1440), shuffleQuestions: z.boolean(), shuffleOptions: z.boolean(), questionCount: z.number().int().positive().optional() })
export type Settings = z.infer<typeof settingsSchema>
export const sessionSchema = z.strictObject({
  schemaVersion: z.literal(1), id: z.string().min(1), moduleId: idSchema, packageId: idSchema,
  contentVersion: z.string(), startedAt: z.number().finite().nonnegative(), deadline: z.number().finite().nonnegative().nullable(),
  settings: settingsSchema, order: z.array(idSchema).min(1), optionOrder: z.record(idSchema, z.array(idSchema).min(2)),
  answers: z.record(idSchema, idSchema), flagged: z.array(idSchema), current: z.number().int().nonnegative(),
  status: z.enum(['active', 'finished']), finishedAt: z.number().finite().nonnegative().nullable(),
  finishReason: z.enum(['manual', 'timeout']).nullable(), revision: z.number().int().nonnegative(),
})
export type Session = z.infer<typeof sessionSchema>
export type Action = { type: 'answer'; questionId: string; optionId: string | null } | { type: 'flag'; questionId: string } | { type: 'navigate'; index: number } | { type: 'finish' } | { type: 'tick' }

export function shuffle<T>(items: readonly T[], random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
  return result
}
export function createSession(moduleId: string, pkg: ExamPackage, settingsInput: Settings, now = Date.now()): Session {
  const parsed = settingsSchema.parse(settingsInput)
  const questionCount = parsed.questionCount ?? pkg.questions.length
  if (questionCount > pkg.questions.length) throw Error('Question count exceeds the available bank.')
  const settings = { ...parsed, questionCount, shuffleQuestions: true, shuffleOptions: true }
  const ids = pkg.questions.map((q) => q.id)
  const order = shuffle(ids).slice(0, questionCount)
  return {
    schemaVersion: 1, id: crypto.randomUUID(), moduleId, packageId: pkg.id, contentVersion: pkg.contentVersion,
    startedAt: now, deadline: settings.timed ? now + settings.minutes * 60000 : null, settings,
    order,
    optionOrder: Object.fromEntries(order.map(id => { const q = pkg.questions.find(q => q.id === id)!; return [id, shuffle(q.options.map(o => o.id))] })),
    answers: {}, flagged: [], current: 0, status: 'active', finishedAt: null, finishReason: null, revision: 0,
  }
}
const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && a.every((id) => b.includes(id))
export function compatible(session: Session, moduleId: string, pkg: ExamPackage): boolean {
  const ids = pkg.questions.map((q) => q.id)
  const selected = session.order
  const count = session.settings.questionCount ?? ids.length
  return session.moduleId === moduleId && session.packageId === pkg.id && session.contentVersion === pkg.contentVersion
    && count > 0 && count <= ids.length && selected.length === count && new Set(selected).size === count && selected.every(id => ids.includes(id))
    && session.current < count && sameSet(Object.keys(session.optionOrder), selected)
    && selected.every(id => sameSet(session.optionOrder[id] ?? [], pkg.questions.find(q => q.id === id)!.options.map(o => o.id)))
    && Object.entries(session.answers).every(([id, option]) => selected.includes(id) && pkg.questions.some((q) => q.id === id && q.options.some((o) => o.id === option)))
    && new Set(session.flagged).size === session.flagged.length && session.flagged.every((id) => selected.includes(id))
    && (session.settings.timed ? session.deadline === session.startedAt + session.settings.minutes * 60000 : session.deadline === null)
    && (session.status === 'active' ? session.finishedAt === null && session.finishReason === null : session.finishedAt !== null && session.finishedAt >= session.startedAt && session.finishReason !== null)
}
export function transition(session: Session, pkg: ExamPackage, action: Action, now = Date.now()): Session {
  if (session.status === 'finished') return session
  const timedOut = session.deadline !== null && now >= session.deadline
  if (timedOut || action.type === 'finish') return { ...session, status: 'finished', finishedAt: timedOut ? session.deadline : now, finishReason: timedOut ? 'timeout' : 'manual', revision: session.revision + 1 }
  if (action.type === 'tick') return session
  const next = { ...session, revision: session.revision + 1 }
  if (action.type === 'navigate') return { ...next, current: Math.max(0, Math.min(session.order.length - 1, action.index)) }
  const question = session.order.includes(action.questionId) ? pkg.questions.find((q) => q.id === action.questionId) : undefined
  if (!question) return session
  if (action.type === 'flag') return { ...next, flagged: session.flagged.includes(question.id) ? session.flagged.filter((id) => id !== question.id) : [...session.flagged, question.id] }
  if (action.optionId !== null && !question.options.some((o) => o.id === action.optionId)) return session
  const answers = { ...session.answers }
  if (action.optionId === null) delete answers[question.id]
  else answers[question.id] = action.optionId
  return { ...next, answers }
}
export function score(session: Session, pkg: ExamPackage) {
  let correct = 0; let incorrect = 0; let unanswered = 0
  for (const id of session.order) {
    const q = pkg.questions.find(q => q.id === id)
    if (!q) throw Error('Session contains an unavailable question.')
    if (!session.answers[q.id]) unanswered++
    else if (session.answers[q.id] === q.correctOptionId) correct++
    else incorrect++
  }
  return { correct, incorrect, unanswered, total: session.order.length, percentage: correct / session.order.length * 100 }
}
export function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  return `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}:` : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
