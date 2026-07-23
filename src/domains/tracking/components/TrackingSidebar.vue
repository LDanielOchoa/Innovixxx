<script setup lang="ts">
import { computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import AppInput from '../../../components/ui/AppInput.vue'
import {
  ChipIcon,
  Settings02Icon,
  UserGroupIcon,
  Car02Icon,
  Location01Icon,
  RefreshIcon,
  Search01Icon,
  BatteryCharging01Icon,
  MapsIcon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import type { HardwareWs } from '../types/tracking'

interface Props {
  activeTab: 'SERVICIOS' | 'HARDWARE' | 'ESCOLTAS' | 'VEHICULOS'
  searchQuery: string
  hardwareList: HardwareWs[]
  serviciosList: any[]
  escoltasList: any[]
  vehiculosList: any[]
  isLoadingSecondary: boolean
  wsStatus: 'disconnected' | 'connecting' | 'connected'
  wsError: string | null
  selectedItem: any | null
  showGeocercas?: boolean
  loadingGeocercas?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showGeocercas: false,
  loadingGeocercas: false
})

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'reconnect'): void
  (e: 'select', item: any): void
  (e: 'toggleGeocercas'): void
}>()

const localSearchQuery = computed({
  get: () => props.searchQuery,
  set: (val) => emit('update:searchQuery', val)
})

const filteredItems = computed(() => {
  const query = props.searchQuery.toLowerCase()
  if (props.activeTab === 'HARDWARE') {
    if (!query) return props.hardwareList
    return props.hardwareList.filter(h => 
      h.nombre.toLowerCase().includes(query) || 
      h.serial.toLowerCase().includes(query) ||
      h.descripcion.toLowerCase().includes(query)
    )
  } else if (props.activeTab === 'SERVICIOS') {
    if (!query) return props.serviciosList
    return props.serviciosList.filter(s => 
      (s.id_servicio && s.id_servicio.toLowerCase().includes(query)) ||
      (s.estado && s.estado.toLowerCase().includes(query))
    )
  } else if (props.activeTab === 'ESCOLTAS') {
    if (!query) return props.escoltasList
    return props.escoltasList.filter(e => 
      (e.nombre && e.nombre.toLowerCase().includes(query)) ||
      (e.identificacion && e.identificacion.toLowerCase().includes(query))
    )
  } else if (props.activeTab === 'VEHICULOS') {
    if (!query) return props.vehiculosList
    return props.vehiculosList.filter(v => 
      (v.placa && v.placa.toLowerCase().includes(query)) ||
      (v.marca && v.marca.toLowerCase().includes(query)) ||
      (v.modelo && v.modelo.toLowerCase().includes(query))
    )
  }
  return []
})

const isItemSelected = (item: any) => {
  if (!props.selectedItem) return false
  if (props.activeTab === 'HARDWARE') {
    return props.selectedItem.serial === item.serial
  } else if (props.activeTab === 'SERVICIOS') {
    return props.selectedItem.id_servicio === item.id_servicio
  } else if (props.activeTab === 'ESCOLTAS') {
    return props.selectedItem.id_escolta === item.id_escolta
  } else if (props.activeTab === 'VEHICULOS') {
    return props.selectedItem.placa === item.placa
  }
  return false
}
</script>

<template>
  <div class="absolute top-0 bottom-0 left-0 w-[320px] md:w-[350px] lg:w-[380px] bg-white dark:bg-[#13161C] border-r border-slate-200/70 dark:border-white/5 z-20 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)] tracking-sidebar">
    
    <!-- Cabecera Panel -->
    <div class="p-5 border-b border-slate-200/70 dark:border-white/5 shrink-0">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] shadow-inner">
            <HugeiconsIcon v-if="activeTab === 'HARDWARE'" :icon="ChipIcon" :size="17" />
            <HugeiconsIcon v-else-if="activeTab === 'SERVICIOS'" :icon="Settings02Icon" :size="17" />
            <HugeiconsIcon v-else-if="activeTab === 'ESCOLTAS'" :icon="UserGroupIcon" :size="17" />
            <HugeiconsIcon v-else :icon="Car02Icon" :size="17" />
          </div>
          <div>
            <h2 class="text-[14px] font-bold text-slate-800 dark:text-white tracking-tight capitalize">{{ activeTab.toLowerCase() }}</h2>
            <span class="text-[9px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest block mt-0.5">
              {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'elemento' : 'elementos' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Buscador y Acciones -->
      <div class="relative flex items-center gap-2">
        <button
          @click="emit('toggleGeocercas')"
          :title="showGeocercas ? 'Ocultar Geocercas en el mapa' : 'Mostrar Geocercas en el mapa'"
          class="w-10 h-10 rounded-[10px] flex items-center justify-center border transition-all duration-200 shrink-0 relative overflow-hidden"
          :class="showGeocercas 
            ? 'bg-[#3b82f6]/15 dark:bg-[#5da6fc]/20 border-[#3b82f6]/30 dark:border-[#5da6fc]/30 text-[#3b82f6] dark:text-[#5da6fc] shadow-[0_2px_10px_rgba(59,130,246,0.2)]'
            : 'bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/10'"
        >
          <HugeiconsIcon v-if="loadingGeocercas" :icon="Loading03Icon" :size="16" class="animate-spin text-[#3b82f6] dark:text-[#5da6fc]" />
          <HugeiconsIcon v-else :icon="MapsIcon" :size="16" />
        </button>

        <AppInput 
          v-model="localSearchQuery"
          placeholder="Buscar..."
          :icon="Search01Icon"
          class="flex-1"
        />
        <button 
          v-if="activeTab === 'HARDWARE'"
          @click="emit('reconnect')"
          title="Reconectar"
          class="w-10 h-10 rounded-[10px] flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200 shrink-0"
        >
          <HugeiconsIcon :icon="RefreshIcon" :size="14" :class="{ 'animate-spin': wsStatus === 'connecting' }" />
        </button>
      </div>
    </div>

    <!-- Cuerpo / Lista -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/50 dark:bg-[#13161C]/50">
      <!-- Error de sesión / credenciales -->
      <div v-if="wsError && activeTab === 'HARDWARE'" class="mx-1 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2">
        <p class="text-[10px] font-bold text-rose-400">{{ wsError }}</p>
        <button @click="emit('reconnect')" class="text-[9px] font-black uppercase tracking-wider text-[#5da6fc] hover:underline self-start">
          Reintentar
        </button>
      </div>

      <!-- Skeletons de Carga (Diseño limpio y fluido) -->
      <div v-if="isLoadingSecondary || (activeTab === 'HARDWARE' && wsStatus === 'connecting' && hardwareList.length === 0)" class="space-y-2">
        <div 
          v-for="i in 5" 
          :key="i" 
          class="w-full p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] flex items-center gap-3 bg-white/40 dark:bg-white/[0.02] animate-pulse"
        >
          <!-- Icon Circle Skeleton -->
          <div class="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-white/[0.06] shrink-0"></div>

          <!-- Text lines -->
          <div class="flex-1 space-y-1.5 min-w-0">
            <div class="h-3.5 bg-slate-200/50 dark:bg-white/[0.06] rounded-md w-3/5"></div>
            <div class="h-2.5 bg-slate-100 dark:bg-white/[0.03] rounded-md w-2/5"></div>
          </div>
        </div>
      </div>

      <!-- Lista Vacía -->
      <div v-else-if="filteredItems.length === 0 && !wsError" class="py-16 text-center flex flex-col items-center gap-2">
        <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/20">
          <HugeiconsIcon :icon="Location01Icon" :size="20" />
        </div>
        <p class="text-[11px] font-bold text-slate-450 dark:text-white/30">No se encontraron elementos</p>
      </div>

      <!-- Elementos -->
      <template v-else>
        <button
          v-for="item in filteredItems"
          :key="item.serial || item.id_servicio || item.id_escolta || item.placa"
          @click="emit('select', item)"
          class="group w-full text-left p-2.5 px-3 rounded-[14px] transition-all duration-500 border border-transparent outline-none flex items-center justify-between gap-3 relative overflow-hidden active:scale-[0.97]"
          :class="[
            isItemSelected(item)
              ? 'bg-gradient-to-r from-[#3b82f6]/15 to-transparent dark:from-[#3b82f6]/20 border-[#3b82f6]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_rgba(59,130,246,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_15px_rgba(59,130,246,0.15)] z-10'
              : (item.sos 
                  ? 'bg-rose-500/5 hover:bg-rose-500/10 border-red-500/15'
                  : 'hover:bg-gradient-to-r hover:from-slate-100/50 hover:to-transparent dark:hover:from-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]')
          ]"
        >
          <!-- Glow Effect background -->
          <div class="absolute inset-0 bg-[#3b82f6]/0 group-hover:bg-[#3b82f6]/5 transition-colors duration-500"></div>

          <!-- Left: Icono interactivo -->
          <div 
            class="w-9 h-9 flex items-center justify-center shrink-0 transition-all duration-500 rounded-lg relative z-10"
            :class="[
              isItemSelected(item) 
                ? 'bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 text-[#3b82f6] dark:text-[#5da6fc]' 
                : (item.sos 
                    ? 'bg-rose-500/10 text-rose-500 dark:text-rose-450'
                    : 'text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-white/5 group-hover:bg-[#3b82f6]/10 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc]')
            ]"
          >
            <HugeiconsIcon v-if="activeTab === 'HARDWARE'" :icon="ChipIcon" :size="16" />
            <HugeiconsIcon v-else-if="activeTab === 'SERVICIOS'" :icon="Settings02Icon" :size="16" />
            <HugeiconsIcon v-else-if="activeTab === 'ESCOLTAS'" :icon="UserGroupIcon" :size="16" />
            <HugeiconsIcon v-else :icon="Car02Icon" :size="16" />
          </div>

          <!-- Center: Textos -->
          <div class="min-w-0 flex-1 relative z-10">
            <h3
              class="text-[12px] font-bold uppercase tracking-tight truncate transition-colors duration-200"
              :class="[
                isItemSelected(item)
                  ? 'text-[#3b82f6] dark:text-[#5da6fc]'
                  : (item.sos ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc]')
              ]"
            >
              {{ item.nombre || item.placa || item.id_servicio }}
            </h3>
            <p class="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {{ item.descripcion || item.serial || item.celular || item.email || item.identificacion || 'Sin descripción' }}
            </p>
          </div>

          <!-- Right: Badges e Indicador GPS -->
          <div class="flex flex-col items-end gap-1.5 shrink-0 relative z-10">
            <div class="flex items-center gap-1.5">
              <span v-if="item.sos" class="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 leading-none select-none tracking-wide animate-pulse">
                SOS
              </span>
              <span v-if="item.battery !== undefined" class="text-[10px] font-bold text-emerald-550 dark:text-emerald-450 flex items-center gap-0.5 leading-none select-none tracking-wide">
                <HugeiconsIcon :icon="BatteryCharging01Icon" :size="10.5" class="opacity-80" />
                {{ item.battery }}%
              </span>
            </div>
            <span v-if="item.lat && item.lon" class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="GPS Activo"></span>
          </div>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.tracking-sidebar {
  font-family: 'Inter', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1D24; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
</style>

