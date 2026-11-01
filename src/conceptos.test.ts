import { describe, expect, it } from 'vitest'
import { nuevaLinea, reciboVacio, totales } from './calc.ts'
import { actualizarLinea, CONCEPTOS, esAutomatica, faltaCalculo, recalcularLinea, seleccionarConcepto, sugerirConceptos } from './conceptos.ts'
import { parsearRecibo, serializarRecibo } from './io.ts'

function automatica(id = 'aporte-jubilacion') {
  const concepto = CONCEPTOS.find((item) => item.id === id)!
  return seleccionarConcepto(nuevaLinea(concepto.tipo), concepto)
}

describe('catálogo', () => {
  it('inicia los recibos con la plantilla básica y datos por completar', () => {
    const recibo = reciboVacio()
    expect(recibo.lineas.map((linea) => linea.conceptoId)).toEqual([
      'contribucion-jubilacion', 'contribucion-ley-19032', 'contribucion-fne',
      'contribucion-asignaciones', 'contribucion-obra-social', 'art-porcentual',
      'art-fija', 'seguro-vida', 'sueldo-basico', 'aporte-jubilacion',
      'aporte-ley-19032', 'aporte-obra-social',
    ])
    for (const linea of recibo.lineas) {
      const concepto = CONCEPTOS.find((item) => item.id === linea.conceptoId)!
      expect(linea.rubro).toBe(concepto.rubro)
      expect(esAutomatica(linea)).toBe(concepto.porcentual)
      expect(linea.porcentajeBps).toBeNull()
      expect(linea.baseCentavos).toBeNull()
      expect(linea.montoCentavos).toBe(0)
    }
    expect(totales(recibo.lineas).costoEmpleador).toBe(0)
    expect(totales(recibo.lineas).neto).toBe(0)
    const otro = reciboVacio()
    expect(otro.lineas.some((linea) => recibo.lineas.some((previa) => previa.id === linea.id))).toBe(false)
  })

  it('filtra por tipo, palabras, mayúsculas y tildes', () => {
    expect(sugerirConceptos('remunerativo', 'ANTIGUEDAD').map((item) => item.id)).toEqual(['antiguedad'])
    expect(sugerirConceptos('contribucion', 'social obra').map((item) => item.id)).toEqual(['contribucion-obra-social'])
    expect(sugerirConceptos('no_remunerativo', 'jubilacion')).toEqual([])
    expect(new Set(CONCEPTOS.map((item) => item.id)).size).toBe(CONCEPTOS.length)
  })

  it('completa el rubro, sin asumir una tasa', () => {
    expect(automatica()).toMatchObject({ descripcion: 'Jubilación', rubro: 'seguridad_social', porcentajeBps: null, modoCalculo: 'porcentaje' })
    const art = automatica('art-fija')
    expect(art.rubro).toBe('art')
    expect(esAutomatica(art)).toBe(false)
  })

  it('un nombre coincidente escrito libremente sigue siendo manual', () => {
    const linea = actualizarLinea(nuevaLinea('deduccion'), { descripcion: 'Jubilación', baseCentavos: 10000, unidad: '11', montoCentavos: 123 })
    expect(esAutomatica(linea)).toBe(false)
    expect(recalcularLinea(linea).montoCentavos).toBe(123)
  })
})

describe('cálculo porcentual', () => {
  it('calcula con tasas decimales y redondea a centavos', () => {
    const linea = actualizarLinea(automatica(), { baseCentavos: 123456, porcentajeBps: 1235 })
    expect(linea.montoCentavos).toBe(15247)
    expect(actualizarLinea(linea, { baseCentavos: 100 }).montoCentavos).toBe(12)
    expect(actualizarLinea(linea, { porcentajeBps: 1100 }).montoCentavos).toBe(13580)
  })

  it('distingue datos faltantes de cero', () => {
    let linea = automatica()
    expect(faltaCalculo(linea)).toBe('Faltan base y porcentaje')
    linea = actualizarLinea(linea, { baseCentavos: 0 })
    expect(faltaCalculo(linea)).toBe('Falta porcentaje')
    linea = actualizarLinea(linea, { porcentajeBps: 0 })
    expect(faltaCalculo(linea)).toBeNull()
    expect(linea.montoCentavos).toBe(0)
    expect(faltaCalculo(actualizarLinea(linea, { baseCentavos: null }))).toBe('Falta base')
  })

  it('conserva el monto al pasar a manual y recalcula al volver', () => {
    const calculada = actualizarLinea(automatica(), { baseCentavos: 10000, porcentajeBps: 1100 })
    let manual = actualizarLinea(calculada, { modoCalculo: 'manual' })
    expect(manual.montoCentavos).toBe(1100)
    manual = actualizarLinea(manual, { montoCentavos: 777, baseCentavos: 20000 })
    expect(manual.montoCentavos).toBe(777)
    expect(actualizarLinea(manual, { modoCalculo: 'porcentaje' }).montoCentavos).toBe(2200)
  })

  it('editar la descripción o el tipo desactiva la fórmula conservando el monto', () => {
    const linea = actualizarLinea(automatica(), { baseCentavos: 10000, porcentajeBps: 1100 })
    for (const patch of [{ descripcion: 'Mi concepto' }, { tipo: 'no_remunerativo' as const }]) {
      expect(actualizarLinea(linea, patch)).toMatchObject({ modoCalculo: 'manual', conceptoId: undefined, montoCentavos: 1100 })
    }
  })

  it('actualiza totales de ambas tablas y composición', () => {
    const sueldo = { ...nuevaLinea('remunerativo'), montoCentavos: 10000 }
    const deduccion = actualizarLinea(automatica(), { baseCentavos: 10000, porcentajeBps: 1100 })
    const contribucion = actualizarLinea(automatica('art-porcentual'), { baseCentavos: 10000, porcentajeBps: 200 })
    const tot = totales([sueldo, deduccion, contribucion])
    expect(tot.neto).toBe(8900)
    expect(tot.costoEmpleador).toBe(10200)
    expect(tot.porRubro.art.empleador).toBe(200)
    expect(tot.porRubro.seguridad_social.trabajador).toBe(1100)
    expect(totales([automatica()]).deducciones).toBe(0)
  })
})

describe('compatibilidad de archivos', () => {
  it('conserva modos, tasa, base, concepto y monto en una exportación', () => {
    const automatico = actualizarLinea(automatica(), { baseCentavos: 10000, porcentajeBps: 1100 })
    const manual = actualizarLinea(automatico, { id: 'manual', modoCalculo: 'manual', montoCentavos: 777 })
    const recibo = { ...reciboVacio(), lineas: [automatico, manual, automatica('presentismo')] }
    expect(parsearRecibo(serializarRecibo(recibo))).toEqual(recibo)
  })

  it('mantiene manuales los recibos versión 1 sin inferir por descripción', () => {
    const anterior = { ...nuevaLinea('deduccion'), descripcion: 'Jubilación', unidad: '11', baseCentavos: 10000, montoCentavos: 777 }
    const recibo = parsearRecibo(JSON.stringify({ formato: 'recibo-haberes', version: 1, recibo: { lineas: [anterior] } }))
    expect(recibo.lineas[0]).toEqual(anterior)
    expect(totales(recibo.lineas).deducciones).toBe(777)
  })

  it('recalcula montos automáticos importados en lugar de confiar en el monto guardado', () => {
    const linea = { ...actualizarLinea(automatica(), { baseCentavos: 10000, porcentajeBps: 1100 }), montoCentavos: 9999 }
    expect(parsearRecibo(JSON.stringify({ lineas: [linea] })).lineas[0].montoCentavos).toBe(1100)
  })

  it('rechaza tasas inválidas y fórmulas para conceptos manuales o desconocidos', () => {
    for (const porcentajeBps of [-1, 1.5, '11', Infinity]) {
      expect(() => parsearRecibo(JSON.stringify({ lineas: [{ ...automatica(), porcentajeBps: porcentajeBps === Infinity ? 'Infinity' : porcentajeBps }] }))).toThrow('el porcentaje no es válido')
    }
    for (const conceptoId of ['ganancias', 'desconocido']) {
      expect(() => parsearRecibo(JSON.stringify({ lineas: [{ ...automatica(), conceptoId }] }))).toThrow('el concepto no permite')
    }
  })
})
