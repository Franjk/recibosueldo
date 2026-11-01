import { useId, useState } from 'react'
import { formatNumero, formatTasaInput, parsePesos, parseTasa } from '../money.ts'

export function PorcentajeCell({ value, onChange }: {
  value: number | null
  onChange: (value: number | null) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState('')
  const id = useId()
  return (
    <>
      <div className="porcentaje-input">
        <input
          className={`cell-input mono right${value === null || error ? ' campo-pendiente' : ''}`}
          aria-label="Porcentaje"
          aria-invalid={value === null || !!error}
          aria-describedby={error ? id : undefined}
          inputMode="decimal"
          value={draft ?? (value === null ? '' : formatTasaInput(value))}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => { setDraft(event.target.value); setError('') }}
          onBlur={(event) => {
            const raw = event.target.value.trim()
            const tasa = raw ? parseTasa(raw) : null
            if (raw && tasa === null) {
              setError('Ingresá un porcentaje no negativo con hasta dos decimales.')
              return
            }
            try {
              onChange(tasa)
              setDraft(null)
              setError('')
            } catch {
              setError('El monto calculado es demasiado grande.')
            }
          }}
        />
        <span className="mono" aria-hidden="true">%</span>
      </div>
      {error && <small id={id} role="alert" className="error-celda no-print">{error}</small>}
    </>
  )
}

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
  pendiente = false,
}: {
  value: number | null
  onChange: (centavos: number | null) => void
  ariaLabel: string
  emptyAsBlank?: boolean
  pendiente?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState('')
  const errorId = useId()
  const mostrado =
    draft ?? (value === null ? '' : formatNumero(value))

  function commit(raw: string) {
    const texto = raw.trim()
    if (!texto && emptyAsBlank) {
      onChange(null)
      return
    }
    const parsed = parsePesos(texto)
    if (parsed === null || !Number.isSafeInteger(parsed)) throw new Error('Ingresá un importe válido.')
    onChange(parsed)
  }

  return (
    <>
    <input
      className={`cell-input mono right${pendiente || error ? ' campo-pendiente' : ''}`}
      size={Math.max(mostrado.length, 1)}
      inputMode="decimal"
      spellCheck={false}
      aria-label={ariaLabel}
      aria-invalid={pendiente || !!error}
      aria-describedby={error ? errorId : undefined}
      value={mostrado}
      onFocus={(event) => {
        setDraft(mostrado)
        event.currentTarget.select()
      }}
      onChange={(event) => { setDraft(event.target.value); setError('') }}
      onBlur={(event) => {
        try {
          commit(draft ?? event.currentTarget.value)
          setDraft(null)
          setError('')
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Ingresá un importe válido.')
        }
      }}
    />
    {error && <small id={errorId} role="alert" className="error-celda no-print">{error}</small>}
    </>
  )
}
