import clsx from 'clsx'

export default function MetricCard({ label, value, detail, tone = 'default' }) {
  return (
    <div
      className={clsx(
        'surface-card rounded-md p-4',
        tone === 'accent' && 'border-shi-accent/30',
        tone === 'risk' && 'border-shi-orange/40',
        tone === 'success' && 'border-shi-teal/40',
      )}
    >
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-shi-blue">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </div>
  )
}
