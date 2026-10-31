export const TIPOS_LINEA = ['contribucion', 'remunerativo', 'no_remunerativo', 'deduccion'] as const
export type TipoLinea = (typeof TIPOS_LINEA)[number]

export const RUBROS = [
  'sindical',
  'seguridad_social',
  'obra_social',
  'inssjp',
  'art',
  'scvo',
  'otros',
] as const
export type Rubro = (typeof RUBROS)[number]

export const RUBRO_LABEL: Record<Rubro, string> = {
  sindical: 'Costo Sindical',
  seguridad_social: 'Seguridad Social',
  obra_social: 'Obra Social',
  inssjp: 'INSSJP',
  art: 'ART',
  scvo: 'SCVO',
  otros: 'Otros Rubros',
}

export const TIPO_HABER_LABEL: Record<'remunerativo' | 'no_remunerativo' | 'deduccion', string> = {
  remunerativo: 'Remunerativo',
  no_remunerativo: 'No remunerativo',
  deduccion: 'Descuento',
}

export interface Linea {
  id: string
  descripcion: string
  tipo: TipoLinea
  rubro: Rubro | null
  unidad: string
  baseCentavos: number | null
  montoCentavos: number
}

export interface Recibo {
  empresa: string
  domicilioLegal: string
  cuitEmpleador: string
  quincena: string
  mes: string
  anio: string
  apellidoNombre: string
  legajo: string
  antiguedad: string
  cuil: string
  categoria: string
  fechaIngreso: string
  lugarPago: string
  fechaPagoAportes: string
  fechaPago: string
  lineas: Linea[]
}

export interface CorteRubro {
  total: number
  empleador: number
  trabajador: number
}

export interface Totales {
  remunerativo: number
  noRemunerativo: number
  deducciones: number
  contribuciones: number
  bruto: number
  neto: number
  costoEmpleador: number
  porRubro: Record<Rubro, CorteRubro>
  baseTorta: number
  partesTorta: Array<{ key: 'neto' | Rubro; label: string; valor: number; pct: number }>
}
