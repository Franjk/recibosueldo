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
          <rect width="4" height="4" fill="#111" />
          <rect x="4" y="4" width="4" height="4" fill="#111" />
        </>
      )
      break
    case 'inssjp':
      marca = (
        <>
          {blanco}
          <path
            d="M0 2 Q2 0.2 4 2 T8 2 M0 5.8 Q2 4 4 5.8 T8 5.8"
            fill="none"
            stroke="#111"
            strokeWidth="1.2"
          />
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

const RADIO = 58
const FUENTE = 11
const ALTO_LINEA = 13.5
const ANCHO_MAX = 132
const MARGEN_TEXTO = 14
const PAD = 4
// Reservar ambos laterales aunque no haya etiquetas mantiene la escala del círculo.
const ANCHO_GRAFICO = 2 * (RADIO + MARGEN_TEXTO + ANCHO_MAX + PAD + 4)

type ParteTorta = { key: ClaveTorta; valor: number; pct: number; label: string }
type Lado = 'left' | 'right'
type Fila = { texto: string; pct?: string }

function norm(angle: number) {
  return ((angle % 360) + 360) % 360
}

function medir(texto: string, peso: 400 | 700) {
  if (!texto) return 0
  if (typeof document === 'undefined') return texto.length * FUENTE * (peso === 700 ? 0.58 : 0.54)
  const canvas = medirCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return texto.length * FUENTE * 0.55
  ctx.font = `${peso} ${FUENTE}px Arial, Helvetica, sans-serif`
  return ctx.measureText(texto).width
}

function medirCanvas() {
  const guardado = medir as typeof medir & { canvas?: HTMLCanvasElement }
  guardado.canvas ??= document.createElement('canvas')
  return guardado.canvas
}

function formatoPct(pct: number) {
  return `${pct.toLocaleString('es-AR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}%`
}

function filasDe(label: string, pct: string) {
  const palabras = label.split(/\s+/).filter(Boolean)
  const lineas: string[] = []
  let actual = ''
  for (const palabra of palabras) {
    const siguiente = actual ? `${actual} ${palabra}` : palabra
    if (actual && medir(siguiente, 400) > ANCHO_MAX) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = siguiente
    }
  }
  if (actual) lineas.push(actual)
  if (lineas.length === 0) lineas.push(label)

  const pctAncho = medir(pct, 700)
  const filas: Fila[] = lineas.map((texto) => ({ texto }))
  const ultima = lineas[lineas.length - 1]
  const anchoUltima = medir(ultima, 400)
  const anchoConPct = anchoUltima + (ultima ? 4 : 0) + pctAncho
  let ancho = Math.max(...lineas.map((linea) => medir(linea, 400)), 0)
  if (anchoConPct <= ANCHO_MAX) {
    filas[filas.length - 1] = { texto: ultima, pct }
    ancho = Math.max(ancho, anchoConPct)
  } else {
    filas.push({ texto: '', pct })
    ancho = Math.max(ancho, pctAncho)
  }
  return { filas, ancho, alto: filas.length * ALTO_LINEA }
}

function ubicarLado<T extends { mid: number; alto: number; ancho: number }>(
  items: T[],
  lado: Lado,
  radioTorta: number,
) {
  const ancla = lado === 'right' ? radioTorta + MARGEN_TEXTO : -(radioTorta + MARGEN_TEXTO)
  const orden = items
    .map((item) => ({ ...item, natural: polar(0, 0, radioTorta, item.mid).y, y: 0 }))
    .sort((a, b) => a.natural - b.natural)
  for (const item of orden) item.y = item.natural
  for (let i = 1; i < orden.length; i += 1) {
    const minimo = orden[i - 1].y + (orden[i - 1].alto + orden[i].alto) / 2 + 5
    if (orden[i].y < minimo) orden[i].y = minimo
  }
  if (orden.length > 0) {
    const centro = orden.reduce((suma, item) => suma + item.natural, 0) / orden.length
    const arriba = orden[0].y - orden[0].alto / 2
    const abajo = orden[orden.length - 1].y + orden[orden.length - 1].alto / 2
    let corrimiento = centro - (arriba + abajo) / 2
    const tope = -(radioTorta - 4)
    if (arriba + corrimiento < tope) corrimiento = tope - arriba
    for (const item of orden) item.y += corrimiento
  }
  return orden.map((item) => ({ ...item, x: ancla }))
}

function cortaCirculo(
  p: { x: number; y: number },
  q: { x: number; y: number },
  cx: number,
  cy: number,
  radio: number,
) {
  const dx = q.x - p.x
  const dy = q.y - p.y
  const largo2 = dx * dx + dy * dy
  if (largo2 === 0) return false
  const t = Math.max(0, Math.min(1, ((cx - p.x) * dx + (cy - p.y) * dy) / largo2))
  const x = p.x + t * dx
  const y = p.y + t * dy
  return (x - cx) ** 2 + (y - cy) ** 2 < radio * radio
}

function trazo(puntos: Array<{ x: number; y: number }>) {
  const limpios = [puntos[0]]
  for (const punto of puntos.slice(1)) {
    const previo = limpios[limpios.length - 1]
    if (Math.hypot(punto.x - previo.x, punto.y - previo.y) >= 0.75) limpios.push(punto)
  }
  return limpios.map((punto) => `${punto.x.toFixed(1)},${punto.y.toFixed(1)}`).join(' ')
}

function Etiqueta({
  x,
  y,
  anchor,
  filas,
}: {
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
  filas: Fila[]
}) {
  const y0 = y - ((filas.length - 1) * ALTO_LINEA) / 2
  return (
    <text
      x={x}
      y={y0}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize={FUENTE}
      fill="#111"
    >
      {filas.map((fila, indice) => (
        <tspan key={indice} x={x} dy={indice === 0 ? 0 : ALTO_LINEA}>
          {fila.texto}
          {fila.pct ? (
            <tspan fontWeight={700} dx={fila.texto ? 4 : 0}>
              {fila.pct}
            </tspan>
          ) : null}
        </tspan>
      ))}
    </text>
  )
}

export function PieChart({ partes, patrones }: { partes: ParteTorta[]; patrones: boolean }) {
  const visibles = partes.filter((parte) => parte.valor > 0)
  const r = RADIO

  if (visibles.length === 0) {
    return (
      <svg className="pie" viewBox={`0 0 ${ANCHO_GRAFICO} ${2 * (r + PAD)}`} aria-hidden="true">
        <circle cx={ANCHO_GRAFICO / 2} cy={r + PAD} r={r} fill="#dee2e6" />
      </svg>
    )
  }

  const slices = visibles.reduce<
    Array<ParteTorta & { start: number; sweep: number }>
  >((acum, parte) => {
    const start = acum.length === 0 ? 0 : acum[acum.length - 1].start + acum[acum.length - 1].sweep
    const sweep = (parte.pct / 100) * 360
    return [...acum, { ...parte, start, sweep }]
  }, [])
  // La porción más grande queda centrada arriba; el resto se reparte alrededor.
  const mayor = slices.reduce((actual, parte) => (parte.sweep > actual.sweep ? parte : actual))
  const offset = -((mayor.start + mayor.start + mayor.sweep) / 2)

  const medidas = slices.map((slice) => {
    const mid = norm(slice.start + slice.sweep / 2 + offset)
    const caja = filasDe(slice.label, formatoPct(slice.pct))
    return { ...slice, mid, ...caja }
  })

  const techo = medidas.find((slice) => slice.key === mayor.key)!
  const resto = medidas.filter((slice) => slice.key !== mayor.key)
  const fondo =
    resto.length === 1 && Math.abs(norm(resto[0].mid) - 180) <= 28 ? resto[0] : null
  const laterales = resto.filter((slice) => slice !== fondo)

  const grupos = {
    right: ubicarLado(
      laterales.filter((slice) => slice.mid > 0 && slice.mid < 180),
      'right',
      r,
    ),
    left: ubicarLado(
      laterales.filter((slice) => !(slice.mid > 0 && slice.mid < 180)),
      'left',
      r,
    ),
  }

  const techoY = -(r + MARGEN_TEXTO + techo.alto / 2)
  const fondoY = fondo ? r + MARGEN_TEXTO + fondo.alto / 2 : 0
  let minY = Math.min(-r, techoY - techo.alto / 2)
  let maxY = Math.max(r, fondo ? fondoY + fondo.alto / 2 : r)
  for (const item of grupos.left) {
    minY = Math.min(minY, item.y - item.alto / 2)
    maxY = Math.max(maxY, item.y + item.alto / 2)
  }
  for (const item of grupos.right) {
    minY = Math.min(minY, item.y - item.alto / 2)
    maxY = Math.max(maxY, item.y + item.alto / 2)
  }
  const cx = ANCHO_GRAFICO / 2
  const cy = PAD - minY
  const width = ANCHO_GRAFICO
  const height = maxY - minY + PAD * 2

  const aria = medidas.map((slice) => `${slice.label}: ${formatoPct(slice.pct)}`).join(', ')

  function guia(mid: number, x: number, y: number, lado: Lado) {
    const rim = polar(cx, cy, r, mid)
    const stub = polar(cx, cy, r + 6, mid)
    const destino = { x: cx + x + (lado === 'right' ? -3 : 3), y: cy + y }
    if (!cortaCirculo(stub, destino, cx, cy, r + 0.6)) return trazo([rim, stub, destino])
    const canal = lado === 'right' ? cx + r + 9 : cx - r - 9
    const afuera = stub.y >= cy ? cy + r + 8 : cy - r - 8
    const entraPorElCentro = lado === 'left' ? stub.x > canal : stub.x < canal
    if (!entraPorElCentro) return trazo([rim, stub, { x: canal, y: stub.y }, { x: canal, y: destino.y }, destino])
    return trazo([
      rim,
      stub,
      { x: stub.x, y: afuera },
      { x: canal, y: afuera },
      { x: canal, y: destino.y },
      destino,
    ])
  }

  return (
    <svg className="pie" viewBox={`0 0 ${width.toFixed(1)} ${height.toFixed(1)}`} role="img" aria-label={aria}>
      {medidas.map((slice) =>
        slice.sweep >= 359.9 ? (
          <circle
            key={slice.key}
            cx={cx}
            cy={cy}
            r={r}
            fill={patrones ? `url(#${idPatron(slice.key)})` : COLORES_TORTA[slice.key]}
            stroke={patrones ? '#111' : 'none'}
            strokeWidth={patrones ? 1.25 : 0}
          />
        ) : (
          <path
            key={slice.key}
            d={arco(cx, cy, r, slice.start + offset, slice.start + offset + slice.sweep)}
            fill={patrones ? `url(#${idPatron(slice.key)})` : COLORES_TORTA[slice.key]}
            stroke={patrones ? '#111' : 'none'}
            strokeWidth={patrones ? 0.8 : 0}
          />
        ),
      )}
      <polyline
        points={trazo([
          polar(cx, cy, r, 0),
          { x: cx, y: cy + techoY + techo.alto / 2 + 1.5 },
        ])}
        fill="none"
        stroke="#222"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <Etiqueta x={cx} y={cy + techoY} anchor="middle" filas={techo.filas} />
      {fondo ? (
        <>
          <polyline
            points={trazo([
              polar(cx, cy, r, fondo.mid),
              { x: cx, y: cy + fondoY - fondo.alto / 2 - 1.5 },
            ])}
            fill="none"
            stroke="#222"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <Etiqueta x={cx} y={cy + fondoY} anchor="middle" filas={fondo.filas} />
        </>
      ) : null}
      {(['left', 'right'] as const).map((lado) =>
        grupos[lado].map((item) => (
          <g key={item.key}>
            <polyline
              points={guia(item.mid, item.x, item.y, lado)}
              fill="none"
              stroke="#222"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Etiqueta
              x={cx + item.x}
              y={cy + item.y}
              anchor={lado === 'right' ? 'start' : 'end'}
              filas={item.filas}
            />
          </g>
        )),
      )}
    </svg>
  )
}
