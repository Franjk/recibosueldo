import { COLORES_TORTA } from '../pieColors.ts'
import type { Rubro } from '../types.ts'

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

export function PieChart({
  partes,
}: {
  partes: Array<{ key: 'neto' | Rubro; valor: number; pct: number; label: string }>
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
    return (
      <svg className="pie" viewBox="0 0 160 160" aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill={COLORES_TORTA[visibles[0].key]} />
      </svg>
    )
  }

  const slices = visibles.reduce<Array<{ key: 'neto' | Rubro; start: number; end: number }>>(
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
          fill={COLORES_TORTA[slice.key]}
        />
      ))}
    </svg>
  )
}
