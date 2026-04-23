<template>
  <div class="px-5 sm:px-6 py-4 flex items-center justify-between w-full gap-4 flex-wrap">
    <!-- Contador de resultados -->
    <span class="text-[13px] font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
      <span class="text-slate-700 dark:text-slate-200">{{ Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1) }}</span>
      –
      <span class="text-slate-700 dark:text-slate-200">{{ Math.min(totalItems, currentPage * itemsPerPage) }}</span>
      {{ $t('common.of', 'de') }}
      <span class="text-[#3b82f6] dark:text-[#5da6fc]">{{ totalItems }}</span>
      {{ $t('common.results', 'resultados') }}
    </span>

    <!-- Controles de paginación -->
    <div class="flex items-center gap-1.5" v-if="totalPages > 1">
      <!-- Anterior -->
      <button
        @click="$emit('update:currentPage', currentPage - 1)"
        :disabled="currentPage <= 1"
        class="h-9 px-3 flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1A1D24] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] hover:border-[#3b82f6]/30 dark:hover:border-[#5da6fc]/30 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 shadow-sm"
      >
        <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" />
      </button>

      <!-- Páginas numeradas (sm+) -->
      <div class="hidden sm:flex items-center gap-1">
        <template v-for="page in pageRange" :key="page">
          <span v-if="page === '...'" class="h-8 w-6 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[13px] font-bold select-none">…</span>
          <button
            v-else
            @click="$emit('update:currentPage', page as number)"
            class="h-9 min-w-[2.25rem] px-2.5 flex items-center justify-center rounded-xl text-[13px] font-black transition-all duration-200 active:scale-95"
            :class="currentPage === page
              ? 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] text-white border border-[#2563eb] dark:border-[#1d4ed8] shadow-[0_4px_0_#2563eb,0_8px_15px_rgba(59,130,246,0.2)] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb]'
              : 'border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1A1D24] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2A313A] hover:border-[#3b82f6]/30 dark:hover:border-[#5da6fc]/30 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] shadow-sm'"
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
        class="h-9 px-3 flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1A1D24] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] hover:border-[#3b82f6]/30 dark:hover:border-[#5da6fc]/30 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 shadow-sm"
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
  totalItems: number
  currentPage: number
  itemsPerPage: number
}>()

defineEmits(['update:currentPage'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.itemsPerPage)))

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


