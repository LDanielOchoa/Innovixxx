import { ref, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useGroupStore } from '../../../stores/group.store'
import { fetchGeocercasApi, fetchGeocercaDetallesApi } from '../../geocercas/services/geocercas.api'
import type { Geocerca, GeocercaDetalle } from '../../geocercas/types/geocerca'

export function useTrackingGeocercas(mapRef: { value: any }) {
  const groupStore = useGroupStore()
  const { selectedGroup } = storeToRefs(groupStore)

  const showGeocercas = ref(false)
  const loadingGeocercas = ref(false)
  const geocercas = ref<Geocerca[]>([])
  
  // Lista de overlays/polígonos/círculos dibujados en el mapa
  const geocercaDrawings = ref<any[]>([])

  let CustomLabelOverlayClass: any = null

  // Inicializar o crear la clase de etiqueta flotante para Google Maps en modo oscuro
  const getCustomLabelClass = () => {
    if (CustomLabelOverlayClass) return CustomLabelOverlayClass
    if (!(window as any).google?.maps?.OverlayView) return null

    CustomLabelOverlayClass = class extends (window as any).google.maps.OverlayView {
      private element: HTMLDivElement
      private position: any

      constructor(position: any, text: string, color: string) {
        super()
        this.position = position
        this.element = document.createElement('div')
        this.element.style.position = 'absolute'
        this.element.style.transform = 'translate(-50%, -50%) scale(1)'
        this.element.style.background = 'rgba(15, 23, 42, 0.9)'
        this.element.style.backdropFilter = 'blur(4px)'
        this.element.style.border = `1.5px solid ${color}`
        this.element.style.borderRadius = '6px'
        this.element.style.padding = '4px 8px'
        this.element.style.color = '#ffffff'
        this.element.style.fontSize = '9px'
        this.element.style.fontWeight = '800'
        this.element.style.fontFamily = 'Inter, sans-serif'
        this.element.style.whiteSpace = 'nowrap'
        this.element.style.pointerEvents = 'none'
        this.element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'
        this.element.style.textTransform = 'uppercase'
        this.element.style.letterSpacing = '0.06em'
        this.element.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out'
        this.element.innerText = text
      }

      onAdd() {
        const panes = this.getPanes()
        if (panes) {
          panes.overlayMouseTarget.appendChild(this.element)
        }
      }

      draw() {
        const projection = this.getProjection()
        if (!projection) return
        const point = projection.fromLatLngToDivPixel(this.position)
        if (point) {
          this.element.style.left = point.x + 'px'
          this.element.style.top = point.y + 'px'

          const mapInstance = this.getMap()
          if (mapInstance) {
            const zoom = mapInstance.getZoom()
            let scale = 1
            let opacity = 1

            if (zoom >= 14) {
              scale = 1
              opacity = 1
            } else if (zoom >= 10) {
              scale = 0.65 + (zoom - 10) * (0.35 / 4)
              opacity = 0.75 + (zoom - 10) * (0.25 / 4)
            } else if (zoom >= 8) {
              scale = 0.45 + (zoom - 8) * (0.2 / 2)
              opacity = 0.2 + (zoom - 8) * (0.55 / 2)
            } else {
              scale = 0
              opacity = 0
            }

            this.element.style.transform = `translate(-50%, -50%) scale(${scale})`
            this.element.style.opacity = String(opacity)
          }
        }
      }

      onRemove() {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element)
        }
      }
    }

    return CustomLabelOverlayClass
  }

  // Limpiar todos los elementos dibujados
  const clearGeocercaDrawings = () => {
    geocercaDrawings.value.forEach(d => {
      if (d) {
        if (typeof d.setMap === 'function') {
          d.setMap(null)
        }
      }
    })
    geocercaDrawings.value = []
  }

  // Dibujar todas las geocercas en el mapa
  const renderGeocercasOnMap = async () => {
    clearGeocercaDrawings()
    if (!showGeocercas.value || !selectedGroup.value?.id || !mapRef.value) return

    loadingGeocercas.value = true
    try {
      if (geocercas.value.length === 0) {
        geocercas.value = await fetchGeocercasApi(selectedGroup.value.id)
      }

      if (geocercas.value.length === 0) return

      const promises = geocercas.value.map(g =>
        fetchGeocercaDetallesApi(selectedGroup.value!.id, g.id_geocerca).catch(() => null)
      )

      const detalles = await Promise.all(promises)

      // Si el usuario desactivó las geocercas mientras se cargaban los datos de la API, cancelar
      if (!showGeocercas.value) {
        clearGeocercaDrawings()
        return
      }

      const LabelClass = getCustomLabelClass()

      detalles.forEach(detalle => {
        if (!detalle || !detalle.puntos || detalle.puntos.length === 0) return
        const color = detalle.color || '#3b82f6'
        let centerLatLng: any = null

        if (detalle.tipo === 'Circular') {
          const p = detalle.puntos[0]
          const center = { lat: parseFloat(p.lat), lng: parseFloat(p.lon) }
          const radius = parseFloat(p.radio || '0')
          const circle = new (window as any).google.maps.Circle({
            strokeColor: color,
            strokeOpacity: 0.7,
            strokeWeight: 1.5,
            fillColor: color,
            fillOpacity: 0.2,
            map: mapRef.value,
            center,
            radius,
            clickable: false
          })
          geocercaDrawings.value.push(circle)
          centerLatLng = center
        } else {
          const paths = detalle.puntos.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
          const polygon = new (window as any).google.maps.Polygon({
            paths,
            strokeColor: color,
            strokeOpacity: 0.7,
            strokeWeight: 1.5,
            fillColor: color,
            fillOpacity: 0.2,
            map: mapRef.value,
            clickable: false
          })
          geocercaDrawings.value.push(polygon)

          const polyBounds = new (window as any).google.maps.LatLngBounds()
          paths.forEach(p => polyBounds.extend(p))
          centerLatLng = polyBounds.getCenter()
        }

        if (centerLatLng && mapRef.value && LabelClass) {
          const position = new (window as any).google.maps.LatLng(
            typeof centerLatLng.lat === 'function' ? centerLatLng.lat() : centerLatLng.lat,
            typeof centerLatLng.lng === 'function' ? centerLatLng.lng() : centerLatLng.lng
          )
          const labelOverlay = new LabelClass(position, detalle.nombre, color)
          labelOverlay.setMap(mapRef.value)
          geocercaDrawings.value.push(labelOverlay)
        }
      })
    } catch (err) {
      console.error('Error al renderizar geocercas en el mapa:', err)
    } finally {
      loadingGeocercas.value = false
    }
  }

  const toggleGeocercas = () => {
    showGeocercas.value = !showGeocercas.value
  }

  // Reactividad
  watch(showGeocercas, (val) => {
    if (val) {
      renderGeocercasOnMap()
    } else {
      clearGeocercaDrawings()
    }
  })

  watch(selectedGroup, () => {
    geocercas.value = []
    if (showGeocercas.value) {
      renderGeocercasOnMap()
    }
  })

  onUnmounted(() => {
    clearGeocercaDrawings()
  })

  return {
    showGeocercas,
    loadingGeocercas,
    toggleGeocercas,
    renderGeocercasOnMap,
    clearGeocercaDrawings
  }
}
