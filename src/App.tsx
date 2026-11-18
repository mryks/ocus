import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, Flag, Grid2X2, Info, RotateCcw, ShieldCheck, X } from 'lucide-react'
import type { Catalog, ExamPackage, LearningModule } from './domain/content'
import { formatTime, score, type Session, type Settings } from './domain/session'
import { useSession } from './hooks/useSession'
import { Blocks } from './components/Blocks'
import { Modal } from './components/Modal'
import { ComplaintButton } from './components/ComplaintButton'
import { ComplaintAdmin } from './components/ComplaintAdmin'
import { publicAsset } from './config'

const packagePath = (moduleId: string, ..._ignored: string[]) => { void _ignored; return '/module/' + moduleId }
type PreviewOptions = { basePath: string; label: string; reportEndpoint: string; storageNamespace: string }
function PageTitle({ title }: { title: string }) {
  useEffect(() => { document.title = `${title} | OCUS.` }, [title])
  return null
}
function Shell({ children, isDev, preview }: { children: ReactNode; isDev: boolean; preview?: PreviewOptions }) {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    window.scrollTo(0, 0)
    document.getElementById('content')?.focus({ preventScroll: true })
  }, [pathname])
  return <div className="app-shell">
    <a className="skip-link" href="#content" onClick={event => { event.preventDefault(); const content = document.getElementById("content"); content?.focus(); content?.scrollIntoView({ block: "start" }) }}>Skip to content</a>
    {(isDev || preview) && <div className="dev-banner">{preview?.label ?? 'Local test mode · non-medical questions · excluded from production'}</div>}
    <header className="site-header"><div className="container header-inner">
      <Link to="/" className="brand" aria-label="OCUS., home"><img src={publicAsset("/ocus.svg")} width="510" height="180" alt="OCUS."/></Link>
      <nav aria-label="Main"><NavLink to="/" end>Modules</NavLink><NavLink to="/guide">Guide</NavLink></nav>
    </div></header>
    {children}
    <footer className="site-footer container"><Link to="/privacy">Storage & privacy</Link></footer>
  </div>
}

function Home({ catalog }: { catalog: Catalog }) {
  return <main className="container home-main"><PageTitle title="Modules"/>
    <div className="catalog-heading"><h1 id="content" tabIndex={-1}>Modules</h1><span className="catalog-count">{catalog.modules.length} {catalog.modules.length === 1 ? 'module' : 'modules'}</span></div>
    {catalog.modules.length === 0 ? <div className="empty-state"><span className="empty-state-symbol"><BookOpen size={26} aria-hidden="true"/></span><h2>No practice banks yet</h2></div> :
      <div className="module-list">{catalog.modules.map(module => {
        const pkg = module.packages[0]
        return <section className="module-item" key={module.id}>
          <div className="module-title"><div className="module-name"><BookOpen size={22} aria-hidden="true"/><h2>{module.title}</h2></div><span className="module-count">{pkg.questions.length} questions</span></div>
          <div className="package-row"><div><span className="module-kicker">Question bank</span><p>Choose your question count and timer before you start.</p></div><Link className="button primary" to={packagePath(module.id, pkg.id)}>Practice <ArrowRight size={17} aria-hidden="true"/></Link></div>
        </section>
      })}</div>}
  </main>
}

function InfoPage({ privacy = false }: { privacy?: boolean }) {
  return <main className="container narrow document-page" lang="id"><PageTitle title={privacy ? 'Storage & privacy' : 'Guide'}/>
    <Link to="/" className="back-link" lang="en"><ArrowLeft size={16} aria-hidden="true"/> Modules</Link><h1 id="content" tabIndex={-1} lang="en">{privacy ? 'Storage & privacy' : 'Guide'}</h1>
    {privacy ? <>
      <section><h2>Progres tersimpan di perangkat Anda</h2><p>Jawaban, urutan soal, tanda untuk ditinjau, pengaturan timer, dan hasil latihan terakhir disimpan di browser yang Anda gunakan. Progres dan nilai latihan tidak dikirim ke server.</p><p>Progres terikat pada alamat website dan browser yang digunakan. Data dari alamat OCUS yang lama tidak otomatis berpindah ke alamat baru atau ke perangkat lain. Data juga dapat hilang saat Anda menghapus data situs atau menggunakan mode privat. Jika browser tidak dapat menyimpan progres, pemberitahuan akan muncul selama latihan.</p></section>
      <section><h2>Data dalam laporan soal</h2><p>Saat Anda mengirim laporan, server menyimpan alasan laporan, soal dan pilihan jawabannya, jawaban yang Anda usulkan, serta waktu pengiriman. Jika laporan dibuat dari pembahasan, pilihan jawaban Anda pada soal tersebut juga disertakan.</p><p>Nama atau inisial boleh diisi jika Anda menginginkannya. Anda tidak perlu mencantumkan nomor mahasiswa, alamat email, atau informasi pribadi lainnya. Laporan hanya dapat dibaca pengelola dengan kunci akses. Laporan tidak langsung mengubah kunci jawaban atau nilai latihan.</p></section>
      <section><h2>Koneksi dan penyimpanan laporan</h2><p>Website disajikan melalui GitHub Pages. Laporan soal dikirim ke layanan penyimpanan online yang terpisah agar tetap bisa diterima langsung dari halaman ini. Penyedia hosting dapat mencatat informasi koneksi untuk operasional dan keamanan layanannya.</p><p>Database laporan tidak menyimpan alamat IP mentah. Penanda satu arah digunakan untuk membatasi pengiriman berulang. Aplikasi tidak memasang pelacak analitik.</p></section>
      <section><h2>Mengganti atau menghapus progres</h2><p>Pilih Start again pada modul untuk mengganti latihan beserta hasil sebelumnya. Untuk menghapus progres yang tersimpan, gunakan pengaturan browser dan hapus data situs OCUS. Menghapus data browser tidak menghapus laporan yang sudah dikirim ke pengelola.</p></section>
    </> : <>
      <section><h2>Siapkan latihan</h2><p>Buka modul, lalu tentukan jumlah soal yang ingin Anda kerjakan. Soal dipilih secara acak tanpa pengulangan dalam satu sesi. Urutan pilihan jawabannya juga selalu diacak.</p><p>Aktifkan timer jika ingin berlatih dengan batas waktu. Jika timer dimatikan, Anda dapat mengerjakan soal sesuai waktu yang tersedia.</p></section>
      <section><h2>Kerjakan dan simpan progres</h2><p>Pilih satu jawaban yang paling tepat. Gunakan Previous, Next, atau tombol Questions untuk berpindah soal. Flag for review dapat dipakai untuk menandai soal yang ingin Anda periksa kembali.</p><p>Progres tersimpan otomatis pada browser yang sama. Pilih Resume practice untuk melanjutkan. Jika memakai timer, waktu tetap berjalan saat tab ditutup; ketika batas waktu habis, jawaban terakhir otomatis dikumpulkan.</p></section>
      <section><h2>Lihat hasil dan pembahasan</h2><p>Anda boleh mengumpulkan latihan walaupun masih ada soal kosong. Nilai dihitung dari jumlah jawaban benar dibagi jumlah soal dalam sesi, lalu dikalikan 100%. Tidak ada pengurangan nilai untuk jawaban salah.</p><p>Setelah selesai, pilih Review answers untuk melihat jawaban Anda, jawaban yang dinilai benar, dan penjelasan singkat setiap soal. Start again akan mengganti sesi beserta hasil latihan sebelumnya.</p></section>
      <section><h2>Laporkan soal yang perlu diperiksa</h2><p>Gunakan Report an answer pada halaman persiapan atau pembahasan. Dari halaman persiapan, cari dan pilih soalnya terlebih dahulu; Anda tidak perlu mengerjakan ulang latihan untuk mengirim laporan.</p><p>Tuliskan bagian yang menurut Anda perlu diperiksa dan, bila sudah ada, usulkan jawabannya. Nama atau inisial bersifat opsional. Mengirim laporan tidak langsung mengubah kunci maupun nilai.</p></section>
    </>}
  </main>
}
function NotFound({ message = 'The page you requested is unavailable.' }: { message?: string }) {
  return <main className="container narrow document-page"><PageTitle title="Page unavailable"/><h1 id="content" tabIndex={-1}>Page unavailable</h1><p>{message}</p><Link to="/" className="button primary">Back to Modules <ArrowRight size={18} aria-hidden="true"/></Link></main>
}
function Timer({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id) }, [])
  const remaining = deadline - now
  return <div className={`timer ${remaining <= 60000 ? 'urgent' : ''}`} role="timer" aria-label={`Time remaining ${formatTime(remaining)}`}><Clock3 size={18} aria-hidden="true"/><span>{formatTime(remaining)}</span></div>
}
function SessionWarnings({ saveFailed, conflict }: { saveFailed: boolean; conflict: boolean }) {
  return <>{saveFailed && <div className="notice warning" role="alert"><Info size={20} aria-hidden="true"/><p>Browser storage is unavailable or full. Your answers remain on this page; keep it open to avoid losing them.</p></div>}{conflict && <div className="notice warning" role="alert"><Info size={20} aria-hidden="true"/><div><p>This session changed in another tab. Load the latest session before continuing.</p><button className="text-link" onClick={() => window.location.reload()}>Load latest session <RotateCcw size={16} aria-hidden="true"/></button></div></div>}</>
}

function Preparation({ module, pkg, engine, reportEndpoint }: { module: LearningModule; pkg: ExamPackage; engine: ReturnType<typeof useSession>; reportEndpoint?: string }) {
  const { session } = engine
  const navigate = useNavigate()
  const [count, setCount] = useState(String(pkg.questions.length))
  const [timed, setTimed] = useState(false)
  const [minutes, setMinutes] = useState(String(pkg.recommendedMinutes ?? 60))
  const [reset, setReset] = useState(false)
  const [errors, setErrors] = useState<{ count?: string; minutes?: string }>({})
  const countRef = useRef<HTMLInputElement>(null), minutesRef = useRef<HTMLInputElement>(null)
  const base = packagePath(module.id, pkg.id)
  const validate = () => {
    const next: { count?: string; minutes?: string } = {}
    if (!/^\d+$/.test(count) || Number(count) < 1 || Number(count) > pkg.questions.length) next.count = 'Enter a whole number from 1 to ' + pkg.questions.length + '.'
    if (timed && (!/^\d+$/.test(minutes) || Number(minutes) < 1 || Number(minutes) > 1440)) next.minutes = 'Enter a whole number from 1 to 1440 minutes.'
    setErrors(next)
    if (next.count) countRef.current?.focus()
    else if (next.minutes) minutesRef.current?.focus()
    return !Object.keys(next).length
  }
  const start = () => {
    if (!validate()) return
    const settings: Settings = { timed, minutes: timed ? Number(minutes) : 60, questionCount: Number(count), shuffleQuestions: true, shuffleOptions: true }
    engine.start(settings); setReset(false); navigate(base + '/exam')
  }
  if (engine.recoveredTimeout && session?.status === 'finished') return <Navigate to={base + '/results'} replace/>
  return <main className="container preparation-page"><PageTitle title={module.title + ' · Practice'}/><Link className="back-link" to="/"><ArrowLeft size={16} aria-hidden="true"/> Modules</Link>
    <div className="page-heading"><p className="eyebrow">Practice</p><h1 id="content" tabIndex={-1}>{module.title}</h1></div>
    <SessionWarnings saveFailed={engine.saveFailed} conflict={engine.conflict}/>
    {engine.notice && <div className="notice warning"><Info size={20} aria-hidden="true"/><p>{engine.notice}</p></div>}
    {session && <div className="resume-panel"><div><p className="eyebrow">{session.status === 'active' ? 'Saved session' : 'Previous practice'}</p><h2>{session.status === 'active' ? 'Pick up where you left off' : 'Your latest result is saved'}</h2><p>{Object.keys(session.answers).length} of {session.order.length} questions answered. {session.deadline && session.status === 'active' ? 'Your timer is still running.' : 'Saved in this browser.'}</p></div><Link className="button primary" aria-disabled={engine.conflict || undefined} onClick={event => { if (engine.conflict) event.preventDefault(); else engine.resume() }} to={base + (session.status === 'active' ? '/exam' : '/results')}>{session.status === 'active' ? 'Resume practice' : 'View results'}<ArrowRight size={18} aria-hidden="true"/></Link></div>}
    <div className="preparation-grid"><form className="settings-panel" aria-labelledby="practice-settings-title" action={base} method="get" noValidate onSubmit={event => { event.preventDefault(); if (!validate()) return; if (session || engine.needsReset) setReset(true); else start() }}>
      <h2 id="practice-settings-title">Practice settings</h2>
      <div className="form-field question-count-field"><label htmlFor="question-count">Number of questions</label><input ref={countRef} id="question-count" name="question-count" type="number" inputMode="numeric" min={1} max={pkg.questions.length} step={1} required value={count} aria-invalid={!!errors.count} aria-describedby={'count-hint' + (errors.count ? ' count-error' : '')} onChange={event => { setCount(event.target.value); setErrors(previous => ({ ...previous, count: undefined })) }}/><p id="count-hint" className="field-hint">{pkg.questions.length} questions available in this bank.</p>{errors.count && <p id="count-error" className="field-error" role="alert">{errors.count}</p>}</div>
      <div className="setting-row"><div><label htmlFor="timed">Use a timer</label><p>Answers are submitted automatically when time runs out.</p></div><input className="toggle" id="timed" name="timed" type="checkbox" checked={timed} onChange={event => setTimed(event.target.checked)}/></div>
      {timed && <div className="duration-field"><label htmlFor="minutes">Duration</label><div><input ref={minutesRef} id="minutes" name="minutes" type="number" inputMode="numeric" min={1} max={1440} step={1} required value={minutes} aria-invalid={!!errors.minutes} aria-describedby={'duration-hint' + (errors.minutes ? ' duration-error' : '')} onChange={event => { setMinutes(event.target.value); setErrors(previous => ({ ...previous, minutes: undefined })) }}/><span>minutes</span></div><p id="duration-hint" className="small muted">Choose a duration from 1 to 1440 minutes.</p>{errors.minutes && <p id="duration-error" className="field-error" role="alert">{errors.minutes}</p>}</div>}
      <button className="button primary full" disabled={engine.conflict} type="submit">{session || engine.needsReset ? 'Start again' : 'Start practice'}<ArrowRight size={18} aria-hidden="true"/></button>
    </form><aside className="preparation-aside">
      <div className="package-facts"><span className="fact-icon"><BookOpen aria-hidden="true" size={24}/></span><h2>In this practice</h2><dl><div><dt>Questions</dt><dd>{/^\d+$/.test(count) && Number(count) > 0 && Number(count) <= pkg.questions.length ? count : '—'} of {pkg.questions.length}</dd></div><div><dt>Answer type</dt><dd>One correct choice</dd></div><div><dt>Order</dt><dd>Questions and choices shuffled</dd></div></dl><p className="small muted">Questions are selected without repetition. Explanations open after you finish.</p></div>
      <ComplaintButton module={module} pkg={pkg} endpoint={reportEndpoint}/>
      <p className="storage-note"><ShieldCheck aria-hidden="true" size={18}/><span>Your progress is saved in this browser.</span></p>
    </aside></div>
    <Modal open={reset} title="Start a new practice?" onClose={() => setReset(false)}><p>Your previous answers, flags, and result for this module will be replaced.</p><div className="modal-actions"><button type="button" className="button secondary" autoFocus onClick={() => setReset(false)}>Cancel</button><button type="button" className="button primary" onClick={start}>Start again <RotateCcw size={16} aria-hidden="true"/></button></div></Modal>
  </main>
}
function NumberPanel({ session, pkg, review, onNavigate }: { session: Session; pkg: ExamPackage; review: boolean; onNavigate: (index: number) => void }) {
  const answered = Object.keys(session.answers).length
  return <div className="number-panel-content"><div className="panel-title"><h2>Questions</h2><span className="muted small">{session.order.length} questions</span></div><div className="number-grid">{session.order.map((id, index) => {
    const question = pkg.questions.find((q) => q.id === id)!
    const selected = session.answers[id]
    const flagged = session.flagged.includes(id)
    const status = review ? !selected ? 'Unanswered' : selected === question.correctOptionId ? 'Correct' : 'Incorrect' : selected ? 'Answered' : 'Unanswered'
    return <button key={id} className={`number-button ${selected ? 'answered' : ''} ${flagged && !review ? 'flagged' : ''} ${review ? status === 'Correct' ? 'correct' : status === 'Incorrect' ? 'incorrect' : '' : ''}`} aria-current={session.current === index ? 'step' : undefined} aria-label={`Question ${index + 1}, ${status}${flagged && !review ? ', flagged for review' : ''}`} onClick={() => onNavigate(index)}><span>{index + 1}</span>{review && selected ? selected === question.correctOptionId ? <Check size={10} aria-hidden="true"/> : <X size={10} aria-hidden="true"/> : flagged ? <Flag size={10} aria-hidden="true"/> : selected ? <Check size={10} aria-hidden="true"/> : null}</button>
  })}</div><div className="legend">{review ? <><span><CheckCircle2 size={14} aria-hidden="true"/> Correct</span><span><X size={14} aria-hidden="true"/> Incorrect</span><span><Circle size={13} aria-hidden="true"/> Unanswered</span></> : <><span><Circle size={13} aria-hidden="true"/> Unanswered</span><span><Check size={14} aria-hidden="true"/> Answered</span><span><Flag size={13} aria-hidden="true"/> Flagged</span></>}<span><span className="active-marker"/> Current question</span></div><div className="panel-progress"><p><span>Answered</span><strong>{answered} / {session.order.length}</strong></p><progress value={answered} max={session.order.length} aria-label="Answered questions"/></div></div>
}
function Exam({ module, pkg, engine, review = false, reportEndpoint }: { module: LearningModule; pkg: ExamPackage; engine: ReturnType<typeof useSession>; review?: boolean; reportEndpoint?: string }) {
  const { session, dispatch } = engine
  const [reviewIndex, setReviewIndex] = useState(0)
  const [submit, setSubmit] = useState(false)
  const [numbers, setNumbers] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const base = packagePath(module.id, pkg.id)
  const index = review ? reviewIndex : session?.current ?? 0
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [index])
  if (!session) return <Navigate to={base} replace/>
  if (session.status === 'finished' && !review) return <Navigate to={`${base}/results`} replace/>
  if (session.status === 'active' && review) return <Navigate to={`${base}/exam`} replace/>
  if (session.status === 'active' && !engine.entered) return <Navigate to={base} replace/>
  const question = pkg.questions.find((q) => q.id === session.order[index])!
  const selected = session.answers[question.id]
  const flagged = session.flagged.includes(question.id)
  const answered = Object.keys(session.answers).length
  const navigateQuestion = (next: number) => {
    if (review) setReviewIndex(next)
    else dispatch({ type: 'navigate', index: next })
    setNumbers(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const numberPanel = <NumberPanel session={{ ...session, current: index }} pkg={pkg} review={review} onNavigate={navigateQuestion}/>
  return <main className="container exam-page"><PageTitle title={`${review ? 'Explanation' : 'Practice'} — ${pkg.title}`}/>
    <div className="exam-topline"><Link className="back-link" to={review ? `${base}/results` : base}><ArrowLeft size={16} aria-hidden="true"/>{review ? 'Results summary' : 'Save & exit'}</Link><span className="mode-label">{review ? 'Explanation' : 'Practice'}</span></div>
    <div className="exam-heading"><div><p className="eyebrow">Practice</p><h1 id="content" tabIndex={-1}>{pkg.title}</h1></div>{!review && session.deadline && <Timer deadline={session.deadline}/>}</div>
    <SessionWarnings saveFailed={engine.saveFailed} conflict={engine.conflict}/>
    <div className="mobile-exam-toolbar"><span>{answered} / {session.order.length} answered</span><button className="button secondary" aria-haspopup="dialog" aria-expanded={numbers} onClick={() => setNumbers(true)}>Questions <Grid2X2 size={17} aria-hidden="true"/></button></div>
    <div className="exam-layout"><div className="question-column"><article className="question-surface"><div className="question-meta"><span>Question <strong>{index + 1}</strong><span className="muted"> / {session.order.length}</span></span>{review ? <span className={`review-status ${selected === question.correctOptionId ? 'success-text' : 'error-text'}`}>{!selected ? 'Unanswered' : selected === question.correctOptionId ? 'Correct answer' : 'Incorrect answer'}</span> : <button disabled={engine.conflict} className={`flag-button ${flagged ? 'is-flagged' : ''}`} aria-pressed={flagged} onClick={() => dispatch({ type: 'flag', questionId: question.id })}><Flag size={16} aria-hidden="true"/>{flagged ? 'Flagged for review' : 'Flag for review'}</button>}</div>
      <h2 className="visually-hidden" ref={heading} tabIndex={-1}>Question {index + 1}</h2><div className="question-body"><Blocks blocks={question.blocks}/></div>
      {review ? <div className="answer-options review-options">{session.optionOrder[question.id].map((id, i) => {
        const option = question.options.find((o) => o.id === id)!
        const isCorrect = id === question.correctOptionId; const isChosen = id === selected
        return <div className={`option ${isCorrect ? 'is-correct' : isChosen ? 'is-incorrect' : ''}`} key={id}><span className="option-letter">{String.fromCharCode(65 + i)}</span><span className="option-content" lang="id">{option.text}{(isCorrect || isChosen) && <span className="answer-annotation">{isCorrect && <span><CheckCircle2 size={14} aria-hidden="true"/> Correct answer</span>}{isChosen && <span>{!isCorrect && <X size={14} aria-hidden="true"/>}Your answer</span>}</span>}</span></div>
      })}</div> : <fieldset className="answer-options" disabled={engine.conflict}><legend className="visually-hidden">Choose one answer for question {index + 1}</legend>{session.optionOrder[question.id].map((id, i) => {
        const option = question.options.find((o) => o.id === id)!
        return <label className={`option ${selected === id ? 'is-selected' : ''}`} key={id} htmlFor={`option-${id}`}><input id={`option-${id}`} type="radio" name={`question-${question.id}`} value={id} checked={selected === id} onChange={() => dispatch({ type: 'answer', questionId: question.id, optionId: id })}/><span className="option-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span><span className="option-content" lang="id">{option.text}</span><span className="radio-visual" aria-hidden="true">{selected === id && <span/>}</span></label>
      })}</fieldset>}
      {!review && <div className="answer-footnote"><span>Choose the best answer.</span>{selected && <button className="text-link" disabled={engine.conflict} onClick={() => dispatch({ type: 'answer', questionId: question.id, optionId: null })}>Clear answer</button>}</div>}
      {review && <section className="explanation"><div className="explanation-heading"><BookOpen size={19} aria-hidden="true"/><h3>Explanation</h3></div>{!selected && <p className="unanswered-note">You did not answer this question.</p>}<Blocks blocks={question.explanation}/><ComplaintButton module={module} pkg={pkg} question={question} session={session} endpoint={reportEndpoint}/></section>}
    </article><div className="question-navigation"><button className="button secondary" disabled={index === 0 || engine.conflict} onClick={() => navigateQuestion(index - 1)}><ChevronLeft size={18} aria-hidden="true"/> Previous</button><span className="muted small">{index + 1} of {session.order.length}</span><button className="button secondary" disabled={index === session.order.length - 1 || engine.conflict} onClick={() => navigateQuestion(index + 1)}>Next <ChevronRight size={18} aria-hidden="true"/></button></div><p className="autosave-line">{review ? <><Info size={14} aria-hidden="true"/> Your answers and score remain saved.</> : <><ShieldCheck size={14} aria-hidden="true"/>{engine.saveFailed ? 'Autosave is unavailable.' : 'Changes are saved automatically in this browser.'}</>}</p></div>
    <aside className="exam-sidebar"><div className="number-panel">{numberPanel}</div>{review ? <Link className="button primary full" to={`${base}/results`}>Results summary <ArrowRight size={17} aria-hidden="true"/></Link> : <><button className="button primary full" disabled={engine.conflict} onClick={() => setSubmit(true)}>Finish practice <Check size={17} aria-hidden="true"/></button><p className="small muted sidebar-note">Check your answers before submitting.</p></>}</aside></div>
    <div className="mobile-finish">{review ? <Link className="button primary full" to={`${base}/results`}>Results summary</Link> : <button className="button primary full" disabled={engine.conflict} onClick={() => setSubmit(true)}>Finish practice <Check size={17} aria-hidden="true"/></button>}</div>
    <Modal open={numbers} title="Question navigation" onClose={() => setNumbers(false)} className="number-modal">{numberPanel}</Modal>
    <Modal open={submit} title="Submit practice?" onClose={() => setSubmit(false)}><p>{answered < session.order.length ? `There are ${session.order.length - answered} unanswered questions. Unanswered questions receive no points.` : 'All questions have been answered.'}</p>{session.flagged.length > 0 && <p>{session.flagged.length} questions flagged for review.</p>}<p>Answers cannot be changed after submission.</p><div className="modal-actions"><button className="button secondary" autoFocus onClick={() => setSubmit(false)}>Keep reviewing</button><button className="button primary" disabled={engine.conflict} onClick={() => { dispatch({ type: 'finish' }); setSubmit(false) }}>Submit answers <Check size={17} aria-hidden="true"/></button></div></Modal>
  </main>
}
function Results({ module, pkg, engine }: { module: LearningModule; pkg: ExamPackage; engine: ReturnType<typeof useSession> }) {
  const { session } = engine
  const { acknowledgeTimeout } = engine
  useEffect(() => { acknowledgeTimeout() }, [acknowledgeTimeout])
  const base = packagePath(module.id, pkg.id)
  if (!session) return <Navigate to={base} replace/>
  if (session.status === 'active') return <Navigate to={`${base}/exam`} replace/>
  const result = score(session, pkg)
  return <main className="container results-page"><PageTitle title={`Results — ${pkg.title}`}/><Link to="/" className="back-link"><ArrowLeft size={16} aria-hidden="true"/> Modules</Link><div className="results-heading"><span className="completion-icon"><Check size={26} aria-hidden="true"/></span><p className="eyebrow">Practice complete</p><h1 id="content" tabIndex={-1}>Your results</h1><p className="muted">{module.title}</p></div><SessionWarnings saveFailed={engine.saveFailed} conflict={engine.conflict}/>{session.finishReason === 'timeout' && <div className="notice timeout-notice" role="status"><Clock3 size={20} aria-hidden="true"/><p>Time is up. Your latest answers were submitted automatically.</p></div>}
    <section className="result-card" aria-label="Score summary"><div className="score-display"><span className="eyebrow">Final score</span><p><strong>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(result.percentage)}</strong><span>%</span></p><span className="muted small">{result.correct} correct out of {result.total} questions</span></div><dl className="result-stats"><div><dt><CheckCircle2 size={18} aria-hidden="true"/> Correct</dt><dd>{result.correct}<span>questions</span></dd></div><div><dt><X size={18} aria-hidden="true"/> Incorrect</dt><dd>{result.incorrect}<span>questions</span></dd></div><div><dt><Circle size={17} aria-hidden="true"/> Unanswered</dt><dd>{result.unanswered}<span>questions</span></dd></div></dl><p className="score-formula">Score = correct answers ÷ questions in this session × 100%. No penalty for incorrect answers.</p></section>
    <div className="results-actions"><Link className="button primary" to={`${base}/review`}>Review answers <BookOpen size={18} aria-hidden="true"/></Link><Link className="button secondary" to={base}>Practice again <RotateCcw size={17} aria-hidden="true"/></Link></div><p className="results-note">Review each question to understand your answers.</p>
  </main>
}
function PackageSession({ module, pkg, view, preview }: { module: LearningModule; pkg: ExamPackage; view?: string; preview?: PreviewOptions }) {
  const engine = useSession(module.id, pkg, preview?.storageNamespace)
  if (view === 'exam') return <Exam module={module} pkg={pkg} engine={engine} reportEndpoint={preview?.reportEndpoint}/>
  if (view === 'results') return <Results module={module} pkg={pkg} engine={engine}/>
  if (view === 'review') return <Exam module={module} pkg={pkg} engine={engine} reportEndpoint={preview?.reportEndpoint} review/>
  if (view) return <NotFound/>
  return <Preparation module={module} pkg={pkg} engine={engine} reportEndpoint={preview?.reportEndpoint}/>
}
function PackageRoute({ catalog, preview }: { catalog: Catalog; preview?: PreviewOptions }) {
  const { moduleId, packageId, view: rawView } = useParams()
  const aliases: Record<string,string> = { ujian: 'exam', hasil: 'results', pembahasan: 'review' }
  const view = rawView ? aliases[rawView] ?? rawView : undefined
  const module = catalog.modules.find((item) => item.id === moduleId)
  const pkg = packageId ? module?.packages.find(item => item.id === packageId) : module?.packages[0]
  if (!module || !pkg) return <NotFound message="This module is unavailable or has been updated. Return to Modules to choose a practice bank."/>
  return <PackageSession key={`${module.id}/${pkg.id}/${preview?.storageNamespace ?? ''}`} module={module} pkg={pkg} view={view} preview={preview}/>
}
export function App({ catalog, isDev = false, contentError = false, preview }: { catalog: Catalog; isDev?: boolean; contentError?: boolean; preview?: PreviewOptions }) {
  const Router = import.meta.env.MODE === 'pages' && !preview ? HashRouter : BrowserRouter
  return <Router basename={preview?.basePath ?? (isDev ? '/dev' : undefined)}><Shell isDev={isDev} preview={preview}>{contentError ? <NotFound message="Practice data could not load. Please try again later."/> : <Routes><Route path="/" element={<Home catalog={catalog}/>}/><Route path="/guide" element={<InfoPage/>}/><Route path="/privacy" element={<InfoPage privacy/>}/><Route path="/admin/reports" element={<><PageTitle title="Question reports"/><ComplaintAdmin/></>}/><Route path="/panduan" element={<InfoPage/>}/><Route path="/privasi" element={<InfoPage privacy/>}/><Route path="/modul/:moduleId/paket/:packageId/:view?" element={<PackageRoute catalog={catalog} preview={preview}/>}/><Route path="/module/:moduleId/:view?" element={<PackageRoute catalog={catalog} preview={preview}/>}/><Route path="/pengelola/laporan" element={<><PageTitle title="Question reports"/><ComplaintAdmin/></>}/><Route path="*" element={<NotFound/>}/></Routes>}</Shell></Router>
}
