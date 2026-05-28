<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="flex items-center justify-center min-h-screen p-4 sm:p-0">
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md transition-opacity" aria-hidden="true" @click="closeOnClickOutside ? close() : null"></div>
          
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <Transition name="modal-content" appear>
            <div
              v-if="isOpen"
              class="inline-block align-bottom bg-slate-50/95 dark:bg-[#1A1D24]/95 backdrop-blur-2xl rounded-2xl text-left overflow-visible shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] transform transition-all sm:my-8 sm:align-middle w-full border border-slate-200/80 dark:border-white/10 relative z-[101]"
              :style="{ maxWidth: modalMaxWidth }"
            >
              <!-- Top Bar Glow (sutil) -->
              <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5da6fc]/50 to-transparent rounded-t-2xl z-20"></div>
              
              <!-- Header -->
              <div class="bg-transparent px-4 sm:px-6 py-5 border-b border-slate-200/60 dark:border-white/5 flex justify-between items-center rounded-t-2xl relative z-10">
                <h3 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight" id="modal-title">
                  <slot name="icon"></slot>
                  {{ title }}
                </h3>
                <button @click="close" class="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-xl transition-all duration-200 active:scale-95 relative z-30">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <!-- Body -->
              <div class="px-4 sm:px-6 pt-5 pb-6 relative z-10">
                <slot></slot>
              </div>

              <!-- Footer -->
              <div v-if="showFooter" class="bg-slate-100/50 dark:bg-[#0F1115]/50 px-4 sm:px-6 py-4 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row gap-3 rounded-b-2xl relative z-10">
                <slot name="footer">
                  <div class="flex flex-col sm:flex-row w-full gap-3 justify-end">
                    <button type="button" @click="close" class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-6 py-3 bg-white dark:bg-[#1A1D24] text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] focus:outline-none transition-all duration-300 shadow-sm active:scale-[0.98]">
                      {{ cancelText || $t('common.cancel', 'Cancelar') }}
                    </button>
                    <button type="button" @click="$emit('confirm')" :class="['flex-1 sm:flex-none', confirmButtonClass]">
                      {{ confirmText || $t('common.save', 'Guardar') }}
                    </button>
                  </div>
                </slot>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  isOpen: boolean
  title: string
  confirmText?: string
  cancelText?: string
  confirmButtonClass?: string
  closeOnClickOutside?: boolean
  showFooter?: boolean
  size?: 'md' | 'lg' | 'xl'
}>(), {
  confirmButtonClass: 'inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)] focus:outline-none transition-all duration-200 border border-[#2563eb] dark:border-[#1d4ed8]',
  closeOnClickOutside: true,
  showFooter: true,
  size: 'md'
})

const modalMaxWidth = computed(() => {
  if (props.size === 'xl') return '52rem'
  if (props.size === 'lg') return '38rem'
  return '32rem'
})

const emit = defineEmits(['update:isOpen', 'confirm', 'close'])

const close = () => {
  emit('update:isOpen', false)
  emit('close')
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.4s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.modal-content-enter-active { 
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); 
}
.modal-content-leave-active { 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
}
.modal-content-enter-from { 
  opacity: 0; 
  transform: scale(0.9) translateY(40px); 
}
.modal-content-leave-to { 
  opacity: 0; 
  transform: scale(0.95) translateY(20px); 
}
</style>


