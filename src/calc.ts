import type { CorteRubro, Linea, Recibo, Rubro, TipoLinea, Totales } from './types.ts'
import { RUBRO_LABEL, RUBROS } from './types.ts'

export function nuevaLinea(tipo: TipoLinea): Linea {
  return {
    id: crypto.randomUUID(),
    descripcion: '',
    tipo,
    rubro: null,
    unidad: '',
    baseCentavos: null,
    montoCentavos: 0,
  }
}

export function reciboVacio(): Recibo {
  return {
    empresa: '',
    domicilioLegal: '',
    cuitEmpleador: '',
    quincena: '',
    mes: '',
    anio: '',
    apellidoNombre: '',
    legajo: '',
    antiguedad: '',
    cuil: '',
    categoria: '',
    fechaIngreso: '',
    lugarPago: '',
    bancoDeposito: '',
    periodoDeposito: '',
    fechaPagoAportes: '',
    fechaPago: '',
    lineas: [nuevaLinea('contribucion'), nuevaLinea('remunerativo')],
  }
}

function sumar(lineas: Linea[], tipo: TipoLinea): number {
  return lineas.filter((linea) => linea.tipo === tipo).reduce((acum, linea) => acum + linea.montoCentavos, 0)
}

function corteVacio(): CorteRubro {
  return { total: 0, empleador: 0, trabajador: 0 }
}

export function totales(lineas: Linea[]): Totales {
  const remunerativo = sumar(lineas, 'remunerativo')
  const noRemunerativo = sumar(lineas, 'no_remunerativo')
  const deducciones = sumar(lineas, 'deduccion')
  const contribuciones = sumar(lineas, 'contribucion')
  const bruto = remunerativo
  const neto = remunerativo + noRemunerativo - deducciones
  const costoEmpleador = remunerativo + contribuciones

  const porRubro = Object.fromEntries(RUBROS.map((rubro) => [rubro, corteVacio()])) as Record<Rubro, CorteRubro>
  let deduccionesSinRubro = 0

  for (const linea of lineas) {
    if (!linea.rubro) {
      if (linea.tipo === 'deduccion') deduccionesSinRubro += linea.montoCentavos
      continue
    }
    const corte = porRubro[linea.rubro]
    if (linea.tipo === 'contribucion') {
      corte.empleador += linea.montoCentavos
      corte.total += linea.montoCentavos
    } else if (linea.tipo === 'deduccion') {
      corte.trabajador += linea.montoCentavos
      corte.total += linea.montoCentavos
    }
  }

  const baseTorta = costoEmpleador - deduccionesSinRubro
  const crudas: Totales['partesTorta'] = [
    { key: 'neto', label: 'Sueldo Neto', valor: neto, pct: 0 },
    ...RUBROS.map((rubro) => ({
      key: rubro,
      label: RUBRO_LABEL[rubro],
      valor: porRubro[rubro].total,
      pct: 0,
    })),
  ]
  const partesTorta = crudas.map((parte) => ({
    ...parte,
    pct: baseTorta > 0 ? (parte.valor / baseTorta) * 100 : 0,
  }))

  return {
    remunerativo,
    noRemunerativo,
    deducciones,
    contribuciones,
    bruto,
    neto,
    costoEmpleador,
    porRubro,
    baseTorta,
    partesTorta,
  }
}

export function filasTipo(lineas: Linea[], tipo: TipoLinea): Linea[] {
  return lineas.filter((linea) => linea.tipo === tipo)
}

export function filasHaberes(lineas: Linea[]): Linea[] {
  return lineas.filter((linea) => linea.tipo !== 'contribucion')
}
