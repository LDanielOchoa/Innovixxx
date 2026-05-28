<script setup lang="ts">
import DataTable from 'primevue/datatable'
import type { DataTableProps } from 'primevue/datatable'

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
  <div class="app-table-container w-full overflow-hidden">
    <DataTable 
      v-bind="$attrs"
      :value="value" 
      :loading="loading"
      responsiveLayout="scroll"
      class="modern-table"
      :pt="{
        root: { class: 'bg-transparent w-full' },
        table: { class: 'w-full border-collapse' },
        thead: { class: 'border-b border-slate-200/50 dark:border-white/5' },
        tbody: { class: 'divide-y divide-slate-100 dark:divide-white/5' },
        row: { class: 'group/row transition-colors duration-150 hover:bg-slate-50/50 dark:hover:bg-white/[0.03]' },
        headercell: ({ context }: any) => ({
          class: [
            'px-5 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 border-b border-slate-200/50 dark:border-white/5 select-none text-left bg-transparent uppercase tracking-[0.2em]',
            { 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-150': context.sortable }
          ]
        }),
        headercontent: { class: 'flex items-center gap-1.5' },
        sortIcon: { class: 'w-3 h-3 transition-colors' }, 
        bodycell: { class: 'px-5 py-4 text-[13px] text-slate-600 dark:text-slate-300 align-middle border-b border-slate-100 dark:border-white/5' }
      }"
    >
      <!-- Slot para las columnas -->
      <slot></slot>
      
      <template #empty>
        <div class="py-20 flex flex-col items-center justify-center text-center px-4">
          <div class="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-5 border border-slate-200 dark:border-white/10">
            <slot name="empty-icon">
              <svg class="w-7 h-7 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </slot>
          </div>
          <h3 class="text-base font-bold text-slate-700 dark:text-white tracking-tight mb-1.5">
            <slot name="empty-title">{{ emptyMessage }}</slot>
          </h3>
          <p class="text-[13px] text-slate-400 dark:text-slate-500 font-medium max-w-[280px]">
            <slot name="empty-subtitle">Intenta ajustar tus filtros de búsqueda</slot>
          </p>
        </div>
      </template>
      
      <template #loading>
        <div class="absolute inset-0 bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-sm flex items-center justify-center z-10">
          <div class="w-8 h-8 border-[3px] border-slate-200 dark:border-white/10 border-t-[#3b82f6] rounded-full animate-spin"></div>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style>
.modern-table .p-datatable-thead > tr > th {
  background: transparent !important;
  color: #94a3b8 !important;
}

.modern-table .p-datatable-thead {
  background: transparent !important;
}

.modern-table .p-datatable-tbody > tr {
  background: transparent !important;
}

.modern-table .p-datatable-tbody > tr > td {
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
}

.modern-table .p-datatable-thead > tr > th {
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
}

.modern-table .p-datatable-loading-overlay {
  background: rgba(255, 255, 255, 0.5) !important;
  backdrop-filter: blur(4px) !important;
}

.dark .modern-table .p-datatable-loading-overlay {
  background: rgba(19, 22, 28, 0.6) !important;
}
</style>
