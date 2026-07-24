<template>
  <!-- Floating Side Panel — Clean & Sleek Design -->
  <div
    class="absolute bottom-6 right-6 z-40 w-[340px] flex flex-col pointer-events-auto"
    style="max-height: calc(100vh - 80px);"
  >
    <!-- Clean Card Container -->
    <div class="flex flex-col bg-white dark:bg-[#13161C] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xl overflow-hidden">

      <!-- ═══ HEADER ═══ -->
      <div class="px-5 py-4 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20 shrink-0">
            <HugeiconsIcon :icon="Route01Icon" :size="18" :stroke-width="2" />
          </div>
          <div>
            <h2 class="text-[13px] font-bold text-slate-800 dark:text-white tracking-tight leading-tight">Asignación de Paradas</h2>
            <p class="text-[10px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <span v-if="paradas.length === 0" class="text-slate-400 font-medium">Sin puntos asignados</span>
              <template v-else>
                <span>{{ filteredParadas.length }} {{ filteredParadas.length === 1 ? 'Novedad' : 'Novedades' }}</span>
                <span>•</span>
                <span>{{ totalDistanceStr }}</span>
              </template>
            </p>
          </div>
        </div>

        <!-- Botón Cerrar Plano -->
        <button
          @click="$emit('close')"
          class="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200"
          title="Cerrar panel"
        >
          <HugeiconsIcon :icon="Cancel01Icon" :size="14" :stroke-width="2" />
        </button>
      </div>

      <!-- Buscador (Solo si hay más de 5 paradas) -->
      <div v-if="paradas.length > 5" class="px-4 pt-3 shrink-0">
        <div class="relative flex items-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-xl overflow-hidden">
          <HugeiconsIcon :icon="Search01Icon" :size="14" class="absolute left-3 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar novedad..."
            class="w-full bg-transparent border-none py-2 pl-9 pr-3 text-[11px] font-medium text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      <!-- ═══ LISTA DE NOVEDADES ═══ -->
      <div ref="stopListContainer" class="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2" style="max-height: 320px; min-height: 80px;">

        <!-- Empty State -->
        <div v-if="filteredParadas.length === 0" class="flex flex-col items-center justify-center py-8 text-center gap-2">
          <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-center text-slate-300 dark:text-slate-600">
            <HugeiconsIcon :icon="Location01Icon" :size="24" :stroke-width="1.5" />
          </div>
          <div>
            <p class="text-[11px] font-bold text-slate-600 dark:text-slate-300">Sin novedades</p>
            <p class="text-[10px] text-slate-400 dark:text-slate-500">No hay puntos especiales en este trayecto</p>
          </div>
        </div>

        <!-- Stop Items -->
        <TransitionGroup name="stop-item" tag="div" class="space-y-2">
          <div
            v-for="parada in paginatedParadas"
            :key="parada.originalIndex"
            @click="$emit('select', parada.originalIndex)"
            class="group flex items-center justify-between p-2.5 px-3 rounded-xl border cursor-pointer transition-all duration-200"
            :class="[
              selectedIndex === parada.originalIndex
                ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/15 border-[#3b82f6]/40'
                : 'bg-slate-50/50 dark:bg-[#1E222B]/40 border-slate-200/60 dark:border-white/5 hover:bg-slate-100/70 dark:hover:bg-[#232732]/70 hover:border-slate-300 dark:hover:border-white/10'
            ]"
          >
            <div class="flex items-center gap-3 min-w-0">
              <!-- Número de Parada -->
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors"
                :class="[
                  selectedIndex === parada.originalIndex
                    ? 'bg-[#3b82f6] text-white'
                    : 'bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10'
                ]"
              >
                {{ parada.originalIndex + 1 }}
              </div>

              <!-- Info de Parada -->
              <div class="flex flex-col min-w-0">
                <span
                  class="text-[11px] font-bold truncate"
                  :class="selectedIndex === parada.originalIndex ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                >
                  {{ getTipoNombre(parada.tipo) }}
                </span>
                <span class="text-[9.5px] font-medium text-slate-400">
                  {{ parada.originalIndex === 0 ? 'Punto Inicial' : getDistanceStr(paradas[parada.originalIndex - 1], parada) }}
                </span>
              </div>
            </div>

            <!-- Botón Eliminar -->
            <button
              v-if="selectedIndex === parada.originalIndex"
              @click.stop="$emit('delete', parada.originalIndex)"
              class="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all duration-200 shrink-0"
              title="Eliminar parada"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="13" />
            </button>
          </div>
        </TransitionGroup>
      </div>

      <!-- Paginación Simple -->
      <div v-if="totalPages > 1" class="px-4 py-2 flex items-center justify-between border-t border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <button
          type="button"
          @click="currentPage > 1 ? currentPage-- : null"
          :disabled="currentPage === 1"
          class="w-6 h-6 rounded-md border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
        >
          <HugeiconsIcon :icon="ArrowLeft01Icon" :size="11" />
        </button>
        <span class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          type="button"
          @click="currentPage < totalPages ? currentPage++ : null"
          :disabled="currentPage === totalPages"
          class="w-6 h-6 rounded-md border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
        >
          <HugeiconsIcon :icon="ArrowRight01Icon" :size="11" />
        </button>
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

// Filtered paradas with original indexes preserved (Excluye las paradas de tipo 'Normal' para mostrar solo novedades/puntos clave)
const filteredParadas = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const list = props.paradas
    .map((p, idx) => ({ ...p, originalIndex: idx }))
    .filter(p => {
      const nombre = getTipoNombre(p.tipo).toLowerCase().trim()
      // Omitir si es tipo 'normal' o 'punto normal'
      return !nombre.includes('normal')
    })
  
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
