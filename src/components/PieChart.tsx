import type { ReactNode } from 'react'
import { COLORES_TORTA } from '../pieColors.ts'
import type { Rubro } from '../types.ts'

export type ClaveTorta = 'neto' | Rubro

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arco(cx: number, cy: number, r: number, start: number, end: number) {
  const a = polar(cx, cy, r, end)
  const b = polar(cx, cy, r, start)
  const large = end - start > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${b.x} ${b.y} A ${r} ${r} 0 ${large} 1 ${a.x} ${a.y} Z`
}

export function idPatron(clave: ClaveTorta) {
  return `patron-torta-${clave}`
}

function Patron({ id, clave }: { id: string; clave: ClaveTorta }) {
  const blanco = <rect width="8" height="8" fill="#fff" />
  let marca: ReactNode
  switch (clave) {
    case 'neto':
      marca = <rect width="8" height="8" fill="#111" />
      break
    case 'sindical':
      marca = (
        <>
          {blanco}
          <path d="M0 2.2 H8 M0 6.2 H8" stroke="#111" strokeWidth="1.5" />
        </>
      )
      break
    case 'seguridad_social':
      marca = (
        <>
          {blanco}
          <path d="M2.2 0 V8 M6.2 0 V8" stroke="#111" strokeWidth="1.5" />
        </>
      )
      break
    case 'obra_social':
      marca = (
        <>
          {blanco}
          <path d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" stroke="#111" strokeWidth="1.35" />
        </>
      )
      break
    case 'inssjp':
      marca = (
        <>
          {blanco}
          <path d="M-2 6 L2 10 M0 0 L8 8 M6 -2 L10 2" stroke="#111" strokeWidth="1.35" />
        </>
      )
      break
    case 'art':
      marca = (
        <>
          {blanco}
          <path d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" stroke="#111" strokeWidth="1.05" />
          <path d="M-2 6 L2 10 M0 0 L8 8 M6 -2 L10 2" stroke="#111" strokeWidth="1.05" />
        </>
      )
      break
    case 'camaras':
      marca = (
        <>
          {blanco}
          <circle cx="2" cy="2" r="1.15" fill="#111" />
          <circle cx="6" cy="6" r="1.15" fill="#111" />
        </>
      )
      break
    case 'scvo':
      marca = (
        <>
          {blanco}
          <rect width="8" height="3.4" fill="#111" />
        </>
      )
      break
    case 'otros':
      marca = (
        <>
          {blanco}
          <path d="M0 4 H8 M4 0 V8" stroke="#111" strokeWidth="1.25" />
        </>
      )
      break
  }

  return (
    <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
      {marca}
    </pattern>
  )
}

const CLAVES: ClaveTorta[] = [
  'neto',
  'sindical',
  'seguridad_social',
  'obra_social',
  'inssjp',
  'art',
  'camaras',
  'scvo',
  'otros',
]

export function DefsPatrones() {
  return (
    <svg className="patrones-defs" aria-hidden="true">
      <defs>
        {CLAVES.map((clave) => (
          <Patron key={clave} id={idPatron(clave)} clave={clave} />
        ))}
      </defs>
    </svg>
  )
}

export function MuestraParte({ clave, patrones }: { clave: ClaveTorta; patrones: boolean }) {
  return (
    <svg className="muestra" viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" fill={patrones ? `url(#${idPatron(clave)})` : COLORES_TORTA[clave]} />
    </svg>
  )
}

export function PieChart({
  partes,
  patrones,
}: {
  partes: Array<{ key: ClaveTorta; valor: number; pct: number; label: string }>
  patrones: boolean
}) {
  const visibles = partes.filter((parte) => parte.valor > 0)
  const cx = 80
  const cy = 80
  const r = 72

  if (visibles.length === 0) {
    return (
      <svg className="pie" viewBox="0 0 160 160" aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="#dee2e6" />
      </svg>
    )
  }

  if (visibles.length === 1) {
    const clave = visibles[0].key
    return (
      <svg className="pie" viewBox="0 0 160 160" aria-hidden="true">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={patrones ? `url(#${idPatron(clave)})` : COLORES_TORTA[clave]}
          stroke={patrones ? '#111' : 'none'}
          strokeWidth={patrones ? 1.25 : 0}
        />
      </svg>
    )
  }

  const slices = visibles.reduce<Array<{ key: ClaveTorta; start: number; end: number }>>(
    (acum, parte) => {
      const start = acum.length === 0 ? 0 : acum[acum.length - 1].end
      return [...acum, { key: parte.key, start, end: start + (parte.pct / 100) * 360 }]
    },
    [],
  )

  return (
    <svg className="pie" viewBox="0 0 160 160" aria-hidden="true">
      {slices.map((slice) => (
        <path
          key={slice.key}
          d={arco(cx, cy, r, slice.start, slice.end)}
          fill={patrones ? `url(#${idPatron(slice.key)})` : COLORES_TORTA[slice.key]}
          stroke={patrones ? '#111' : 'none'}
          strokeWidth={patrones ? 0.8 : 0}
        />
      ))}
    </svg>
  )
}
