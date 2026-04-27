<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  count?: number
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
    <div class="space-y-1">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none">
          {{ title }}
        </h1>
        <span v-if="count !== undefined" class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-[11px] font-black text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/5">
          {{ count }}
        </span>
      </div>
      <p v-if="subtitle" class="text-slate-400 dark:text-slate-500 font-medium text-[13px] md:text-[14px] tracking-wide uppercase">
        {{ subtitle }}
      </p>
    </div>

    <div class="flex items-center gap-3">
      <slot name="actions"></slot>
    </div>
  </div>
</template>


