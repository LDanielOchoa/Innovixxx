<template>
  <!-- Floating Side Panel — Glassmorphic 3D Style -->
  <div
    class="absolute bottom-6 right-6 z-40 w-[340px] flex flex-col pointer-events-auto"
    style="max-height: calc(100vh - 80px);"
  >
    <!-- Glass Card -->
    <div class="flex flex-col bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl rounded-2xl border border-slate-200/70 dark:border-white/[0.07] shadow-[0_20px_50px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">

      <!-- ═══ HEADER ═══ -->
      <div class="relative px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/[0.05] overflow-hidden">
        <!-- Fondo decorativo -->
        <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.06] via-transparent to-transparent pointer-events-none"></div>
        <div class="absolute top-0 right-0 w-24 h-24 bg-[#3b82f6]/[0.04] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div class="relative flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Route Icon con glow -->
            <div class="relative group/icon shrink-0">
              <div class="absolute inset-0 bg-[#3b82f6] blur-lg rounded-[14px] opacity-40 group-hover/icon:opacity-60 transition-opacity duration-300"></div>
              <div class="w-10 h-10 rounded-[14px] bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(59,130,246,0.5),inset_0_2px_0_rgba(255,255,255,0.3)] border border-[#2563eb]/30 relative z-10">
                <HugeiconsIcon :icon="Route01Icon" :size="20" :stroke-width="2" />
              </div>
            </div>
            <div class="flex flex-col">
              <span class="text-[9px] font-black tracking-[0.2em] uppercase text-[#3b82f6] dark:text-[#5da6fc]">Asignación de Paradas</span>
              <span class="text-[13px] font-black text-slate-800 dark:text-white tracking-tight leading-tight mt-0.5 flex items-center gap-2">
                <span v-if="paradas.length === 0" class="text-slate-400 dark:text-slate-500 font-bold text-[12px]">Inicia a trazar en el mapa</span>
                <template v-else>
                  <span>{{ paradas.length }} {{ paradas.length === 1 ? 'Parada' : 'Paradas' }}</span>
                  <span class="w-1 h-1 rounded-full bg-[#3b82f6] animate-pulse"></span>
                  <span class="text-[#3b82f6] dark:text-[#5da6fc]">{{ totalDistanceStr }}</span>
                </template>
              </span>
            </div>
          </div>
        <!-- Close Button Flat -->
          <button
            @click="$emit('close')"
            class="w-8 h-8 flex items-center justify-center rounded-[10px] text-slate-450 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 active:scale-[0.97] transition-all duration-200"
            title="Cerrar panel"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" :stroke-width="2.5" />
          </button>
        </div>
      </div>

      <!-- Search Bar (visible only when there are more than 5 stops) -->
      <div v-if="paradas.length > 5" class="px-3 pt-2 shrink-0">
        <div class="relative flex items-center bg-slate-50 dark:bg-[#0A0C10] border border-slate-200/80 dark:border-white/5 rounded-xl overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          <HugeiconsIcon :icon="Search01Icon" :size="14" class="absolute left-3.5 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar parada (Ej: 3, normal)..."
            class="w-full bg-transparent border-none py-2.5 pl-10 pr-3 text-[11px] font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      <!-- ═══ STOPS LIST ═══ -->
      <div ref="stopListContainer" class="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-1.5" style="max-height: 320px; min-height: 80px;">

        <!-- Empty State -->
        <div v-if="paradas.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
          <div class="w-16 h-16 rounded-[20px] bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4 animate-[float_6s_ease-in-out_infinite] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.02),0_10px_20px_rgba(0,0,0,0.2)]">
            <HugeiconsIcon :icon="Location01Icon" :size="32" :stroke-width="1.5" />
          </div>
          <p class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Sin paradas</p>
          <p class="text-[10px] text-slate-400 dark:text-slate-600 mt-1 font-medium">Haz clic en el mapa para agregar nodos</p>
        </div>

        <!-- Stop Items -->
        <TransitionGroup :name="paradas.length <= 30 ? 'stop-item' : 'stop-item-fast'" tag="div" class="space-y-1.5">
          <div
            v-for="parada in paginatedParadas"
            :key="parada.originalIndex"
            @click="$emit('select', parada.originalIndex)"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-[14px] border cursor-pointer transition-all duration-200 relative overflow-hidden"
            :class="[
              selectedIndex === parada.originalIndex
                ? 'bg-gradient-to-b from-white to-slate-50/80 dark:from-[#20242D] dark:to-[#1A1E28] border-[#3b82f6]/30 shadow-sm'
                : 'bg-gradient-to-b from-white/80 to-slate-50/60 dark:from-[#20242D]/60 dark:to-[#1A1E28]/60 border-slate-200/80 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-[#3b82f6]/20'
            ]"
          >
            <!-- Barra lateral izquierda activa -->
            <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb] transition-all duration-300"
              :class="selectedIndex === parada.originalIndex ? 'opacity-100 h-[65%]' : 'opacity-0 h-0'"></div>
            <!-- Node Index + Type Icon -->
            <div class="relative shrink-0">
              <!-- Connection Line (top, skip first) -->
              <div v-if="parada.originalIndex > 0" class="absolute -top-[14px] left-1/2 -translate-x-1/2 w-[2px] h-3 rounded-full"
                   :class="isNodePassed(parada.originalIndex) ? 'bg-[#3b82f6] dark:bg-[#5da6fc]' : 'bg-slate-200 dark:bg-white/10'">
              </div>
              <!-- Connection Line (bottom, skip last) -->
              <div v-if="parada.originalIndex < paradas.length - 1" class="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-[2px] h-3 rounded-full"
                   :class="isNodePassed(parada.originalIndex + 1) ? 'bg-[#3b82f6] dark:bg-[#5da6fc]' : 'bg-slate-200 dark:bg-white/10'">
              </div>

              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black border transition-all"
                   :class="[
                     selectedIndex === parada.originalIndex
                       ? 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white border-[#2563eb] shadow-[0_4px_10px_rgba(59,130,246,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]'
                       : isNodePassed(parada.originalIndex)
                         ? 'bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 text-[#3b82f6] dark:text-[#5da6fc] border-[#3b82f6]/20 dark:border-[#5da6fc]/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                         : 'bg-slate-50 dark:bg-[#0A0C10] text-slate-400 dark:text-slate-500 border-slate-200/80 dark:border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]'
                   ]">
                {{ parada.originalIndex + 1 }}
              </div>
            </div>

            <!-- Stop Info -->
            <div class="flex-1 min-w-0 flex items-center">
              <span class="text-[11px] font-black uppercase tracking-wider truncate"
                    :class="selectedIndex === parada.originalIndex ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'">
                {{ getTipoNombre(parada.tipo) }}
              </span>
              <!-- Distance badge (between stops) -->
              <span v-if="parada.originalIndex > 0" class="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-auto"
                    :class="isNodePassed(parada.originalIndex) ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:bg-[#5da6fc]/10 dark:text-[#5da6fc]' : 'bg-slate-100 dark:bg-white/5 text-slate-400'">
                {{ getDistanceStr(paradas[parada.originalIndex - 1], parada) }}
              </span>
              <span v-else class="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto uppercase tracking-wide">
                Inicio
              </span>
            </div>

            <!-- Delete Button (visible on selected) -->
            <button
              v-if="selectedIndex === parada.originalIndex"
              @click.stop="$emit('delete', parada.originalIndex)"
              class="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all duration-200 active:scale-90 shrink-0"
              title="Eliminar parada"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="14" />
            </button>
          </div>
        </TransitionGroup>
      </div>

      <!-- Pagination Controls (only if totalPages > 1) -->
      <div v-if="totalPages > 1" class="px-4 py-2.5 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.05] bg-slate-50/50 dark:bg-white/[0.02] shrink-0 select-none">
        <button
          type="button"
          @click="currentPage > 1 ? currentPage-- : null"
          :disabled="currentPage === 1"
          class="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-35 transition-all"
        >
          <HugeiconsIcon :icon="ArrowLeft01Icon" :size="12" />
        </button>
        <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Pág. {{ currentPage }} de {{ totalPages }}
        </span>
        <button
          type="button"
          @click="currentPage < totalPages ? currentPage++ : null"
          :disabled="currentPage === totalPages"
          class="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-35 transition-all"
        >
          <HugeiconsIcon :icon="ArrowRight01Icon" :size="12" />
        </button>
      </div>

      <!-- ═══ FOOTER ACTIONS ═══ -->
      <div class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-white/[0.05] flex flex-col gap-2.5">
        <!-- Hint line -->
        <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest">
          {{ paradas.length < 2 ? 'Añade al menos 2 puntos' : 'Ruta lista' }}
        </p>

        <!-- Save Button -->
        <button
          @click="$emit('save')"
          :disabled="paradas.length < 2"
          class="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-bold text-xs uppercase tracking-wide transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed"
          :class="paradas.length >= 2
            ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white active:scale-[0.97]'
            : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-white/5'"
        >
          <HugeiconsIcon :icon="Tick01Icon" :size="16" :stroke-width="2.5" />
          LISTO
        </button>

        <!-- Secondary Actions -->
        <div class="flex gap-2">
          <button
            @click="$emit('clear')"
            :disabled="paradas.length === 0"
            class="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 active:scale-[0.97] transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <HugeiconsIcon :icon="Delete01Icon" :size="14" :stroke-width="2.5" />
            Limpiar
          </button>
          <button
            @click="$emit('close')"
            class="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide text-slate-550 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" :stroke-width="2.5" />
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
  TouchInteraction01Icon,
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon
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
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 8

// Tipos de parada mapping
const getTipoNombre = (tipoId: number): string => {
  const tipo = props.tiposParada.find(t => t.id_tipo === tipoId)
  if (!tipo) return 'Punto'
  return tipo.nombre.length > 15 ? tipo.nombre.substring(0, 12) + '...' : tipo.nombre
}

// Filtered paradas with original indexes preserved
const filteredParadas = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const list = props.paradas.map((p, idx) => ({ ...p, originalIndex: idx }))
  
  if (!query) return list
  
  return list.filter(p => {
    const matchIndex = (p.originalIndex + 1).toString() === query
    const typeName = getTipoNombre(p.tipo).toLowerCase()
    const matchType = typeName.includes(query)
    return matchIndex || matchType
  })
})

// Total Pages
const totalPages = computed(() => Math.ceil(filteredParadas.value.length / itemsPerPage) || 1)

// Paginated items
const paginatedParadas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredParadas.value.slice(start, start + itemsPerPage)
})

// Reset to page 1 if search changes total pages
watch(totalPages, (newVal) => {
  if (currentPage.value > newVal) {
    currentPage.value = newVal
  }
})

// Auto-scroll to last added stop & go to the last page when a stop is added
watch(() => props.paradas.length, async (newVal, oldVal) => {
  if (newVal > oldVal) {
    currentPage.value = totalPages.value
  }
  await nextTick()
  if (stopListContainer.value) {
    stopListContainer.value.scrollTop = stopListContainer.value.scrollHeight
  }
})

// Go to corresponding page when selected index changes
watch(() => props.selectedIndex, (newIdx) => {
  if (newIdx !== null && newIdx !== undefined) {
    const filteredIdx = filteredParadas.value.findIndex(p => p.originalIndex === newIdx)
    if (filteredIdx !== -1) {
      currentPage.value = Math.floor(filteredIdx / itemsPerPage) + 1
    }
  }
})



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

/* Stop list transition (used when <=30 stops) */
.stop-item-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.stop-item-leave-active {
  transition: all 0.2s ease;
  /* No usar position:absolute aquí — evita reflow masivo */
}
.stop-item-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.95);
}
.stop-item-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.stop-item-move {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Fast transition (used when >30 stops) — sin move animation */
.stop-item-fast-enter-active {
  transition: opacity 0.15s ease;
}
.stop-item-fast-leave-active {
  transition: opacity 0.1s ease;
}
.stop-item-fast-enter-from { opacity: 0; }
.stop-item-fast-leave-to   { opacity: 0; }
/* Sin .stop-item-fast-move = sin animación de reorden = sin freeze */

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
