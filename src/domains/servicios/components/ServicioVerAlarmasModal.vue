<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Alert01Icon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  User02Icon,
  HardDriveIcon,
  Tick02Icon,
  MapsIcon,
  ArrowLeft02Icon,
  Loading02Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useThemeStore } from '../../../stores/theme.store'
import { fetchServicioAlertasApi, solventarAlertaApi } from '../services/servicios.api'
import type { ServicioDashboard, ServicioAlertaItem } from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import { useToast } from 'primevue/usetoast'

const MAP_KEY = 'AIzaSyDIUxzochI7PvqdE8pNL6b5jy77NOnO1Ko'

const groupStore = useGroupStore()
const themeStore = useThemeStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  servicio: ServicioDashboard | null
}>()

const emit = defineEmits(['update:isOpen'])

const isLoading = ref(true)
const alertas = ref<ServicioAlertaItem[]>([])
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)
const solventandoToken = ref<string | null>(null)
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Estado de vista dentro del mismo modal ('list' | 'map')
const activeView = ref<'list' | 'map'>('list')
const selectedAlertaForMap = ref<ServicioAlertaItem | null>(null)
const mapZoom = ref(16)
const isMapImageLoading = ref(true)

const staticMapUrl = computed(() => {
  if (!selectedAlertaForMap.value) return ''
  const lat = selectedAlertaForMap.value.latitud
  const lng = selectedAlertaForMap.value.longitud
  if (!lat || !lng) return ''

  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${mapZoom.value}&size=640x460&scale=2&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${MAP_KEY}`

  if (themeStore.isDark) {
    const darkStyles = [
      'element:geometry|color:0x242f3e',
      'element:labels.text.stroke|color:0x242f3e',
      'element:labels.text.fill|color:0x746855',
      'feature:administrative.locality|element:labels.text.fill|color:0xd59563',
      'feature:poi|element:labels.text.fill|color:0xd59563',
      'feature:poi.park|element:geometry|color:0x263c3f',
      'feature:poi.park|element:labels.text.fill|color:0x6b9a76',
      'feature:road|element:geometry|color:0x38414e',
      'feature:road|element:geometry.stroke|color:0x212a37',
      'feature:road|element:labels.text.fill|color:0x9ca5b3',
      'feature:road.highway|element:geometry|color:0x746855',
      'feature:road.highway|element:geometry.stroke|color:0x1f2835',
      'feature:road.highway|element:labels.text.fill|color:0xf3d19c',
      'feature:transit|element:geometry|color:0x2f3948',
      'feature:transit.station|element:labels.text.fill|color:0xd59563',
      'feature:water|element:geometry|color:0x17263c',
      'feature:water|element:labels.text.fill|color:0x515c6d',
      'feature:water|element:labels.text.stroke|color:0x17263c'
    ].map(s => `style=${encodeURIComponent(s)}`).join('&')

    url += `&${darkStyles}`
  }

  return url
})

const googleMapsExternalUrl = computed(() => {
  if (!selectedAlertaForMap.value) return '#'
  return `https://www.google.com/maps/search/?api=1&query=${selectedAlertaForMap.value.latitud},${selectedAlertaForMap.value.longitud}`
})

const zoomIn = () => {
  if (mapZoom.value < 20) {
    isMapImageLoading.value = true
    mapZoom.value++
  }
}

const zoomOut = () => {
  if (mapZoom.value > 10) {
    isMapImageLoading.value = true
    mapZoom.value--
  }
}

const modalTitle = computed(() => {
  if (activeView.value === 'map' && selectedAlertaForMap.value) {
    return `Ubicación de Alarma: ${selectedAlertaForMap.value.tipo_alerta}`
  }
  return 'Historial de Alarmas'
})

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '---'
  const parts = dateStr.split(' ')
  const datePart = parts[0]
  const timePart = parts[1] || ''
  const [year, month, day] = datePart.split('-')
  return `${day}/${month}/${year} ${timePart.substring(0, 5)}`
}

// Ordenar siempre de más reciente a más antigua
const sortedAlertas = computed(() => {
  return [...alertas.value].sort((a, b) => {
    const timeA = new Date(a.fecha_hora.replace(' ', 'T')).getTime() || 0
    const timeB = new Date(b.fecha_hora.replace(' ', 'T')).getTime() || 0
    return timeB - timeA
  })
})

const paginatedAlertas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return sortedAlertas.value.slice(start, start + itemsPerPage.value)
})

const fetchAlertas = async () => {
  if (!groupStore.selectedGroup?.id || !props.servicio?.id_servicio) return
  isLoading.value = true
  modalMessage.value = null
  currentPage.value = 1
  try {
    const res = await fetchServicioAlertasApi({
      id_grupo: groupStore.selectedGroup.id,
      id_servicio: props.servicio.id_servicio
    })
    if (res.done) {
      alertas.value = res.data || []
    } else {
      modalMessage.value = { text: res.message || 'Error al obtener el historial de alarmas.', type: 'error' }
    }
  } catch (error) {
    console.error('Error al cargar alarmas:', error)
    modalMessage.value = { text: 'Error de conexión con el servidor.', type: 'error' }
  } finally {
    isLoading.value = false
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    alertas.value = []
    currentPage.value = 1
    activeView.value = 'list'
    selectedAlertaForMap.value = null
    fetchAlertas()
  }
})

const openMapView = (item: ServicioAlertaItem) => {
  selectedAlertaForMap.value = item
  mapZoom.value = 16
  isMapImageLoading.value = true
  activeView.value = 'map'
}

const backToList = () => {
  activeView.value = 'list'
  selectedAlertaForMap.value = null
}

const handleSolventar = async (alerta: ServicioAlertaItem) => {
  if (solventandoToken.value) return
  solventandoToken.value = alerta.token
  try {
    const res = await solventarAlertaApi(alerta.token)
    if (res.done) {
      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Alarma solventada correctamente', life: 3000 })
      await fetchAlertas()
    } else {
      toast.add({ severity: 'error', summary: 'Error', detail: res.message || 'No se pudo solventar la alarma', life: 3000 })
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error de conexión al solventar alarma', life: 3000 })
  } finally {
    solventandoToken.value = null
  }
}

const handleClose = () => {
  activeView.value = 'list'
  selectedAlertaForMap.value = null
  emit('update:isOpen', false)
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    :title="modalTitle"
    cancel-text="Cerrar"
    :show-footer="false"
    size="xl"
  >
    <template #icon>
      <div v-if="activeView === 'map'" class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-300">
        <HugeiconsIcon :icon="MapsIcon" :size="20" :stroke-width="2" />
      </div>
      <div v-else class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-300">
        <HugeiconsIcon :icon="Alert01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <!-- Transición suave tipo Morph entre Vistas (Lista <-> Mapa) -->
    <Transition name="modal-view-morph" mode="out-in">
      <!-- Vista de Mapa (Foto/Imagen Estática de Google Maps) -->
      <div v-if="activeView === 'map'" key="map-view" class="flex flex-col gap-4">
        <!-- Top Toolbar del Mapa -->
        <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 backdrop-blur-md flex-wrap sm:flex-nowrap">
          <button
            @click="backToList"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1A1D24] hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 transition-all duration-200 flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
          >
            <HugeiconsIcon :icon="ArrowLeft02Icon" :size="16" />
            <span>Volver al historial</span>
          </button>

          <div v-if="selectedAlertaForMap" class="flex items-center gap-3 text-xs flex-wrap">
            <div class="flex items-center gap-2 bg-slate-200/60 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5">
              <HugeiconsIcon :icon="HardDriveIcon" :size="14" class="text-slate-400" />
              <span class="font-medium text-slate-400 dark:text-slate-500">Hardware:</span>
              <span class="font-bold text-slate-800 dark:text-slate-100">{{ selectedAlertaForMap.hardware }}</span>
            </div>

            <a
              :href="googleMapsExternalUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <HugeiconsIcon :icon="MapsIcon" :size="14" />
              <span>Abrir en Google Maps</span>
            </a>
          </div>
        </div>

        <!-- Contenedor de la Imagen Estática de Mapa -->
        <div class="relative w-full h-[470px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-lg bg-slate-100 dark:bg-[#13161C] flex items-center justify-center">
          <!-- Spinner Loader mientras carga la foto -->
          <div v-if="isMapImageLoading" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100/90 dark:bg-[#13161C]/90 backdrop-blur-sm">
            <HugeiconsIcon :icon="Loading02Icon" :size="32" class="text-blue-500 animate-spin" />
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Cargando mapa...</span>
          </div>

          <!-- Imagen Estática de Google Maps con Marcador -->
          <img
            v-if="staticMapUrl"
            :src="staticMapUrl"
            :alt="`Mapa de ${selectedAlertaForMap?.tipo_alerta}`"
            class="w-full h-full object-cover transition-opacity duration-300"
            :class="{ 'opacity-0': isMapImageLoading, 'opacity-100': !isMapImageLoading }"
            @load="isMapImageLoading = false"
            @error="isMapImageLoading = false"
          />

          <!-- Controles de Zoom sobre la Imagen -->
          <div class="absolute bottom-4 right-4 z-20 flex flex-col gap-1 bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-lg">
            <button
              @click="zoomIn"
              :disabled="mapZoom >= 20"
              class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-base leading-none"
              title="Acercar (+)"
            >
              +
            </button>
            <div class="h-px w-full bg-slate-200 dark:bg-white/10"></div>
            <button
              @click="zoomOut"
              :disabled="mapZoom <= 10"
              class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-base leading-none"
              title="Alejar (-)"
            >
              −
            </button>
          </div>
        </div>
      </div>

      <!-- Vista Principal: Lista de Alarmas -->
      <div v-else key="list-view" class="flex flex-col gap-4 relative">
        <!-- Skeleton Loader -->
        <div v-if="isLoading" class="space-y-3 p-1">
          <div v-for="i in 3" :key="i" class="p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3 animate-pulse">
            <div class="flex justify-between items-center">
              <div class="h-5 w-32 bg-slate-200/60 dark:bg-white/[0.06] rounded-xl"></div>
              <div class="h-5 w-24 bg-slate-200/60 dark:bg-white/[0.06] rounded-xl"></div>
            </div>
            <div class="h-4 w-48 bg-slate-200/40 dark:bg-white/[0.04] rounded-xl"></div>
          </div>
        </div>

        <!-- Mensajes de Error / Feedback -->
        <Transition name="message-fade">
          <div v-if="modalMessage"
               class="flex items-center gap-3 py-3.5 px-4 rounded-2xl text-sm font-semibold tracking-wide transition-all duration-300 border mb-2"
               :class="{
                 'text-red-500 bg-red-500/10 border-red-500/20': modalMessage.type === 'error',
                 'text-amber-500 bg-amber-500/10 border-amber-500/20': modalMessage.type === 'warning',
                 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': modalMessage.type === 'success'
               }">
            <HugeiconsIcon :icon="Alert01Icon" :size="18" />
            {{ modalMessage.text }}
          </div>
        </Transition>

        <!-- Empty State -->
        <div v-if="!isLoading && alertas.length === 0 && !modalMessage" class="py-14 flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center mb-4 shadow-sm">
            <HugeiconsIcon :icon="Alert01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 class="text-base font-bold text-slate-700 dark:text-slate-200">Sin alarmas registradas</h3>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">Este servicio no cuenta con alertas de seguridad registradas.</p>
        </div>

        <!-- Lista Tarjetas de Alertas -->
        <div v-if="!isLoading && sortedAlertas.length > 0" class="relative max-h-[540px] overflow-y-auto custom-scrollbar pr-1.5 py-1 space-y-3">
          <div
            v-for="(item, index) in paginatedAlertas"
            :key="item.token || index"
            class="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#13161C]/70 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 group"
          >
            <!-- Fila Superior: Tipo, Fecha, Estado/Acción -->
            <div class="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-white/[0.06] flex-wrap sm:flex-nowrap">
              <div class="flex items-center gap-3 min-w-0">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] shrink-0">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <HugeiconsIcon :icon="Alert01Icon" :size="14" />
                  {{ item.tipo_alerta }}
                </span>
                <span class="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-1.5 font-medium tabular-nums shrink-0">
                  <HugeiconsIcon :icon="Clock01Icon" :size="13" class="opacity-70" />
                  {{ formatDate(item.fecha_hora) }}
                </span>
              </div>

              <!-- Estado Solventada Badge / Action -->
              <div class="flex items-center gap-2 shrink-0">
                <template v-if="item.solventada">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="14" />
                    Solventada
                  </span>
                </template>
                <template v-else>
                  <button
                    @click="handleSolventar(item)"
                    :disabled="solventandoToken === item.token"
                    class="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-b from-amber-500/10 to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/30 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <HugeiconsIcon :icon="Tick02Icon" :size="14" />
                    <span>{{ solventandoToken === item.token ? 'Solventando...' : 'Solventar' }}</span>
                  </button>
                </template>
              </div>
            </div>

            <!-- Fila Inferior: Información & Acción Ver en mapa -->
            <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-3 text-xs">
              <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <HugeiconsIcon :icon="HardDriveIcon" :size="15" class="text-slate-400 shrink-0" />
                  <span class="font-medium text-slate-400 dark:text-slate-400">Hardware:</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200">{{ item.hardware || '---' }}</span>
                </div>

                <div v-if="item.solventada_por" class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <HugeiconsIcon :icon="User02Icon" :size="15" class="text-slate-400 shrink-0" />
                  <span class="font-medium text-slate-400 dark:text-slate-400">Solventada por:</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200">{{ item.solventada_por }}</span>
                </div>
              </div>

              <div v-if="item.latitud && item.longitud" class="flex items-center gap-2 text-slate-600 dark:text-slate-300 ml-auto">
                <button
                  @click="openMapView(item)"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/30 transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-sm hover:shadow-[#3b82f6]/10 cursor-pointer"
                >
                  <HugeiconsIcon :icon="MapsIcon" :size="14" />
                  <span>Ver en mapa</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Paginación -->
        <div v-if="!isLoading && sortedAlertas.length > itemsPerPage" class="pt-2 border-t border-slate-100 dark:border-white/[0.06]">
          <AppPagination
            :total-records="sortedAlertas.length"
            v-model:current-page="currentPage"
            :rows-per-page="itemsPerPage"
          />
        </div>
      </div>
    </Transition>
  </AppModal>
</template>

<style scoped>
/* Transición Morph Fluida con Física de Resorte y Blur sutil */
.modal-view-morph-enter-active,
.modal-view-morph-leave-active {
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              filter 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-view-morph-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(12px);
  filter: blur(4px);
}

.modal-view-morph-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-12px);
  filter: blur(4px);
}

.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.message-fade-enter-active,
.message-fade-leave-active {
  transition: all 0.3s ease;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>

