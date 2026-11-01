import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { reciboVacio } from './calc.ts'
import { CONCEPTOS, seleccionarConcepto } from './conceptos.ts'
import { generarExcel, nombreArchivoExcel } from './excel.ts'
import type { Linea } from './types.ts'
import type { LayoutImpresion } from './printLayout.ts'

const impresion: LayoutImpresion = {
  width: 700, height: 1000,
  cells: [
    { x: 0, y: 0, width: 500, height: 25, value: 'COSTO TOTAL EMPLEADOR', font: 'Arial', size: 9, bold: true, italic: false, color: 'FFFFFFFF', background: 'FF2C2C2C', align: 'left' },
    { x: 500, y: 0, width: 200, height: 25, value: 104.26, numFmt: '"$" #,##0.00', font: 'Arial', size: 9, bold: true, italic: false, color: 'FFFFFFFF', background: 'FF2C2C2C', align: 'right' },
  ],
  borders: [{ x: 0, y: 0, width: 700, height: 25, sides: ['top', 'bottom'] }],
  chart: { x: 350, y: 600, width: 350, height: 200, png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==' },
}

function linea(patch: Partial<Linea>): Linea {
  return { id: '1', descripcion: 'Sueldo', tipo: 'remunerativo', rubro: null, unidad: '', baseCentavos: null, montoCentavos: 100_01, ...patch }
}

function buscarFila(hoja: ExcelJS.Worksheet, texto: string): ExcelJS.Row {
  let encontrada: ExcelJS.Row | undefined
  hoja.eachRow((fila) => {
    if (fila.getCell(1).value === texto) encontrada = fila
  })
  if (!encontrada) throw new Error(`Falta la fila ${texto}`)
  return encontrada
}

describe('exportación a Excel', () => {
  it('genera un xlsx legible con importes numéricos y los mismos totales que el recibo', async () => {
    const automatico = seleccionarConcepto(linea({}), CONCEPTOS.find((item) => item.id === 'aporte-jubilacion')!)
    const recibo = {
      ...reciboVacio(),
      empresa: '=SUM(A1:A2)',
      apellidoNombre: 'García, Ana',
      legajo: '0007',
      cuil: '20-01234567-9',
      mes: 'octubre',
      anio: '2026',
      lineas: [
        linea({}),
        linea({ id: '2', descripcion: 'Bono', tipo: 'no_remunerativo', montoCentavos: 20_50 }),
        { ...automatico, id: '3', baseCentavos: 100_01, porcentajeBps: 1100, montoCentavos: 999999 },
        linea({ id: '4', descripcion: 'ART', tipo: 'contribucion', rubro: 'art', montoCentavos: 5_25 }),
        linea({ id: '5', descripcion: 'Ajuste', montoCentavos: -1_00 }),
      ],
    }
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(await generarExcel(recibo, impresion))
    const hoja = libro.getWorksheet('Datos')!
    const vista = libro.worksheets[0]
    expect(vista.name).toBe('Recibo')
    expect(vista.pageSetup.orientation).toBe('portrait')
    expect(vista.pageSetup.paperSize).toBe(9)
    expect(vista.pageSetup.fitToWidth).toBe(1)
    expect(vista.pageSetup.fitToHeight).toBe(1)
    expect(vista.views[0].showGridLines).toBe(false)
    expect(buscarFila(vista, 'COSTO TOTAL EMPLEADOR').getCell(1).font.color?.argb).toBe('FFFFFFFF')
    expect(vista.getImages()).toHaveLength(1)
    expect(vista.getImages()[0].range.tl).toMatchObject({ nativeCol: 1, nativeRow: 2 })
    expect(vista.getImages()[0].range.br).toMatchObject({ nativeCol: 3, nativeRow: 3 })
    expect(buscarFila(hoja, 'Empleador').getCell(2).value).toBe('=SUM(A1:A2)')
    expect(buscarFila(hoja, 'Nro. legajo').getCell(2).value).toBe('0007')
    expect(buscarFila(hoja, 'CUIL').getCell(2).value).toBe(recibo.cuil)
    expect(buscarFila(hoja, 'Sueldo').getCell(6).value).toBe(100.01)
    expect(buscarFila(hoja, 'Jubilación').getCell(4).value).toBe(0.11)
    expect(buscarFila(hoja, 'Jubilación').getCell(4).numFmt).toBe('0.00%')
    expect(buscarFila(hoja, 'Jubilación').getCell(6).value).toBe(11)
    expect(buscarFila(hoja, 'Sueldo bruto').getCell(6).value).toBe(99.01)
    expect(buscarFila(hoja, 'Sueldo neto').getCell(6).value).toBe(108.51)
    expect(buscarFila(hoja, 'Costo total empleador').getCell(6).value).toBe(104.26)
    expect(buscarFila(hoja, 'Seguridad Social').getCell(3).value).toBe(11)
    expect(buscarFila(hoja, 'ART').getCell(2).value).toBe(5.25)
    expect(recibo.lineas[2].montoCentavos).toBe(999999)
    expect(nombreArchivoExcel(recibo)).toBe('recibo-garcia-ana-octubre-2026.xlsx')
  })

  it('distingue cálculos pendientes, bases vacías e importes en cero', async () => {
    const pendiente = seleccionarConcepto(linea({}), CONCEPTOS.find((item) => item.id === 'antiguedad')!)
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(await generarExcel({
      ...reciboVacio(),
      lineas: [pendiente, linea({ id: '2', descripcion: 'Cero', baseCentavos: 0, montoCentavos: 0 })],
    }, impresion))
    const hoja = libro.getWorksheet('Datos')!
    const fila = buscarFila(hoja, 'Antigüedad')
    expect(fila.getCell(5).value).toBeNull()
    expect(fila.getCell(6).value).toBeNull()
    expect(fila.getCell(7).value).toBe('Faltan base y porcentaje')
    expect(buscarFila(hoja, 'Cero').getCell(5).value).toBe(0)
    expect(buscarFila(hoja, 'Cero').getCell(6).value).toBe(0)
    expect(buscarFila(hoja, 'Sueldo neto').getCell(6).value).toBe(0)
    expect(nombreArchivoExcel(reciboVacio())).toBe('recibo.xlsx')
  })

  it('permite exportar un recibo sin conceptos', async () => {
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(await generarExcel({ ...reciboVacio(), lineas: [] }, impresion))
    expect(buscarFila(libro.getWorksheet('Datos')!, 'Sueldo neto').getCell(6).value).toBe(0)
  })

  it('permite varias páginas en recibos largos sin reducir todo a una sola página', async () => {
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(await generarExcel(reciboVacio(), { ...impresion, height: 2000 }))
    expect(libro.worksheets[0].pageSetup.fitToWidth).toBe(1)
    expect(libro.worksheets[0].pageSetup.fitToHeight).toBe(0)
  })
})
