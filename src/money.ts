export function toCentavos(pesos: number): number {
  const negativo = pesos < 0
  const [entero, frac] = Math.abs(pesos).toFixed(2).split('.')
  const centavos = Number(entero) * 100 + Number(frac ?? '0')
  return negativo ? -centavos : centavos
}

export function parsePesos(input: string): number | null {
  let texto = input.trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!texto) return 0
  const negativo = texto.startsWith('-')
  if (negativo) texto = texto.slice(1)
  if (!texto) return null

  let pesos: number
  if (texto.includes(',') && texto.includes('.')) {
    if (texto.lastIndexOf(',') > texto.lastIndexOf('.')) {
      pesos = Number(texto.replace(/\./g, '').replace(',', '.'))
    } else {
      pesos = Number(texto.replace(/,/g, ''))
    }
  } else if (texto.includes(',')) {
    pesos = Number(texto.replace(/\./g, '').replace(',', '.'))
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    pesos = Number(texto.replace(/\./g, ''))
  } else {
    pesos = Number(texto)
  }

  if (!Number.isFinite(pesos)) return null
  return toCentavos(negativo ? -pesos : pesos)
}

const numero = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const pesosFmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export function formatNumero(centavos: number): string {
  return numero.format(centavos / 100)
}

export function formatPesos(centavos: number): string {
  return pesosFmt.format(centavos / 100)
}

export function porcentaje(baseCentavos: number, tasaBps: number): number {
  return Math.round((baseCentavos * tasaBps) / 10000)
}

export function producto(baseCentavos: number, cantidad: number): number {
  return Math.round(baseCentavos * cantidad)
}

export function parseTasa(input: string): number | null {
  const texto = input.trim().replace(/\s*%$/, '').trim().replace(',', '.')
  if (!texto) return 0
  if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) return null
  const valor = Number(texto)
  const bps = Math.round(valor * 100)
  return Number.isSafeInteger(bps) ? bps : null
}

export function formatTasaInput(bps: number): string {
  return (bps / 100).toLocaleString('es-AR', {
    useGrouping: false,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
}

export function formatTasa(bps: number): string {
  return `${formatTasaInput(bps)} %`
}

export function parseCantidad(input: string): number | null {
  const texto = input.trim().replace(',', '.')
  if (!texto) return 0
  const valor = Number(texto)
  if (!Number.isFinite(valor)) return null
  return valor
}

export function formatCantidad(valor: number): string {
  return valor.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}
