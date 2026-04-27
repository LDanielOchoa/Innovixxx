<script setup lang="ts">
import Avatar from 'primevue/avatar'

interface Props {
  image?: string
  label?: string
  size?: 'normal' | 'large' | 'xlarge'
  shape?: 'circle' | 'square'
  glow?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 'normal',
  shape: 'circle',
  glow: true
})
</script>

<template>
  <div class="relative group/avatar inline-block">
    <!-- Efecto Glow de Fondo -->
    <div 
      v-if="glow"
      class="absolute inset-0 bg-[#3b82f6]/20 blur-md rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500"
    ></div>
    
    <!-- Componente Avatar con estilos premium -->
    <Avatar 
      :image="image"
      :label="label ? label.charAt(0).toUpperCase() : undefined" 
      :shape="shape" 
      class="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#2A313A] dark:to-[#1A1D24] text-slate-700 dark:text-white font-black border-2 border-white dark:border-[#1A1D24] shadow-md relative z-10 transition-transform duration-500 group-hover/avatar:scale-110" 
      :pt="{
        root: { 
          style: {
            width: size === 'xlarge' ? '6rem' : size === 'large' ? '4rem' : '2.75rem',
            height: size === 'xlarge' ? '6rem' : size === 'large' ? '4rem' : '2.75rem'
          }
        }
      }"
    />
  </div>
</template>

<style scoped>
:deep(.p-avatar-text) {
  @apply font-black tracking-tight;
}
</style>
