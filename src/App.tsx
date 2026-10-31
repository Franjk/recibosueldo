import { ReciboSheet } from './components/ReciboSheet.tsx'
import { useReciboListo, useStore } from './store.ts'

export default function App() {
  const listo = useReciboListo()
  const vaciar = useStore((estado) => estado.vaciar)

  if (!listo) {
    return (
      <div className="app">
        <p className="cargando">Cargando el recibo…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="sidebar no-print">
        <div>
          <p className="eyebrow">Recibo de haberes</p>
          <h1>Editor</h1>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              if (window.confirm('¿Vaciar todos los campos del recibo?')) vaciar()
            }}
          >
            Vaciar
          </button>
          <button type="button" className="btn" onClick={() => window.print()}>
            Imprimir o guardar PDF
          </button>
        </div>
      </header>
      <main className="stage">
        <ReciboSheet />
      </main>
    </div>
  )
}
