const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const DIECIS = [
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
]
const VEINTIS = [
  '',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
]
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CENTENAS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
]

function bajoCien(valor: number, apocopar: boolean): string {
  if (valor < 10) {
    if (valor === 1 && apocopar) return 'un'
    return UNIDADES[valor] ?? ''
  }
  if (valor < 20) return DIECIS[valor - 10] ?? ''
  if (valor < 30) {
    if (valor === 20) return 'veinte'
    if (valor === 21 && apocopar) return 'veintiún'
    return VEINTIS[valor - 20] ?? ''
  }
  const decena = Math.floor(valor / 10)
  const unidad = valor % 10
  const nombreDecena = DECENAS[decena] ?? ''
  if (unidad === 0) return nombreDecena
  if (unidad === 1 && apocopar) return `${nombreDecena} y un`
  return `${nombreDecena} y ${UNIDADES[unidad] ?? ''}`
}

function bajoMil(valor: number, apocopar: boolean): string {
  if (valor === 0) return ''
  if (valor === 100) return 'cien'
  const centena = Math.floor(valor / 100)
  const resto = valor % 100
  const nombreCentena = centena === 0 ? '' : (CENTENAS[centena] ?? '')
  const nombreResto = bajoCien(resto, apocopar)
  if (nombreCentena && nombreResto) return `${nombreCentena} ${nombreResto}`
  return nombreCentena || nombreResto
}

export function numeroEnLetras(valor: number): string {
  if (!Number.isInteger(valor)) return String(valor)
  if (valor < 0) return `menos ${numeroEnLetras(-valor)}`
  if (valor === 0) return 'cero'
  if (valor >= 1_000_000_000_000) return valor.toLocaleString('es-AR')

  const milMillones = Math.floor(valor / 1_000_000_000)
  const millones = Math.floor((valor % 1_000_000_000) / 1_000_000)
  const miles = Math.floor((valor % 1_000_000) / 1000)
  const resto = valor % 1000
  const partes: string[] = []

  if (milMillones === 1) partes.push('mil millones')
  else if (milMillones > 1) partes.push(`${bajoMil(milMillones, true)} mil millones`)

  if (millones === 1) partes.push('un millón')
  else if (millones > 1) partes.push(`${bajoMil(millones, true)} millones`)

  if (miles === 1) partes.push('mil')
  else if (miles > 1) partes.push(`${bajoMil(miles, true)} mil`)

  if (resto > 0) partes.push(bajoMil(resto, false))
  return partes.join(' ')
}

export function enLetrasPesos(centavos: number): string {
  const absoluto = Math.abs(centavos)
  const pesos = Math.floor(absoluto / 100)
  const cents = absoluto % 100
  const signo = centavos < 0 ? 'menos ' : ''
  const fraccion = String(cents).padStart(2, '0')
  return `Son pesos ${signo}${numeroEnLetras(pesos)} con ${fraccion}/100`
}
