<script setup lang="ts">
// Simple wrapper for the table to maintain the Glassmorphic container style
</script>

<template>
  <div class="bg-white/40 dark:bg-[#1A1D24]/30 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] overflow-hidden">
    <slot></slot>
  </div>
</template>


