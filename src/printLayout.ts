import { parsePesos, parseTasa } from './money.ts'

export interface Caja { x: number; y: number; width: number; height: number }
export interface CeldaImpresion extends Caja {
  value: string | number | null
  numFmt?: string
  font: string
  size: number
  bold: boolean
  italic: boolean
  color: string
  background: string
  align: 'left' | 'center' | 'right'
  wrap?: boolean
}
export interface BordeImpresion extends Caja {
  sides: Array<'top' | 'bottom' | 'left' | 'right'>
}
export interface LayoutImpresion {
  width: number
  height: number
  cells: CeldaImpresion[]
  borders: BordeImpresion[]
  chart: Caja & { png: string }
}

function colorExcel(color: string): string {
  const canales = color.match(/[\d.]+/g)
  if (!canales) return 'FF111111'
  return 'FF' + canales.slice(0, 3).map((v) => Math.round(Number(v)).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Aplica las mismas reglas que usa el navegador al imprimir, sin alterar la vista actual.
function cssImpresion(rules: CSSRuleList): string {
  return Array.from(rules).map((rule) => {
    if (rule instanceof CSSMediaRule) {
      return rule.media.mediaText === 'print' ? cssImpresion(rule.cssRules) : ''
    }
    return rule.cssText
  }).join('\n')
}

async function pngGrafico(svg: SVGSVGElement, doc: Document): Promise<string> {
  const copia = svg.cloneNode(true) as SVGSVGElement
  const defs = doc.querySelector('.patrones-defs defs')
  if (defs) copia.prepend(defs.cloneNode(true))
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const rect = svg.getBoundingClientRect()
  const escala = 4
  copia.setAttribute('width', String(Math.ceil(rect.width * escala)))
  copia.setAttribute('height', String(Math.ceil(rect.height * escala)))
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const imagen = new Image()
    imagen.src = url
    await imagen.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(rect.width * escala)
    canvas.height = Math.ceil(rect.height * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo dibujar el gráfico.')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function capturarImpresion(origen: HTMLElement): Promise<LayoutImpresion> {
  const copia = origen.cloneNode(true) as HTMLElement
  const inputs = origen.querySelectorAll('input')
  copia.querySelectorAll('input').forEach((input, i) => {
    input.value = inputs[i].value
    input.setAttribute('value', inputs[i].value)
  })
  copia.querySelectorAll('.no-print').forEach((elemento) => elemento.remove())
  const css = Array.from(document.styleSheets)
    .filter((sheet) => !sheet.href || new URL(sheet.href).origin === location.origin)
    .map((sheet) => cssImpresion(sheet.cssRules)).join('\n')
  const iframe = document.createElement('iframe')
  iframe.title = 'Preparación de la exportación a Excel'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:194mm;height:281mm;border:0;pointer-events:none'
  document.body.appendChild(iframe)
  try {
    const doc = iframe.contentDocument!
    doc.open()
    doc.write('<!doctype html><html><head></head><body></body></html>')
    doc.close()
    const style = doc.createElement('style')
    style.textContent = css
    doc.head.appendChild(style)
    doc.body.appendChild(copia)
    await doc.fonts.ready
    const win = iframe.contentWindow!
    const origenRect = copia.getBoundingClientRect()
    const caja = (el: Element): Caja => {
      const r = el.getBoundingClientRect()
      return { x: r.x - origenRect.x, y: r.y - origenRect.y, width: r.width, height: r.height }
    }
    const cells: CeldaImpresion[] = []
    const borders: BordeImpresion[] = []
    const selectors = [
      '.encabezado > div', '.banner > strong', '.banner > span',
      '.lineas th', '.lineas td', '.totales > div > span', '.totales > div > b',
      '.totales > div > input', '.letras', '.composicion-titulo',
      '.cortes-head > span', '.corte > span', '.nota', '.firma > span',
    ].join(',')
    for (const el of copia.querySelectorAll<HTMLElement>(selectors)) {
      const rect = caja(el)
      if (!rect.width || !rect.height) continue
      const input = el.matches('input') ? el as HTMLInputElement : el.querySelector('input')
      const texto = input?.value ?? el.textContent?.trim() ?? ''
      const textoEl = input ?? el.querySelector('.mono, .cell-input') ?? el
      const s = win.getComputedStyle(textoEl)
      let fondo: Element | null = el
      let background = 'FFFFFFFF'
      while (fondo) {
        const bg = win.getComputedStyle(fondo).backgroundColor
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { background = colorExcel(bg); break }
        fondo = fondo.parentElement
      }
      let value: string | number | null = s.textTransform === 'uppercase' ? texto.toLocaleUpperCase('es-AR') : texto
      let numFmt: string | undefined
      const aria = input?.getAttribute('aria-label')
      if (aria === 'Porcentaje' && texto) {
        const tasa = parseTasa(texto)
        if (tasa !== null) {
          value = tasa / 10000
          const decimales = texto.split(',')[1]?.length ?? 0
          numFmt = `${decimales ? `0.${'0'.repeat(decimales)}` : '0'}%`
        }
      } else if (aria === 'Base' || aria === 'Monto' ||
        (!input && textoEl.classList.contains('mono') && !el.closest('.encabezado')) ||
        el.matches('.g-bru:not(.lab), .corte .num')) {
        const centavos = texto ? parsePesos(texto.replace(/−/g, '-')) : null
        if (centavos !== null) {
          value = centavos / 100
          if (el.querySelector('.descuento')) value = -value
          numFmt = texto.includes('$') ? '"$" #,##0.00;"− $" #,##0.00' : '#,##0.00;"−" #,##0.00'
        } else value = texto || null
      }
      const align = s.textAlign
      if (value === '') value = null
      if (typeof value === 'string') numFmt = '@'
      cells.push({ ...rect, value, numFmt, font: s.fontFamily.includes('Mono') ? 'Courier New' : 'Arial',
        size: parseFloat(s.fontSize) * 0.75, bold: Number(s.fontWeight) >= 600,
        italic: s.fontStyle === 'italic', color: colorExcel(s.color), background,
        align: align === 'right' || textoEl.classList.contains('right') || el.matches('.banner > span') ? 'right' : align === 'center' ? 'center' : 'left',
        wrap: !input && s.whiteSpace !== 'nowrap' })
    }
    // Les da a los fondos de banners y totales toda su extensión, incluidos sus márgenes internos.
    for (const el of copia.querySelectorAll<HTMLElement>('.banner, .totales > div')) {
      const children = cells.filter((c) => {
        const r = caja(el)
        return c.x >= r.x - 0.1 && c.y >= r.y - 0.1 && c.x + c.width <= r.x + r.width + 0.1 && c.y + c.height <= r.y + r.height + 0.1
      })
      if (el.matches('.banner') && children.length === 2) {
        const r = caja(el)
        const split = r.x + r.width * 0.68
        Object.assign(children[0], { x: r.x, y: r.y, width: split - r.x, height: r.height })
        Object.assign(children[1], { x: split, y: r.y, width: r.x + r.width - split, height: r.height })
      } else if (children.length === 2) {
        const r = caja(el)
        const mitad = r.y + r.height / 2
        Object.assign(children[0], { x: r.x, y: r.y, width: r.width, height: mitad - r.y })
        Object.assign(children[1], { x: r.x, y: mitad, width: r.width, height: r.y + r.height - mitad })
      }
    }
    for (const el of copia.querySelectorAll<HTMLElement>('.encabezado > div, .lineas th, .lineas td, .totales, .totales > div, .letras, .composicion-body, .firma > span')) {
      const s = win.getComputedStyle(el)
      const sides = (['top', 'bottom', 'left', 'right'] as const).filter((side) => parseFloat(s.getPropertyValue(`border-${side}-width`)) > 0)
      if (sides.length) borders.push({ ...caja(el), sides })
    }
    const svg = copia.querySelector<SVGSVGElement>('.pie')!
    return { width: origenRect.width, height: origenRect.height, cells, borders, chart: { ...caja(svg), png: await pngGrafico(svg, doc) } }
  } finally {
    iframe.remove()
  }
}
