import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { conceptoDeLinea, esAutomatica, faltaCalculo } from '../conceptos.ts'
import { filasHaberes, filasTipo, totales, type LugarLinea } from '../calc.ts'
import { enLetrasPesos } from '../letras.ts'
import { formatNumero } from '../money.ts'
import { useStore } from '../store.ts'
import type { Linea, Rubro, TipoLinea } from '../types.ts'
import { RUBRO_LABEL, RUBROS, TIPO_HABER_LABEL } from '../types.ts'
import { ConceptoInput } from './ConceptoInput.tsx'
import { CellInput, MoneyCell, PorcentajeCell } from './Fields.tsx'
import { DefsPatrones, PieChart } from './PieChart.tsx'

function dinero(centavos: number): string {
  return `$ ${formatNumero(centavos)}`
}

// Mismo color que el fondo CSS. El rectángulo se imprime aunque
// «Gráficos en segundo plano» esté destildado.
function Fondo({ color }: { color: string }) {
  return (
    <svg className="fondo" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1" height="1" fill={color} />
    </svg>
  )
}

function letrasNeto(centavos: number): string {
  return enLetrasPesos(centavos).replace(/^Son pesos\s+/i, '')
}

function RubroSelect({
  linea,
  onChange,
}: {
  linea: Linea
  onChange: (patch: Partial<Linea>) => void
}) {
  return (
    <select
      aria-label="Rubro"
      value={linea.rubro ?? ''}
      onChange={(event) =>
        onChange({ rubro: event.target.value ? (event.target.value as Rubro) : null })
      }
    >
      <option value="">Sin rubro</option>
      {RUBROS.map((rubro) => (
        <option key={rubro} value={rubro}>
          {RUBRO_LABEL[rubro]}
        </option>
      ))}
    </select>
  )
}

type GrupoTabla = 'contribucion' | 'haberes'

type IndicadorReorden = {
  id: string
  lugar: LugarLinea
}

type SesionReorden = {
  id: string
  grupo: GrupoTabla
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  burbuja: HTMLDivElement
  arrastrando: boolean
}

type ContextoReorden = {
  arrastrandoId: string | null
  indicador: IndicadorReorden | null
  alPresionarBurbuja: (event: ReactPointerEvent<HTMLDivElement>, id: string, grupo: GrupoTabla) => void
  alTeclaAsa: (event: ReactKeyboardEvent<HTMLButtonElement>, id: string, grupo: GrupoTabla) => void
}

const ReordenCtx = createContext<ContextoReorden | null>(null)

function useReorden(): ContextoReorden {
  const valor = useContext(ReordenCtx)
  if (!valor) throw new Error('Reorden fuera de contexto')
  return valor
}

function limpiarEstilosBurbuja(burbuja: HTMLDivElement) {
  burbuja.style.position = ''
  burbuja.style.left = ''
  burbuja.style.top = ''
  burbuja.style.transform = ''
  burbuja.style.width = ''
  burbuja.style.zIndex = ''
  burbuja.style.pointerEvents = ''
  burbuja.style.margin = ''
}

function filaBajoPuntero(x: number, y: number, grupo: GrupoTabla): IndicadorReorden | null {
  const bajo = document.elementFromPoint(x, y)
  const fila = bajo instanceof Element ? bajo.closest('tr[data-linea-id]') : null
  if (!(fila instanceof HTMLTableRowElement) || fila.dataset.grupo !== grupo) return null
  const id = fila.dataset.lineaId
  if (!id) return null
  const rect = fila.getBoundingClientRect()
  const lugar: LugarLinea = y >= rect.top + rect.height / 2 ? 'despues' : 'antes'
  return { id, lugar }
}

function ReordenProvider({ children }: { children: ReactNode }) {
  const moverLinea = useStore((estado) => estado.moverLinea)
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)
  const [indicador, setIndicador] = useState<IndicadorReorden | null>(null)
  const sesion = useRef<SesionReorden | null>(null)
  const indicadorRef = useRef<IndicadorReorden | null>(null)
  const soltarOyentes = useRef<(() => void) | null>(null)

  function publicarIndicador(siguiente: IndicadorReorden | null) {
    const previo = indicadorRef.current
    if (previo?.id === siguiente?.id && previo?.lugar === siguiente?.lugar) return
    indicadorRef.current = siguiente
    setIndicador(siguiente)
  }

  function finalizar(aplicar: boolean) {
    const actual = sesion.current
    if (!actual) return
    const destino = indicadorRef.current
    sesion.current = null
    indicadorRef.current = null
    soltarOyentes.current?.()
    soltarOyentes.current = null
    document.documentElement.classList.remove('reordenando')
    limpiarEstilosBurbuja(actual.burbuja)
    setArrastrandoId(null)
    setIndicador(null)
    if (aplicar && actual.arrastrando && destino) moverLinea(actual.id, destino.id, destino.lugar)
  }

  function alPresionarBurbuja(event: ReactPointerEvent<HTMLDivElement>, id: string, grupo: GrupoTabla) {
    if (event.button !== 0 || sesion.current) return
    const target = event.target
    if (!(target instanceof Element) || target.closest('select, button:not(.asa)')) return
    event.preventDefault()

    const burbuja = event.currentTarget
    const actual: SesionReorden = {
      id,
      grupo,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: 0,
      offsetY: 0,
      burbuja,
      arrastrando: false,
    }
    sesion.current = actual

    const alMover = (ev: PointerEvent) => {
      const vigente = sesion.current
      if (!vigente || ev.pointerId !== vigente.pointerId) return
      if (!vigente.arrastrando) {
        const dx = ev.clientX - vigente.startX
        const dy = ev.clientY - vigente.startY
        if (dx * dx + dy * dy < 9) return
        const rect = vigente.burbuja.getBoundingClientRect()
        vigente.offsetX = ev.clientX - rect.left
        vigente.offsetY = ev.clientY - rect.top
        vigente.arrastrando = true
        vigente.burbuja.style.position = 'fixed'
        vigente.burbuja.style.margin = '0'
        vigente.burbuja.style.transform = 'none'
        vigente.burbuja.style.width = `${rect.width}px`
        vigente.burbuja.style.zIndex = '30'
        vigente.burbuja.style.pointerEvents = 'none'
        document.documentElement.classList.add('reordenando')
        setArrastrandoId(vigente.id)
      }
      ev.preventDefault()
      vigente.burbuja.style.left = `${ev.clientX - vigente.offsetX}px`
      vigente.burbuja.style.top = `${ev.clientY - vigente.offsetY}px`
      publicarIndicador(filaBajoPuntero(ev.clientX, ev.clientY, vigente.grupo))
    }

    const alSoltar = (ev: PointerEvent) => {
      const vigente = sesion.current
      if (!vigente || ev.pointerId !== vigente.pointerId) return
      finalizar(true)
    }

    const alCancelar = () => finalizar(false)
    const alEscape = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      ev.preventDefault()
      finalizar(false)
    }

    window.addEventListener('pointermove', alMover)
    window.addEventListener('pointerup', alSoltar)
    window.addEventListener('pointercancel', alCancelar)
    window.addEventListener('keydown', alEscape)
    window.addEventListener('blur', alCancelar)
    soltarOyentes.current = () => {
      window.removeEventListener('pointermove', alMover)
      window.removeEventListener('pointerup', alSoltar)
      window.removeEventListener('pointercancel', alCancelar)
      window.removeEventListener('keydown', alEscape)
      window.removeEventListener('blur', alCancelar)
    }
  }

  function alTeclaAsa(event: ReactKeyboardEvent<HTMLButtonElement>, id: string, grupo: GrupoTabla) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const lineas = useStore.getState().lineas.filter((linea) =>
      grupo === 'contribucion' ? linea.tipo === 'contribucion' : linea.tipo !== 'contribucion',
    )
    const index = lineas.findIndex((linea) => linea.id === id)
    const vecino = lineas[index + (event.key === 'ArrowUp' ? -1 : 1)]
    if (!vecino) return
    moverLinea(id, vecino.id, event.key === 'ArrowUp' ? 'antes' : 'despues')
  }

  useEffect(() => {
    return () => {
      soltarOyentes.current?.()
      soltarOyentes.current = null
      const burbuja = sesion.current?.burbuja
      sesion.current = null
      if (burbuja) limpiarEstilosBurbuja(burbuja)
      document.documentElement.classList.remove('reordenando')
    }
  }, [])

  return (
    <ReordenCtx.Provider value={{ arrastrandoId, indicador, alPresionarBurbuja, alTeclaAsa }}>
      {children}
    </ReordenCtx.Provider>
  )
}

function AsaReordenar({
  lineaId,
  grupo,
}: {
  lineaId: string
  grupo: GrupoTabla
}) {
  const { alTeclaAsa } = useReorden()
  return (
    <button
      type="button"
      className="asa"
      draggable={false}
      aria-label="Reordenar"
      title="Arrastrar a otra fila"
      onKeyDown={(event) => alTeclaAsa(event, lineaId, grupo)}
    >
      <svg viewBox="0 0 10 14" aria-hidden="true">
        <circle cx="2" cy="2" r="1.1" />
        <circle cx="8" cy="2" r="1.1" />
        <circle cx="2" cy="7" r="1.1" />
        <circle cx="8" cy="7" r="1.1" />
        <circle cx="2" cy="12" r="1.1" />
        <circle cx="8" cy="12" r="1.1" />
      </svg>
    </button>
  )
}

function BurbujaLinea({
  lineaId,
  grupo,
  children,
}: {
  lineaId: string
  grupo: GrupoTabla
  children: ReactNode
}) {
  const { arrastrandoId, alPresionarBurbuja } = useReorden()
  return (
    <td className="ancla-burbuja no-print">
      <div
        className={arrastrandoId === lineaId ? 'burbuja arrastrando' : 'burbuja'}
        onPointerDown={(event) => alPresionarBurbuja(event, lineaId, grupo)}
        onDragStart={(event) => event.preventDefault()}
      >
        <AsaReordenar lineaId={lineaId} grupo={grupo} />
        {children}
      </div>
    </td>
  )
}

function BurbujaAgregar({ children }: { children: ReactNode }) {
  return <div className="burbuja burbuja-agregar">{children}</div>
}

function BotonAgregar({
  children,
  onClick,
}: {
  children: string
  onClick: () => void
}) {
  return (
    <button type="button" className="btn-agregar" onClick={onClick}>
      {children}
    </button>
  )
}

function ModoCalculo({ linea, onChange }: { linea: Linea; onChange: (patch: Partial<Linea>) => void }) {
  const [error, setError] = useState('')
  if (!conceptoDeLinea(linea)?.porcentual) return null
  return (
    <>
    <button
      type="button"
      className="modo-calculo"
      aria-label="Cálculo automático"
      aria-pressed={esAutomatica(linea)}
      title={esAutomatica(linea) ? 'Pasar a monto manual' : 'Calcular monto con base y porcentaje'}
      onClick={() => {
        try {
          onChange({ modoCalculo: esAutomatica(linea) ? 'manual' : 'porcentaje' })
          setError('')
        } catch {
          setError('El monto calculado es demasiado grande. Revisá la base y el porcentaje.')
        }
      }}
    >
      {esAutomatica(linea) ? 'Automático' : 'Manual'}
    </button>
    {error && <small role="alert" className="error-celda">{error}</small>}
    </>
  )
}

function ControlesContribucion({
  linea,
  onChange,
  onRemove,
}: {
  linea: Linea
  onChange: (patch: Partial<Linea>) => void
  onRemove: () => void
}) {
  return (
    <BurbujaLinea lineaId={linea.id} grupo="contribucion">
      <RubroSelect linea={linea} onChange={onChange} />
      <ModoCalculo linea={linea} onChange={onChange} />
      <button type="button" className="btn-mini" onClick={onRemove} aria-label="Quitar línea">
        ×
      </button>
    </BurbujaLinea>
  )
}

function ControlesHaber({
  linea,
  onChange,
  onRemove,
}: {
  linea: Linea
  onChange: (patch: Partial<Linea>) => void
  onRemove: () => void
}) {
  return (
    <BurbujaLinea lineaId={linea.id} grupo="haberes">
      <select
        aria-label="Tipo de línea"
        value={linea.tipo}
        onChange={(event) => {
          const tipo = event.target.value as TipoLinea
          onChange({ tipo, rubro: tipo === 'deduccion' ? linea.rubro : null })
        }}
      >
        {(['remunerativo', 'no_remunerativo', 'deduccion'] as const).map((tipo) => (
          <option key={tipo} value={tipo}>
            {TIPO_HABER_LABEL[tipo]}
          </option>
        ))}
      </select>
      {linea.tipo === 'deduccion' && <RubroSelect linea={linea} onChange={onChange} />}
      <ModoCalculo linea={linea} onChange={onChange} />
      <button type="button" className="btn-mini" onClick={onRemove} aria-label="Quitar línea">
        ×
      </button>
    </BurbujaLinea>
  )
}

function FilaEditable({
  linea,
  grupo,
  controles,
  descuento = false,
}: {
  linea: Linea
  grupo: GrupoTabla
  controles: ReactNode
  descuento?: boolean
}) {
  const setLinea = useStore((estado) => estado.setLinea)
  const seleccionarConcepto = useStore((estado) => estado.seleccionarConcepto)
  const automatico = esAutomatica(linea)
  const faltante = faltaCalculo(linea)
  const ayudaId = `calculo-${linea.id}`
  const { arrastrandoId, indicador } = useReorden()
  const clase = [
    arrastrandoId === linea.id ? 'origen-arrastre' : '',
    indicador?.id === linea.id ? (indicador.lugar === 'despues' ? 'soltar-despues' : 'soltar-antes') : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <tr data-linea-id={linea.id} data-grupo={grupo} className={clase || undefined}>
      <td>
        <ConceptoInput
          value={linea.descripcion}
          tipo={linea.tipo}
          onChange={(descripcion) => setLinea(linea.id, { descripcion })}
          onSelect={(concepto) => seleccionarConcepto(linea.id, concepto)}
        />
      </td>
      <td>
        {automatico ? (
          <PorcentajeCell
            value={linea.porcentajeBps ?? null}
            onChange={(porcentajeBps) => setLinea(linea.id, { porcentajeBps })}
          />
        ) : <CellInput
          className="mono right"
          ariaLabel="Unidad"
          value={linea.unidad}
          onChange={(unidad) => setLinea(linea.id, { unidad })}
        />}
      </td>
      <td>
        <MoneyCell
          emptyAsBlank
          ariaLabel="Base"
          pendiente={automatico && linea.baseCentavos === null}
          value={linea.baseCentavos}
          onChange={(baseCentavos) => setLinea(linea.id, { baseCentavos })}
        />
      </td>
      <td>
        <div className={descuento ? 'descuento' : undefined}>
          {descuento && <span className="signo">−</span>}
          {automatico ? (
            <input
              className={`cell-input mono right${faltante ? ' campo-pendiente' : ''}`}
              aria-label="Monto"
              aria-invalid={!!faltante}
              aria-describedby={faltante ? ayudaId : undefined}
              readOnly
              value={faltante ? '' : formatNumero(linea.montoCentavos)}
            />
          ) : <MoneyCell
            ariaLabel="Monto"
            value={linea.montoCentavos}
            onChange={(montoCentavos) => setLinea(linea.id, { montoCentavos: montoCentavos ?? 0 })}
          />}
        </div>
        {faltante && <small id={ayudaId} className="calculo-pendiente no-print" role="status">{faltante}</small>}
      </td>
      {controles}
    </tr>
  )
}

export function ReciboSheet() {
  const recibo = useStore()
  const [patrones, setPatrones] = useState(false)
  const tot = totales(recibo.lineas)
  const contribuciones = filasTipo(recibo.lineas, 'contribucion')
  const haberes = filasHaberes(recibo.lineas)

  return (
    <ReordenProvider>
    <article className="sheet">
      <div className="encabezado">
        <div className="lab g-emp">Empleador</div>
        <div className="lab g-dom">Domicilio Legal</div>
        <div className="lab g-cuit">C.U.I.T. Empleador</div>
        <div className="g-emp">
          <CellInput
            ariaLabel="Empleador"
            value={recibo.empresa}
            onChange={(empresa) => recibo.patch({ empresa })}
          />
        </div>
        <div className="g-dom">
          <CellInput
            ariaLabel="Domicilio legal"
            value={recibo.domicilioLegal}
            onChange={(domicilioLegal) => recibo.patch({ domicilioLegal })}
          />
        </div>
        <div className="g-cuit">
          <CellInput
            className="mono"
            ariaLabel="CUIT empleador"
            value={recibo.cuitEmpleador}
            onChange={(cuitEmpleador) => recibo.patch({ cuitEmpleador })}
          />
        </div>

        <div className="lab g-q">Q</div>
        <div className="lab g-mes">Mes</div>
        <div className="lab g-anio">Año</div>
        <div className="lab g-nom">Apellido y Nombre</div>
        <div className="lab g-leg">Nro. Legajo</div>
        <div className="lab g-ing">Fec. Ingreso</div>
        <div className="lab g-ant">Antigüedad</div>
        <div className="g-q">
          <CellInput
            className="center"
            ariaLabel="Quincena"
            value={recibo.quincena}
            onChange={(quincena) => recibo.patch({ quincena })}
          />
        </div>
        <div className="g-mes">
          <CellInput
            className="center"
            ariaLabel="Mes"
            value={recibo.mes}
            onChange={(mes) => recibo.patch({ mes })}
          />
        </div>
        <div className="g-anio">
          <CellInput
            className="center"
            ariaLabel="Año"
            value={recibo.anio}
            onChange={(anio) => recibo.patch({ anio })}
          />
        </div>
        <div className="g-nom">
          <CellInput
            ariaLabel="Apellido y nombre"
            value={recibo.apellidoNombre}
            onChange={(apellidoNombre) => recibo.patch({ apellidoNombre })}
          />
        </div>
        <div className="g-leg">
          <CellInput
            className="center"
            ariaLabel="Número de legajo"
            value={recibo.legajo}
            onChange={(legajo) => recibo.patch({ legajo })}
          />
        </div>
        <div className="g-ing">
          <CellInput
            className="center"
            ariaLabel="Fecha de ingreso"
            value={recibo.fechaIngreso}
            onChange={(fechaIngreso) => recibo.patch({ fechaIngreso })}
          />
        </div>
        <div className="g-ant">
          <CellInput
            ariaLabel="Antigüedad"
            value={recibo.antiguedad}
            onChange={(antiguedad) => recibo.patch({ antiguedad })}
          />
        </div>

        <div className="lab g-cuil">C.U.I.L.</div>
        <div className="lab g-cat">Categoría Laboral</div>
        <div className="lab g-lug">Lugar de Pago</div>
        <div className="lab g-bru">Sueldo Bruto</div>
        <div className="g-cuil">
          <CellInput
            className="mono"
            ariaLabel="CUIL"
            value={recibo.cuil}
            onChange={(cuil) => recibo.patch({ cuil })}
          />
        </div>
        <div className="g-cat">
          <CellInput
            ariaLabel="Categoría laboral"
            value={recibo.categoria}
            onChange={(categoria) => recibo.patch({ categoria })}
          />
        </div>
        <div className="g-lug">
          <CellInput
            ariaLabel="Lugar de pago"
            value={recibo.lugarPago}
            onChange={(lugarPago) => recibo.patch({ lugarPago })}
          />
        </div>
        <div className="g-bru mono right strong">{dinero(tot.bruto)}</div>

        <div className="lab g-ban">Banco del depósito</div>
        <div className="lab g-per">Período del depósito</div>
        <div className="lab g-fap">Fecha Pago Aportes</div>
        <div className="g-ban">
          <CellInput
            ariaLabel="Banco del depósito de aportes"
            value={recibo.bancoDeposito ?? ''}
            onChange={(bancoDeposito) => recibo.patch({ bancoDeposito })}
          />
        </div>
        <div className="g-per">
          <CellInput
            ariaLabel="Período del depósito de aportes"
            value={recibo.periodoDeposito ?? ''}
            onChange={(periodoDeposito) => recibo.patch({ periodoDeposito })}
          />
        </div>
        <div className="g-fap">
          <CellInput
            className="center"
            ariaLabel="Fecha pago aportes"
            value={recibo.fechaPagoAportes}
            onChange={(fechaPagoAportes) => recibo.patch({ fechaPagoAportes })}
          />
        </div>
      </div>

      <div className="banner">
        <Fondo color="#2c2c2c" />
        <strong>COSTO TOTAL EMPLEADOR</strong>
        <span className="mono">{dinero(tot.costoEmpleador)}</span>
      </div>

      <table className="lineas">
        <thead>
          <tr>
            <th>Concepto</th>
            <th className="num">Unidad</th>
            <th className="num">Base</th>
            <th className="num">Monto</th>
            <th className="ancla-burbuja no-print" />
          </tr>
        </thead>
        <tbody>
          {contribuciones.map((linea) => (
            <FilaEditable
              key={linea.id}
              linea={linea}
              grupo="contribucion"
              controles={
                <ControlesContribucion
                  linea={linea}
                  onChange={(patch) => recibo.setLinea(linea.id, patch)}
                  onRemove={() => recibo.removeLinea(linea.id)}
                />
              }
            />
          ))}
          <tr className="subtotal">
            <td colSpan={3}>SUBTOTAL CONTRIBUCIONES EMPLEADOR</td>
            <td className="mono right">{dinero(tot.contribuciones)}</td>
            <td className="ancla-burbuja no-print">
              <BurbujaAgregar>
                <BotonAgregar onClick={() => recibo.addLinea('contribucion')}>
                  Agregar contribución
                </BotonAgregar>
              </BurbujaAgregar>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="banner soft">
        <Fondo color="#3a3a3a" />
        <strong>SUELDO BRUTO</strong>
        <span className="mono">{dinero(tot.bruto)}</span>
      </div>

      <table className="lineas">
        <thead>
          <tr>
            <th>Concepto</th>
            <th className="num">Unidad</th>
            <th className="num">Base</th>
            <th className="num">Monto</th>
            <th className="ancla-burbuja no-print" />
          </tr>
        </thead>
        <tbody>
          {haberes.map((linea) => (
            <FilaEditable
              key={linea.id}
              linea={linea}
              grupo="haberes"
              descuento={linea.tipo === 'deduccion'}
              controles={
                <ControlesHaber
                  linea={linea}
                  onChange={(patch) => recibo.setLinea(linea.id, patch)}
                  onRemove={() => recibo.removeLinea(linea.id)}
                />
              }
            />
          ))}
        </tbody>
      </table>

      <div className="totales-wrap">
        <div className="totales">
          <div>
            <span>Remunerativo:</span>
            <b className="mono">{dinero(tot.remunerativo)}</b>
          </div>
          <div>
            <span>No Remunerativo:</span>
            <b className="mono">{dinero(tot.noRemunerativo)}</b>
          </div>
          <div>
            <span>Descuentos:</span>
            <b className="mono">{dinero(tot.deducciones)}</b>
          </div>
          <div>
            <span>Fecha de Pago:</span>
            <CellInput
              className="center"
              ariaLabel="Fecha de pago"
              value={recibo.fechaPago}
              onChange={(fechaPago) => recibo.patch({ fechaPago })}
            />
          </div>
          <div className="neto">
            <Fondo color="#111" />
            <span>SUELDO NETO $</span>
            <b className="mono">{formatNumero(tot.neto)}</b>
          </div>
        </div>
        <div className="ancla-agregar no-print">
          <BurbujaAgregar>
            <BotonAgregar onClick={() => recibo.addLinea('remunerativo')}>
              Agregar remunerativo
            </BotonAgregar>
            <BotonAgregar onClick={() => recibo.addLinea('no_remunerativo')}>
              Agregar no remunerativo
            </BotonAgregar>
            <BotonAgregar onClick={() => recibo.addLinea('deduccion')}>Agregar descuento</BotonAgregar>
          </BurbujaAgregar>
        </div>
      </div>

      <p className="letras">
        <strong>Son pesos:</strong> {letrasNeto(tot.neto)}
      </p>

      <section className="composicion">
        <h2 className="composicion-titulo">
          <Fondo color="#1f1f1f" />
          <span>Detalle de la Composición Salarial</span>
        </h2>
        <div className="composicion-body">
          <div className="cortes">
            <div className="cortes-grid" role="table">
              <div className="cortes-head" role="row">
                <span role="columnheader">Concepto</span>
                <span role="columnheader">Empleador</span>
                <span role="columnheader">Empleado</span>
                <span role="columnheader">Total</span>
              </div>
              {(
                [
                  ['sindical', 'Costo Sindical'],
                  ['seguridad_social', 'Seguridad Social (*)'],
                  ['obra_social', 'Obra Social'],
                  ['inssjp', 'INSSJP'],
                  ['art', 'ART'],
                  ['camaras', 'Entidades empresariales'],
                  ['scvo', 'SCVO'],
                  ['otros', 'Otros Rubros'],
                ] as const
              ).map(([rubro, label]) => {
                const corte = tot.porRubro[rubro]
                return (
                  <div className="corte" key={rubro} role="row">
                    <span role="cell">{label}</span>
                    <span className="num" role="cell">
                      {dinero(corte.empleador)}
                    </span>
                    <span className="num" role="cell">
                      {dinero(corte.trabajador)}
                    </span>
                    <span className="num" role="cell">
                      {dinero(corte.total)}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="nota">
              (*) Nota: Seguridad Social del empleador incluye SIPA, Fondo Nacional de Empleo y Asignaciones
              Familiares.
            </p>
          </div>

          <div className="torta-box">
            {patrones && <DefsPatrones />}
            <div className="torta-pie-wrap">
              <PieChart partes={tot.partesTorta} patrones={patrones} />
            </div>
          </div>
        </div>
        <div className="ancla-torta no-print">
          <label className="burbuja burbuja-torta">
            <input
              type="checkbox"
              checked={patrones}
              onChange={(event) => setPatrones(event.target.checked)}
            />
            Blanco y Negro
          </label>
        </div>
      </section>

      <div className="firmas">
        <div className="firma">
          <span>Firma Empleador</span>
        </div>
        <div className="firma">
          <span>Firma Empleado</span>
        </div>
      </div>
    </article>
    </ReordenProvider>
  )
}
