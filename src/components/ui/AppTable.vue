<script setup lang="ts">
import DataTable from 'primevue/datatable'
import type { DataTableProps } from 'primevue/datatable'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  ArrowUp01Icon,
  Sorting01Icon
} from '@hugeicons/core-free-icons'

interface Props extends /* @vue-ignore */ DataTableProps {
  value: any[]
  loading?: boolean
  emptyMessage?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  emptyMessage: 'No se encontraron registros'
})
</script>

<template>
  <div class="app-table-container">
    <DataTable 
      v-bind="$attrs"
      :value="value" 
      :loading="loading"
      responsiveLayout="scroll"
      class="modern-table"
      :pt="{
        root: { class: 'bg-transparent' },
        table: { class: 'w-full border-collapse' },
        thead: { class: 'bg-slate-50/30 dark:bg-transparent border-b border-slate-200/60 dark:border-white/5' },
        tbody: { class: 'divide-y divide-slate-100/50 dark:divide-white/5' },
        row: { class: 'group/row transition-all duration-300 hover:bg-[#3b82f6]/[0.02] dark:hover:bg-[#3b82f6]/[0.03]' },
        headercell: ({ context }: any) => ({
          class: [
            'px-6 py-4 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] border-none select-none text-left transition-all duration-300',
            { 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5': context.sortable }
          ]
        }),
        headercontent: { class: 'flex items-center gap-2' },
        sortIcon: { class: 'w-3 h-3 transition-colors' }, 
        bodycell: { class: 'px-6 py-4' }
      }"
    >
      <!-- Slot para las columnas -->
      <slot></slot>

      <!-- Custom Sort Icon Template -->
      <template #sorticon="{ sortOrder, sorted }">
        <div class="sort-icon-wrapper transition-all duration-300" :class="[
          sorted ? 'text-[#3b82f6] scale-110' : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover/header:opacity-100'
        ]">
          <HugeiconsIcon 
            :icon="sorted ? ArrowUp01Icon : Sorting01Icon" 
            :size="14"
            class="transition-transform duration-500 ease-in-out"
            :class="{ 'rotate-180': sortOrder === -1 }"
          />
        </div>
      </template>
      
      <template #empty>
        <div class="py-20 flex flex-col items-center justify-center text-center px-4">
          <div class="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-6 border border-slate-200 dark:border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)]">
            <slot name="empty-icon">
              <svg class="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </slot>
          </div>
          <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
            <slot name="empty-title">{{ emptyMessage }}</slot>
          </h3>
          <p class="text-sm text-slate-400 dark:text-slate-500 font-medium max-w-[300px]">
            <slot name="empty-subtitle">Intenta ajustar tus filtros de búsqueda</slot>
          </p>
        </div>
      </template>
      
      <template #loading>
        <div class="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
          <div class="w-10 h-10 border-4 border-[#3b82f6]/20 border-t-[#3b82f6] rounded-full animate-spin"></div>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.modern-table :deep(.p-datatable-thead > tr > th) {
  background: transparent !important;
}

.modern-table :deep(.p-datatable-tbody > tr) {
  background: transparent !important;
}

/* Garantiza espacio debajo de la última fila antes del paginador */
.modern-table :deep(.p-datatable-tbody > tr:last-child > td) {
  padding-bottom: 1.25rem !important;
}

.modern-table :deep(.p-datatable-loading-overlay) {
  background: rgba(255, 255, 255, 0.4) !important;
  backdrop-filter: blur(4px) !important;
}

:global(.dark) .modern-table :deep(.p-datatable-loading-overlay) {
  background: rgba(0, 0, 0, 0.4) !important;
}

/* Animación de entrada para el icono de orden activo */
.sort-icon-wrapper {
  animation: sort-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes sort-pop {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1.1); opacity: 1; }
}
</style>
