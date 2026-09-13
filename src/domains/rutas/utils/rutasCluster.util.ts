import type { ParadaPayload } from '../types/ruta'

export interface ParadaVisibleItem {
  parada: ParadaPayload & { fecha?: string }
  index: number
  isFirst: boolean
  isLast: boolean
}

export const RADIO_AGRUPACION_PX = 50

/**
 * Agrupa las paradas según la escala de zoom y proximidad en píxeles de pantalla (Web Mercator).
 * Garantiza que el punto inicial y final siempre permanezcan visibles.
 */
export function agruparParadasPorZoom(
  paradas: Array<ParadaPayload & { fecha?: string }>,
  zoom: number,
  radioPx: number = RADIO_AGRUPACION_PX
): ParadaVisibleItem[] {
  if (!paradas || paradas.length === 0) return []

  // Si hay pocos puntos o el zoom es muy alto, retornar todos
  if (paradas.length <= 3 || zoom >= 18) {
    return paradas.map((parada, index) => ({
      parada,
      index,
      isFirst: index === 0,
      isLast: index === paradas.length - 1
    }))
  }

  const escala = Math.pow(2, zoom)
  const total = paradas.length

  const puntosProyectados = paradas.map((p, index) => {
    const latitudAjustada = Math.max(-85, Math.min(85, p.lat))
    const x = ((p.lon + 180) / 360) * 256 * escala
    const sinLat = Math.sin((latitudAjustada * Math.PI) / 180)
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * 256 * escala
    const isFirst = index === 0
    const isLast = index === total - 1
    const esEspecial = isFirst || isLast || (p.tipo !== 1 && p.tipo !== 8)

    return {
      item: {
        parada: p,
        index,
        isFirst,
        isLast
      },
      x,
      y,
      esEspecial,
      visitado: false
    }
  })

  const visibles: ParadaVisibleItem[] = []

  // Preservar puntos prioritarios (Inicio, Fin y paradas con tipos específicos)
  puntosProyectados.forEach(punto => {
    if (punto.esEspecial) {
      punto.visitado = true
      visibles.push(punto.item)
    }
  })

  // Agrupar puntos intermedios según el radio de píxeles
  for (let i = 0; i < puntosProyectados.length; i++) {
    if (puntosProyectados[i].visitado) continue
    puntosProyectados[i].visitado = true

    visibles.push(puntosProyectados[i].item)

    for (let j = i + 1; j < puntosProyectados.length; j++) {
      if (puntosProyectados[j].visitado) continue

      const dx = puntosProyectados[i].x - puntosProyectados[j].x
      const dy = puntosProyectados[i].y - puntosProyectados[j].y
      const distancia = Math.sqrt(dx * dx + dy * dy)

      if (distancia <= radioPx) {
        puntosProyectados[j].visitado = true
      }
    }
  }

  return visibles.sort((a, b) => a.index - b.index)
}
