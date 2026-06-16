<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  Location01Icon,
  PlusSignIcon,
  Delete01Icon,
  Shield01Icon,
  Tick01Icon,
  Search01Icon,
  CircleIcon,
  SquareIcon,
  MapsIcon,
  PaintBrush01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import { createGeocercaApi, updateGeocercaApi, fetchGeocercaDetallesApi } from '../services/geocercas.api'
import type { GeocercaCreatePayload } from '../types/geocerca'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import AppButton from '../../../components/ui/AppButton.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createGeocercaSchema, updateGeocercaSchema } from '../../../schemas/geocercas.schema'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'

const props = defineProps<{ id?: string }>()
const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const authStore = useAuthStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()
const toast = useToast()

// Form State
const formData = ref({
  nombre: '',
  descripcion: '',
  color: '#3b82f6',
  tipo: 1 as 1 | 2 // 1: Circular, 2: Poligonal
})
const paradas = ref<Array<{ lat: number, lon: number, radio?: number }>>([])
const radius = ref(100) // Default radius in meters

const isEditing = computed(() => !!props.id)
const isSubmitting = ref(false)
const isLoadingData = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

// Validaciones
const activeSchema = computed(() => isEditing.value ? updateGeocercaSchema : createGeocercaSchema)
const { validate, getFirstError, resetErrors } = useFormValidator(activeSchema as any)
const { getError, clearErrors } = useFormError('geocercas-form')

// Predefined Colors
const predefinedColors = [
  '#3b82f6', // Azul
  '#ef4444', // Rojo
  '#22c55e', // Verde
  '#f59e0b', // Amarillo
  '#8b5cf6', // Violeta
  '#ec4899', // Rosa
  '#14b8a6', // Teal
  '#f97316', // Naranja
  '#6366f1', // Indigo
  '#84cc16'  // Lime
]
const showCustomColorPicker = ref(false)
const colorInputRef = ref<HTMLInputElement | null>(null)

const selectOtros = () => {
  showCustomColorPicker.value = true
  setTimeout(() => {
    colorInputRef.value?.click()
  }, 50)
}

// Google Maps Setup (shared composable)
const { loadGoogleMaps } = useGoogleMaps()
const {
  map,
  isLoadingMap,
  initMap,
  startDarkModeObserver
} = useMapSetup('geocerca-form-map-container', {
  defaultZoom: 12,
  gestureHandling: 'cooperative'
})
const currentDrawing = shallowRef<any>(null)
let activeMapMarkers: any[] = []

const initializeMap = async (googleMapsApi: any) => {
  initMap(googleMapsApi, (lat, lng) => {
    handleMapClick(lat, lng)
  })

  if (map.value) {
    map.value.addListener('rightclick', (e: any) => {
      if (paradas.value.length === 0) return
      if (e.domEvent && typeof e.domEvent.preventDefault === 'function') {
        e.domEvent.preventDefault()
      }
      const point = e.pixel || { x: 0, y: 0 }
      contextMenu.value = { visible: true, x: point.x, y: point.y }
    })
  }

  if (isEditing.value) {
    loadGeocercaData()
  }
}

const loadGeocercaData = async () => {
  if (!props.id || !selectedGroup.value?.id) return
  isLoadingData.value = true
  
  try {
    const detalle = await fetchGeocercaDetallesApi(selectedGroup.value.id, props.id)
    if (detalle) {
      formData.value = {
        nombre: detalle.nombre,
        descripcion: detalle.descripcion || '',
        color: detalle.color || '#3b82f6',
        tipo: detalle.tipo === 'Poligonal' ? 2 : 1
      }
      
      const colLower = (detalle.color || '#3b82f6').toLowerCase()
      if (!predefinedColors.some(c => c.toLowerCase() === colLower)) {
        showCustomColorPicker.value = true
      }

      if (detalle.puntos && detalle.puntos.length > 0) {
        paradas.value = detalle.puntos.map(p => ({
          lat: parseFloat(p.lat),
          lon: parseFloat(p.lon),
          radio: p.radio ? parseFloat(p.radio) : undefined
        }))
        
        if (formData.value.tipo === 1 && paradas.value[0].radio) {
          radius.value = paradas.value[0].radio
        }
        
        updateDrawing()
        
        // Center Map
        if (map.value) {
          if (formData.value.tipo === 1) {
            map.value.setCenter({ lat: paradas.value[0].lat, lng: paradas.value[0].lon })
            map.value.setZoom(15)
          } else {
            const bounds = new (window as any).google.maps.LatLngBounds()
            paradas.value.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }))
            map.value.fitBounds(bounds)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error loading geocerca data', error)
    showModalMessage('Error cargando los datos', 'error')
  } finally {
    isLoadingData.value = false
  }
}

const handleMapClick = (lat: number, lon: number) => {
  if (formData.value.tipo === 1) {
    // Circular: Replace existing point
    paradas.value = [{ lat, lon, radio: radius.value }]
  } else {
    // Poligonal: Add new point
    paradas.value.push({ lat, lon })
  }
  updateDrawing()
}

const isDraggingHandle = ref(false)

const contextMenu = ref<{ visible: boolean, x: number, y: number }>({ visible: false, x: 0, y: 0 })

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

const handleDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement | null
  if (target && target.closest('[data-geocerca-context-menu]')) return
  closeContextMenu()
}

const handleDocumentKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeContextMenu()
}

const deleteDrawing = () => {
  paradas.value = []
  updateDrawing()
  closeContextMenu()
}

const clearAllMarkers = () => {
  if (activeMapMarkers && activeMapMarkers.length > 0) {
    activeMapMarkers.forEach(m => {
      if (m && typeof m.setMap === 'function') m.setMap(null)
    })
    activeMapMarkers = []
  }
}

const updateDrawing = () => {
  if (!map.value) return

  // Limpieza agresiva de cualquier rastro previo si no hay datos
  if (paradas.value.length === 0) {
    if (currentDrawing.value) {
      currentDrawing.value.setMap(null)
      currentDrawing.value = null
    }
    clearAllMarkers()
    return
  }

  // Si cambiamos de tipo, limpiar lo anterior completamente
  if (currentDrawing.value && ((formData.value.tipo === 1 && !currentDrawing.value.setRadius) || (formData.value.tipo === 2 && currentDrawing.value.setRadius))) {
    currentDrawing.value.setMap(null)
    currentDrawing.value = null
    clearAllMarkers()
  }

  const color = formData.value.color

  if (formData.value.tipo === 1) {
    const p = paradas.value[0]
    const center = { lat: p.lat, lng: p.lon }
    
    // Create or Update Circle
    if (!currentDrawing.value) {
      currentDrawing.value = new (window as any).google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.2,
        map: map.value,
        center: center,
        radius: radius.value,
        clickable: false
      })
    } else {
      currentDrawing.value.setOptions({ strokeColor: color, fillColor: color, center, radius: radius.value })
    }
    
    // Manage Markers
    if (activeMapMarkers.length !== 2) {
      clearAllMarkers()

      // Center Marker
      const centerMarker = new (window as any).google.maps.Marker({
        position: center,
        map: map.value,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 10
      })
      activeMapMarkers.push(centerMarker)

      // Handle Marker
      const radiusHandle = new (window as any).google.maps.Marker({
        position: center, // will update below
        map: map.value,
        draggable: true,
        icon: {
          path: 'M 0,0 m -10,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0',
          fillColor: '#ffffff',
          fillOpacity: 1,
          strokeColor: color,
          strokeWeight: 3,
          scale: 1,
        },
        zIndex: 20
      })

      radiusHandle.addListener('dragstart', () => { isDraggingHandle.value = true })
      
      radiusHandle.addListener('drag', (e: any) => {
        const dist = (window as any).google.maps.geometry.spherical.computeDistanceBetween(
          new (window as any).google.maps.LatLng(center.lat, center.lng),
          e.latLng
        )
        const newRadius = Math.max(1, Math.min(5000, Math.round(dist)))
        radius.value = newRadius
        currentDrawing.value.setRadius(newRadius)
      })

      radiusHandle.addListener('dragend', () => {
        isDraggingHandle.value = false
        updateDrawing()
      })

      activeMapMarkers.push(radiusHandle)
    }

    // Update markers positions
    if (activeMapMarkers.length === 2) {
      const centerMarker = activeMapMarkers[0]
      const radiusHandle = activeMapMarkers[1]
      
      centerMarker.setPosition(center)
      centerMarker.setIcon({ ...centerMarker.getIcon(), fillColor: color })

      if (!isDraggingHandle.value) {
        const earthRadius = 6378137
        const dLng = radius.value / (earthRadius * Math.cos(Math.PI * center.lat / 180))
        const handlePos = { lat: center.lat, lng: center.lng + (dLng * 180 / Math.PI) }
        radiusHandle.setPosition(handlePos)
        radiusHandle.setIcon({ ...radiusHandle.getIcon(), strokeColor: color })
      }
    }

  } else {
    // Poligonal Logic
    const paths = paradas.value.map(p => ({ lat: p.lat, lng: p.lon }))
    
    if (!currentDrawing.value) {
      currentDrawing.value = new (window as any).google.maps.Polygon({
        paths: paths,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.2,
        map: map.value
      })
    } else {
      currentDrawing.value.setOptions({ strokeColor: color, fillColor: color, paths })
    }

    // Reuse markers for points
    if (activeMapMarkers.length !== paradas.value.length) {
      clearAllMarkers()
      activeMapMarkers = paradas.value.map((p, index) => {
        const marker = new (window as any).google.maps.Marker({
          position: { lat: p.lat, lng: p.lon },
          map: map.value,
          draggable: true,
          label: { text: (index + 1).toString(), color: 'white', fontSize: '10px', fontWeight: '900' },
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        })

        // Mover vértice (arrastrar)
        marker.addListener('drag', (e: any) => {
          paradas.value[index].lat = e.latLng.lat()
          paradas.value[index].lon = e.latLng.lng()
          if (currentDrawing.value) {
            currentDrawing.value.setOptions({ paths: paradas.value.map(pt => ({ lat: pt.lat, lng: pt.lon })) })
          }
        })

        // Eliminar vértice (clic)
        marker.addListener('click', () => {
          paradas.value.splice(index, 1)
          updateDrawing()
        })

        return marker
      })
    } else {
      activeMapMarkers.forEach((m, i) => {
        m.setPosition({ lat: paradas.value[i].lat, lng: paradas.value[i].lon })
        m.setIcon({ ...m.getIcon(), fillColor: color })
      })
    }
  }
}

watch(radius, (newVal) => {
  if (formData.value.tipo === 1 && paradas.value.length > 0) {
    paradas.value[0].radio = newVal
    if (!isDraggingHandle.value) {
      updateDrawing()
    }
  }
})

const changeTipo = (tipo: number) => {
  if (formData.value.tipo === tipo) return
  formData.value.tipo = tipo
  paradas.value = []
  updateDrawing()
}

watch(() => formData.value.color, () => {
  updateDrawing()
})

onMounted(() => {
  startDarkModeObserver()
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKey)

  loadGoogleMaps().then(initializeMap).catch(err => {
    console.error('Error cargando Google Maps:', err)
    isLoadingMap.value = false
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKey)
})

const saveGeocerca = async () => {
  if (isSubmitting.value) return
  
  clearErrors()
  modalMessage.value = null

  const idGrupo = selectedGroup.value?.id?.trim() || ''

  const payload: any = isEditing.value && props.id
    ? {
        id_grupo: idGrupo,
        id_geocerca: props.id,
        nombre: formData.value.nombre,
        descripcion: formData.value.descripcion || '',
        color: formData.value.color,
        tipo: formData.value.tipo,
        paradas: paradas.value
      }
    : {
        id_grupo: idGrupo,
        nombre: formData.value.nombre,
        descripcion: formData.value.descripcion || '',
        color: formData.value.color,
        tipo: formData.value.tipo,
        paradas: paradas.value
      }

  if (formData.value.tipo === 2 && paradas.value.length < 3 && paradas.value.length > 0) {
    showModalMessage('Una geocerca poligonal requiere al menos 3 puntos', 'warning')
    return
  }

  if (!validate(payload, 'geocercas-form')) {
    const firstErr = getFirstError()
    if (firstErr) {
      showModalMessage(firstErr, 'warning')
    }
    return
  }

  isSubmitting.value = true

  try {
    let success = false
    if (isEditing.value && props.id) {
      if (!authStore.hasPermission(PERMISSIONS.GEOCERCAS_EDIT)) {
        showModalMessage('No tienes permiso para editar geocercas', 'error')
        isSubmitting.value = false
        return
      }
      success = await updateGeocercaApi(payload)
    } else {
      success = await createGeocercaApi(payload as GeocercaCreatePayload)
    }

    if (success) {
      toast.add({
        severity: 'success',
        summary: isEditing.value ? 'Actualización exitosa' : 'Creación exitosa',
        detail: isEditing.value ? 'Geocerca actualizada correctamente' : 'Geocerca creada correctamente',
        life: 4000
      })
      setTimeout(() => router.push('/geocercas'), 1500)
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: `Error al ${isEditing.value ? 'actualizar' : 'crear'} la geocerca`,
        life: 4000
      })
    }
  } catch (error) {
    console.error('Error saving geocerca:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Error de red al ${isEditing.value ? 'actualizar' : 'crear'} la geocerca`,
      life: 4000
    })
  } finally {
    isSubmitting.value = false
  }
}

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => { modalMessage.value = null }, 3000)
  }
}

const clearParadas = () => {
  paradas.value = []
  updateDrawing()
}
</script>

<template>
  <div class="h-[calc(100vh-80px)] w-full">
    <div class="relative w-full h-full overflow-hidden">
      
      <!-- MAPA -->
      <div
        id="geocerca-form-map-container"
        class="absolute inset-0 z-0"
        style="width:100%;height:100%;"
      ></div>

      <!-- Capa de Carga del Mapa -->
      <Transition name="fade-overlay">
        <div v-if="isLoadingMap" class="absolute inset-0 z-[8] flex flex-col items-center justify-center gap-5 pointer-events-none bg-white/50 dark:bg-[#0C0E13]/50 backdrop-blur-sm">
          <div class="w-16 h-16 rounded-2xl bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-md border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#3b82f6] shadow-xl animate-spin">
            <HugeiconsIcon :icon="MapsIcon" :size="32" :stroke-width="1.5" />
          </div>
          <p class="text-[11px] font-black text-[#3b82f6] uppercase tracking-[0.25em] animate-pulse">Iniciando Mapa...</p>
        </div>
      </Transition>

      <!-- Menú Contextual (clic derecho en el mapa) -->
      <div
        v-show="contextMenu.visible"
        data-geocerca-context-menu
        class="absolute z-[60] min-w-[180px] rounded-xl bg-white dark:bg-[#13161C] border border-slate-200/80 dark:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-xl"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @contextmenu.prevent
      >
        <div class="px-3 py-2 border-b border-slate-200/60 dark:border-white/5">
          <p class="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Geocerca</p>
        </div>
        <button
          type="button"
          @click="deleteDrawing"
          class="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] font-bold text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors duration-150 active:scale-[0.98]"
        >
          <HugeiconsIcon :icon="Delete01Icon" :size="14" :stroke-width="2.2" />
          <span class="uppercase tracking-wider">Eliminar Geocerca</span>
        </button>
      </div>

      <!-- PANEL LATERAL DE GEOCERCAS (Estilo docked consistente con RutasFormView y Sidebar.vue) -->
      <div class="absolute top-0 bottom-0 left-0 z-10 w-[320px] md:w-[350px] lg:w-[380px] flex flex-col">
        <!-- Panel acoplado consistente con Sidebar.vue -->
        <div class="flex-1 flex flex-col bg-white dark:bg-[#13161C] border-r border-slate-200/70 dark:border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)] overflow-hidden relative">
          
          <!-- Loader Spinner Overlay -->
          <Transition name="loader-fade">
            <div v-if="isSubmitting" class="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-[#0C0E13]/85 backdrop-blur-md overflow-hidden animate-none">
              <div class="flex flex-col items-center gap-4 p-8">
                <div class="relative flex items-center justify-center">
                  <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
                  <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
                </div>
                <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">{{ isEditing ? 'Actualizando' : 'Creando' }} Geocerca</p>
              </div>
            </div>
          </Transition>

          <!-- Encabezado -->
          <div class="relative px-5 py-5 border-b border-slate-200/60 dark:border-white/5 shrink-0">
            <div class="relative flex items-center gap-3">
              <!-- Botón Volver Plano -->
              <button @click="router.push('/geocercas')"
                class="w-9 h-9 rounded-[12px] flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200 shrink-0">
                <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" :stroke-width="2.2" />
              </button>

              <!-- Ícono plano -->
              <div class="w-9 h-9 rounded-[12px] bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20 shrink-0">
                <HugeiconsIcon :icon="MapsIcon" :size="18" :stroke-width="2" />
              </div>

              <div class="flex-1 min-w-0">
                <h1 class="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight leading-tight">
                  {{ isEditing ? 'Editar Geocerca' : 'Nueva Geocerca' }}
                </h1>
                <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                  Configuración y Trazado
                </p>
              </div>
            </div>

            <div class="relative mt-4">
              <AppButton variant="primary" @click="saveGeocerca" :loading="isSubmitting" class="w-full !rounded-[12px]">
                <span>{{ $t('geocercas.btnSave', 'Guardar Geocerca') }}</span>
              </AppButton>
            </div>
          </div>

          <!-- Formulario de configuración -->
          <div class="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
            <div class="space-y-6 relative p-1">
              
              <!-- Mensajes informativos -->
              <Transition name="fade">
                <div v-if="modalMessage" 
                     class="flex items-center gap-3 py-3 px-4 rounded-[12px] text-xs font-bold tracking-tight uppercase border animate-none"
                     :class="{
                       'text-red-500 bg-red-500/5 border-red-500/10': modalMessage.type === 'error',
                       'text-amber-500 bg-amber-500/5 border-amber-500/10': modalMessage.type === 'warning',
                       'text-[#3b82f6] bg-[#3b82f6]/5 border-[#3b82f6]/10': modalMessage.type === 'success'
                     }">
                  <HugeiconsIcon :icon="modalMessage.type === 'success' ? Tick01Icon : Shield01Icon" :size="16" />
                  {{ modalMessage.text }}
                </div>
              </Transition>

              <!-- Inputs -->
              <div>
                <AppInput 
                  v-model="formData.nombre"
                  label="Nombre de la Geocerca"
                  placeholder="Ej: Zona Norte"
                  :icon="MapsIcon"
                  required
                />
                <span v-if="getError('nombre')" class="text-xs text-red-500 font-bold ml-1.5 mt-1 block">{{ getError('nombre') }}</span>
              </div>

              <div>
                <AppInput 
                  v-model="formData.descripcion"
                  type="textarea"
                  label="Descripción"
                  placeholder="Describe el propósito de esta geocerca..."
                  :rows="3"
                />
                <span v-if="getError('descripcion')" class="text-xs text-red-500 font-bold ml-1.5 mt-1 block">{{ getError('descripcion') }}</span>
              </div>

              <!-- Sección: Estilo Visual (Color) -->
              <div class="p-4 bg-slate-50/50 dark:bg-[#1E222B]/20 border border-slate-200/50 dark:border-white/[0.03] rounded-2xl space-y-3 shadow-sm">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Color de Geocerca</label>
                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    v-for="color in predefinedColors"
                    :key="color"
                    type="button"
                    :disabled="isSubmitting"
                    @click="formData.color = color; showCustomColorPicker = false"
                    class="w-6 h-6 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
                    :style="{ backgroundColor: color }"
                    :title="color"
                  >
                    <HugeiconsIcon
                      v-if="formData.color.toLowerCase() === color.toLowerCase() && !showCustomColorPicker"
                      :icon="Tick01Icon"
                      :size="10"
                      class="text-white"
                    />
                  </button>

                  <!-- "Otros" (Custom Color Picker Button) -->
                  <button
                    type="button"
                    :disabled="isSubmitting"
                    @click="selectOtros"
                    class="h-6 px-2.5 rounded-full border text-[11px] font-bold transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none flex items-center gap-1.5"
                    :class="[
                      showCustomColorPicker
                        ? 'bg-gradient-to-b from-[#3b82f6] to-[#2563eb] border-[#2563eb] text-white shadow-sm'
                        : 'bg-white dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A]'
                    ]"
                  >
                    <span>Otros</span>
                    <span 
                      v-if="showCustomColorPicker" 
                      class="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0" 
                      :style="{ backgroundColor: formData.color }"
                    ></span>
                  </button>

                  <!-- Color Input (visible only when showCustomColorPicker is true) -->
                  <div v-if="showCustomColorPicker" class="flex items-center gap-2 ml-auto">
                    <input
                      ref="colorInputRef"
                      type="color"
                      v-model="formData.color"
                      :disabled="isSubmitting"
                      class="w-8 h-6 rounded border-none bg-transparent cursor-pointer p-0 shrink-0"
                    />
                    <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase select-none font-mono">
                      {{ formData.color }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Tipo de Geocerca -->
              <div class="p-4 bg-slate-50/50 dark:bg-[#1E222B]/20 border border-slate-200/50 dark:border-white/[0.03] rounded-2xl space-y-3 shadow-sm">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tipo de Geocerca</label>
                <div class="flex p-1 bg-slate-100/50 dark:bg-white/5 rounded-[12px] border border-slate-200/80 dark:border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                  <button type="button" @click="changeTipo(1)"
                    class="flex-1 flex items-center justify-center gap-2 py-2 transition-all duration-300 font-bold text-[11px] uppercase tracking-wider"
                    :class="formData.tipo === 1
                      ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white border-transparent shadow-sm rounded-lg'
                      : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300 rounded-lg'">
                    <HugeiconsIcon :icon="CircleIcon" :size="14" :stroke-width="2.5" />
                    <span>Circular</span>
                  </button>
                  <button type="button" @click="changeTipo(2)"
                    class="flex-1 flex items-center justify-center gap-2 py-2 transition-all duration-300 font-bold text-[11px] uppercase tracking-wider"
                    :class="formData.tipo === 2
                      ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white border-transparent shadow-sm rounded-lg'
                      : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300 rounded-lg'">
                    <HugeiconsIcon :icon="SquareIcon" :size="14" :stroke-width="2.5" />
                    <span>Poligonal</span>
                  </button>
                </div>
              </div>



            </div>
          </div>

          <!-- Pie de página informativo -->
          <div class="shrink-0 px-5 py-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Haz clic en el mapa para empezar a trazar
            </p>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.6s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.18); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.35); }

#geocerca-form-map-container :deep(.gm-style-cc),
#geocerca-form-map-container :deep(.gmnoprint),
#geocerca-form-map-container :deep(a[href^="https://maps.google.com/maps"]) {
  display: none !important;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 18px;
  width: 18px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
  border: 3px solid white;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.loader-fade-enter-active, .loader-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.loader-fade-enter-from, .loader-fade-leave-to {
  opacity: 0;
}
</style>
