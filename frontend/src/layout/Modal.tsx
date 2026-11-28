import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Only the topmost modal reacts: nested/later modals come last in document order.
      const all = document.querySelectorAll('.modal-backdrop')
      if (all[all.length - 1] === ref.current) close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div ref={ref} className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={wide ? 'modal modal-wide card' : 'modal card'} role="dialog" aria-modal="true">{children}</div>
    </div>
  )
}
