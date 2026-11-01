import type { Linea, Rubro, TipoLinea } from './types.ts'
import { porcentaje } from './money.ts'

export interface Concepto {
  id: string
  descripcion: string
  tipo: TipoLinea
  rubro: Rubro | null
  porcentual: boolean
}

function concepto(id: string, descripcion: string, tipo: TipoLinea, porcentual = false, rubro: Rubro | null = null): Concepto {
  return { id, descripcion, tipo, porcentual, rubro }
}

export const CONCEPTOS: readonly Concepto[] = [
  concepto('sueldo-basico', 'Sueldo básico', 'remunerativo'),
  concepto('antiguedad', 'Antigüedad', 'remunerativo', true),
  concepto('presentismo', 'Presentismo', 'remunerativo', true),
  concepto('horas-extra-50', 'Horas extra al 50 %', 'remunerativo'),
  concepto('horas-extra-100', 'Horas extra al 100 %', 'remunerativo'),
  concepto('aguinaldo', 'Aguinaldo', 'remunerativo'),
  concepto('vacaciones', 'Vacaciones', 'remunerativo'),
  concepto('suma-no-remunerativa', 'Suma no remunerativa', 'no_remunerativo'),
  concepto('redondeo', 'Redondeo', 'no_remunerativo'),
  concepto('aporte-jubilacion', 'Jubilación', 'deduccion', true, 'seguridad_social'),
  concepto('aporte-ley-19032', 'Ley 19032', 'deduccion', true, 'inssjp'),
  concepto('aporte-obra-social', 'Obra social', 'deduccion', true, 'obra_social'),
  concepto('cuota-sindical', 'Cuota sindical', 'deduccion', true, 'sindical'),
  concepto('aporte-solidario', 'Aporte solidario', 'deduccion', true, 'sindical'),
  concepto('ganancias', 'Impuesto a las Ganancias 4ta Categoría', 'deduccion'),
  concepto('anticipo', 'Anticipo de sueldo', 'deduccion'),
  concepto('contribucion-jubilacion', 'Contribución jubilación', 'contribucion', true, 'seguridad_social'),
  concepto('contribucion-ley-19032', 'Contribución Ley 19032', 'contribucion', true, 'inssjp'),
  concepto('contribucion-fne', 'Fondo Nacional de Empleo (FNE)', 'contribucion', true, 'seguridad_social'),
  concepto('contribucion-asignaciones', 'Asignaciones familiares', 'contribucion', true, 'seguridad_social'),
  concepto('contribucion-obra-social', 'Contribución obra social', 'contribucion', true, 'obra_social'),
  concepto('art-porcentual', 'ART porcentual', 'contribucion', true, 'art'),
  concepto('art-fija', 'ART suma fija', 'contribucion', false, 'art'),
  concepto('seguro-vida', 'Seguro de vida obligatorio', 'contribucion', false, 'scvo'),
  concepto('camara-empresarial', 'Contribución a cámara empresarial', 'contribucion', true, 'camaras'),
]

// Plantilla inicial editable; las tasas y bases se completan en cada recibo.
export const CONCEPTOS_INICIALES = CONCEPTOS.filter((item) => [
  'contribucion-jubilacion',
  'contribucion-ley-19032',
  'contribucion-fne',
  'contribucion-asignaciones',
  'contribucion-obra-social',
  'art-porcentual',
  'art-fija',
  'seguro-vida',
  'sueldo-basico',
  'aporte-jubilacion',
  'aporte-ley-19032',
  'aporte-obra-social',
].includes(item.id)).sort((a, b) => Number(b.tipo === 'contribucion') - Number(a.tipo === 'contribucion'))

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

export function sugerirConceptos(tipo: TipoLinea, texto: string): Concepto[] {
  const palabras = normalizar(texto).split(/\s+/)
  return CONCEPTOS.filter((item) => item.tipo === tipo && palabras.every((palabra) => normalizar(item.descripcion).includes(palabra)))
}

export function conceptoDeLinea(linea: Linea): Concepto | undefined {
  return CONCEPTOS.find((item) => item.id === linea.conceptoId && item.tipo === linea.tipo)
}

export function esAutomatica(linea: Linea): boolean {
  return linea.modoCalculo === 'porcentaje' && conceptoDeLinea(linea)?.porcentual === true
}

export function faltaCalculo(linea: Linea): string | null {
  if (!esAutomatica(linea)) return null
  if (linea.baseCentavos === null && linea.porcentajeBps == null) return 'Faltan base y porcentaje'
  if (linea.baseCentavos === null) return 'Falta base'
  if (linea.porcentajeBps == null) return 'Falta porcentaje'
  return null
}

export function recalcularLinea(linea: Linea): Linea {
  if (!esAutomatica(linea)) return linea
  const montoCentavos = faltaCalculo(linea) ? 0 : porcentaje(linea.baseCentavos!, linea.porcentajeBps!)
  if (!Number.isSafeInteger(montoCentavos)) throw new Error('El monto calculado es demasiado grande.')
  return { ...linea, montoCentavos }
}

export function seleccionarConcepto(linea: Linea, item: Concepto): Linea {
  return recalcularLinea({
    ...linea,
    conceptoId: item.id,
    descripcion: item.descripcion,
    tipo: item.tipo,
    rubro: item.rubro,
    modoCalculo: item.porcentual ? 'porcentaje' : 'manual',
    porcentajeBps: null,
    unidad: '',
  })
}

export function actualizarLinea(linea: Linea, patch: Partial<Linea>): Linea {
  let siguiente = { ...linea, ...patch }
  if ((patch.descripcion !== undefined && patch.descripcion !== linea.descripcion) || (patch.tipo !== undefined && patch.tipo !== linea.tipo)) {
    siguiente = { ...siguiente, conceptoId: undefined, modoCalculo: 'manual', porcentajeBps: undefined }
  }
  return recalcularLinea(siguiente)
}
