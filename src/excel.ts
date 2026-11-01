import ExcelJS from 'exceljs'
import { totales } from './calc.ts'
import { esAutomatica, faltaCalculo } from './conceptos.ts'
import { datosRecibo, nombreArchivoRecibo } from './io.ts'
import { enLetrasPesos } from './letras.ts'
import { RUBROS, RUBRO_LABEL, TIPO_HABER_LABEL, type Recibo } from './types.ts'
import type { LayoutImpresion } from './printLayout.ts'

const MONEDA = '"$" #,##0.00;[Red]-"$" #,##0.00'

export function nombreArchivoExcel(recibo: Recibo): string {
  return nombreArchivoRecibo(recibo).replace(/\.json$/, '.xlsx')
}

// Exporta una copia de los valores actuales usando los mismos cálculos que la pantalla.
export async function generarExcel(recibo: Recibo, impresion: LayoutImpresion): Promise<ArrayBuffer> {
  const datos = datosRecibo(recibo)
  const total = totales(datos.lineas)
  const libro = new ExcelJS.Workbook()
  agregarVistaImpresion(libro, impresion)
  const hoja = libro.addWorksheet('Datos', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  hoja.columns = [48, 24, 26, 18, 20, 20, 30].map((width) => ({ width }))

  function titulo(texto: string) {
    const fila = hoja.addRow([texto])
    hoja.mergeCells(fila.number, 1, fila.number, 7)
    fila.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
    fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C2C2C' } }
    fila.height = 26
  }

  titulo('RECIBO DE HABERES')
  const campos: Array<[string, string]> = [
    ['Empleador', datos.empresa],
    ['Domicilio legal', datos.domicilioLegal],
    ['CUIT empleador', datos.cuitEmpleador],
    ['Quincena', datos.quincena],
    ['Mes', datos.mes],
    ['Año', datos.anio],
    ['Apellido y nombre', datos.apellidoNombre],
    ['Nro. legajo', datos.legajo],
    ['Fecha de ingreso', datos.fechaIngreso],
    ['Antigüedad', datos.antiguedad],
    ['CUIL', datos.cuil],
    ['Categoría laboral', datos.categoria],
    ['Lugar de pago', datos.lugarPago],
    ['Banco del depósito', datos.bancoDeposito],
    ['Período del depósito', datos.periodoDeposito],
    ['Fecha pago aportes', datos.fechaPagoAportes],
    ['Fecha de pago', datos.fechaPago],
  ]
  for (const [etiqueta, valor] of campos) {
    const fila = hoja.addRow([etiqueta, valor])
    fila.getCell(1).font = { bold: true }
    hoja.mergeCells(fila.number, 2, fila.number, 7)
  }

  hoja.addRow([])
  titulo('CONCEPTOS')
  const encabezado = hoja.addRow(['Concepto', 'Tipo', 'Rubro', 'Unidad / porcentaje', 'Base', 'Monto', 'Estado'])
  encabezado.font = { bold: true }
  hoja.views = [{ state: 'frozen', ySplit: encabezado.number }]
  for (const linea of datos.lineas) {
    const pendiente = faltaCalculo(linea)
    const automatico = esAutomatica(linea)
    const fila = hoja.addRow([
      linea.descripcion,
      linea.tipo === 'contribucion' ? 'Contribución empleador' : TIPO_HABER_LABEL[linea.tipo],
      linea.rubro ? RUBRO_LABEL[linea.rubro] : '',
      automatico ? (linea.porcentajeBps == null ? null : linea.porcentajeBps / 10000) : linea.unidad,
      linea.baseCentavos === null ? null : linea.baseCentavos / 100,
      pendiente ? null : linea.montoCentavos / 100,
      pendiente ?? '',
    ])
    if (automatico) fila.getCell(4).numFmt = '0.00%'
    fila.getCell(5).numFmt = MONEDA
    fila.getCell(6).numFmt = MONEDA
  }

  hoja.addRow([])
  titulo('TOTALES')
  for (const [etiqueta, centavos] of [
    ['Costo total empleador', total.costoEmpleador],
    ['Contribuciones empleador', total.contribuciones],
    ['Sueldo bruto', total.bruto],
    ['Remunerativo', total.remunerativo],
    ['No remunerativo', total.noRemunerativo],
    ['Descuentos', total.deducciones],
    ['Sueldo neto', total.neto],
  ] as const) {
    const fila = hoja.addRow([etiqueta, null, null, null, null, centavos / 100])
    fila.font = { bold: true }
    fila.getCell(6).numFmt = MONEDA
  }
  const letras = hoja.addRow([enLetrasPesos(total.neto)])
  hoja.mergeCells(letras.number, 1, letras.number, 7)
  if (datos.lineas.some((linea) => faltaCalculo(linea))) {
    const aviso = hoja.addRow(['Hay conceptos pendientes de cálculo. Los totales los consideran en cero, igual que en el recibo.'])
    hoja.mergeCells(aviso.number, 1, aviso.number, 7)
  }

  hoja.addRow([])
  titulo('DETALLE DE LA COMPOSICIÓN SALARIAL')
  hoja.addRow(['Concepto', 'Empleador', 'Empleado', 'Total']).font = { bold: true }
  for (const rubro of RUBROS) {
    const corte = total.porRubro[rubro]
    const fila = hoja.addRow([RUBRO_LABEL[rubro], corte.empleador / 100, corte.trabajador / 100, corte.total / 100])
    for (const columna of [2, 3, 4]) fila.getCell(columna).numFmt = MONEDA
  }
  hoja.eachRow((fila) => {
    fila.alignment = { vertical: 'middle', wrapText: true }
  })
  const buffer = await libro.xlsx.writeBuffer()
  return new Uint8Array(buffer).buffer
}

function agregarVistaImpresion(libro: ExcelJS.Workbook, layout: LayoutImpresion) {
  const hoja = libro.addWorksheet('Recibo', {
    views: [{ showGridLines: false, zoomScale: 100 }],
    pageSetup: {
      paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1,
      fitToHeight: layout.height <= 281 * 96 / 25.4 + 1 ? 1 : 0,
      margins: { left: 8 / 25.4, right: 8 / 25.4, top: 8 / 25.4, bottom: 8 / 25.4, header: 0, footer: 0 },
    },
  })
  // Usa los bordes reales de la vista de impresión como cuadrícula para ubicar
  // cada tabla y campo, sin mantener una segunda plantilla del recibo.
  function limites(valores: number[]) {
    const unicos: number[] = []
    for (const n of valores.sort((a, b) => a - b)) {
      if (unicos.length === 0 || n - unicos[unicos.length - 1] > 0.4) unicos.push(n)
    }
    return unicos
  }
  const cajas = [...layout.cells, ...layout.borders, layout.chart]
  const xs = limites([0, layout.width, ...cajas.flatMap((c) => [c.x, c.x + c.width])])
  const ys = limites([0, layout.height, ...cajas.flatMap((c) => [c.y, c.y + c.height])])
  function indice(limites: number[], valor: number) {
    return limites.reduce((mejor, n, i) => Math.abs(n - valor) < Math.abs(limites[mejor] - valor) ? i : mejor, 0)
  }
  for (let i = 0; i < xs.length - 1; i++) {
    const px = xs[i + 1] - xs[i]
    hoja.getColumn(i + 1).width = px < 12 ? px / 12 : (px - 5) / 7
  }
  for (let i = 0; i < ys.length - 1; i++) hoja.getRow(i + 1).height = (ys[i + 1] - ys[i]) * 0.75
  for (const celda of layout.cells) {
    const left = indice(xs, celda.x) + 1
    const right = indice(xs, celda.x + celda.width)
    const top = indice(ys, celda.y) + 1
    const bottom = indice(ys, celda.y + celda.height)
    if (right < left || bottom < top) continue
    if (right > left || bottom > top) hoja.mergeCells(top, left, bottom, right)
    const cell = hoja.getCell(top, left)
    cell.value = celda.value
    cell.font = { name: celda.font, size: celda.size, bold: celda.bold, italic: celda.italic, color: { argb: celda.color } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: celda.background } }
    cell.alignment = { horizontal: celda.align, vertical: 'middle', wrapText: celda.wrap ?? false }
    if (celda.numFmt) cell.numFmt = celda.numFmt
  }
  for (const borde of layout.borders) {
    const left = indice(xs, borde.x) + 1
    const right = indice(xs, borde.x + borde.width)
    const top = indice(ys, borde.y) + 1
    const bottom = indice(ys, borde.y + borde.height)
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const cell = hoja.getCell(row, col)
        const border = { ...cell.border }
        for (const side of borde.sides) {
          if ((side === 'left' && col === left) || (side === 'right' && col === right) ||
            (side === 'top' && row === top) || (side === 'bottom' && row === bottom)) {
            border[side] = { style: 'hair', color: { argb: 'FF222222' } }
          }
        }
        cell.style = { ...cell.style, border }
      }
    }
  }
  const chart = layout.chart
  const imageId = libro.addImage({ base64: chart.png, extension: 'png' })
  // Ancla a la misma cuadrícula que las tablas, para que no las tape al abrir o imprimir.
  hoja.addImage(imageId, {
    tl: { col: indice(xs, chart.x), row: indice(ys, chart.y) } as ExcelJS.Anchor,
    br: { col: indice(xs, chart.x + chart.width), row: indice(ys, chart.y + chart.height) } as ExcelJS.Anchor,
    editAs: 'absolute',
  })
  hoja.pageSetup.printArea = `A1:${hoja.getColumn(xs.length - 1).letter}${ys.length - 1}`
  hoja.properties.defaultRowHeight = 12
}
