import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ open, title, children, onClose, className = '' }: { open: boolean; title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby={id} onClose={() => { if (ref.current) ref.current.returnValue = ''; onClose() }}>
    <div className="modal-heading"><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={() => ref.current?.close()}><X aria-hidden="true" size={20}/></button></div>
    {children}
  </dialog>
}
