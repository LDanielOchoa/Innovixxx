<script setup lang="ts">
import { ref, watch } from 'vue'
import Avatar from 'primevue/avatar'

interface Props {
  image?: string
  label?: string
  size?: 'normal' | 'large' | 'xlarge'
  shape?: 'circle' | 'square'
  glow?: boolean
  hoverable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'normal',
  shape: 'circle',
  glow: false,
  hoverable: false
})

const hasImageError = ref(false)

watch(() => props.image, () => {
  hasImageError.value = false
})

const getInitials = (text?: string): string => {
  if (!text) return ''
  const trimmed = text.trim()
  if (!trimmed) return ''
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
</script>

<template>
  <div class="relative group/avatar inline-block shrink-0">
    <!-- Efecto Glow de Fondo -->
    <div 
      v-if="glow"
      class="absolute inset-0 bg-[#3b82f6]/20 blur-md rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500 pointer-events-none"
    ></div>
    
    <!-- Componente Avatar con estilos limpios y estables -->
    <Avatar 
      :image="!hasImageError && image ? image : undefined"
      :label="(!image || hasImageError) ? getInitials(label) : undefined" 
      :shape="shape" 
      class="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#2A313A] dark:to-[#1A1D24] text-slate-700 dark:text-white font-black border-2 border-white dark:border-[#1A1D24] shadow-sm relative z-10 transition-transform duration-300" 
      :class="{
        'group-hover/avatar:scale-110 cursor-pointer': hoverable
      }"
      :pt="{
        root: { 
          style: {
            width: size === 'xlarge' ? '6rem' : size === 'large' ? '4rem' : '2.75rem',
            height: size === 'xlarge' ? '6rem' : size === 'large' ? '4rem' : '2.75rem'
          }
        },
        image: {
          onError: () => { hasImageError = true }
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
