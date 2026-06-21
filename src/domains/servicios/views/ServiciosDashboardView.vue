<script setup lang="ts">
import { ref, onUnmounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Car01Icon,
  CpuIcon,
  User02Icon,
  Search01Icon,
  AlertCircleIcon,
  GridViewIcon
} from '@hugeicons/core-free-icons'
import {
  fetchServicioDashboardApi,
  fetchVehiculosSimplesApi,
  fetchHardwareSimplesApi,
  fetchRutasSimplesApi,
  fetchEscoltasSimplesApi
} from '../services/servicios.api'
import type { ServicioDashboard, VehiculoSimple, HardwareSimple, RutaSimple, EscoltaSimple } from '../types/servicio'
import ServicioCard from '../components/ServicioCard.vue'

const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const catalogoRutas     = ref<RutaSimple[]>([])
const catalogoVehiculos = ref<VehiculoSimple[]>([])
const catalogoHardware  = ref<HardwareSimple[]>([])
const catalogoEscoltas  = ref<EscoltaSimple[]>([])

const servicios             = ref<ServicioDashboard[]>([])
const isLoading             = ref(true)
const searchFilter          = ref('')
const selectedEstadoFilter  = ref<number | null>(null)

const ESTADOS_INFO = [
  { id: 1, label: 'PRERCARGA',      color: '#D65900', shadow: 'rgba(214,89,0,0.5)',    bg: 'rgba(214,89,0,0.08)',    border: 'rgba(214,89,0,0.2)' },
  { id: 2, label: 'EN ESPERA',      color: '#9D21D6', shadow: 'rgba(157,33,214,0.5)',  bg: 'rgba(157,33,214,0.08)', border: 'rgba(157,33,214,0.2)' },
  { id: 3, label: 'EJECUCION OK',   color: '#00C5D6', shadow: 'rgba(0,197,214,0.5)',   bg: 'rgba(0,197,214,0.08)',  border: 'rgba(0,197,214,0.2)' },
  { id: 4, label: 'EJECUCION FAIL', color: '#A1D600', shadow: 'rgba(161,214,0,0.5)',   bg: 'rgba(161,214,0,0.08)', border: 'rgba(161,214,0,0.2)' },
  { id: 5, label: 'FINALIZADO',     color: '#814F2B', shadow: 'rgba(129,79,43,0.5)',   bg: 'rgba(129,79,43,0.08)', border: 'rgba(129,79,43,0.2)' }
]

// Tooltip
const tooltipVisible = ref(false)
const tooltipTipo    = ref<'ubicacion' | 'bus' | 'hardware' | 'usuario'>('ubicacion')
const tooltipData    = ref<any>(null)
const tooltipPos     = ref({ top: '0px', left: '0px' })
let tooltipTimer: ReturnType<typeof setTimeout> | null = null

const obtenerNombreRuta     = (id: string) => catalogoRutas.value.find(r => r.id_ruta === id)?.nombre ?? id
const obtenerNombreVehiculo = (id: string) => { const v = catalogoVehiculos.value.find(v => v.id_vehiculo === id); return v ? `${v.nombre} (${v.placa})` : id }
const obtenerNombreHardware = (id: string) => catalogoHardware.value.find(h => h.id_hardware === id)?.nombre ?? id
const obtenerNombreEscolta  = (id: string) => catalogoEscoltas.value.find(e => e.id_escolta === id)?.nombre ?? id
const obtenerTelefonoEscolta = (id: string) => catalogoEscoltas.value.find(e => e.id_escolta === id)?.celular ?? ''

const fetchDatos = async () => {
  if (!selectedGroup.value?.id) { servicios.value = []; isLoading.value = false; return }
  isLoading.value = true
  try {
    const [rutasData, vehiculosData, hardwareData, escoltasData] = await Promise.all([
      fetchRutasSimplesApi(selectedGroup.value.id),
      fetchVehiculosSimplesApi(selectedGroup.value.id, 0),
      fetchHardwareSimplesApi(selectedGroup.value.id, 0),
      fetchEscoltasSimplesApi(selectedGroup.value.id, 0)
    ])
    catalogoRutas.value     = rutasData
    catalogoVehiculos.value = vehiculosData
    catalogoHardware.value  = hardwareData
    catalogoEscoltas.value  = escoltasData

    const respuesta = await fetchServicioDashboardApi({ id_grupo: selectedGroup.value.id, id_servicio: '', estado: 2 })
    if (respuesta.done && respuesta.data?.servicios) {
      servicios.value = respuesta.data.servicios.map((s: any) => ({
        ...s,
        estado: typeof s.estado === 'number'
          ? (ESTADOS_INFO.find(e => e.id === s.estado)?.label || String(s.estado))
          : s.estado
      }))
    } else {
      servicios.value = []
    }
  } catch (e) {
    console.error('Error al cargar dashboard de servicios:', e)
  } finally {
    isLoading.value = false
  }
}

const filteredServicios = computed(() => {
  let list = servicios.value
  if (selectedEstadoFilter.value !== null) {
    const label = ESTADOS_INFO.find(e => e.id === selectedEstadoFilter.value)?.label
    if (label) list = list.filter(s => s.estado === label)
  }
  if (searchFilter.value) {
    const q = searchFilter.value.toLowerCase()
    list = list.filter(s => s.id_servicio.toLowerCase().includes(q) || (s.id_ruta?.toLowerCase().includes(q) ?? false))
  }
  return list
})

const conteoEstados = computed(() => {
  const c: Record<string, number> = { 'PRERCARGA': 0, 'EN ESPERA': 0, 'EJECUCION OK': 0, 'EJECUCION FAIL': 0, 'FINALIZADO': 0 }
  servicios.value.forEach(s => { if (s.estado in c) c[s.estado]++ })
  return c
})

const formatFecha = (f: string) => {
  if (!f) return '---'
  const [date, time] = f.split(' ')
  const [y, m, d] = (date ?? '').split('-')
  return `${d}/${m}/${y}${time ? ' ' + time.substring(0, 5) : ''}`
}

const obtenerHoras = (f: string): number => {
  if (!f) return 0
  let isoStr = f.replace(' ', 'T')
  if (!isoStr.includes('Z') && !isoStr.includes('+') && !isoStr.includes('-')) {
    isoStr += 'Z'
  }
  const parsedDate = new Date(isoStr)
  if (isNaN(parsedDate.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - parsedDate.getTime()) / 3600000))
}

const getEstadoInfo = (label: string) => ESTADOS_INFO.find(e => e.label === label)

const tooltipDirection = ref<'up' | 'down'>('up')

const mostrarTooltip = (event: MouseEvent, data: any, tipo: 'ubicacion' | 'bus' | 'hardware' | 'usuario') => {
  if (tooltipTimer) clearTimeout(tooltipTimer)
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const w = 210
  let left = rect.left + rect.width / 2 - w / 2
  if (left < 8) left = 8
  if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8

  const espacioArriba = rect.top
  const espacioAbajo = window.innerHeight - rect.bottom

  if (espacioArriba < 220 && espacioAbajo > espacioArriba) {
    tooltipDirection.value = 'down'
    tooltipPos.value = { top: `${rect.bottom + window.scrollY + 8}px`, left: `${left}px` }
  } else {
    tooltipDirection.value = 'up'
    tooltipPos.value = { top: `${rect.top + window.scrollY - 8}px`, left: `${left}px` }
  }

  tooltipData.value = data
  tooltipTipo.value = tipo
  tooltipVisible.value = true
}

const ocultarTooltip = () => {
  tooltipTimer = setTimeout(() => { tooltipVisible.value = false; tooltipData.value = null }, 150)
}

const estadoFiltroActual = computed(() => ESTADOS_INFO.find(e => e.id === selectedEstadoFilter.value))

watch(selectedGroup, () => fetchDatos(), { immediate: true })
onUnmounted(() => { if (tooltipTimer) clearTimeout(tooltipTimer) })
</script>

<template>
  <!-- Contenedor raíz con fondo táctico idéntico al Dashboard.vue -->
  <div class="relative w-full min-h-full bg-[#F1F4F8] dark:bg-[#13161C] overflow-hidden transition-colors duration-500">

    <!-- CONTENIDO -->
    <div class="relative z-10 p-6 space-y-5 animate-page-in">

      <!-- ══════ HEADER ══════ -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-[12px] bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20 shrink-0">
            <HugeiconsIcon :icon="GridViewIcon" :size="18" :stroke-width="2" />
          </div>
          <div>
            <h1 class="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight leading-tight">Dashboard de Servicios</h1>
          </div>
        </div>
      </div>

      <!-- ══════ CARDS DE ESTADO ══════ -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div
          v-for="est in ESTADOS_INFO"
          :key="est.id"
          @click="selectedEstadoFilter = selectedEstadoFilter === est.id ? null : est.id"
          class="relative group/stat overflow-hidden rounded-xl bg-slate-50/50 dark:bg-[#0F1115]/50 border transition-all duration-300 ease-out cursor-pointer select-none p-4 flex flex-col items-center"
          :class="[
            selectedEstadoFilter === est.id
              ? ''
              : 'border-slate-200/60 dark:border-white/5 hover:border-slate-350 dark:hover:border-white/10'
          ]"
          :style="selectedEstadoFilter === est.id ? { 
            borderColor: est.color, 
            boxShadow: `0 0 0 1px ${est.color}33, inset 0 1px 2px rgba(0,0,0,0.05)` 
          } : {}"
        >
          <!-- Borde superior brillante en active/focus idéntico a AppInput -->
          <div 
            class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-transparent to-transparent opacity-0 transition-all duration-300"
            :class="{ 'opacity-100 left-2 right-2': selectedEstadoFilter === est.id }"
            :style="selectedEstadoFilter === est.id ? { 
              backgroundImage: `linear-gradient(to right, transparent, ${est.color}80, transparent)` 
            } : {}"
          ></div>

          <!-- Número -->
          <p
            class="text-2xl font-black tracking-tighter relative z-10"
            :style="{ color: est.color }"
          >{{ conteoEstados[est.label] || 0 }}</p>

          <!-- Dot + Label -->
          <div class="flex items-center gap-1.5 mt-1 relative z-10">
            <span
              class="w-1.5 h-1.5 rounded-full animate-pulse"
              :style="{ backgroundColor: est.color }"
            ></span>
            <p
              class="text-[8px] uppercase tracking-[0.1em] font-black text-center leading-tight"
              :style="{ color: est.color, opacity: 0.85 }"
            >{{ est.label }}</p>
          </div>
        </div>
      </div>


      <!-- ══════ SKELETON ══════ -->
      <div v-if="isLoading" class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        <div
          v-for="i in 12" :key="i"
          class="relative overflow-hidden rounded-xl bg-white/90 dark:bg-[#1C1F27]/90 border border-slate-200/70 dark:border-white/[0.07] shadow-sm w-full animate-pulse"
        >
          <div class="p-3.5 flex flex-col gap-3">
            <!-- Estado badge y Horas transcurridas skeleton -->
            <div class="flex items-center justify-between">
              <div class="w-16 h-4 rounded-full bg-slate-200/60 dark:bg-white/[0.05]"></div>
              <div class="w-6 h-3 rounded bg-slate-200/60 dark:bg-white/[0.05]"></div>
            </div>

            <!-- Fila inferior: Iconos de recursos skeleton -->
            <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.03]">
              <div class="flex items-center gap-1.5">
                <div
                  v-for="j in 4"
                  :key="j"
                  class="w-6 h-6 rounded-lg bg-slate-200/60 dark:bg-white/[0.05]"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sin resultados -->
      <div
        v-else-if="filteredServicios.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center select-none"
      >
        <HugeiconsIcon :icon="AlertCircleIcon" :size="32" class="text-slate-350 dark:text-slate-655 opacity-60 mb-3" />
        <p class="text-[12px] font-bold text-slate-500 dark:text-slate-400">Sin servicios</p>
        <p class="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">No hay servicios registrados en este estado</p>
      </div>

      <!-- ══════ GRID DE SERVICIOS ══════ -->
      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        <ServicioCard
          v-for="serv in filteredServicios"
          :key="serv.id_servicio"
          :serv="serv"
          :get-estado-info="getEstadoInfo"
          :format-fecha="formatFecha"
          :obtener-horas="obtenerHoras"
          :mostrar-tooltip="mostrarTooltip"
          :ocultar-tooltip="ocultarTooltip"
        />
      </div>

    </div><!-- /contenido -->

    <!-- ══════ TOOLTIPS ══════ -->
    <Teleport to="body">
      <Transition :name="tooltipDirection === 'up' ? 'tooltip-up' : 'tooltip-down'">
        <div
          v-if="tooltipVisible && tooltipData"
          class="fixed z-[99999] pointer-events-none"
          :style="{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: tooltipDirection === 'up' ? 'translateY(-100%)' : 'translateY(0)'
          }"
        >
          <div class="w-[210px] rounded-[14px] bg-gradient-to-b from-white/95 to-white/90 dark:from-[#20242D]/95 dark:to-[#13161C]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden mb-2">
            <!-- Header tooltip -->
            <div class="flex items-center gap-2 px-3 py-2.5 bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06]">
              <HugeiconsIcon
                :icon="tooltipTipo === 'ubicacion' ? Route01Icon : tooltipTipo === 'bus' ? Car01Icon : tooltipTipo === 'hardware' ? CpuIcon : User02Icon"
                :size="11"
                class="text-[#3b82f6] dark:text-[#5da6fc]"
              />
              <span class="text-[8px] font-bold uppercase tracking-[0.15em] text-[#3b82f6] dark:text-[#5da6fc]">
                {{ tooltipTipo === 'ubicacion' ? 'Rutas' : tooltipTipo === 'bus' ? 'Vehículos' : tooltipTipo === 'hardware' ? 'Hardware' : 'Escoltas' }}
              </span>
            </div>

            <!-- Rutas -->
            <div v-if="tooltipTipo === 'ubicacion'" class="p-2 space-y-1">
              <template v-if="(tooltipData.rutas || []).length > 0">
                <div v-for="rId in tooltipData.rutas" :key="rId" class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100/50 dark:border-white/[0.02]">
                  <div class="w-1.5 h-1.5 rounded-full bg-[#5da6fc] shrink-0" style="box-shadow:0 0 6px rgba(93,166,252,0.6)"></div>
                  <span class="truncate text-slate-700 dark:text-slate-300 text-[10px] font-bold">{{ obtenerNombreRuta(rId) }}</span>
                </div>
              </template>
              <div v-else-if="tooltipData.id_ruta" class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100/50 dark:border-white/[0.02]">
                <div class="w-1.5 h-1.5 rounded-full bg-[#5da6fc] shrink-0" style="box-shadow:0 0 6px rgba(93,166,252,0.6)"></div>
                <span class="truncate text-slate-700 dark:text-slate-300 text-[10px] font-bold">{{ obtenerNombreRuta(tooltipData.id_ruta) }}</span>
              </div>
              <div v-else class="py-3 text-center text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sin ruta asignada</div>
            </div>

            <!-- Vehículos -->
            <div v-if="tooltipTipo === 'bus'" class="p-2 space-y-1">
              <template v-if="Object.keys(tooltipData.vehiculos || {}).length > 0">
                <div v-for="(_, vId) in tooltipData.vehiculos" :key="vId" class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100/50 dark:border-white/[0.02]">
                  <div class="w-1.5 h-1.5 rounded-full bg-[#5da6fc] shrink-0" style="box-shadow:0 0 6px rgba(93,166,252,0.6)"></div>
                  <span class="truncate text-slate-700 dark:text-slate-300 text-[10px] font-bold">{{ obtenerNombreVehiculo(String(vId)) }}</span>
                </div>
              </template>
              <div v-else class="py-3 text-center text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sin vehículos</div>
            </div>

            <!-- Hardware -->
            <div v-if="tooltipTipo === 'hardware'" class="p-2 space-y-2">
              <template v-if="Object.keys(tooltipData.vehiculos || {}).length > 0">
                <div v-for="(hwIds, vId) in tooltipData.vehiculos" :key="vId" class="p-2 rounded-lg bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100/50 dark:border-white/[0.02]">
                  <p class="text-[7.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate mb-1.5 border-b border-slate-100 dark:border-white/[0.03] pb-0.5">{{ obtenerNombreVehiculo(String(vId)) }}</p>
                  <div class="space-y-1">
                    <div v-for="hwId in (hwIds as string[])" :key="hwId" class="flex items-center gap-1.5">
                      <span class="w-1 h-1 rounded-full bg-[#5da6fc]"></span>
                      <span class="truncate text-[9.5px] font-bold text-slate-700 dark:text-slate-300">{{ obtenerNombreHardware(hwId) }}</span>
                    </div>
                    <div v-if="!(hwIds as string[]).length" class="text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sin hardware</div>
                  </div>
                </div>
              </template>
              <div v-else class="py-3 text-center text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sin hardware</div>
            </div>

            <!-- Escoltas -->
            <div v-if="tooltipTipo === 'usuario'" class="p-2 space-y-1">
              <template v-if="(tooltipData.escoltas || []).length > 0">
                <div v-for="eId in tooltipData.escoltas" :key="eId" class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100/50 dark:border-white/[0.02]">
                  <div class="w-1.5 h-1.5 rounded-full bg-[#5da6fc] shrink-0" style="box-shadow:0 0 6px rgba(93,166,252,0.6)"></div>
                  <div class="flex flex-col min-w-0">
                    <span class="truncate text-slate-700 dark:text-slate-300 text-[10px] font-bold leading-tight">{{ obtenerNombreEscolta(eId) }}</span>
                    <span v-if="obtenerTelefonoEscolta(eId)" class="text-[8.5px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">Cel: {{ obtenerTelefonoEscolta(eId) }}</span>
                  </div>
                </div>
              </template>
              <div v-else class="py-3 text-center text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sin escoltas</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-page-in {
  animation: pageIn 0.45s ease-out;
}
@keyframes pageIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Tooltip */
.tooltip-up-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16,1,0.3,1); }
.tooltip-up-leave-active { transition: opacity 0.1s ease; }
.tooltip-up-enter-from { opacity: 0; transform: translateY(calc(-100% + 8px)); }
.tooltip-up-leave-to  { opacity: 0; }

.tooltip-down-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16,1,0.3,1); }
.tooltip-down-leave-active { transition: opacity 0.1s ease; }
.tooltip-down-enter-from { opacity: 0; transform: translateY(-8px); }
.tooltip-down-leave-to  { opacity: 0; }

/* Chip filtro */
.chip-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
.chip-fade-leave-active { transition: opacity 0.15s ease; }
.chip-fade-enter-from { opacity: 0; transform: scale(0.9) translateX(-6px); }
.chip-fade-leave-to  { opacity: 0; }

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(93,166,252,0.25); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(93,166,252,0.45); }
</style>
