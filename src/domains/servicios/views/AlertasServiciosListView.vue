<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { useAuthStore } from '../../../stores/auth.store'
import { useThemeStore } from '../../../stores/theme.store'
import { PERMISSIONS } from '../../../constants/permissions'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Alert01Icon,
  Search01Icon,
  RefreshIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Clock01Icon,
  HardDriveIcon,
  MapsIcon,
  Loading02Icon,
  Tick02Icon,
  ServiceIcon,
  EyeIcon,
  ViewOffIcon
} from '@hugeicons/core-free-icons'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import { fetchAlertasListadoApi, solventarAlertaApi } from '../services/servicios.api'
import type { AlertaServicioGlobalItem } from '../services/servicios.api'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDateRangePicker from '../../../components/ui/AppDateRangePicker.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import PageHeader from '../../../components/shared/PageHeader.vue'

const MAP_KEY = 'AIzaSyDIUxzochI7PvqdE8pNL6b5jy77NOnO1Ko'

const toast = useToast()
const authStore = useAuthStore()
const groupStore = useGroupStore()
const themeStore = useThemeStore()
const { selectedGroup } = storeToRefs(groupStore)

const alertasList = ref<AlertaServicioGlobalItem[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

// Fechas por defecto: 1 semana hacia adelante desde hoy
const today = new Date()
const nextWeek = new Date()
nextWeek.setDate(today.getDate() + 7)

const formatDateForPayload = (d: Date, isEnd: boolean = false): string => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const time = isEnd ? '23:59:59' : '00:00:01'
  return `${yyyy}-${mm}-${dd} ${time}`
}

const formatDateSimple = (d: Date): string => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const fechaRango = ref({
  start: formatDateSimple(today),
  end: formatDateSimple(nextWeek)
})

const currentPage = ref(1)
const itemsPerPage = 10
const solventandoToken = ref<string | null>(null)

// Estado del Mini Menú Desplegable Flotante al lado del botón Solventar
const openSolventarMenuToken = ref<string | null>(null)
const solventarMenuPosition = ref<{ top?: string; bottom?: string; left?: string; right?: string }>({})

const solventarMenuStyle = computed(() => {
  const style: Record<string, string> = {}
  if (solventarMenuPosition.value.top) style.top = solventarMenuPosition.value.top
  if (solventarMenuPosition.value.bottom) style.bottom = solventarMenuPosition.value.bottom
  if (solventarMenuPosition.value.left) style.left = solventarMenuPosition.value.left
  if (solventarMenuPosition.value.right) style.right = solventarMenuPosition.value.right
  return style
})

const toggleSolventarMenu = (token: string, event: MouseEvent) => {
  event.stopPropagation()
  if (openSolventarMenuToken.value === token) {
    openSolventarMenuToken.value = null
    return
  }
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const menuHeight = 115

  const pos: { top?: string; bottom?: string; left?: string; right?: string } = {}

  if (spaceBelow < menuHeight && rect.top > menuHeight) {
    pos.bottom = `${window.innerHeight - rect.top + 6}px`
  } else {
    pos.top = `${rect.bottom + 6}px`
  }

  if (rect.left + 180 > window.innerWidth) {
    pos.right = `${window.innerWidth - rect.right}px`
  } else {
    pos.left = `${rect.left}px`
  }

  solventarMenuPosition.value = pos
  openSolventarMenuToken.value = token
}

const closeSolventarMenu = () => {
  openSolventarMenuToken.value = null
}

const ejecutarSolventar = async (token: string, visible: boolean) => {
  const alerta = alertasList.value.find(a => a.token === token)
  if (!alerta || solventandoToken.value) return

  solventandoToken.value = token
  openSolventarMenuToken.value = null

  try {
    const res = await solventarAlertaApi({ token, visible })
    if (res?.done !== false) {
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Alarma solventada correctamente',
        life: 3000
      })
      await cargarAlertas()
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: res?.msg || res?.message || 'No se pudo solventar la alarma',
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error al solventar alerta:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.message || 'Error de conexión al solventar la alerta',
      life: 4000
    })
  } finally {
    solventandoToken.value = null
  }
}

// Estado del Modal de Mapa
const isMapModalOpen = ref(false)
const selectedAlertaForMap = ref<AlertaServicioGlobalItem | null>(null)
const mapZoom = ref(16)
const isMapImageLoading = ref(true)

const hasValidCoordinates = (lat?: string, lng?: string) => {
  if (!lat || !lng) return false
  const numLat = parseFloat(lat)
  const numLng = parseFloat(lng)
  return !isNaN(numLat) && !isNaN(numLng) && (numLat !== 0 || numLng !== 0)
}

const openMapModal = (alerta: AlertaServicioGlobalItem) => {
  selectedAlertaForMap.value = alerta
  mapZoom.value = 16
  isMapImageLoading.value = true
  isMapModalOpen.value = true
}

const closeMapModal = () => {
  isMapModalOpen.value = false
  selectedAlertaForMap.value = null
}

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
  if (!selectedAlertaForMap.value?.latitud || !selectedAlertaForMap.value?.longitud) return '#'
  return `https://www.google.com/maps/search/?api=1&query=${selectedAlertaForMap.value.latitud},${selectedAlertaForMap.value.longitud}`
})

const cargarAlertas = async () => {
  if (!selectedGroup.value?.id) {
    alertasList.value = []
    return
  }

  isLoading.value = true
  try {
    const startDateObj = fechaRango.value.start ? new Date(fechaRango.value.start + 'T00:00:01') : today
    const endDateObj = fechaRango.value.end ? new Date(fechaRango.value.end + 'T23:59:59') : nextWeek

    const res = await fetchAlertasListadoApi({
      id_grupo: selectedGroup.value.id,
      desde: formatDateForPayload(startDateObj, false),
      hasta: formatDateForPayload(endDateObj, true),
      id_servicio: ''
    })
    if (res.done && Array.isArray(res.data)) {
      alertasList.value = res.data
    } else {
      alertasList.value = []
    }
  } catch (error) {
    console.error('Error al cargar alertas de servicios:', error)
    alertasList.value = []
  } finally {
    isLoading.value = false
  }
}

const recargar = () => {
  cargarAlertas()
}

onMounted(() => {
  document.addEventListener('click', closeSolventarMenu)
  window.addEventListener('scroll', closeSolventarMenu, true)
})

onUnmounted(() => {
  document.removeEventListener('click', closeSolventarMenu)
  window.removeEventListener('scroll', closeSolventarMenu, true)
})

watch([selectedGroup, fechaRango], () => {
  currentPage.value = 1
  cargarAlertas()
}, { deep: true, immediate: true })

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return alertasList.value

  const query = searchQuery.value.toLowerCase().trim()
  return alertasList.value.filter((item) => {
    return (
      item.id_servicio?.toLowerCase().includes(query) ||
      item.hardware?.toLowerCase().includes(query) ||
      item.tipo_alerta?.toLowerCase().includes(query) ||
      item.solventada_por?.toLowerCase().includes(query) ||
      item.token?.toLowerCase().includes(query)
    )
  })
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredItems.value.slice(start, start + itemsPerPage)
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '---'
  return dateStr
}
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Header -->
    <PageHeader
      title="Alertas de Servicios"
      subtitle="Consulta y seguimiento de alertas generadas en servicios"
      :count="filteredItems.length"
      :icon="Alert01Icon"
    />

    <!-- Toolbar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <!-- Buscador -->
        <div class="relative w-full sm:w-72">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Buscar por servicio, hardware, alerta..."
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <!-- Date Picker -->
        <div class="w-full sm:w-auto">
          <AppDateRangePicker
            v-model="fechaRango"
            placeholder="Rango de Fechas"
          />
        </div>

        <!-- Botón Recargar -->
        <button 
          @click="recargar"
          :disabled="isLoading"
          title="Recargar"
          class="p-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          <HugeiconsIcon 
            :icon="RefreshIcon" 
            :size="16" 
            :class="{ 'animate-spin': isLoading }"
          />
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <AppTableCard>
      <AppTable
        :value="paginatedItems"
        :loading="isLoading"
        :rows="itemsPerPage"
        removableSort
        empty-message="No se encontraron alertas en el rango de fechas seleccionado"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <!-- Columna ID Servicio -->
        <Column field="id_servicio" header="ID Servicio" sortable headerStyle="width: 140px">
          <template #body="{ data }">
            <AppBadge variant="primary">
              <span class="font-mono font-bold text-[11px]">
                {{ data.id_servicio }}
              </span>
            </AppBadge>
          </template>
        </Column>

        <!-- Columna Fecha y Hora -->
        <Column field="fecha_hora" header="Fecha / Hora" sortable headerStyle="width: 170px">
          <template #body="{ data }">
            <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono text-xs">
              <HugeiconsIcon :icon="Clock01Icon" :size="14" class="text-slate-400" />
              <span>{{ formatDate(data.fecha_hora) }}</span>
            </div>
          </template>
        </Column>

        <!-- Columna Hardware -->
        <Column field="hardware" header="Hardware" sortable>
          <template #body="{ data }">
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {{ data.hardware || '---' }}
            </span>
          </template>
        </Column>

        <!-- Columna Tipo Alerta -->
        <Column field="tipo_alerta" header="Tipo Alerta" sortable>
          <template #body="{ data }">
            <span 
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
              :class="data.tipo_alerta === 'SOS' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'"
            >
              <HugeiconsIcon :icon="Alert01Icon" :size="13" />
              {{ data.tipo_alerta }}
            </span>
          </template>
        </Column>

        <!-- Columna Ubicación / Mapa (a la izquierda de Atendida) -->
        <Column header="Mapa" headerStyle="width: 80px" class="text-center">
          <template #body="{ data }">
            <div class="flex items-center justify-center">
              <button
                v-if="hasValidCoordinates(data.latitud, data.longitud)"
                @click="openMapModal(data)"
                title="Ver ubicación en mapa"
                class="w-8 h-8 rounded-lg flex items-center justify-center border bg-blue-500/10 text-blue-600 dark:text-[#5da6fc] border-blue-500/20 hover:bg-blue-500/20 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <HugeiconsIcon :icon="MapsIcon" :size="16" />
              </button>
              <span v-else class="text-slate-400 dark:text-slate-600 text-xs font-mono">---</span>
            </div>
          </template>
        </Column>

        <!-- Columna Atendida -->
        <Column field="atendida" header="Atendida" sortable headerStyle="width: 110px">
          <template #body="{ data }">
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold"
              :class="data.atendida ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-100 dark:bg-white/5'"
            >
              <HugeiconsIcon :icon="data.atendida ? CheckmarkCircle01Icon : Cancel01Icon" :size="13" />
              {{ data.atendida ? 'Sí' : 'No' }}
            </span>
          </template>
        </Column>

        <!-- Columna Solventada / Desplegable Rápido de Visibilidad -->
        <Column field="solventada" header="Solventada" sortable headerStyle="width: 140px">
          <template #body="{ data }">
            <div class="flex items-center">
              <!-- Si ya está solventada: Badge verde -->
              <span
                v-if="data.solventada"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm"
              >
                <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="13" />
                <span>Solventada</span>
              </span>

              <!-- Si NO está solventada: Botón que despliega el mini menú de visibilidad al lado -->
              <button
                v-else-if="authStore.hasPermission(PERMISSIONS.ALERT_SOLVENTAR)"
                type="button"
                @click.stop="toggleSolventarMenu(data.token, $event)"
                :disabled="solventandoToken === data.token"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                :class="{ 'ring-2 ring-emerald-500/40 bg-emerald-700': openSolventarMenuToken === data.token }"
                title="Seleccionar visibilidad y solventar alarma"
              >
                <HugeiconsIcon
                  :icon="solventandoToken === data.token ? Loading02Icon : Tick02Icon"
                  :size="13"
                  :class="{ 'animate-spin': solventandoToken === data.token }"
                />
                <span>{{ solventandoToken === data.token ? 'Solventando...' : 'Solventar' }}</span>
              </button>

              <span v-else class="text-xs text-slate-400 font-medium">---</span>
            </div>
          </template>
        </Column>

        <!-- Columna Solventada Por -->
        <Column field="solventada_por" header="Solventada por">
          <template #body="{ data }">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {{ data.solventada && data.solventada_por && data.solventada_por !== 'Desconocido' ? data.solventada_por : '---' }}
            </span>
          </template>
        </Column>
      </AppTable>

      <!-- Paginación -->
      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination
          :totalRecords="filteredItems.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <!-- Mini Desplegable Flotante de Visibilidad junto al botón Solventar -->
    <Teleport to="body">
      <Transition name="dropdown-popover">
        <div
          v-if="openSolventarMenuToken"
          class="fixed z-[99999] w-48 bg-white dark:bg-[#1A1D24] border border-slate-200/80 dark:border-white/10 rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden p-1.5 space-y-1"
          :style="solventarMenuStyle"
          @click.stop
        >
          <div class="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Visibilidad
          </div>

          <!-- Opción: Visible -->
          <button
            type="button"
            @click="ejecutarSolventar(openSolventarMenuToken, true)"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
          >
            <HugeiconsIcon :icon="EyeIcon" :size="15" />
            <span>Visible</span>
          </button>

          <!-- Opción: No Visible -->
          <button
            type="button"
            @click="ejecutarSolventar(openSolventarMenuToken, false)"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <HugeiconsIcon :icon="ViewOffIcon" :size="15" />
            <span>No Visible</span>
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal Ubicación en Mapa -->
    <AppModal
      :isOpen="isMapModalOpen"
      @update:isOpen="closeMapModal"
      @close="closeMapModal"
      :title="`Ubicación: ${selectedAlertaForMap?.tipo_alerta || 'Alarma'}`"
      size="lg"
      :showFooter="false"
    >
      <template #icon>
        <div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shadow-sm">
          <HugeiconsIcon :icon="MapsIcon" :size="20" :stroke-width="2" />
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <!-- Barra de Información superior del Mapa -->
        <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 backdrop-blur-md flex-wrap sm:flex-nowrap">
          <div v-if="selectedAlertaForMap" class="flex items-center gap-3 text-xs flex-wrap">
            <div class="flex items-center gap-2 bg-slate-200/60 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5">
              <HugeiconsIcon :icon="ServiceIcon" :size="14" class="text-slate-400" />
              <span class="font-medium text-slate-400 dark:text-slate-500">Servicio:</span>
              <span class="font-bold text-slate-800 dark:text-slate-100 font-mono">{{ selectedAlertaForMap.id_servicio || '---' }}</span>
            </div>

            <div class="flex items-center gap-2 bg-slate-200/60 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5">
              <HugeiconsIcon :icon="HardDriveIcon" :size="14" class="text-slate-400" />
              <span class="font-medium text-slate-400 dark:text-slate-500">Hardware:</span>
              <span class="font-bold text-slate-800 dark:text-slate-100">{{ selectedAlertaForMap.hardware || '---' }}</span>
            </div>
          </div>

          <a
            :href="googleMapsExternalUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto"
          >
            <HugeiconsIcon :icon="MapsIcon" :size="14" />
            <span>Abrir en Google Maps</span>
          </a>
        </div>

        <!-- Contenedor del Mapa Estático -->
        <div class="relative w-full h-[440px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-lg bg-slate-100 dark:bg-[#13161C] flex items-center justify-center">
          <div v-if="isMapImageLoading" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100/90 dark:bg-[#13161C]/90 backdrop-blur-sm">
            <HugeiconsIcon :icon="Loading02Icon" :size="32" class="text-blue-500 animate-spin" />
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Cargando mapa...</span>
          </div>

          <img
            v-if="staticMapUrl"
            :src="staticMapUrl"
            :alt="`Mapa de ${selectedAlertaForMap?.tipo_alerta}`"
            class="w-full h-full object-cover transition-opacity duration-300"
            :class="{ 'opacity-0': isMapImageLoading, 'opacity-100': !isMapImageLoading }"
            @load="isMapImageLoading = false"
            @error="isMapImageLoading = false"
          />

          <!-- Controles de Zoom -->
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
    </AppModal>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-popover-enter-active {
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-popover-leave-active {
  transition: all 0.12s cubic-bezier(0.4, 0, 1, 1);
}
.dropdown-popover-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.95);
}
.dropdown-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
