<template>
  <div class="px-5 py-4 flex items-center justify-between w-full gap-4 flex-wrap min-h-[64px]">
    <!-- Left: Showing results -->
    <div class="text-[12px] font-medium text-slate-500 dark:text-slate-400">
      Mostrando 
      <span class="font-bold text-slate-700 dark:text-slate-200">{{ Math.min(totalRecords, (currentPage - 1) * rowsPerPage + 1) }}</span>
      -
      <span class="font-bold text-slate-700 dark:text-slate-200">{{ Math.min(totalRecords, currentPage * rowsPerPage) }}</span>
      de 
      <span class="font-bold text-slate-700 dark:text-slate-200">{{ totalRecords }}</span>
      resultados
    </div>

    <!-- Right: Controls -->
    <div class="flex items-center gap-4">
      <!-- Rows Per Page Custom Dropdown -->
      <div class="relative">
        <button 
          @click="isDropdownOpen = !isDropdownOpen"
          class="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1115]/50 border border-slate-200/50 dark:border-white/5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-[#3b82f6]/50 transition-all cursor-pointer min-w-[60px] justify-between"
        >
          <span>{{ rowsPerPage }}</span>
          <svg 
            class="w-3 h-3 text-slate-400 transition-transform duration-200" 
            :class="{ 'rotate-180': isDropdownOpen }"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown Menu -->
        <Transition name="dropdown-fade">
          <div 
            v-if="isDropdownOpen"
            class="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/[0.08] rounded-xl shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] overflow-hidden z-50"
          >
            <button
              v-for="option in [rowsPerPage, rowsPerPage * 2, rowsPerPage * 4]"
              :key="option"
              @click="selectOption(option)"
              class="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#3b82f6]/10 dark:hover:bg-[#3b82f6]/10 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors duration-150"
              :class="{ 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]': rowsPerPage === option }"
            >
              {{ option }}
            </button>
          </div>
        </Transition>
      </div>

      <!-- Previous & Next -->
      <div class="flex items-center gap-1">
        <button
          @click="$emit('update:currentPage', currentPage - 1)"
          :disabled="currentPage <= 1"
          class="h-8 px-3 flex items-center gap-1.5 rounded-lg text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-slate-200 dark:hover:border-white/10"
        >
          <HugeiconsIcon :icon="ArrowLeft01Icon" :size="14" />
          <span>Previous</span>
        </button>

        <button
          @click="$emit('update:currentPage', currentPage + 1)"
          :disabled="currentPage >= totalPages"
          class="h-8 px-3 flex items-center gap-1.5 rounded-lg text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-slate-200 dark:hover:border-white/10"
        >
          <span>Next</span>
          <HugeiconsIcon :icon="ArrowRight01Icon" :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

const props = defineProps<{
  totalRecords: number
  currentPage: number
  rowsPerPage: number
}>()

const emit = defineEmits(['update:currentPage', 'update:rowsPerPage'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalRecords / props.rowsPerPage)))

const isDropdownOpen = ref(false)

const selectOption = (value: number) => {
  emit('update:rowsPerPage', value)
  isDropdownOpen.value = false
}

const closeDropdown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.dropdown-fade-enter-to,
.dropdown-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
