import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { CONCEPTOS } from './conceptos.ts'
import { nuevaLinea, reciboVacio } from './calc.ts'

const datos = new Map<string, string>()
let useStore: (typeof import('./store.ts'))['useStore']

beforeAll(async () => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => datos.get(key) ?? null,
    setItem: (key: string, value: string) => { datos.set(key, value) },
    removeItem: (key: string) => { datos.delete(key) },
  })
  vi.stubGlobal('window', { localStorage })
  useStore = (await import('./store.ts')).useStore
})
afterAll(() => vi.unstubAllGlobals())

describe('persistencia de cálculos', () => {
  it('vaciar limpia los datos y restaura la plantilla inicial', () => {
    useStore.getState().cargar({
      ...reciboVacio(),
      empresa: 'Empresa de prueba',
      apellidoNombre: 'Persona de prueba',
      lineas: [{ ...nuevaLinea('remunerativo'), descripcion: 'Concepto propio', montoCentavos: 50000 }],
    })
    useStore.getState().vaciar()
    expect(useStore.getState().empresa).toBe('')
    expect(useStore.getState().apellidoNombre).toBe('')
    expect(useStore.getState().lineas.map((linea) => linea.conceptoId)).toEqual(reciboVacio().lineas.map((linea) => linea.conceptoId))
    expect(useStore.getState().lineas.every((linea) => linea.montoCentavos === 0 && linea.baseCentavos === null && linea.porcentajeBps === null)).toBe(true)
  })

  it('cargar y migrar recibos existentes conserva sus filas sin agregar la plantilla', async () => {
    const linea = { ...nuevaLinea('remunerativo'), descripcion: 'Mi sueldo', montoCentavos: 50000 }
    useStore.getState().cargar({ ...reciboVacio(), lineas: [linea] })
    expect(useStore.getState().lineas).toEqual([linea])
    datos.set('recibo-wysiwyg-v1', JSON.stringify({ version: 3, state: { ...reciboVacio(), lineas: [] } }))
    await useStore.persist.rehydrate()
    expect(useStore.getState().lineas).toEqual([])
  })

  it('restaura el modo, base, tasa y monto después de hidratar el almacenamiento', async () => {
    useStore.getState().vaciar()
    const id = useStore.getState().lineas.find((linea) => linea.tipo === 'contribucion')!.id
    useStore.getState().seleccionarConcepto(id, CONCEPTOS.find((item) => item.id === 'art-porcentual')!)
    useStore.getState().setLinea(id, { baseCentavos: 10000000, porcentajeBps: 163 })
    const guardado = datos.get('recibo-wysiwyg-v1')!
    const esperada = useStore.getState().lineas.find((linea) => linea.id === id)!
    expect(esperada.montoCentavos).toBe(163000)
    useStore.getState().vaciar()
    datos.set('recibo-wysiwyg-v1', guardado)
    await useStore.persist.rehydrate()
    expect(useStore.getState().lineas.find((linea) => linea.id === id)).toEqual(esperada)
  })

  it('migra las filas antiguas sin inferir fórmulas ni modificar los montos', async () => {
    const anterior = { ...nuevaLinea('deduccion'), descripcion: 'Jubilación', unidad: '11', baseCentavos: 10000, montoCentavos: 777 }
    datos.set('recibo-wysiwyg-v1', JSON.stringify({ version: 3, state: { ...reciboVacio(), lineas: [anterior] } }))
    await useStore.persist.rehydrate()
    expect(useStore.getState().lineas[0]).toMatchObject({ ...anterior, modoCalculo: 'manual' })
    expect(useStore.getState().lineas[0].conceptoId).toBeUndefined()
  })
})
