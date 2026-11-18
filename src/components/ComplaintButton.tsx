import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, MessageSquare, Search } from 'lucide-react'
import type { ExamPackage, LearningModule, Question } from '../domain/content'
import type { Session } from '../domain/session'
import { complaintInput, complaintReceiptSchema } from '../domain/complaints'
import { apiUrl } from '../config'
import { Blocks } from './Blocks'
import { Modal } from './Modal'

type Draft = { submissionId: string; reason: string; senderName: string; proposedOptionId: string; pending: boolean; receipt: string; error: string; reasonError: boolean }
const blank = (): Draft => ({ submissionId: crypto.randomUUID(), reason: '', senderName: '', proposedOptionId: '', pending: false, receipt: '', error: '', reasonError: false })
export function ComplaintButton({ module, pkg, question, session, endpoint }: { module: LearningModule; pkg: ExamPackage; question?: Question; session?: Session; endpoint?: string }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(12)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const active = question ?? pkg.questions.find(q => q.id === selectedId)
  const reasonRef = useRef<HTMLTextAreaElement>(null), searchRef = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLHeadingElement>(null)
  const draft = active ? drafts[active.id] : undefined
  const target = endpoint ?? apiUrl('/api/complaints')
  useEffect(() => {
    if (open) { if (!active) searchRef.current?.focus(); else if (draft?.receipt) receiptRef.current?.focus(); else reasonRef.current?.focus() }
  }, [open, active, draft?.receipt])
  const change = (patch: Partial<Draft>) => {
    if (!active) return
    setDrafts(previous => ({ ...previous, [active.id]: { ...(previous[active.id] ?? blank()), ...patch } }))
  }
  const order = active ? session?.optionOrder[active.id] ?? active.options.map(o => o.id) : []
  const optionText = (id: string) => String.fromCharCode(65 + order.indexOf(id)) + '. ' + (active?.options.find(o => o.id === id)?.text ?? '')
  const send = async () => {
    if (!active || !draft || draft.pending || draft.receipt) return
    if (!draft.reason.trim()) { change({ reasonError: true, error: '' }); reasonRef.current?.focus(); return }
    const questionId = active.id
    change({ pending: true, error: '', reasonError: false })
    try {
      const input = complaintInput(module, pkg, active, session ?? null, { submissionId: draft.submissionId, reason: draft.reason, senderName: draft.senderName, proposedOptionId: draft.proposedOptionId || null })
      const response = await fetch(target, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw Error(typeof result?.error === 'string' ? result.error : 'Your report could not be sent. Please try again.')
      const receipt = complaintReceiptSchema.safeParse(result)
      if (!receipt.success) throw Error('Receipt could not be confirmed. Please try sending again.')
      setDrafts(previous => ({ ...previous, [questionId]: { ...previous[questionId], pending: false, receipt: receipt.data.id } }))
    } catch (error) {
      setDrafts(previous => ({ ...previous, [questionId]: { ...previous[questionId], pending: false, error: error instanceof Error && !(error instanceof TypeError) && error.message.length < 200 ? error.message : 'Your report could not be sent. Check your connection and try again.' } }))
    }
  }
  const search = query.trim().toLocaleLowerCase('id-ID')
  const matches = pkg.questions.filter((q, index) => !search || String(index + 1) === search || q.blocks.some(b => b.type === 'paragraph' && b.text.toLocaleLowerCase('id-ID').includes(search)))
  const choose = (q: Question) => { setSelectedId(q.id); setDrafts(previous => previous[q.id] ? previous : { ...previous, [q.id]: blank() }) }
  const show = () => {
    if (active && !draft) setDrafts(previous => ({ ...previous, [active.id]: blank() }))
    setOpen(true)
  }
  return <div className="complaint-entry">
    <button className="text-link" type="button" aria-haspopup="dialog" onClick={show}><MessageSquare size={16} aria-hidden="true"/> Report an answer</button>
    <Modal open={open} title={active ? 'Report an answer' : 'Choose a question'} onClose={() => setOpen(false)} className="complaint-modal">
      {!active ? <div className="question-picker">
        <p>Search this bank to report a question without starting a practice.</p>
        <search><label htmlFor="report-search">Find a question</label><div className="search-field"><Search size={18} aria-hidden="true"/><input ref={searchRef} id="report-search" name="query" type="search" autoComplete="off" autoCapitalize="none" spellCheck={false} value={query} onChange={event => { setQuery(event.target.value); setVisibleCount(12) }} placeholder="Question number or a few words"/></div></search>
        <p className="small muted" role="status">{matches.length} {matches.length === 1 ? 'question found' : 'questions found'}</p>
        <div className="question-picker-list">{matches.slice(0, visibleCount).map(q => <button className="question-picker-item" type="button" key={q.id} onClick={() => choose(q)}><span>Question {pkg.questions.findIndex(item => item.id === q.id) + 1}</span><span lang="id">{q.blocks.filter(b => b.type === 'paragraph').map(b => b.text).join(' ')}</span></button>)}</div>
        {matches.length > visibleCount && <button className="button secondary full" type="button" onClick={() => setVisibleCount(n => n + 12)}>Show more questions</button>}
        {!matches.length && <p>No matching questions. Try a different word or question number.</p>}
      </div> : draft && (draft.receipt ? <div className="complaint-receipt"><CheckCircle2 size={26} aria-hidden="true"/><h3 ref={receiptRef} tabIndex={-1}>Report received</h3><p>Report number</p><p className="report-id">{draft.receipt}</p><p>Your report has been saved for review.</p><div className="modal-actions"><button type="button" className="button primary" onClick={() => setOpen(false)}>Close</button></div></div> : <>
        {!question && <button type="button" className="text-link" onClick={() => setSelectedId('')}><ArrowLeft size={15} aria-hidden="true"/> Choose another question</button>}
        <div className="complaint-context"><p className="small muted">{module.title} · Question {(session ? session.order.indexOf(active.id) : pkg.questions.findIndex(q => q.id === active.id)) + 1}</p><Blocks blocks={active.blocks}/><p className="small"><strong>Current answer:</strong> <span lang="id">{optionText(active.correctOptionId)}</span></p></div>
        <form action={target} method="post" noValidate onSubmit={event => { event.preventDefault(); void send() }}>
          <fieldset className="complaint-fields" disabled={draft.pending}><legend className="visually-hidden">Answer report</legend>
            <div className="form-field"><label htmlFor="complaint-reason">Reason (required)</label><span id="complaint-reason-hint" className="field-hint">Explain what needs to be checked. Up to 3,000 characters.</span><textarea ref={reasonRef} id="complaint-reason" name="reason" rows={4} required maxLength={3000} value={draft.reason} aria-invalid={draft.reasonError} aria-describedby={'complaint-reason-hint' + (draft.reasonError ? ' complaint-reason-error' : '')} onChange={event => change({ reason: event.target.value, submissionId: crypto.randomUUID(), reasonError: false, error: '' })}/>{draft.reasonError && <p className="field-error" id="complaint-reason-error">Please explain your reason before sending.</p>}</div>
            <div className="form-field"><label htmlFor="complaint-option">Suggested answer (optional)</label><select id="complaint-option" name="proposedOptionId" value={draft.proposedOptionId} onChange={event => change({ proposedOptionId: event.target.value, submissionId: crypto.randomUUID(), error: '' })}><option value="">Not selected</option>{order.map(id => <option key={id} value={id} lang="id">{optionText(id)}</option>)}</select></div>
            <div className="form-field"><label htmlFor="complaint-name">Name or initials (optional)</label><input id="complaint-name" name="senderName" type="text" autoComplete="name" maxLength={80} value={draft.senderName} onChange={event => change({ senderName: event.target.value, submissionId: crypto.randomUUID(), error: '' })}/></div>
          </fieldset>
          <p className="small muted">Question details are included automatically.</p>
          {draft.error && <p className="field-error" role="alert">{draft.error}</p>}
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Close</button><button type="submit" className="button primary" disabled={draft.pending}>{draft.pending ? 'Sending…' : 'Send report'}</button></div>
        </form>
      </>)}
    </Modal>
  </div>
}
