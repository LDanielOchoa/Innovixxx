<template>
  <div class="px-6 py-4 flex items-center justify-between w-full gap-4 flex-wrap border-t border-slate-100 dark:border-white/5 bg-slate-50/20 dark:bg-white/[0.01] min-h-[64px]">
    <!-- Contador de resultados -->
    <div class="text-[13px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
      <span>Mostrando</span>
      <span class="text-slate-900 dark:text-white font-black">{{ Math.min(totalRecords, (currentPage - 1) * rowsPerPage + 1) }}</span>
      <span>a</span>
      <span class="text-slate-900 dark:text-white font-black">{{ Math.min(totalRecords, currentPage * rowsPerPage) }}</span>
      <span>de</span>
      <span class="text-[#3b82f6] dark:text-[#5da6fc] font-black">{{ totalRecords }}</span>
      <span>resultados</span>
    </div>

    <!-- Controles de paginación -->
    <div class="flex items-center gap-1.5" v-if="totalPages >= 1">
      <!-- Anterior -->
      <button
        @click="$emit('update:currentPage', currentPage - 1)"
        :disabled="currentPage <= 1"
        class="h-9 px-3 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_2px_0_#e2e8f0,0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_0_#1D1D24,0_1px_4px_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
      >
        <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" />
      </button>

      <!-- Páginas numeradas (sm+) -->
      <div class="hidden sm:flex items-center gap-1.5">
        <template v-for="page in pageRange" :key="page">
          <span v-if="page === '...'" class="h-8 w-6 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[13px] font-bold select-none">…</span>
          <button
            v-else
            @click="$emit('update:currentPage', page as number)"
            class="h-9 min-w-[2.25rem] px-2.5 flex items-center justify-center rounded-xl text-[13px] font-black transition-all duration-200 active:scale-95"
            :class="currentPage === page
              ? 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] text-white border border-[#2563eb] dark:border-[#1d4ed8] shadow-[0_3px_0_#2563eb,0_6px_12px_rgba(59,130,246,0.3)] dark:shadow-[0_3px_0_#1d4ed8,0_6px_15px_rgba(59,130,246,0.2)] active:translate-y-[3px] active:shadow-none'
              : 'bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 shadow-[0_2px_0_#e2e8f0,0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_0_#1D1D24,0_1px_4px_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-none'"
          >
            {{ page }}
          </button>
        </template>
      </div>

      <!-- Página actual (mobile) -->
      <span class="sm:hidden h-8 px-3 flex items-center justify-center rounded-lg border border-[#3b82f6]/30 dark:border-[#5da6fc]/30 bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 text-[13px] font-bold text-[#3b82f6] dark:text-[#5da6fc]">
        {{ currentPage }} / {{ totalPages }}
      </span>

      <!-- Siguiente -->
      <button
        @click="$emit('update:currentPage', currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="h-9 px-3 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_2px_0_#e2e8f0,0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_0_#1D1D24,0_1px_4px_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
      >
        <HugeiconsIcon :icon="ArrowRight01Icon" :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

const props = defineProps<{
  totalRecords: number
  currentPage: number
  rowsPerPage: number
}>()

defineEmits(['update:currentPage'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalRecords / props.rowsPerPage)))

// Smart page range with ellipsis
const pageRange = computed(() => {
  const total = totalPages.value
  const current = props.currentPage
  const delta = 2

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const range: (number | '...')[] = []
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)

  range.push(1)
  if (left > 2) range.push('...')
  for (let i = left; i <= right; i++) range.push(i)
  if (right < total - 1) range.push('...')
  range.push(total)

  return range
})
</script>


