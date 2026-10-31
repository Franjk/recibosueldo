import { useRef, useState } from 'react'
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
        <div>
          <p className="eyebrow">Recibo de haberes</p>
          <h1>Editor</h1>
        </div>
        <div className="actions">
          <button type="button" className="btn secondary" onClick={exportar}>
            Exportar Datos
          </button>
          <button type="button" className="btn secondary" onClick={() => archivo.current?.click()}>
            Importar Datos
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
            className="btn secondary"
            onClick={() => {
              if (window.confirm('¿Vaciar todos los campos del recibo?')) {
                vaciar()
                setGeneracion((actual) => actual + 1)
                setError(null)
              }
            }}
          >
            Vaciar
          </button>
          <button type="button" className="btn" onClick={() => window.print()}>
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
