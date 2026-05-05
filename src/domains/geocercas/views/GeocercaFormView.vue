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
  PaintBrush01Icon
} from '@hugeicons/core-free-icons'
import { createGeocercaApi, updateGeocercaApi, fetchGeocercaDetallesApi } from '../services/geocercas.api'
import type { GeocercaCreatePayload } from '../types/geocerca'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import AppButton from '../../../components/ui/AppButton.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'

const props = defineProps<{ id?: string }>()
const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()

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
const markers = shallowRef<any[]>([])

const initializeMap = async (googleMapsApi: any) => {
  initMap(googleMapsApi, (lat, lng) => {
    handleMapClick(lat, lng)
  })

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

let activeMapMarkers: any[] = []

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

  loadGoogleMaps().then(initializeMap).catch(err => {
    console.error('Error cargando Google Maps:', err)
    isLoadingMap.value = false
  })
})

onUnmounted(() => {
  // Cleanup handled by useMapSetup onUnmounted
})

const saveGeocerca = async () => {
  if (isSubmitting.value) return
  if (!selectedGroup.value?.id) {
    showModalMessage('Debes seleccionar un grupo', 'warning')
    return
  }
  if (!formData.value.nombre) {
    showModalMessage('El nombre es obligatorio', 'warning')
    return
  }
  if (paradas.value.length === 0) {
    showModalMessage('Debes trazar la geocerca en el mapa', 'warning')
    return
  }
  if (formData.value.tipo === 2 && paradas.value.length < 3) {
    showModalMessage('Una geocerca poligonal requiere al menos 3 puntos', 'warning')
    return
  }

  isSubmitting.value = true
  modalMessage.value = null

  try {
    const payload: any = {
      id_grupo: selectedGroup.value.id,
      nombre: formData.value.nombre,
      descripcion: formData.value.descripcion,
      color: formData.value.color,
      tipo: formData.value.tipo,
      paradas: paradas.value
    }

    let success = false
    if (isEditing.value && props.id) {
      if (!authStore.hasPermission(PERMISSIONS.GEOCERCAS_EDIT)) {
        showModalMessage('No tienes permiso para editar geocercas', 'error')
        isSubmitting.value = false
        return
      }
      payload.id_geocerca = props.id
      success = await updateGeocercaApi(payload)
    } else {
      success = await createGeocercaApi(payload as GeocercaCreatePayload)
    }

    if (success) {
      showModalMessage(isEditing.value ? 'Geocerca actualizada correctamente' : 'Geocerca creada correctamente', 'success')
      setTimeout(() => router.push('/geocercas'), 1500)
    } else {
      showModalMessage(`Error al ${isEditing.value ? 'actualizar' : 'crear'} la geocerca`, 'error')
    }
  } catch (error) {
    console.error('Error saving geocerca:', error)
    showModalMessage(`Error de red al ${isEditing.value ? 'actualizar' : 'crear'} la geocerca`, 'error')
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
      
      <!-- MAP -->
      <div
        id="geocerca-form-map-container"
        class="absolute inset-0 z-0"
        style="width:100%;height:100%;"
      ></div>

      <!-- Overlay Carga Mapa -->
      <Transition name="fade-overlay">
        <div v-if="isLoadingMap" class="absolute inset-0 z-[8] flex flex-col items-center justify-center gap-5 pointer-events-none bg-white/50 dark:bg-[#0C0E13]/50 backdrop-blur-sm">
          <div class="w-16 h-16 rounded-2xl bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-md border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#3b82f6] shadow-xl animate-spin">
            <HugeiconsIcon :icon="MapsIcon" :size="32" :stroke-width="1.5" />
          </div>
          <p class="text-[11px] font-black text-[#3b82f6] uppercase tracking-[0.25em] animate-pulse">Iniciando Mapa...</p>
        </div>
      </Transition>

      <!-- FLOATING SIDEBAR -->
      <div class="absolute top-0 bottom-0 left-0 z-10 w-[340px] md:w-[380px] lg:w-[420px] flex flex-col animate-fade-in">
        <div class="flex-1 flex flex-col m-4 rounded-xl bg-white/95 dark:bg-[#0C0E13] backdrop-blur-3xl border border-slate-200 dark:border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">
          
          <!-- Header -->
          <div class="relative px-5 pt-6 pb-5 border-b border-slate-100 dark:border-white/[0.05] shrink-0">
            <div class="flex items-center gap-4">
              <button @click="router.push('/geocercas')" class="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-[#3b82f6] transition-all shadow-sm active:scale-95">
                <HugeiconsIcon :icon="ArrowLeft01Icon" :size="20" />
              </button>
              <div class="flex-1">
                <h1 class="text-[17px] font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{{ isEditing ? 'Editar Geocerca' : 'Nueva Geocerca' }}</h1>
                <p class="text-[10px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-[0.15em] mt-1">Configuración y Trazado</p>
              </div>
            </div>
            
            <div class="mt-6 flex gap-3">
              <AppButton variant="primary" @click="saveGeocerca" :loading="isSubmitting" class="flex-1">
                {{ $t('geocercas.btnSave', 'Guardar Geocerca') }}
              </AppButton>
            </div>
          </div>

          <!-- Form Content -->
          <div class="flex-1 overflow-y-auto custom-scrollbar px-5 py-6 space-y-6">
            
            <!-- Messages -->
            <Transition name="fade">
              <div v-if="modalMessage" 
                   class="flex items-center gap-3 p-4 rounded-xl text-[11px] font-black uppercase tracking-wider border"
                   :class="modalMessage.type === 'error' ? 'bg-red-500/5 text-red-500 border-red-500/10' : (modalMessage.type === 'warning' ? 'bg-amber-500/5 text-amber-500 border-amber-500/10' : 'bg-green-500/5 text-green-500 border-green-500/10')">
                <HugeiconsIcon :icon="modalMessage.type === 'success' ? Tick01Icon : Shield01Icon" :size="16" />
                {{ modalMessage.text }}
              </div>
            </Transition>

            <!-- Inputs -->
            <AppFormInput 
              v-model="formData.nombre"
              label="Nombre de la Geocerca"
              placeholder="Ej: Zona Norte"
              :icon="MapsIcon"
            />

            <div class="space-y-2">
              <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5 text-balance">Descripción</label>
              <div class="relative group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-2xl overflow-hidden focus-within:border-[#3b82f6]/40 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                <textarea v-model="formData.descripcion" rows="3" placeholder="Describe el propósito de esta geocerca..." class="w-full bg-transparent border-none px-4 py-3.5 text-[13px] font-bold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-0 resize-none"></textarea>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">Color</label>
                <div class="relative flex items-center gap-3 p-1.5 bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-2xl">
                  <input type="color" v-model="formData.color" class="w-10 h-10 rounded-xl border-none bg-transparent cursor-pointer overflow-hidden shadow-sm" />
                  <span class="text-[11px] font-black font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">{{ formData.color }}</span>
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">Tipo</label>
                <div class="flex p-1 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <button type="button" @click="changeTipo(1)" class="flex-1 flex items-center justify-center py-2 rounded-xl transition-all" :class="formData.tipo === 1 ? 'bg-white dark:bg-[#1A1D24] text-[#3b82f6] shadow-sm' : 'text-slate-400'">
                    <HugeiconsIcon :icon="CircleIcon" :size="16" />
                  </button>
                  <button type="button" @click="changeTipo(2)" class="flex-1 flex items-center justify-center py-2 rounded-xl transition-all" :class="formData.tipo === 2 ? 'bg-white dark:bg-[#1A1D24] text-[#3b82f6] shadow-sm' : 'text-slate-400'">
                    <HugeiconsIcon :icon="SquareIcon" :size="16" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Trazado Section -->
            <div class="p-5 rounded-2xl bg-[#3b82f6]/[0.03] dark:bg-[#3b82f6]/5 border border-[#3b82f6]/10 dark:border-[#3b82f6]/10 space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5 text-[#3b82f6]">
                  <HugeiconsIcon :icon="Location01Icon" :size="18" />
                  <span class="text-[11px] font-black uppercase tracking-widest">Trazado en Mapa</span>
                </div>
                <button @click="clearParadas" class="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors">Limpiar</button>
              </div>

              <div v-if="formData.tipo === 1" class="space-y-6 animate-fade-in">
                <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  Haz clic en el mapa para establecer el centro o <span class="text-[#3b82f6] font-bold">arrastra el controlador blanco</span> en el borde del círculo para ajustar el radio.
                </p>
                
                <div class="relative pt-2 pb-6">
                  <div class="flex items-center justify-between mb-5">
                    <div class="flex flex-col">
                      <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Dimensión del Radio</span>
                      <div class="flex items-baseline gap-1.5">
                        <input 
                          type="number" 
                          v-model.number="radius" 
                          min="1" 
                          max="5000"
                          class="w-24 bg-transparent border-none p-0 text-3xl font-black text-[#3b82f6] dark:text-[#5da6fc] tracking-tighter leading-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span class="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Metros</span>
                      </div>
                    </div>
                    
                    <div class="w-12 h-12 rounded-2xl bg-[#3b82f6]/10 dark:bg-[#3b82f6]/5 flex items-center justify-center border border-[#3b82f6]/20 dark:border-[#3b82f6]/10 shadow-inner group-hover:scale-110 transition-transform">
                       <HugeiconsIcon :icon="CircleIcon" :size="20" class="text-[#3b82f6] animate-pulse" />
                    </div>
                  </div>

                  <!-- Custom Styled Slider -->
                  <div class="group relative h-10 flex items-center px-1">
                    <!-- Track Background -->
                    <div class="absolute inset-x-0 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <!-- Active Track with Gradient -->
                      <div 
                        class="h-full bg-gradient-to-r from-[#3b82f6] via-[#60a5fa] to-[#3b82f6] bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite] rounded-full transition-all duration-300" 
                        :style="{ width: (radius / 5000 * 100) + '%' }"
                      ></div>
                    </div>

                    <!-- Hidden Native Range -->
                    <input 
                      type="range" 
                      v-model.number="radius" 
                      min="1" 
                      max="5000" 
                      step="1" 
                      class="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />

                    <!-- Custom Thumb (follows the value) -->
                    <div 
                      class="absolute w-7 h-7 bg-white dark:bg-[#1A1D24] border-[5px] border-[#3b82f6] rounded-full shadow-[0_8px_16px_rgba(59,130,246,0.4)] transition-all duration-100 pointer-events-none z-[5] flex items-center justify-center"
                      :style="{ left: `calc(${(radius / 5000 * 100)}% - 14px)` }"
                    >
                      <div class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-ping"></div>
                      
                      <!-- Tooltip -->
                      <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 whitespace-nowrap shadow-2xl border border-white/10 dark:border-black/5 flex items-center gap-1.5">
                        <HugeiconsIcon :icon="PaintBrush01Icon" :size="10" />
                        {{ radius }}m
                        <div class="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900 dark:border-t-white"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex justify-between mt-3 px-1">
                    <span class="text-[9px] font-black text-slate-300 dark:text-slate-600">1M</span>
                    <span class="text-[9px] font-black text-slate-300 dark:text-slate-600">5000M</span>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-3 animate-fade-in">
                <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  Haz clic en el mapa para añadir vértices. Puedes <span class="text-[#3b82f6] font-bold">arrastrar los números</span> para moverlos, o <span class="text-red-400 font-bold">hacerles clic para eliminarlos</span>.
                </p>
                <div class="flex flex-wrap gap-2">
                  <div v-for="(_, i) in paradas" :key="i" class="w-8 h-8 rounded-lg bg-[#3b82f6] text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                    {{ i + 1 }}
                  </div>
                  <div v-if="paradas.length < 3" class="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest">
                    Mínimo 3 puntos
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer Info -->
          <div class="shrink-0 px-5 py-4 border-t border-slate-100 dark:border-white/[0.05] bg-slate-50/50 dark:bg-white/[0.02]">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
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

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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
</style>
