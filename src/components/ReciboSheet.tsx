import type { ReactNode } from 'react'
import { filasHaberes, filasTipo, totales } from '../calc.ts'
import { enLetrasPesos } from '../letras.ts'
import { formatNumero } from '../money.ts'
import { useStore } from '../store.ts'
import type { Linea, Rubro, TipoLinea } from '../types.ts'
import { RUBRO_LABEL, RUBROS, TIPO_HABER_LABEL } from '../types.ts'
import { COLORES_TORTA } from '../pieColors.ts'
import { CellInput, MoneyCell } from './Fields.tsx'
import { PieChart } from './PieChart.tsx'

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
    <td className="controles no-print">
      <RubroSelect linea={linea} onChange={onChange} />
      <button type="button" className="btn-mini" onClick={onRemove} aria-label="Quitar línea">
        ×
      </button>
    </td>
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
    <td className="controles no-print">
      <select
        aria-label="Tipo de línea"
        value={linea.tipo}
        onChange={(event) => {
          const tipo = event.target.value as TipoLinea
          onChange({
            tipo,
            rubro: tipo === 'deduccion' ? linea.rubro : null,
          })
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
    </td>
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
  const tot = totales(recibo.lineas)
  const contribuciones = filasTipo(recibo.lineas, 'contribucion')
  const haberes = filasHaberes(recibo.lineas)

  return (
    <article className="sheet">
      <table className="grid-head">
        <tbody>
          <tr>
            <td className="lab">Empresa</td>
            <td className="lab">Domicilio Legal</td>
            <td className="lab">C.U.I.T. Empleador</td>
          </tr>
          <tr>
            <td>
              <CellInput
                ariaLabel="Empresa"
                value={recibo.empresa}
                onChange={(empresa) => recibo.patch({ empresa })}
              />
            </td>
            <td>
              <CellInput
                ariaLabel="Domicilio legal"
                value={recibo.domicilioLegal}
                onChange={(domicilioLegal) => recibo.patch({ domicilioLegal })}
              />
            </td>
            <td>
              <CellInput
                className="mono"
                ariaLabel="CUIT empleador"
                value={recibo.cuitEmpleador}
                onChange={(cuitEmpleador) => recibo.patch({ cuitEmpleador })}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <table className="grid-head">
        <tbody>
          <tr>
            <td className="lab narrow">Q</td>
            <td className="lab periodo">Mes</td>
            <td className="lab periodo">Año</td>
            <td className="lab">Apellido y Nombre</td>
            <td className="lab">Nro. Legajo</td>
            <td className="lab">Sueldo Bruto</td>
            <td className="lab">Antigüedad</td>
          </tr>
          <tr>
            <td>
              <CellInput
                className="center"
                ariaLabel="Quincena"
                value={recibo.quincena}
                onChange={(quincena) => recibo.patch({ quincena })}
              />
            </td>
            <td>
              <CellInput
                className="center"
                ariaLabel="Mes"
                value={recibo.mes}
                onChange={(mes) => recibo.patch({ mes })}
              />
            </td>
            <td>
              <CellInput
                className="center"
                ariaLabel="Año"
                value={recibo.anio}
                onChange={(anio) => recibo.patch({ anio })}
              />
            </td>
            <td>
              <CellInput
                ariaLabel="Apellido y nombre"
                value={recibo.apellidoNombre}
                onChange={(apellidoNombre) => recibo.patch({ apellidoNombre })}
              />
            </td>
            <td>
              <CellInput
                className="center"
                ariaLabel="Número de legajo"
                value={recibo.legajo}
                onChange={(legajo) => recibo.patch({ legajo })}
              />
            </td>
            <td className="mono right strong">{dinero(tot.bruto)}</td>
            <td>
              <CellInput
                ariaLabel="Antigüedad"
                value={recibo.antiguedad}
                onChange={(antiguedad) => recibo.patch({ antiguedad })}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <table className="grid-head">
        <tbody>
          <tr>
            <td className="lab">C.U.I.L.</td>
            <td className="lab">Categoría Laboral</td>
            <td className="lab">Fec. Ingreso</td>
            <td className="lab">Lugar de Pago</td>
            <td className="lab">Fecha Pago Aportes</td>
          </tr>
          <tr>
            <td>
              <CellInput
                className="mono"
                ariaLabel="CUIL"
                value={recibo.cuil}
                onChange={(cuil) => recibo.patch({ cuil })}
              />
            </td>
            <td>
              <CellInput
                ariaLabel="Categoría laboral"
                value={recibo.categoria}
                onChange={(categoria) => recibo.patch({ categoria })}
              />
            </td>
            <td>
              <CellInput
                className="center"
                ariaLabel="Fecha de ingreso"
                value={recibo.fechaIngreso}
                onChange={(fechaIngreso) => recibo.patch({ fechaIngreso })}
              />
            </td>
            <td>
              <CellInput
                ariaLabel="Lugar de pago"
                value={recibo.lugarPago}
                onChange={(lugarPago) => recibo.patch({ lugarPago })}
              />
            </td>
            <td>
              <CellInput
                className="center"
                ariaLabel="Fecha pago aportes"
                value={recibo.fechaPagoAportes}
                onChange={(fechaPagoAportes) => recibo.patch({ fechaPagoAportes })}
              />
            </td>
          </tr>
        </tbody>
      </table>

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
            <th className="no-print" />
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
            <td className="no-print" />
          </tr>
        </tbody>
      </table>

      <div className="add-row no-print">
        <button type="button" className="btn secondary" onClick={() => recibo.addLinea('contribucion')}>
          Agregar contribución
        </button>
      </div>

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
            <th className="no-print" />
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

      <div className="add-row no-print">
        <button type="button" className="btn secondary" onClick={() => recibo.addLinea('remunerativo')}>
          Agregar remunerativo
        </button>
        <button type="button" className="btn secondary" onClick={() => recibo.addLinea('no_remunerativo')}>
          Agregar no remunerativo
        </button>
        <button type="button" className="btn secondary" onClick={() => recibo.addLinea('deduccion')}>
          Agregar descuento
        </button>
      </div>

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
            <PieChart partes={tot.partesTorta} />
            <ul className="leyenda">
              {tot.partesTorta.map((parte) => (
                <li key={parte.key}>
                  <i style={{ background: COLORES_TORTA[parte.key] }} />
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
