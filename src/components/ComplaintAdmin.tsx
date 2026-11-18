import { useEffect, useRef, useState } from 'react'
import { complaintListSchema, type StoredComplaint } from '../domain/complaints'
import { apiUrl } from '../config'
import { Blocks } from './Blocks'

export function ComplaintAdmin() {
  const [token, setToken] = useState('')
  const [reports, setReports] = useState<StoredComplaint[]>([])
  const [authorized, setAuthorized] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const requestId = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (authorized) heading.current?.focus() }, [authorized])
  const load = async (before: string | null = null) => {
    if (!token.trim() || pending) { if (!token.trim()) setError('Enter your administrator access key.'); return }
    const currentRequest = ++requestId.current
    setPending(true); setError('')
    try {
      const response = await fetch(apiUrl(`/api/admin/complaints${before ? `?before=${encodeURIComponent(before)}` : ''}`), { credentials: 'omit', headers: { Authorization: `Bearer ${token.trim()}` }, cache: 'no-store' })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw Error(typeof body?.error === 'string' ? body.error : 'Reports could not load.')
      const parsed = complaintListSchema.safeParse(body)
      if (!parsed.success) throw Error('The report data could not be read. Please try again later.')
      const data = parsed.data
      if (currentRequest !== requestId.current) return
      setAuthorized(true); setReports(previous => before ? [...previous, ...data.reports.filter(report => !previous.some(p => p.id === report.id))] : data.reports); setCursor(data.nextCursor)
    } catch (error) {
      if (currentRequest === requestId.current) setError(error instanceof Error && !(error instanceof TypeError) && error.message.length < 200 ? error.message : 'Reports could not load. Please try again.')
    } finally { if (currentRequest === requestId.current) setPending(false) }
  }
  const logout = () => { requestId.current++; setToken(''); setAuthorized(false); setReports([]); setCursor(null); setError(''); setPending(false) }
  const answer = (report: StoredComplaint, id: string | null) => {
    const option = report.options.find(o => o.id === id)
    return option ? `${option.label}. ${option.text}` : 'None'
  }
  return <main className="container admin-page"><div className="page-heading"><p className="eyebrow">Administrator</p><h1 ref={heading} id="content" tabIndex={-1}>Question reports</h1></div>
    {!authorized ? <form className="admin-login settings-panel" action={apiUrl('/api/admin/complaints')} method="post" noValidate onSubmit={event => { event.preventDefault(); void load() }}><h2>Administrator access</h2><p>Enter your access key to view student reports.</p><div className="form-field"><label htmlFor="admin-token">Administrator access key</label><input id="admin-token" type="password" name="admin-token" autoComplete="current-password" required value={token} onChange={event => { setToken(event.target.value); setError('') }}/></div>{error && <p role="alert" className="field-error">{error}</p>}<button type="submit" className="button primary" disabled={pending}>{pending ? 'Checking access…' : 'Open reports'}</button></form> : <>
      <div className="admin-toolbar"><p>{reports.length} reports shown</p><div><button className="button secondary" type="button" disabled={pending} onClick={() => void load()}>Refresh</button><button className="text-link" type="button" onClick={logout}>Sign out</button></div></div>
      {error && <p role="alert" className="field-error">{error}</p>}
      {reports.length === 0 ? <div className="empty-state"><h2>No reports yet</h2></div> : <div className="report-list">{reports.map(report => <article className="report-card" key={report.id}><div className="report-heading"><h2>{report.moduleTitle}{report.packageTitle !== report.moduleTitle ? ' / ' + report.packageTitle : ''}</h2><span className="small muted">Question {report.questionNumber}</span></div><Blocks blocks={report.blocks}/><dl className="report-answers"><div><dt>Answer at time of report</dt><dd>{answer(report, report.correctOptionId)}</dd></div><div><dt>Student answer</dt><dd>{answer(report, report.chosenOptionId)}</dd></div><div><dt>Suggested answer</dt><dd>{answer(report, report.proposedOptionId)}</dd></div></dl><h3>Reason</h3><p className="report-prose">{report.reason}</p><p className="small muted">{report.senderName || 'Anonymous'} · {report.context === 'bank' ? 'Before practice' : 'Answer review'}</p><details className="report-details"><summary>Report details</summary><dl><div><dt>Report ID</dt><dd>{report.id}</dd></div><div><dt>Received (UTC)</dt><dd>{report.createdAt}</dd></div><div><dt>Question ID</dt><dd>{report.questionId}</dd></div><div><dt>Content version</dt><dd>{report.contentVersion}</dd></div></dl></details></article>)}</div>}
      {cursor && <button type="button" className="button secondary" disabled={pending} onClick={() => void load(cursor)}>{pending ? 'Loading…' : 'Older reports'}</button>}
    </>}
  </main>
}
