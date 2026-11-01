import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nuevaLinea, reciboVacio, reordenarLinea, rubroDeLinea, type LugarLinea } from './calc.ts'
import { guardarReciboLocal, leerReciboLocal } from './io.ts'
import type { Linea, Recibo, TipoLinea } from './types.ts'

interface Acciones {
  patch: (patch: Partial<Omit<Recibo, 'lineas'>>) => void
  setLinea: (id: string, patch: Partial<Linea>) => void
  addLinea: (tipo: TipoLinea) => void
  removeLinea: (id: string) => void
  moverLinea: (id: string, destinoId: string, lugar: LugarLinea) => void
  vaciar: () => void
  cargar: (recibo: Recibo) => void
}

type Store = Recibo & Acciones

const NOMBRE_PERSISTENCIA = 'recibo-wysiwyg-v1'

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...reciboVacio(),
      patch: (patch) => set(patch),
      setLinea: (id, patch) =>
        set((estado) => ({
          lineas: estado.lineas.map((linea) => {
            if (linea.id !== id) return linea
            const siguiente = { ...linea, ...patch }
            return { ...siguiente, rubro: rubroDeLinea(siguiente.tipo, siguiente.rubro) }
          }),
        })),
      addLinea: (tipo) =>
        set((estado) => {
          const linea = nuevaLinea(tipo)
          if (tipo === 'contribucion') {
            let ultima = -1
            for (let i = 0; i < estado.lineas.length; i += 1) {
              if (estado.lineas[i].tipo === 'contribucion') ultima = i
            }
            const lineas = [...estado.lineas]
            lineas.splice(ultima + 1, 0, linea)
            return { lineas }
          }
          return { lineas: [...estado.lineas, linea] }
        }),
      moverLinea: (id, destinoId, lugar) =>
        set((estado) => {
          const lineas = reordenarLinea(estado.lineas, id, destinoId, lugar)
          return lineas === estado.lineas ? estado : { lineas }
        }),
      removeLinea: (id) =>
        set((estado) => {
          const filtradas = estado.lineas.filter((linea) => linea.id !== id)
          const contribuciones = filtradas.filter((linea) => linea.tipo === 'contribucion')
          const haberes = filtradas.filter((linea) => linea.tipo !== 'contribucion')
          return {
            lineas: [
              ...(contribuciones.length > 0 ? contribuciones : [nuevaLinea('contribucion')]),
              ...(haberes.length > 0 ? haberes : [nuevaLinea('remunerativo')]),
            ],
          }
        }),
      vaciar: () => set(reciboVacio()),
      cargar: (recibo) =>
        set({
          ...recibo,
          lineas: recibo.lineas.map((linea) => ({
            ...linea,
            rubro: rubroDeLinea(linea.tipo, linea.rubro),
          })),
        }),
    }),
    {
      name: NOMBRE_PERSISTENCIA,
      version: 3,
      migrate: (persistedState) => {
        const base = reciboVacio()
        const previo = (persistedState ?? {}) as Partial<Recibo>
        const lineas = previo.lineas && previo.lineas.length > 0 ? previo.lineas : base.lineas
        return {
          ...base,
          ...previo,
          bancoDeposito: previo.bancoDeposito ?? '',
          periodoDeposito: previo.periodoDeposito ?? '',
          lineas: lineas.map((linea) => ({
            ...linea,
            rubro: rubroDeLinea(linea.tipo, linea.rubro),
          })),
        }
      },
    },
  ),
)

let persistirCopiaLocal = false

useStore.subscribe(() => {
  if (!persistirCopiaLocal) return
  guardarReciboLocal(useStore.getState())
})

function restaurarCopiaLocal() {
  if (persistirCopiaLocal) return
  let crudo: string | null = null
  try {
    crudo = localStorage.getItem(NOMBRE_PERSISTENCIA)
  } catch {
    crudo = null
  }
  if (!crudo) {
    const guardado = leerReciboLocal()
    if (guardado) useStore.getState().cargar(guardado)
  }
  persistirCopiaLocal = true
}

useStore.persist.onFinishHydration(restaurarCopiaLocal)
if (useStore.persist.hasHydrated()) restaurarCopiaLocal()

export function useReciboListo(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useStore.persist.onFinishHydration(onStoreChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  )
}
