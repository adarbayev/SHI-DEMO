import { useState } from 'react'
import { Info } from 'lucide-react'

function clampValue(value, min, max) {
  if (!Number.isFinite(value)) return value
  if (Number.isFinite(min) && value < min) return min
  if (Number.isFinite(max) && value > max) return max
  return value
}

function valueToDraft(value, scale = 1) {
  return Number.isFinite(value) ? String(value * scale) : ''
}

function parseDraft(value) {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function InfoTooltip({ text }) {
  if (!text) return null

  return (
    <span className="group relative inline-flex align-middle">
      <Info size={13} className="text-slate-400" aria-hidden="true" />
      <span
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-64 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium normal-case leading-snug text-slate-600 shadow-lg group-hover:block"
        aria-hidden="true"
      >
        {text}
      </span>
    </span>
  )
}

export function Field({ label, children, help, tooltip }) {
  return (
    <label className="block">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
        {label}
        <InfoTooltip text={tooltip} />
      </span>
      <div className="mt-1">{children}</div>
      {help ? <span className="mt-1 block text-xs text-slate-500">{help}</span> : null}
    </label>
  )
}

export function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      className="input"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function NumberInput({ value, onChange, min, max, step = 1, disabled = false, className = '' }) {
  const [isFocused, setIsFocused] = useState(false)
  const [draft, setDraft] = useState(valueToDraft(value))

  function handleChange(rawValue) {
    setDraft(rawValue)
    const parsed = parseDraft(rawValue)
    if (parsed === null) return
    onChange(clampValue(parsed, min, max))
  }

  function handleBlur() {
    setIsFocused(false)
    const parsed = parseDraft(draft)
    if (parsed === null) {
      setDraft(valueToDraft(value))
      return
    }
    const nextValue = clampValue(parsed, min, max)
    setDraft(valueToDraft(nextValue))
    onChange(nextValue)
  }

  return (
    <input
      className={`input ${className}`}
      type="number"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      value={isFocused ? draft : valueToDraft(value)}
      onFocus={() => {
        setIsFocused(true)
        setDraft(valueToDraft(value))
      }}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
    />
  )
}

export function PercentInput({
  value,
  onChange,
  min = -100,
  max = 100,
  step = 0.1,
  disabled = false,
  className = '',
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [draft, setDraft] = useState(valueToDraft(value, 100))

  function handleChange(rawValue) {
    setDraft(rawValue)
    const parsed = parseDraft(rawValue)
    if (parsed === null) return
    onChange(clampValue(parsed, min, max) / 100)
  }

  function handleBlur() {
    setIsFocused(false)
    const parsed = parseDraft(draft)
    if (parsed === null) {
      setDraft(valueToDraft(value, 100))
      return
    }
    const nextValue = clampValue(parsed, min, max)
    setDraft(valueToDraft(nextValue))
    onChange(nextValue / 100)
  }

  return (
    <div className="relative">
      <input
        className={`input pr-8 ${className}`}
        type="number"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={isFocused ? draft : valueToDraft(value, 100)}
        onFocus={() => {
          setIsFocused(true)
          setDraft(valueToDraft(value, 100))
        }}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
        %
      </span>
    </div>
  )
}

export function SelectInput({ value, onChange, children }) {
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      {children}
    </select>
  )
}
