import { useState, type ReactNode } from 'react'
import { filasHaberes, filasTipo, totales } from '../calc.ts'
import { enLetrasPesos } from '../letras.ts'
import { formatNumero } from '../money.ts'
import { useStore } from '../store.ts'
import type { Linea, Rubro, TipoLinea } from '../types.ts'
import { RUBRO_LABEL, RUBROS, TIPO_HABER_LABEL } from '../types.ts'
import { CellInput, MoneyCell } from './Fields.tsx'
import { DefsPatrones, MuestraParte, PieChart } from './PieChart.tsx'

function dinero(centavos: number): string {
  return `$ ${formatNumero(centavos)}`
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

function BurbujaLinea({ children }: { children: ReactNode }) {
  return (
    <td className="ancla-burbuja no-print">
      <div className="burbuja">{children}</div>
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
    <BurbujaLinea>
      <RubroSelect linea={linea} onChange={onChange} />
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
    <BurbujaLinea>
      <select
        aria-label="Tipo de línea"
        value={linea.tipo}
        onChange={(event) => {
          onChange({ tipo: event.target.value as TipoLinea })
        }}
      >
        {(['remunerativo', 'no_remunerativo', 'deduccion'] as const).map((tipo) => (
          <option key={tipo} value={tipo}>
            {TIPO_HABER_LABEL[tipo]}
          </option>
        ))}
      </select>
      <RubroSelect linea={linea} onChange={onChange} />
      <button type="button" className="btn-mini" onClick={onRemove} aria-label="Quitar línea">
        ×
      </button>
    </BurbujaLinea>
  )
}

function FilaEditable({
  linea,
  controles,
  descuento = false,
}: {
  linea: Linea
  controles: ReactNode
  descuento?: boolean
}) {
  const setLinea = useStore((estado) => estado.setLinea)
  return (
    <tr>
      <td>
        <CellInput
          ariaLabel="Concepto"
          value={linea.descripcion}
          onChange={(descripcion) => setLinea(linea.id, { descripcion })}
        />
      </td>
      <td>
        <CellInput
          className="mono right"
          ariaLabel="Unidad"
          value={linea.unidad}
          onChange={(unidad) => setLinea(linea.id, { unidad })}
        />
      </td>
      <td>
        <MoneyCell
          emptyAsBlank
          ariaLabel="Base"
          value={linea.baseCentavos}
          onChange={(baseCentavos) => setLinea(linea.id, { baseCentavos })}
        />
      </td>
      <td>
        <div className={descuento ? 'descuento' : undefined}>
          {descuento && <span className="signo">−</span>}
          <MoneyCell
            ariaLabel="Monto"
            value={linea.montoCentavos}
            onChange={(montoCentavos) => setLinea(linea.id, { montoCentavos: montoCentavos ?? 0 })}
          />
        </div>
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
        <strong>Sueldo Bruto</strong>
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
        <div className="composicion-body">
          <div className="cortes">
            <h2>Detalle de la Composición Salarial</h2>
            <p className="corte-titulo">Costo Total del Empleador</p>
            {(
              [
                ['sindical', 'Total Costo Sindical:'],
                ['seguridad_social', 'Total Seguridad Social (*):'],
                ['obra_social', 'Total Obra Social:'],
                ['inssjp', 'Total Costo INSSJP:'],
                ['art', 'Total Costo ART:'],
                ['camaras', 'Total Cámaras o entidades empresariales:'],
                ['scvo', 'Total Costo SCVO:'],
                ['otros', 'Total Otros Rubros:'],
              ] as const
            ).map(([rubro, label]) => {
              const corte = tot.porRubro[rubro]
              return (
                <div className="corte" key={rubro}>
                  <div className="corte-head">
                    <span>{label}</span>
                    <b className="mono">{dinero(corte.total)}</b>
                  </div>
                  {(corte.empleador > 0 || corte.trabajador > 0) && (
                    <div className="corte-split">
                      {corte.empleador > 0 && (
                        <span>
                          Empleador <b className="mono">{dinero(corte.empleador)}</b>
                        </span>
                      )}
                      {corte.trabajador > 0 && (
                        <span>
                          Trabajador <b className="mono">{dinero(corte.trabajador)}</b>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <p className="nota">
              (*) Nota: Seguridad Social del empleador incluye SIPA, Fondo Nacional de Empleo y Asignaciones
              Familiares.
            </p>
          </div>

          <div className="torta-box">
            {patrones && <DefsPatrones />}
            <div className="torta-pie-wrap">
              <PieChart partes={tot.partesTorta} patrones={patrones} />
              <label className="burbuja burbuja-torta no-print">
                <input
                  type="checkbox"
                  checked={patrones}
                  onChange={(event) => setPatrones(event.target.checked)}
                />
                Patrones
              </label>
            </div>
            <ul className="leyenda">
              {tot.partesTorta
                .filter((parte) => parte.valor > 0)
                .sort((a, b) => b.pct - a.pct)
                .map((parte) => (
                  <li key={parte.key}>
                    <MuestraParte clave={parte.key} patrones={patrones} />
                    <span>{parte.label}</span>
                    <b>
                      {parte.pct.toLocaleString('es-AR', {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                      %
                    </b>
                  </li>
                ))}
            </ul>
          </div>
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
  )
}
