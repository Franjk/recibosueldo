import { describe, expect, it } from 'vitest'
import { reordenarLinea, totales } from './calc.ts'
import { enLetrasPesos, numeroEnLetras } from './letras.ts'
import { parsePesos, porcentaje } from './money.ts'
import type { Linea } from './types.ts'

function linea(
  parcial: Pick<Linea, 'descripcion' | 'tipo' | 'rubro' | 'montoCentavos'> &
    Partial<Pick<Linea, 'unidad' | 'baseCentavos'>>,
): Linea {
  return {
    id: parcial.descripcion,
    unidad: parcial.unidad ?? '',
    baseCentavos: parcial.baseCentavos ?? null,
    ...parcial,
  }
}

describe('pesos', () => {
  it('lee montos con punto de miles y coma decimal', () => {
    expect(parsePesos('1.234,56')).toBe(123456)
    expect(parsePesos('$ 1.234,56')).toBe(123456)
    expect(parsePesos('1234.56')).toBe(123456)
    expect(parsePesos('1.234')).toBe(123400)
    expect(parsePesos('')).toBe(0)
    expect(parsePesos('abc')).toBeNull()
  })

  it('redondea un porcentaje en centavos', () => {
    expect(porcentaje(100_000_000, 1100)).toBe(11_000_000)
  })
})

describe('letras', () => {
  it('escribe el neto como en un recibo', () => {
    expect(numeroEnLetras(0)).toBe('cero')
    expect(numeroEnLetras(21)).toBe('veintiuno')
    expect(enLetrasPesos(299_340_400)).toBe(
      'Son pesos dos millones novecientos noventa y tres mil cuatrocientos cuatro con 00/100',
    )
  })
})

describe('reordenar líneas', () => {
  const lineas = [
    linea({ descripcion: 'c1', tipo: 'contribucion', rubro: null, montoCentavos: 1 }),
    linea({ descripcion: 'c2', tipo: 'contribucion', rubro: null, montoCentavos: 2 }),
    linea({ descripcion: 'h1', tipo: 'remunerativo', rubro: null, montoCentavos: 3 }),
    linea({ descripcion: 'h2', tipo: 'deduccion', rubro: 'obra_social', montoCentavos: 4 }),
  ]

  it('lleva un concepto antes de otra fila de la misma tabla', () => {
    expect(reordenarLinea(lineas, 'c2', 'c1', 'antes').map((item) => item.id)).toEqual([
      'c2',
      'c1',
      'h1',
      'h2',
    ])
  })

  it('lleva un concepto después de otra fila de la misma tabla', () => {
    expect(reordenarLinea(lineas, 'h1', 'h2', 'despues').map((item) => item.id)).toEqual([
      'c1',
      'c2',
      'h2',
      'h1',
    ])
  })

  it('no mezcla contribuciones con haberes', () => {
    expect(reordenarLinea(lineas, 'c1', 'h1', 'antes')).toBe(lineas)
  })

  it('conserva el arreglo si el orden no cambia', () => {
    expect(reordenarLinea(lineas, 'h2', 'h2', 'despues')).toBe(lineas)
    expect(reordenarLinea(lineas, 'c1', 'c2', 'antes')).toBe(lineas)
  })
})

describe('cámaras empresariales', () => {
  it('suma la contribución patronal en su rubro', () => {
    const tot = totales([
      linea({
        descripcion: 'Aporte cámara',
        tipo: 'contribucion',
        rubro: 'camaras',
        montoCentavos: 1_500,
      }),
    ])
    expect(tot.porRubro.camaras).toEqual({
      total: 1_500,
      empleador: 1_500,
      trabajador: 0,
    })
  })
})

describe('recibo de octubre', () => {
  const lineas: Linea[] = [
    linea({
      descripcion: '11100 - Contribución Jubilación',
      tipo: 'contribucion',
      rubro: 'seguridad_social',
      unidad: '12,35',
      baseCentavos: 364_352_532,
      montoCentavos: 44_997_538,
    }),
    linea({
      descripcion: '11150 - Contribución Ley 19032',
      tipo: 'contribucion',
      rubro: 'inssjp',
      unidad: '1,57',
      baseCentavos: 364_352_532,
      montoCentavos: 5_720_335,
    }),
    linea({
      descripcion: '11160 - Contribución F.N.E.',
      tipo: 'contribucion',
      rubro: 'seguridad_social',
      unidad: '1,08',
      baseCentavos: 364_352_532,
      montoCentavos: 3_935_007,
    }),
    linea({
      descripcion: '11170 - Contrib. Asign Familiares',
      tipo: 'contribucion',
      rubro: 'seguridad_social',
      unidad: '5,40',
      baseCentavos: 364_352_532,
      montoCentavos: 19_675_037,
    }),
    linea({
      descripcion: '11180 - Contrib. Obra Social',
      tipo: 'contribucion',
      rubro: 'obra_social',
      unidad: '6,00',
      baseCentavos: 365_052_900,
      montoCentavos: 21_903_174,
    }),
    linea({
      descripcion: '11188 - Contr.Seguro Vida Obligatorio',
      tipo: 'contribucion',
      rubro: 'scvo',
      unidad: '424,62',
      montoCentavos: 42_462,
    }),
    linea({
      descripcion: '11300 - Contrib. ART - Suma Fija',
      tipo: 'contribucion',
      rubro: 'art',
      unidad: '1.935,00',
      montoCentavos: 193_500,
    }),
    linea({
      descripcion: '11305 - Contrib. ART - Porcentaje',
      tipo: 'contribucion',
      rubro: 'art',
      unidad: '1,63',
      baseCentavos: 365_052_900,
      montoCentavos: 5_939_411,
    }),
    linea({
      descripcion: '01100 - Sueldo Basico',
      tipo: 'remunerativo',
      rubro: null,
      unidad: '30,00',
      montoCentavos: 365_052_900,
    }),
    linea({
      descripcion: '06005 - Jubilacion',
      tipo: 'deduccion',
      rubro: 'seguridad_social',
      unidad: '11,00',
      baseCentavos: 365_052_900,
      montoCentavos: 40_155_819,
    }),
    linea({
      descripcion: '06010 - Ley 19032',
      tipo: 'deduccion',
      rubro: 'inssjp',
      unidad: '3,00',
      baseCentavos: 365_052_900,
      montoCentavos: 10_951_587,
    }),
    linea({
      descripcion: '06030 - Obra Social',
      tipo: 'deduccion',
      rubro: 'obra_social',
      unidad: '3,00',
      baseCentavos: 365_052_900,
      montoCentavos: 10_951_587,
    }),
    linea({
      descripcion: '13900 - Imp. a las Ganancias 4ta Cat.',
      tipo: 'deduccion',
      rubro: null,
      montoCentavos: 3_653_515,
    }),
    linea({
      descripcion: '16000 - Redondeo',
      tipo: 'no_remunerativo',
      rubro: null,
      montoCentavos: 8,
    }),
  ]

  it('reproduce los totales del recibo de octubre', () => {
    const tot = totales(lineas)
    expect(tot.contribuciones).toBe(102_406_464)
    expect(tot.bruto).toBe(365_052_900)
    expect(tot.remunerativo).toBe(365_052_900)
    expect(tot.noRemunerativo).toBe(8)
    expect(tot.deducciones).toBe(65_712_508)
    expect(tot.neto).toBe(299_340_400)
    expect(tot.costoEmpleador).toBe(467_459_364)
    expect(tot.porRubro.seguridad_social).toEqual({
      total: 108_763_401,
      empleador: 68_607_582,
      trabajador: 40_155_819,
    })
    expect(tot.porRubro.obra_social).toEqual({
      total: 32_854_761,
      empleador: 21_903_174,
      trabajador: 10_951_587,
    })
    expect(tot.porRubro.inssjp).toEqual({
      total: 16_671_922,
      empleador: 5_720_335,
      trabajador: 10_951_587,
    })
    expect(tot.porRubro.art).toEqual({
      total: 6_132_911,
      empleador: 6_132_911,
      trabajador: 0,
    })
    expect(tot.porRubro.camaras).toEqual({
      total: 0,
      empleador: 0,
      trabajador: 0,
    })
    expect(tot.porRubro.scvo).toEqual({
      total: 42_462,
      empleador: 42_462,
      trabajador: 0,
    })
    expect(tot.baseTorta).toBe(463_805_849)
    const neto = tot.partesTorta.find((parte) => parte.key === 'neto')
    expect(neto?.pct).toBeCloseTo(64.54, 2)
  })
})
