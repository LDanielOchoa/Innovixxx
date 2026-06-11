<script setup lang="ts">
import { ref, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Car01Icon,
  CpuIcon,
  User02Icon,
  Calendar01Icon,
  Clock01Icon
} from '@hugeicons/core-free-icons'
import type { ServicioDashboard } from '../types/servicio'

interface EstadoInfo {
  id: number
  label: string
  color: string
  shadow: string
  bg: string
  border: string
}

const props = defineProps<{
  serv: ServicioDashboard
  getEstadoInfo: (label: string) => EstadoInfo | undefined
  formatFecha: (f: string) => string
  obtenerHoras: (f: string) => number
  mostrarTooltip: (event: MouseEvent, data: any, tipo: 'ubicacion' | 'bus' | 'hardware' | 'usuario') => void
  ocultarTooltip: () => void
}>()

const cantRutas = computed(() => props.serv.rutas?.length || (props.serv.id_ruta ? 1 : 0))
const cantVehiculos = computed(() => Object.keys(props.serv.vehiculos || {}).length)
const cantHardware = computed(() => Object.values(props.serv.vehiculos || {}).reduce((acc, curr) => acc + (curr?.length || 0), 0))
const cantEscoltas = computed(() => props.serv.escoltas?.length || 0)

const obtenerCantidad = (tipo: 'ubicacion' | 'bus' | 'hardware' | 'usuario') => {
  if (tipo === 'ubicacion') return cantRutas.value
  if (tipo === 'bus') return cantVehiculos.value
  if (tipo === 'hardware') return cantHardware.value
  return cantEscoltas.value
}

const iconos = [
  { tipo: 'ubicacion' as const, icon: Route01Icon, label: 'Ruta' },
  { tipo: 'bus'       as const, icon: Car01Icon,   label: 'Vehículo' },
  { tipo: 'hardware'  as const, icon: CpuIcon,     label: 'Hardware' },
  { tipo: 'usuario'   as const, icon: User02Icon,  label: 'Escolta' }
]

const estadoInfo = () => props.getEstadoInfo(props.serv.estado)
</script>

<template>
  <div
    class="relative group/card overflow-hidden rounded-[14px] bg-gradient-to-b from-white/95 to-white/60 dark:from-[#20242D]/90 dark:to-[#13161C]/90 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_20px_rgba(0,0,0,0.15)] transition-all duration-200 cursor-pointer"
  >
    <!-- Línea de color estado en el borde superior -->
    <div
      class="absolute top-0 left-0 right-0 h-[2px] opacity-80"
      :style="{ background: `linear-gradient(to right, transparent, ${estadoInfo()?.color || '#3b82f6'}, transparent)` }"
    ></div>

    <div class="relative z-10 p-2.5 flex flex-col gap-2">

      <!-- Fila superior: Estado + Tiempo transcurrido -->
      <div class="flex items-center justify-between gap-2">
        <div
          class="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full border backdrop-blur-sm"
          :style="{
            backgroundColor: estadoInfo()?.bg || 'rgba(59,130,246,0.08)',
            borderColor: estadoInfo()?.border || 'rgba(59,130,246,0.2)'
          }"
        >
          <span
            class="w-1 h-1 rounded-full animate-pulse"
            :style="{ backgroundColor: estadoInfo()?.color || '#3b82f6' }"
          ></span>
          <span
            class="text-[6.5px] font-black uppercase tracking-[0.05em] leading-none whitespace-nowrap"
            :style="{ color: estadoInfo()?.color || '#3b82f6' }"
          >{{ serv.estado }}</span>
        </div>

        <div class="flex items-center gap-0.5 text-slate-400 dark:text-slate-500 text-[8px] font-black uppercase tracking-wider">
          <HugeiconsIcon :icon="Clock01Icon" :size="9" class="text-slate-400 dark:text-slate-500" />
          <span>{{ obtenerHoras(serv.fecha_inicio) }}h</span>
        </div>
      </div>

      <!-- Fila inferior: Recursos + Fecha de inicio (Compacto) -->
      <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
        <div class="flex items-center gap-1.5 py-0.5 justify-start">
          <button
            v-for="item in iconos"
            :key="item.tipo"
            class="relative w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-200"
            :class="[
              obtenerCantidad(item.tipo) > 0
                ? 'bg-blue-50/50 dark:bg-[#3b82f6]/10 border-blue-100 dark:border-blue-500/20 text-[#3b82f6] dark:text-[#5da6fc]'
                : 'bg-slate-50/40 dark:bg-white/[0.01] border-slate-100/40 dark:border-white/[0.02] text-slate-400/50 dark:text-slate-600/40'
            ]"
            @mouseenter="mostrarTooltip($event, serv, item.tipo)"
            @mouseleave="ocultarTooltip"
          >
            <HugeiconsIcon :icon="item.icon" :size="11" :stroke-width="2.5" />
            
            <!-- Badge numérico flotante miniatura -->
            <span
              v-if="obtenerCantidad(item.tipo) > 0"
              class="absolute -top-1 -right-1 flex h-3 min-w-[12px] px-0.5 items-center justify-center rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] text-[7px] font-black text-white dark:text-slate-950 border border-white dark:border-[#1A1D24]"
            >
              {{ obtenerCantidad(item.tipo) }}
            </span>
          </button>
        </div>

        <div class="flex items-center gap-1">
          <HugeiconsIcon :icon="Calendar01Icon" :size="9" class="text-slate-400 dark:text-slate-500 shrink-0" />
          <span class="text-[8px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
            {{ formatFecha(serv.fecha_inicio) }}
          </span>
        </div>
      </div>
    </div>
    <!-- Overlay de borde interno -->
    <div class="absolute inset-0 pointer-events-none rounded-[14px] border border-white/10 dark:border-white/5 mix-blend-overlay"></div>
  </div>
</template>
