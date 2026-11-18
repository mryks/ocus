import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExamPackage } from '../domain/content'
import { compatible, createSession, transition, type Action, type Session, type Settings } from '../domain/session'
import { browserStorage, readSession, sessionKey, writeSession } from '../domain/storage'

export function useSession(moduleId: string, pkg: ExamPackage, storageNamespace?: string) {
  const [storage] = useState(browserStorage)
  const key = sessionKey(moduleId, pkg.id, storageNamespace)
  const [initial] = useState(() => readSession(storage, key))
  const [session, setSession] = useState<Session | null>(() => initial.kind === 'ok' && compatible(initial.session, moduleId, pkg) ? transition(initial.session, pkg, { type: 'tick' }) : null)
  const current = useRef(session)
  const [saveFailed, setSaveFailed] = useState(initial.kind === 'unavailable')
  const [conflict, setConflict] = useState(false)
  const [entered, setEntered] = useState(false)
  const [recoveredTimeout, setRecoveredTimeout] = useState(() => initial.kind === 'ok' && initial.session.status === 'active' && initial.session.deadline !== null && initial.session.deadline <= Date.now())
  const acknowledgeTimeout = useCallback(() => setRecoveredTimeout(false), [])
  const [notice, setNotice] = useState(() => initial.kind === 'invalid' ? 'Your saved progress could not be read. Start again to create a new session.' : initial.kind === 'ok' && !compatible(initial.session, moduleId, pkg) ? 'This question bank or saved session has changed. Start again to use the current bank.' : '')
  const persist = useCallback((next: Session) => {
    current.current = next
    // Simpan sinkron sebelum UI berubah agar refresh cepat tidak menghilangkan jawaban terakhir.
    setSaveFailed(!writeSession(storage, key, next))
    setSession(next)
  }, [key, storage])
  const dispatch = useCallback((action: Action) => {
    const existing = current.current
    if (!existing || conflict) return
    const stored = readSession(storage, key)
    if (stored.kind === 'ok' && (stored.session.id !== existing.id || stored.session.revision > existing.revision)) { setConflict(true); return }
    const next = transition(existing, pkg, action)
    if (next !== existing) {
      if (next.finishReason === 'timeout') setRecoveredTimeout(true)
      persist(next)
    }
  }, [key, pkg, persist, conflict, storage])
  const start = useCallback((settings: Settings) => {
    setConflict(false); setNotice(''); setRecoveredTimeout(false)
    setEntered(true)
    persist(createSession(moduleId, pkg, settings))
  }, [moduleId, pkg, persist])
  const resume = useCallback(() => {
    if (conflict) return
    dispatch({ type: 'tick' })
    setEntered(true)
  }, [conflict, dispatch])

  useEffect(() => {
    if (initial.kind === 'ok' && current.current && initial.session.revision !== current.current.revision) persist(current.current)
  }, [initial, persist])
  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) setConflict(true) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])
  useEffect(() => {
    if (session?.status !== 'active' || session.deadline === null || conflict) return
    const tick = () => dispatch({ type: 'tick' })
    const timer = window.setInterval(tick, 500)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    tick()
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick) }
  }, [session?.status, session?.deadline, conflict, dispatch])
  return { session, start, resume, entered, dispatch, saveFailed, conflict, notice, recoveredTimeout, acknowledgeTimeout, needsReset: initial.kind === 'invalid' || initial.kind === 'ok' && !compatible(initial.session, moduleId, pkg) }
}
