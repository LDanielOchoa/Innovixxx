<script setup lang="ts">
import { ref } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'

interface Props {
  title: string
  icon?: any
  loading?: boolean
}

defineProps<Props>()

const cardRef = ref<HTMLElement | null>(null)
const rotateX = ref(0)
const rotateY = ref(0)
const mouseX = ref(50)
const mouseY = ref(50)
const isPressed = ref(false)

const handleMouseMove = (e: MouseEvent) => {
  if (!cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  // Subtle tilt: max 5 degrees
  rotateX.value = -((y - centerY) / centerY) * 5
  rotateY.value = ((x - centerX) / centerX) * 5
  
  // Percentages for reflection
  mouseX.value = (x / rect.width) * 100
  mouseY.value = (y / rect.height) * 100
}

const handleMouseLeave = () => {
  rotateX.value = 0
  rotateY.value = 0
  isPressed.value = false
}

const handleMouseDown = () => {
  isPressed.value = true
}

const handleMouseUp = () => {
  isPressed.value = false
}
</script>

<template>
  <div 
    ref="cardRef"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    class="relative group/widget overflow-hidden rounded-[24px] bg-white/40 dark:bg-[#13161C]/40 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)] cursor-pointer"
    :style="{
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isPressed ? 0.98 : 1})`,
      transformStyle: 'preserve-3d',
      transition: isPressed ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out'
    }"
  >
    <div class="relative z-10">
      <!-- Header -->
      <div class="px-5 pt-4 pb-1 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div v-if="icon" class="w-7 h-7 rounded-lg bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20 group-hover/widget:scale-110 transition-transform duration-500">
             <HugeiconsIcon :icon="icon" :size="14" :stroke-width="2.5" />
          </div>
          <h3 class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">{{ title }}</h3>
        </div>
        
        <!-- Indicador de Actividad -->
        <div class="flex gap-1">
          <div class="w-1 h-1 rounded-full bg-[#3b82f6] animate-pulse"></div>
          <div class="w-1 h-1 rounded-full bg-[#3b82f6]/40 animate-pulse [animation-delay:0.2s]"></div>
        </div>
      </div>

      <!-- Content -->
      <div class="px-5 pb-5 pt-2">
        <div v-if="loading" class="animate-pulse space-y-4">
          <div class="h-12 bg-slate-100 dark:bg-white/5 rounded-2xl w-full"></div>
          <div class="grid grid-cols-2 gap-3">
            <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-2xl"></div>
            <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-2xl"></div>
          </div>
        </div>
        <div v-else class="animate-fade-in">
          <slot></slot>
        </div>
      </div>
    </div>

    <!-- Inner Border Glow -->
    <div class="absolute inset-0 pointer-events-none rounded-[24px] border border-white/10 dark:border-white/5 mix-blend-overlay"></div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
</style>

