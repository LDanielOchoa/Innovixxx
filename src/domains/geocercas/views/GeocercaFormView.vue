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
  Paintbrush01Icon
} from '@hugeicons/core-free-icons'
import { createGeocercaApi } from '../services/geocercas.api'
import type { GeocercaCreatePayload } from '../types/geocerca'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useGoogleMaps } from '../../rutas/composables/useGoogleMaps'
import AppButton from '../../../components/ui/AppButton.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'

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

const isSubmitting = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

// Google Maps Setup
const { loadGoogleMaps } = useGoogleMaps()
const map = shallowRef<any>(null)
const isLoadingMap = ref(true)
const isDarkMapMode = ref(document.documentElement.classList.contains('dark'))
const htmlClassObserver = ref<MutationObserver | null>(null)
const currentDrawing = shallowRef<any>(null)
const markers = ref<any[]>([])

const themes = [
  {
    id: 'tactical',
    getStyle: (isDark: boolean) => {
      const land = isDark ? '#0f172a' : '#e2e8f0'
      const water = isDark ? '#020617' : '#cbd5e1'
      const road = isDark ? '#1e293b' : '#f1f5f9'
      const highway = isDark ? '#334155' : '#ffffff'
      const text = '#64748b'
      const accent = isDark ? '#3b82f6' : '#2563eb'

      return [
        { elementType: 'geometry', stylers: [{ color: land }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: land }, { weight: 2 }] },
        { elementType: 'labels.text.fill', stylers: [{ color: text }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: accent }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: isDark ? '#020617' : '#d1d5db' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: road }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: highway }] },
        { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: accent }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: water }] }
      ]
    }
  }
]

const initializeMap = async (googleMapsApi: any) => {
  await nextTick()
  const container = document.getElementById('geocerca-form-map-container')
  if (!container) return

  isLoadingMap.value = false
  map.value = new googleMapsApi.Map(container, {
    center: { lat: 4.6097, lng: -74.0817 },
    zoom: 6,
    styles: themes[0].getStyle(isDarkMapMode.value),
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'cooperative',
  })

  map.value.addListener('click', (e: any) => {
    const lat = e.latLng.lat()
    const lon = e.latLng.lng()
    handleMapClick(lat, lon)
  })
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

const updateDrawing = () => {
  if (!map.value) return

  // Clear previous drawings
  if (currentDrawing.value) {
    currentDrawing.value.setMap(null)
    currentDrawing.value = null
  }
  markers.value.forEach(m => m.setMap(null))
  markers.value = []

  if (paradas.value.length === 0) return

  const color = formData.value.color

  if (formData.value.tipo === 1) {
    // Draw Circle
    const p = paradas.value[0]
    currentDrawing.value = new (window as any).google.maps.Circle({
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.35,
      map: map.value,
      center: { lat: p.lat, lng: p.lon },
      radius: radius.value
    })
    
    // Add center marker
    markers.value.push(new (window as any).google.maps.Marker({
      position: { lat: p.lat, lng: p.lon },
      map: map.value,
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      }
    }))
  } else {
    // Draw Polygon
    const paths = paradas.value.map(p => ({ lat: p.lat, lng: p.lon }))
    currentDrawing.value = new (window as any).google.maps.Polygon({
      paths: paths,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.35,
      map: map.value
    })

    // Add point markers
    paths.forEach((p, index) => {
      markers.value.push(new (window as any).google.maps.Marker({
        position: p,
        map: map.value,
        label: { text: (index + 1).toString(), color: 'white', fontSize: '10px', fontWeight: '900' },
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      }))
    })
  }
}

watch(radius, () => {
  if (formData.value.tipo === 1 && paradas.value.length > 0) {
    paradas.value[0].radio = radius.value
    updateDrawing()
  }
})

watch(() => formData.value.tipo, () => {
  paradas.value = []
  updateDrawing()
})

watch(() => formData.value.color, () => {
  updateDrawing()
})

onMounted(() => {
  htmlClassObserver.value = new MutationObserver(() => {
    isDarkMapMode.value = document.documentElement.classList.contains('dark')
    if (map.value) {
      map.value.setOptions({ styles: themes[0].getStyle(isDarkMapMode.value) })
    }
  })
  htmlClassObserver.value.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })

  loadGoogleMaps().then(initializeMap).catch(err => {
    console.error('Error cargando Google Maps:', err)
    isLoadingMap.value = false
  })
})

onUnmounted(() => {
  htmlClassObserver.value?.disconnect()
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
    const payload: GeocercaCreatePayload = {
      id_grupo: selectedGroup.value.id,
      nombre: formData.value.nombre,
      descripcion: formData.value.descripcion,
      color: formData.value.color,
      tipo: formData.value.tipo,
      paradas: paradas.value
    }

    const success = await createGeocercaApi(payload)
    if (success) {
      showModalMessage('Geocerca creada correctamente', 'success')
      setTimeout(() => router.push('/geocercas'), 1500)
    } else {
      showModalMessage('Error al crear la geocerca', 'error')
    }
  } catch (error) {
    console.error('Error saving geocerca:', error)
    showModalMessage('Error de red al crear la geocerca', 'error')
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
                <h1 class="text-[17px] font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Nueva Geocerca</h1>
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
                  <button @click="formData.tipo = 1" class="flex-1 flex items-center justify-center py-2 rounded-xl transition-all" :class="formData.tipo === 1 ? 'bg-white dark:bg-[#1A1D24] text-[#3b82f6] shadow-sm' : 'text-slate-400'">
                    <HugeiconsIcon :icon="CircleIcon" :size="16" />
                  </button>
                  <button @click="formData.tipo = 2" class="flex-1 flex items-center justify-center py-2 rounded-xl transition-all" :class="formData.tipo === 2 ? 'bg-white dark:bg-[#1A1D24] text-[#3b82f6] shadow-sm' : 'text-slate-400'">
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

              <div v-if="formData.tipo === 1" class="space-y-4 animate-fade-in">
                <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">Haz clic en el mapa para establecer el centro de la geocerca circular.</p>
                <div class="space-y-3">
                  <div class="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Radio</span>
                    <span class="text-[#3b82f6]">{{ radius }}m</span>
                  </div>
                  <input type="range" v-model.number="radius" min="10" max="5000" step="10" class="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#3b82f6]" />
                </div>
              </div>

              <div v-else class="space-y-3 animate-fade-in">
                <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">Haz clic en el mapa para añadir vértices a tu geocerca poligonal.</p>
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
