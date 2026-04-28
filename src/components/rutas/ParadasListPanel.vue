<template>
  <!-- Floating Side Panel — Glassmorphic 3D Style -->
  <div
    class="absolute bottom-6 right-6 z-40 w-[340px] flex flex-col pointer-events-auto"
    style="max-height: calc(100vh - 80px);"
  >
    <!-- Glass Card -->
    <div class="flex flex-col bg-white/95 dark:bg-[#0C0E13] backdrop-blur-3xl rounded-xl border border-slate-200 dark:border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">

      <!-- ═══ HEADER ═══ -->
      <div class="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Route Icon -->
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(59,130,246,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-white/10 relative overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              <HugeiconsIcon :icon="Route01Icon" :size="20" :stroke-width="2" class="relative z-10" />
            </div>
            <div class="flex flex-col">
              <span class="text-[11px] font-black tracking-[0.15em] uppercase text-[#3b82f6] dark:text-[#5da6fc]">Asignación de Paradas</span>
              <span class="text-[13px] font-black text-slate-800 dark:text-white tracking-tight leading-tight mt-0.5 flex items-center gap-2">
                <span v-if="paradas.length === 0" class="text-slate-400 dark:text-slate-500 font-bold">Inicia a trazar en el mapa</span>
                <template v-else>
                  <span>{{ paradas.length }} {{ paradas.length === 1 ? 'Parada' : 'Paradas' }}</span>
                  <span class="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <span class="text-[#3b82f6] dark:text-[#5da6fc]">{{ totalDistanceStr }}</span>
                </template>
              </span>
            </div>
          </div>
          <!-- Close Button -->
          <button
            @click="$emit('close')"
            class="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 transition-all active:scale-90 shadow-sm"
            title="Cerrar panel"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="16" />
          </button>
        </div>

      </div>

      <!-- ═══ STOPS LIST ═══ -->
      <div class="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-1.5" style="max-height: 320px; min-height: 80px;">

        <!-- Empty State -->
        <div v-if="paradas.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
          <div class="w-16 h-16 rounded-[20px] bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4 animate-[float_6s_ease-in-out_infinite] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.02),0_10px_20px_rgba(0,0,0,0.2)]">
            <HugeiconsIcon :icon="Location01Icon" :size="32" :stroke-width="1.5" />
          </div>
          <p class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Sin paradas</p>
          <p class="text-[10px] text-slate-400 dark:text-slate-600 mt-1 font-medium">Haz clic en el mapa para agregar nodos</p>
        </div>

        <!-- Stop Items -->
        <TransitionGroup name="stop-item" tag="div" class="space-y-1.5">
          <div
            v-for="(parada, index) in paradas"
            :key="index"
            @click="$emit('select', index)"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-[16px] border cursor-pointer transition-all duration-300 relative"
            :class="[
              selectedIndex === index
                ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/10 border-[#3b82f6]/30 dark:border-[#3b82f6]/20 shadow-[inset_0_1px_3px_rgba(59,130,246,0.1)]'
                : 'bg-white/80 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 hover:border-[#3b82f6]/20 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(59,130,246,0.1)] dark:hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.4)]'
            ]"
          >
            <!-- Node Index + Type Icon -->
            <div class="relative shrink-0">
              <!-- Connection Line (top, skip first) -->
              <div v-if="index > 0" class="absolute -top-[14px] left-1/2 -translate-x-1/2 w-[2px] h-3 rounded-full"
                   :class="isNodePassed(index) ? 'bg-[#3b82f6] dark:bg-[#5da6fc]' : 'bg-slate-200 dark:bg-white/10'">
              </div>
              <!-- Connection Line (bottom, skip last) -->
              <div v-if="index < paradas.length - 1" class="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-[2px] h-3 rounded-full"
                   :class="isNodePassed(index + 1) ? 'bg-[#3b82f6] dark:bg-[#5da6fc]' : 'bg-slate-200 dark:bg-white/10'">
              </div>

              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black border transition-all"
                   :class="[
                     selectedIndex === index
                       ? 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white border-[#2563eb] shadow-[0_4px_10px_rgba(59,130,246,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]'
                       : isNodePassed(index)
                         ? 'bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 text-[#3b82f6] dark:text-[#5da6fc] border-[#3b82f6]/20 dark:border-[#5da6fc]/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                         : 'bg-slate-50 dark:bg-[#0A0C10] text-slate-400 dark:text-slate-500 border-slate-200/80 dark:border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]'
                   ]">
                {{ index + 1 }}
              </div>
            </div>

            <!-- Stop Info -->
            <div class="flex-1 min-w-0 flex items-center">
              <span class="text-[11px] font-black uppercase tracking-wider truncate"
                    :class="selectedIndex === index ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'">
                {{ getTipoNombre(parada.tipo) }}
              </span>
              <!-- Distance badge (between stops) -->
              <span v-if="index > 0" class="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-auto"
                    :class="isNodePassed(index) ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:bg-[#5da6fc]/10 dark:text-[#5da6fc]' : 'bg-slate-100 dark:bg-white/5 text-slate-400'">
                {{ getDistanceStr(paradas[index - 1], parada) }}
              </span>
              <span v-else class="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto uppercase tracking-wide">
                Inicio
              </span>
            </div>

            <!-- Delete Button (visible on selected) -->
            <button
              v-if="selectedIndex === index"
              @click.stop="$emit('delete', index)"
              class="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all duration-200 active:scale-90 shrink-0"
              title="Eliminar parada"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="14" />
            </button>
          </div>
        </TransitionGroup>
      </div>

      <!-- ═══ FOOTER ACTIONS ═══ -->
      <div class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2.5">
        <!-- Hint line -->
        <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest">
          {{ paradas.length < 2 ? 'Añade al menos 2 nodos para guardar' : 'Ruta lista para guardar' }}
        </p>

        <!-- Save Button (3D Physical) -->
        <button
          @click="$emit('save')"
          :disabled="paradas.length < 2"
          class="w-full h-12 flex items-center justify-center gap-2 rounded-[16px] font-black text-[13px] uppercase tracking-widest transition-all duration-200 border disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
          :class="paradas.length >= 2
            ? 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] text-white border-[#2563eb] shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb]'
            : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5'"
        >
          <HugeiconsIcon :icon="Tick01Icon" :size="18" :stroke-width="2.5" />
          Guardar Ruta
        </button>

        <!-- Secondary Actions -->
        <div class="flex gap-2">
          <button
            @click="$emit('clear')"
            :disabled="paradas.length === 0"
            class="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-[12px] text-[11px] font-black uppercase tracking-wide text-red-500 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 hover:border-red-500/50 transition-all active:scale-[0.98] active:translate-y-[1px] disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_2px_0_rgba(0,0,0,0.04)] dark:shadow-[0_2px_0_rgba(255,255,255,0.02)]"
          >
            <HugeiconsIcon :icon="Delete01Icon" :size="15" />
            Limpiar
          </button>
          <button
            @click="$emit('close')"
            class="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-[12px] text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all active:scale-[0.98] active:translate-y-[1px] shadow-[0_2px_0_rgba(0,0,0,0.04)] dark:shadow-[0_2px_0_rgba(255,255,255,0.02)]"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="15" />
            Cancelar
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Delete01Icon,
  Cancel01Icon,
  Tick01Icon,
  Location01Icon,
  TouchInteraction01Icon
} from '@hugeicons/core-free-icons'
import type { ParadaPayload } from '../../domains/rutas/types/ruta'
import { useI18n } from 'vue-i18n'
import { ref, watch, nextTick, computed } from 'vue'

const { t } = useI18n()

interface Props {
  paradas: ParadaPayload[]
  tiposParada: { id_tipo: number; nombre: string }[]
  selectedIndex?: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', index: number | null): void
  (e: 'delete', index: number): void
  (e: 'save'): void
  (e: 'clear'): void
  (e: 'close'): void
}>()

const stopListContainer = ref<HTMLElement | null>(null)

// Auto-scroll to last added stop
watch(() => props.paradas.length, async () => {
  await nextTick()
  if (stopListContainer.value) {
    stopListContainer.value.scrollTop = stopListContainer.value.scrollHeight
  }
})

// Tipos de parada mapping
const getTipoNombre = (tipoId: number): string => {
  const tipo = props.tiposParada.find(t => t.id_tipo === tipoId)
  if (!tipo) return 'Punto'
  return tipo.nombre.length > 15 ? tipo.nombre.substring(0, 12) + '...' : tipo.nombre
}

// Node state
const isNodePassed = (index: number) => {
  if (props.selectedIndex === null || props.selectedIndex === undefined) return true
  return props.selectedIndex >= index
}

// Distance calc (haversine)
const getDistanceStr = (p1: ParadaPayload, p2: ParadaPayload): string => {
  const R = 6371
  const dLat = (p2.lat - p1.lat) * Math.PI / 180
  const dLon = (p2.lon - p1.lon) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return d < 1 ? `${(d * 1000).toFixed(0)} M` : `${d.toFixed(1)} KM`
}

// Total route distance
const totalDistanceStr = computed(() => {
  if (props.paradas.length < 2) return '—'
  let total = 0
  for (let i = 1; i < props.paradas.length; i++) {
    const p1 = props.paradas[i - 1]!
    const p2 = props.paradas[i]!
    const R = 6371
    const dLat = (p2.lat - p1.lat) * Math.PI / 180
    const dLon = (p2.lon - p1.lon) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
  return total < 1 ? `${(total * 1000).toFixed(0)} M` : `${total.toFixed(1)} KM`
})
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.2) transparent;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.35);
}

/* Stop list transition */
.stop-item-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.stop-item-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
}
.stop-item-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.95);
}
.stop-item-leave-to {
  opacity: 0;
  transform: translateX(-10px) scale(0.96);
}
.stop-item-move {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Hint card fade */
.hint-fade-enter-active, .hint-fade-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.hint-fade-enter-from, .hint-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
</style>
