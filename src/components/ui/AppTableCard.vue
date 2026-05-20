<script setup lang="ts">
// Simple wrapper for the table to maintain the Glassmorphic container style
</script>

<template>
  <div class="relative rounded-[24px] bg-white/60 dark:bg-[#12141A]/50 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-none border border-slate-200/60 dark:border-white/5 backdrop-blur-xl transition-all duration-300">
    <slot></slot>
  </div>
</template>
