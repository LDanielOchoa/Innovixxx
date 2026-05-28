<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'

interface Props {
  title: string
  subtitle?: string
  count?: number
  icon?: any
  iconSize?: number
  iconStrokeWidth?: number
}

withDefaults(defineProps<Props>(), {
  iconSize: 24,
  iconStrokeWidth: 2
})
</script>

<template>
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
    <!-- Left: Icon + Title + Subtitle -->
    <div class="flex items-center gap-5">
      <div 
        v-if="icon"
        class="w-14 h-14 rounded-2xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20 shrink-0 shadow-sm"
      >
        <HugeiconsIcon :icon="icon" :size="iconSize" :stroke-width="iconStrokeWidth" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-white tracking-tight leading-none">
          {{ title }}
        </h1>
        <p 
          v-if="subtitle || count !== undefined" 
          class="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-1.5"
        >
          <template v-if="count !== undefined">{{ count }} registros</template>
          <template v-else>{{ subtitle }}</template>
        </p>
      </div>
    </div>

    <!-- Right: Actions Slot -->
    <div class="flex items-center gap-3">
      <slot name="actions"></slot>
    </div>
  </div>
</template>
