import { useId, useRef, useState } from 'react'
import { sugerirConceptos, type Concepto } from '../conceptos.ts'
import type { TipoLinea } from '../types.ts'

export function ConceptoInput({ value, tipo, onChange, onSelect }: {
  value: string
  tipo: TipoLinea
  onChange: (value: string) => void
  onSelect: (concepto: Concepto) => void
}) {
  const id = useId()
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)
  const lista = useRef<HTMLUListElement>(null)
  const opciones = sugerirConceptos(tipo, value)
  const visible = abierto && opciones.length > 0

  function seleccionar(item: Concepto) {
    onSelect(item)
    setAbierto(false)
    setActivo(-1)
  }

  return (
    <div className="concepto-input">
      <input
        className="cell-input"
        aria-label="Concepto"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={visible ? id : undefined}
        aria-activedescendant={visible && activo >= 0 ? `${id}-${activo}` : undefined}
        autoComplete="off"
        value={value}
        onFocus={() => { setAbierto(true); setActivo(-1) }}
        onClick={() => setAbierto(true)}
        onBlur={() => { setAbierto(false); setActivo(-1) }}
        onChange={(event) => { onChange(event.target.value); setAbierto(true); setActivo(-1) }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setAbierto(false); setActivo(-1); return }
          if (event.key === 'Enter' && visible && activo >= 0) {
            event.preventDefault()
            seleccionar(opciones[activo])
          }
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && opciones.length) {
            event.preventDefault()
            setAbierto(true)
            const siguiente = event.key === 'ArrowDown'
              ? (activo + 1) % opciones.length
              : (activo <= 0 ? opciones.length : activo) - 1
            setActivo(siguiente)
            lista.current?.children[siguiente]?.scrollIntoView({ block: 'nearest' })
          }
        }}
      />
      {visible && (
        <ul id={id} role="listbox" aria-label="Conceptos sugeridos" className="concepto-opciones no-print" ref={lista}>
          {opciones.map((item, index) => (
            <li
              id={`${id}-${index}`}
              key={item.id}
              role="option"
              aria-selected={activo === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => seleccionar(item)}
            >
              {item.descripcion}
              {item.porcentual && <span className="concepto-regla">Base × %</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
