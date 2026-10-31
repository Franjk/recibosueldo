import { describe, expect, it } from 'vitest'
import { reciboVacio } from './calc.ts'
import { nombreArchivoRecibo, parsearRecibo, serializarRecibo } from './io.ts'
import type { Recibo } from './types.ts'

function reciboEjemplo(): Recibo {
  return {
    ...reciboVacio(),
    empresa: 'Acme S.A.',
    apellidoNombre: 'García, Ana',
    mes: 'octubre',
    anio: '2026',
    lineas: [
      {
        id: 'c1',
        descripcion: 'Jubilación',
        tipo: 'contribucion',
        rubro: 'seguridad_social',
        unidad: '12,35',
        baseCentavos: 100_00,
        montoCentavos: 12_35,
      },
      {
        id: 'h1',
        descripcion: 'Sueldo',
        tipo: 'remunerativo',
        rubro: null,
        unidad: '',
        baseCentavos: null,
        montoCentavos: 100_00,
      },
    ],
  }
}

describe('json del recibo', () => {
  it('vuelve a leer lo que exporta', () => {
    const recibo = reciboEjemplo()
    expect(parsearRecibo(serializarRecibo(recibo))).toEqual(recibo)
  })

  it('arma el nombre del archivo con el empleado y el período', () => {
    expect(nombreArchivoRecibo(reciboEjemplo())).toBe('recibo-garcia-ana-octubre-2026.json')
    expect(nombreArchivoRecibo(reciboVacio())).toBe('recibo.json')
  })

  it('acepta el recibo sin el sobre de formato', () => {
    const recibo = parsearRecibo(
      JSON.stringify({
        empresa: 'Norte',
        lineas: [{ id: '1', tipo: 'remunerativo', montoCentavos: 10.6, baseCentavos: null }],
      }),
    )
    expect(recibo.empresa).toBe('Norte')
    expect(recibo.cuitEmpleador).toBe('')
    expect(recibo.lineas[0]).toMatchObject({
      id: '1',
      descripcion: '',
      tipo: 'remunerativo',
      rubro: null,
      unidad: '',
      baseCentavos: null,
      montoCentavos: 11,
    })
  })

  it('ignora una marca de orden de bytes', () => {
    const texto = `\uFEFF${serializarRecibo(reciboEjemplo())}`
    expect(parsearRecibo(texto).empresa).toBe('Acme S.A.')
  })

  it('asigna otro id si la línea lo repite', () => {
    const recibo = parsearRecibo(
      JSON.stringify({
        lineas: [
          { id: 'misma', tipo: 'contribucion', montoCentavos: 1 },
          { id: 'misma', tipo: 'remunerativo', montoCentavos: 2 },
        ],
      }),
    )
    expect(recibo.lineas[0].id).toBe('misma')
    expect(recibo.lineas[1].id).not.toBe('misma')
  })

  it('rechaza un archivo que no se puede leer', () => {
    expect(() => parsearRecibo('{')).toThrow('El archivo no es un JSON válido.')
    expect(() => parsearRecibo('[]')).toThrow('El archivo no tiene la forma de un recibo.')
    expect(() => parsearRecibo(JSON.stringify({ formato: 'otro', version: 1, recibo: {} }))).toThrow(
      'El archivo no es un recibo de haberes.',
    )
    expect(() =>
      parsearRecibo(JSON.stringify({ formato: 'recibo-haberes', version: 2, recibo: {} })),
    ).toThrow('Este archivo usa una versión que esta aplicación no puede leer.')
    expect(() => parsearRecibo(JSON.stringify({ empresa: 'Norte' }))).toThrow(
      'Las líneas del recibo tienen que ser una lista.',
    )
    expect(() => parsearRecibo(JSON.stringify({ empresa: 12, lineas: [] }))).toThrow(
      'El campo «empresa» tiene que ser texto.',
    )
    expect(() =>
      parsearRecibo(JSON.stringify({ lineas: [{ tipo: 'extra', montoCentavos: 1 }] })),
    ).toThrow('La línea 1: el tipo «extra» no es válido.')
    expect(() =>
      parsearRecibo(
        JSON.stringify({ lineas: [{ tipo: 'deduccion', rubro: 'iva', montoCentavos: 1 }] }),
      ),
    ).toThrow('La línea 1: el rubro «iva» no es válido.')
    expect(() =>
      parsearRecibo(JSON.stringify({ lineas: [{ tipo: 'remunerativo', montoCentavos: '10' }] })),
    ).toThrow('La línea 1: el monto tiene que ser un número en centavos.')
  })
})
