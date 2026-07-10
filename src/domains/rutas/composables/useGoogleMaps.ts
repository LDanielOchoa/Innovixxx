/**
 * useGoogleMaps.ts
 * ─────────────────────────────────────────────────────────────
 * Composable singleton para la carga de la API de Google Maps.
 *
 * PROBLEMA que resuelve:
 *   RutasListView y RutasFormView cada uno inyectaba su propio
 *   <script> en el <head>, provocando que Google Maps se cargara
 *   dos veces al navegar entre vistas, causando lentitud.
 *
 * SOLUCIÓN:
 *   Un solo Promise compartido a nivel de módulo (fuera del
 *   composable) garantiza que el script solo se inserte UNA vez,
 *   sin importar cuántos componentes llamen a loadGoogleMaps().
 * ─────────────────────────────────────────────────────────────
 */

const MAP_KEY = 'AIzaSyDIUxzochI7PvqdE8pNL6b5jy77NOnO1Ko'
const SCRIPT_ID = 'google-maps-script'

// Singleton: se comparte entre todas las instancias del composable
let mapsPromise: Promise<typeof google.maps> | null = null

export function useGoogleMaps() {
  /**
   * Carga Google Maps API una sola vez.
   * Llamadas posteriores reutilizan el mismo Promise.
   * @returns Promise que resuelve con el namespace google.maps
   */
  const loadGoogleMaps = (): Promise<typeof google.maps> => {
    // 1. Ya está cargado en window → resolve inmediato
    if ((window as any).google?.maps) {
      return Promise.resolve((window as any).google.maps)
    }

    // 2. Ya se llamó antes → devuelve el mismo Promise en curso
    if (mapsPromise) {
      return mapsPromise
    }

    // 3. Primera llamada: crear el script e inyectarlo
    mapsPromise = new Promise<typeof google.maps>((resolve, reject) => {
      // Por si el script ya existe en el DOM (SSR / HMR edge case)
      const existing = document.getElementById(SCRIPT_ID)
      if (existing) {
        existing.addEventListener('load', () =>
          resolve((window as any).google.maps)
        )
        existing.addEventListener('error', reject)
        return
      }

      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAP_KEY}&libraries=places,marker&language=es`
      script.async = true
      script.defer = true
      script.onload = () => resolve((window as any).google.maps)
      script.onerror = reject
      document.head.appendChild(script)
    })

    return mapsPromise
  }

  return { loadGoogleMaps }
}
