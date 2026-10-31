import { useRef, useState, type ReactNode } from 'react'
import { ReciboSheet } from './components/ReciboSheet.tsx'
import { nombreArchivoRecibo, parsearRecibo, serializarRecibo } from './io.ts'
import { useReciboListo, useStore } from './store.ts'

export default function App() {
  const listo = useReciboListo()
  const vaciar = useStore((estado) => estado.vaciar)
  const cargar = useStore((estado) => estado.cargar)
  const archivo = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [generacion, setGeneracion] = useState(0)

  function exportar() {
    const recibo = useStore.getState()
    const blob = new Blob([serializarRecibo(recibo)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreArchivoRecibo(recibo)
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setError(null)
  }

  async function importar(file: File) {
    try {
      const recibo = parsearRecibo(await file.text())
      setError(null)
      if (!window.confirm('¿Reemplazar el recibo actual con los datos del archivo?')) return
      cargar(recibo)
      setGeneracion((actual) => actual + 1)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.')
    }
  }

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
        <div className="sidebar-head">
          <span className="sidebar-mark" aria-hidden="true">
            <Icono>
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M10 9H8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
            </Icono>
          </span>
          <h1>Recibo de haberes</h1>
        </div>
        <div className="sidebar-group">
          <p className="sidebar-label">Archivo</p>
          <div className="actions">
            <button type="button" className="btn secondary" onClick={exportar}>
              <Icono>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </Icono>
              Exportar datos
            </button>
            <button type="button" className="btn secondary" onClick={() => archivo.current?.click()}>
              <Icono>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </Icono>
              Importar datos
            </button>
            <input
              ref={archivo}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void importar(file)
              }}
            />
            <button
              type="button"
              className="btn secondary danger"
              onClick={() => {
                if (window.confirm('¿Vaciar todos los campos del recibo?')) {
                  vaciar()
                  setGeneracion((actual) => actual + 1)
                  setError(null)
                }
              }}
            >
              <Icono>
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </Icono>
              Vaciar
            </button>
          </div>
        </div>
        <div className="sidebar-foot">
          <button type="button" className="btn primary" onClick={() => window.print()}>
            <Icono>
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </Icono>
            Imprimir o guardar PDF
          </button>
          {error ? (
            <p className="aviso" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </header>
      <main className="stage">
        <ReciboSheet key={generacion} />
      </main>
    </div>
  )
}

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icono">
      {children}
    </svg>
  )
}
