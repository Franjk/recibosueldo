import { conceptoDeLinea, recalcularLinea } from './conceptos.ts'
import { rubroDeLinea } from './calc.ts'
import type { Linea, Recibo, Rubro, TipoLinea } from './types.ts'
import { RUBROS, TIPOS_LINEA } from './types.ts'

export const FORMATO_RECIBO = 'recibo-haberes'
export const VERSION_RECIBO = 2
export const CLAVE_RECIBO_LOCAL = 'recibo-haberes-guardado'

const CAMPOS_TEXTO = [
  'empresa',
  'domicilioLegal',
  'cuitEmpleador',
  'quincena',
  'mes',
  'anio',
  'apellidoNombre',
  'legajo',
  'antiguedad',
  'cuil',
  'categoria',
  'fechaIngreso',
  'lugarPago',
  'bancoDeposito',
  'periodoDeposito',
  'fechaPagoAportes',
  'fechaPago',
] as const satisfies ReadonlyArray<keyof Omit<Recibo, 'lineas'>>

const ETIQUETA_CAMPO: Record<(typeof CAMPOS_TEXTO)[number], string> = {
  empresa: 'empresa',
  domicilioLegal: 'domicilio legal',
  cuitEmpleador: 'CUIT del empleador',
  quincena: 'quincena',
  mes: 'mes',
  anio: 'año',
  apellidoNombre: 'apellido y nombre',
  legajo: 'legajo',
  antiguedad: 'antigüedad',
  cuil: 'CUIL',
  categoria: 'categoría',
  fechaIngreso: 'fecha de ingreso',
  lugarPago: 'lugar de pago',
  bancoDeposito: 'banco de depósito',
  periodoDeposito: 'período de depósito',
  fechaPagoAportes: 'fecha de pago de aportes',
  fechaPago: 'fecha de pago',
}

export function datosRecibo(recibo: Recibo): Recibo {
  return {
    empresa: recibo.empresa,
    domicilioLegal: recibo.domicilioLegal,
    cuitEmpleador: recibo.cuitEmpleador,
    quincena: recibo.quincena,
    mes: recibo.mes,
    anio: recibo.anio,
    apellidoNombre: recibo.apellidoNombre,
    legajo: recibo.legajo,
    antiguedad: recibo.antiguedad,
    cuil: recibo.cuil,
    categoria: recibo.categoria,
    fechaIngreso: recibo.fechaIngreso,
    lugarPago: recibo.lugarPago,
    bancoDeposito: recibo.bancoDeposito,
    periodoDeposito: recibo.periodoDeposito,
    fechaPagoAportes: recibo.fechaPagoAportes,
    fechaPago: recibo.fechaPago,
    lineas: recibo.lineas.map(recalcularLinea).map((linea) => ({
      id: linea.id,
      descripcion: linea.descripcion,
      tipo: linea.tipo,
      rubro: rubroDeLinea(linea.tipo, linea.rubro),
      unidad: linea.unidad,
      baseCentavos: linea.baseCentavos,
      montoCentavos: linea.montoCentavos,
      conceptoId: linea.conceptoId,
      modoCalculo: linea.modoCalculo,
      porcentajeBps: linea.porcentajeBps,
    })),
  }
}

export function guardarReciboLocal(recibo: Recibo): void {
  try {
    localStorage.setItem(CLAVE_RECIBO_LOCAL, serializarRecibo(recibo))
  } catch {
    // Si el navegador rechaza el almacenamiento, el archivo descargado sigue siendo la copia.
  }
}

export function leerReciboLocal(): Recibo | null {
  try {
    const texto = localStorage.getItem(CLAVE_RECIBO_LOCAL)
    if (!texto) return null
    return parsearRecibo(texto)
  } catch {
    return null
  }
}

export function serializarRecibo(recibo: Recibo): string {
  return `${JSON.stringify(
    {
      formato: FORMATO_RECIBO,
      version: VERSION_RECIBO,
      recibo: datosRecibo(recibo),
    },
    null,
    2,
  )}\n`
}

export function nombreArchivoRecibo(recibo: Recibo): string {
  const partes = [recibo.apellidoNombre, recibo.mes, recibo.anio].map(trozoArchivo).filter(Boolean)
  return partes.length > 0 ? `recibo-${partes.join('-')}.json` : 'recibo.json'
}

export function parsearRecibo(texto: string): Recibo {
  let data: unknown
  try {
    data = JSON.parse(texto.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (!esObjeto(data)) throw new Error('El archivo no tiene la forma de un recibo.')

  let cuerpo: unknown = data
  if ('formato' in data || 'version' in data || 'recibo' in data) {
    if (data.formato !== FORMATO_RECIBO) throw new Error('El archivo no es un recibo de haberes.')
    if (data.version !== 1 && data.version !== VERSION_RECIBO) {
      throw new Error('Este archivo usa una versión que esta aplicación no puede leer.')
    }
    if (!('recibo' in data)) throw new Error('El archivo no incluye los datos del recibo.')
    cuerpo = data.recibo
  }
  if (!esObjeto(cuerpo)) throw new Error('El archivo no tiene la forma de un recibo.')

  const recibo = {} as Recibo
  for (const campo of CAMPOS_TEXTO) {
    recibo[campo] = textoCampo(cuerpo[campo], ETIQUETA_CAMPO[campo])
  }
  if (!Array.isArray(cuerpo.lineas)) throw new Error('Las líneas del recibo tienen que ser una lista.')

  const usados = new Set<string>()
  recibo.lineas = cuerpo.lineas.map((linea, indice) => lineaDesdeJson(linea, indice + 1, usados))
  return recibo
}

function trozoArchivo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function textoCampo(valor: unknown, etiqueta: string): string {
  if (valor === undefined) return ''
  if (typeof valor !== 'string') throw new Error(`El campo «${etiqueta}» tiene que ser texto.`)
  return valor
}

function lineaDesdeJson(valor: unknown, numero: number, usados: Set<string>): Linea {
  if (!esObjeto(valor)) throw new Error(`La línea ${numero} no es un objeto.`)
  const tipo = tipoLinea(valor.tipo, numero)
  const linea: Linea = {
    id: idLinea(valor.id, usados),
    descripcion: textoCampo(valor.descripcion, `descripción de la línea ${numero}`),
    tipo,
    rubro: rubroDeLinea(tipo, rubroLinea(valor.rubro, numero)),
    unidad: textoCampo(valor.unidad, `unidad de la línea ${numero}`),
    baseCentavos:
      valor.baseCentavos === undefined
        ? null
        : centavosONulo(
            valor.baseCentavos,
            `La línea ${numero}: la base tiene que ser un número en centavos o nula.`,
          ),
    montoCentavos: centavos(
      valor.montoCentavos === undefined ? 0 : valor.montoCentavos,
      `La línea ${numero}: el monto tiene que ser un número en centavos.`,
    ),
  }

  if (valor.conceptoId !== undefined) {
    linea.conceptoId = textoCampo(valor.conceptoId, `concepto de la línea ${numero}`)
  }
  if (valor.modoCalculo !== undefined) {
    if (valor.modoCalculo !== 'manual' && valor.modoCalculo !== 'porcentaje') {
      throw new Error(`La línea ${numero}: el modo de cálculo no es válido.`)
    }
    linea.modoCalculo = valor.modoCalculo
  }
  if (valor.porcentajeBps !== undefined) {
    if (valor.porcentajeBps !== null && (typeof valor.porcentajeBps !== 'number' || !Number.isSafeInteger(valor.porcentajeBps) || valor.porcentajeBps < 0)) {
      throw new Error(`La línea ${numero}: el porcentaje no es válido.`)
    }
    linea.porcentajeBps = valor.porcentajeBps as number | null
  }
  if (linea.modoCalculo === 'porcentaje' && !conceptoDeLinea(linea)?.porcentual) {
    throw new Error(`La línea ${numero}: el concepto no permite cálculo porcentual.`)
  }
  return recalcularLinea(linea)
}

function tipoLinea(valor: unknown, numero: number): TipoLinea {
  if (valor === undefined) throw new Error(`La línea ${numero}: falta el tipo.`)
  if (typeof valor === 'string' && (TIPOS_LINEA as readonly string[]).includes(valor)) return valor as TipoLinea
  const mostrado = typeof valor === 'string' ? ` «${valor}»` : ''
  throw new Error(`La línea ${numero}: el tipo${mostrado} no es válido.`)
}

function rubroLinea(valor: unknown, numero: number): Rubro | null {
  if (valor === undefined || valor === null || valor === '') return null
  if (typeof valor === 'string' && (RUBROS as readonly string[]).includes(valor)) return valor as Rubro
  const mostrado = typeof valor === 'string' ? ` «${valor}»` : ''
  throw new Error(`La línea ${numero}: el rubro${mostrado} no es válido.`)
}

function idLinea(valor: unknown, usados: Set<string>): string {
  if (typeof valor === 'string' && valor.trim() && !usados.has(valor)) {
    usados.add(valor)
    return valor
  }
  let id = crypto.randomUUID()
  while (usados.has(id)) id = crypto.randomUUID()
  usados.add(id)
  return id
}

function centavosONulo(valor: unknown, mensaje: string): number | null {
  if (valor === null) return null
  return centavos(valor, mensaje)
}

function centavos(valor: unknown, mensaje: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new Error(mensaje)
  const redondeado = Math.round(valor)
  if (!Number.isSafeInteger(redondeado)) throw new Error(mensaje)
  return redondeado
}
