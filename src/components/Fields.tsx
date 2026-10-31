import { useState } from 'react'
import { formatNumero, parsePesos } from '../money.ts'

export function CellInput({
  value,
  onChange,
  ariaLabel,
  className,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
  placeholder?: string
}) {
  return (
    <input
      className={className ? `cell-input ${className}` : 'cell-input'}
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function MoneyCell({
  value,
  onChange,
  ariaLabel,
  emptyAsBlank = false,
}: {
  value: number | null
  onChange: (centavos: number | null) => void
  ariaLabel: string
  emptyAsBlank?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const mostrado =
    draft ?? (value === null || (emptyAsBlank && value === 0) ? '' : formatNumero(value))

  function commit(raw: string) {
    const texto = raw.trim()
    if (!texto && emptyAsBlank) {
      onChange(null)
      return
    }
    const parsed = parsePesos(texto)
    if (parsed !== null) onChange(parsed)
  }

  return (
    <input
      className="cell-input mono right"
      size={Math.max(mostrado.length, 1)}
      inputMode="decimal"
      spellCheck={false}
      aria-label={ariaLabel}
      value={mostrado}
      onFocus={(event) => {
        setDraft(value === null || (emptyAsBlank && value === 0) ? '' : formatNumero(value))
        event.currentTarget.select()
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => {
        commit(draft ?? event.currentTarget.value)
        setDraft(null)
      }}
    />
  )
}
