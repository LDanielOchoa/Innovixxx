<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'

interface Props {
  value: string
  prefix?: string
  maxLength?: number
  icon?: any
  iconSize?: number
  iconStrokeWidth?: number
}

withDefaults(defineProps<Props>(), {
  prefix: '#',
  maxLength: 8,
  iconSize: 14,
  iconStrokeWidth: 2.5
})
</script>

<template>
  <div class="flex items-center gap-2 py-1">
    <div class="w-7 h-7 rounded-lg bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-500/20">
      <HugeiconsIcon :icon="icon" :size="iconSize" :stroke-width="iconStrokeWidth" class="text-[#3b82f6]" />
    </div>
    <span class="text-[13px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">
      {{ prefix }}{{ value.slice(0, maxLength) }}
    </span>
  </div>
</template>
