<script setup lang="ts">
import { computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Car01Icon,
  CpuIcon,
  User02Icon,
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
  { tipo: 'ubicacion' as const, icon: Route01Icon },
  { tipo: 'bus'       as const, icon: Car01Icon   },
  { tipo: 'hardware'  as const, icon: CpuIcon     },
  { tipo: 'usuario'   as const, icon: User02Icon  }
]

const estadoInfo = () => props.getEstadoInfo(props.serv.estado)
</script>

<template>
  <div
    class="relative group/card overflow-hidden rounded-xl bg-white/90 dark:bg-[#1C1F27]/90 backdrop-blur-xl border border-slate-200/70 dark:border-white/[0.07] shadow-sm hover:shadow-md dark:shadow-black/20 transition-all duration-200 cursor-pointer w-full"
  >
    <div class="relative z-10 p-3.5 flex flex-col gap-3">

      <!-- Estado badge y Horas transcurridas -->
      <div class="flex items-center justify-between">
        <div
          class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-widest"
          :style="{
            backgroundColor: estadoInfo()?.bg || 'rgba(59,130,246,0.08)',
            borderColor: estadoInfo()?.border || 'rgba(59,130,246,0.2)',
            color: estadoInfo()?.color || '#3b82f6'
          }"
        >
          <span
            class="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
            :style="{ backgroundColor: estadoInfo()?.color || '#3b82f6' }"
          ></span>
          {{ serv.estado }}
        </div>

        <!-- Tiempo transcurrido -->
        <div class="flex items-center gap-1 text-slate-400 dark:text-slate-500">
          <HugeiconsIcon :icon="Clock01Icon" :size="9" />
          <span class="text-[8px] font-black tracking-tight uppercase">{{ obtenerHoras(serv.fecha_inicio) }}h</span>
        </div>
      </div>

      <!-- Fila inferior: Iconos de recursos (Centrado/Alineado a la izquierda al remover la fecha) -->
      <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.03]">
        <div class="flex items-center gap-1.5">
          <button
            v-for="item in iconos"
            :key="item.tipo"
            class="relative w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-150"
            :class="[
              obtenerCantidad(item.tipo) > 0
                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20 text-blue-500 dark:text-blue-400'
                : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-100/60 dark:border-white/[0.03] text-slate-300 dark:text-slate-600'
            ]"
            @mouseenter="mostrarTooltip($event, serv, item.tipo)"
            @mouseleave="ocultarTooltip"
          >
            <HugeiconsIcon :icon="item.icon" :size="11" :stroke-width="2.5" />

            <span
              v-if="obtenerCantidad(item.tipo) > 0"
              class="absolute -top-1 -right-1 flex h-[11px] min-w-[11px] px-[2px] items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-[6px] font-black text-white dark:text-slate-950 border border-white dark:border-[#1C1F27]"
            >
              {{ obtenerCantidad(item.tipo) }}
            </span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
