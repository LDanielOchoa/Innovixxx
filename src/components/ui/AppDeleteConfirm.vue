<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'
import { Alert01Icon, Delete01Icon } from '@hugeicons/core-free-icons'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import { useI18n } from 'vue-i18n'

interface Props {
  isOpen: boolean
  title?: string
  itemName?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Eliminar Registro',
  itemName: '',
  loading: false
})

defineEmits(['update:isOpen', 'confirm'])
const { t } = useI18n()
</script>

<template>
  <AppModal 
    :isOpen="isOpen"
    @update:isOpen="$emit('update:isOpen', $event)"
    :title="title"
    size="md"
    :showFooter="true"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        <HugeiconsIcon :icon="Alert01Icon" :size="22" stroke-width="2.5" />
      </div>
    </template>

    <div class="flex flex-col items-center text-center py-4 space-y-4">
      <div class="w-20 h-20 rounded-[28px] bg-red-50 dark:bg-red-500/5 flex items-center justify-center border border-red-100 dark:border-red-500/10 shadow-inner group mb-2">
        <div class="w-14 h-14 rounded-2xl bg-white dark:bg-[#1A1D24] flex items-center justify-center shadow-lg border border-red-100 dark:border-red-500/20 group-hover:scale-110 transition-transform duration-500">
          <HugeiconsIcon :icon="Delete01Icon" :size="28" class="text-red-500 animate-pulse" />
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
          <slot name="question">{{ t('common.deleteQuestion', '¿Estás seguro?') }}</slot>
        </h4>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto">
          <slot name="message">
            <template v-if="itemName">
              {{ t('common.deleteConfirmItem', 'Se borrará permanentemente a') }} <span class="text-red-500 font-black">{{ itemName }}</span>.
            </template>
            <template v-else>
              {{ t('common.deleteConfirmGeneral', 'Esta acción eliminará el registro de forma permanente.') }}
            </template>
          </slot>
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col sm:flex-row w-full gap-3 justify-end mt-2">
        <AppButton 
          variant="secondary" 
          class="flex-1 sm:flex-none"
          @click="$emit('update:isOpen', false)"
        >
          {{ t('common.cancel', 'Cancelar') }}
        </AppButton>
        <AppButton 
          variant="danger" 
          class="flex-1 sm:flex-none"
          :icon="Delete01Icon"
          :loading="loading"
          @click="$emit('confirm')"
        >
          {{ t('common.delete', 'Eliminar') }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
