<template>
  <div class="flex-1 flex flex-col gap-6 p-5 lg:p-8 overflow-y-auto custom-scrollbar bg-slate-50/80 dark:bg-transparent">
    <div class="max-w-7xl mx-auto w-full flex flex-col gap-6">

      <!-- Encabezado de sección -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight drop-shadow-sm">
            {{ title }}
          </h1>
          <p class="text-slate-500 dark:text-slate-400 text-[13px] font-medium mt-1">{{ subtitle }}</p>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <slot name="actions"></slot>
        </div>
      </div>

      <!-- Barra de búsqueda (si aplica) -->
      <div v-if="$slots.search" class="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <slot name="search"></slot>
      </div>

      <!-- Tarjeta principal: Contenido -->
      <div class="bg-white/40 dark:bg-[#1A1D24]/30 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col">

        <!-- Tabla / Contenido Principal -->
        <div class="block overflow-x-auto">
          <slot></slot>
        </div>

        <!-- Paginación -->
        <div v-if="$slots.pagination" class="border-t border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#0F1115]/30 flex w-full">
          <slot name="pagination"></slot>
        </div>
      </div>
    </div>
    
    <!-- Modales -->
    <slot name="modals"></slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
}>()
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #2A313A; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3A4450; }
</style>


