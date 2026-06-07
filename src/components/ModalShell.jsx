import { useEffect } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'

export default function ModalShell({
  title,
  subtitle,
  children,
  footer,
  onClose,
  size = 'lg',
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={clsx(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-md border border-white/70 bg-white/95 shadow-2xl backdrop-blur-xl',
          size === 'xl' && 'max-w-5xl',
          size === 'lg' && 'max-w-4xl',
          size === 'md' && 'max-w-2xl',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/60 px-5 py-4">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold text-shi-blue">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button shrink-0" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <footer className="border-t border-slate-200 px-5 py-4">{footer}</footer> : null}
      </div>
    </div>
  )
}
