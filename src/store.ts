import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nuevaLinea, reciboVacio } from './calc.ts'
import type { Linea, Recibo, TipoLinea } from './types.ts'

interface Acciones {
  patch: (patch: Partial<Omit<Recibo, 'lineas'>>) => void
  setLinea: (id: string, patch: Partial<Linea>) => void
  addLinea: (tipo: TipoLinea) => void
  removeLinea: (id: string) => void
  vaciar: () => void
}

type Store = Recibo & Acciones

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...reciboVacio(),
      patch: (patch) => set(patch),
      setLinea: (id, patch) =>
        set((estado) => ({
          lineas: estado.lineas.map((linea) => (linea.id === id ? { ...linea, ...patch } : linea)),
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
    }),
    { name: 'recibo-wysiwyg-v1' },
  ),
)

export function useReciboListo(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useStore.persist.onFinishHydration(onStoreChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  )
}
