<script setup lang="ts">
// Simple wrapper for the table to maintain the Glassmorphic container style
</script>

<template>
  <div class="bg-white/50 dark:bg-[#0F1115]/40 backdrop-blur-3xl rounded-3xl border border-slate-200/60 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-x-hidden transition-all duration-500">
    <slot></slot>
  </div>
</template>


