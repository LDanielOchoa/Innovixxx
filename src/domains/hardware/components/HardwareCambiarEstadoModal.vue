<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ChipIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  Loading03Icon,
  Alert01Icon,
  RefreshIcon
} from '@hugeicons/core-free-icons'
import { changeStateHardwareApi } from '../services/hardware.api'
import type { Hardware } from '../types/hardware'
import { useGroupStore } from '../../../stores/group.store'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import AppModal from '../../../components/ui/AppModal.vue'

const props = defineProps<{
  isOpen: boolean
  hardware: Hardware | null
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'updated'): void
}>()

const { t } = useI18n()
const groupStore = useGroupStore()
const authStore = useAuthStore()
const toast = useToast()

const isLoading = ref(true)
const guardando = ref(false)
// 1 = Habilitado, 0 = Deshabilitado
const estadoSeleccionado = ref<number>(1)

const tienePermiso = computed(() => {
  return authStore.hasPermission(PERMISSIONS.HARDWARE_EDIT)
})

watch(() => props.isOpen, (abierto) => {
  if (abierto) {
    isLoading.value = true
    guardando.value = false

    // Si el hardware ya tiene habilitado definido o deducido
    if (props.hardware?.habilitado !== undefined && props.hardware?.habilitado !== null) {
      estadoSeleccionado.value = Number(props.hardware.habilitado) === 0 ? 0 : 1
    } else {
      // Por defecto sugerimos habilitar o el estado actual
      estadoSeleccionado.value = 1
    }

    setTimeout(() => {
      isLoading.value = false
    }, 150)
  }
})

const handleCambiarEstado = async () => {
  if (guardando.value) return
  if (!props.hardware) return

  guardando.value = true

  try {
    const data = await changeStateHardwareApi({
      id_grupo: groupStore.selectedGroup?.id || '',
      id_hardware: props.hardware.id_hardware,
      habilitado: estadoSeleccionado.value
    })

    if (data.done) {
      toast.add({
        severity: 'success',
        summary: t('hardware.stateUpdatedTitle'),
        detail: data.message || (estadoSeleccionado.value === 1 ? t('hardware.deviceEnabledSuccess') : t('hardware.deviceDisabledSuccess')),
        life: 4000
      })
      emit('updated')
      handleClose()
    } else {
      toast.add({
        severity: 'error',
        summary: t('hardware.stateUpdateErrorTitle'),
        detail: data.message || t('hardware.stateUpdateErrorDetail'),
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error en changeStateHardwareApi:', error)
    toast.add({
      severity: 'error',
      summary: t('hardware.serverError'),
      detail: error?.message || t('hardware.serverConnectionError'),
      life: 4000
    })
  } finally {
    guardando.value = false
  }
}

const handleClose = () => {
  if (guardando.value) return
  emit('update:isOpen', false)
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    @confirm="handleCambiarEstado"
    :title="t('hardware.changeStateModalTitle')"
    :confirm-text="t('hardware.btnConfirmChange')"
    size="md"
    :show-footer="!isLoading && tienePermiso"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="RefreshIcon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <!-- Overlay de Carga -->
      <Transition name="fade">
        <div v-if="guardando" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">{{ t('hardware.updatingState') }}</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <div v-if="isLoading" class="space-y-5 animate-pulse p-2">
        <div class="h-16 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
        <div class="h-24 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
      </div>

      <div v-if="!isLoading && !tienePermiso" class="flex items-start gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <HugeiconsIcon :icon="Alert01Icon" :size="18" class="shrink-0 mt-0.5" />
        <div>
          <p class="font-bold">{{ t('hardware.noPermission') }}</p>
          <p class="text-[12px] font-medium opacity-80 mt-0.5">{{ t('hardware.noPermissionStateDetail') }}</p>
        </div>
      </div>

      <Transition name="fade-slide" mode="out-in">
        <div v-if="!isLoading && tienePermiso" class="animate-fade-in space-y-5">
          <!-- Dispositivo Seleccionado -->
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
              {{ t('hardware.selectedDevice') }}
            </label>
            <div class="bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:bg-[#0F1115] dark:border-white/5 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]">
              <div class="flex items-center gap-3 px-4 py-3.5">
                <div class="w-10 h-10 rounded-xl bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] shrink-0">
                  <HugeiconsIcon :icon="ChipIcon" :size="20" :stroke-width="1.8" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[13.5px] font-bold text-slate-800 dark:text-white tracking-tight truncate">
                    {{ hardware?.nombre || 'Hardware' }}
                  </p>
                  <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                    {{ t('hardware.labelSerial') }}: {{ hardware?.serial || hardware?.id_hardware || '---' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Selección del Nuevo Estado -->
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
              {{ t('hardware.selectNewState') }}
            </label>
            <div class="grid grid-cols-2 gap-3">
              <!-- Opción Habilitar (1) -->
              <button
                type="button"
                @click="estadoSeleccionado = 1"
                :disabled="guardando"
                class="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border transition-all duration-200 text-center cursor-pointer select-none"
                :class="[
                  estadoSeleccionado === 1
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#0F1115] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10'
                ]"
              >
                <div 
                  class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                  :class="estadoSeleccionado === 1 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-200/50 dark:bg-white/5 text-slate-400'"
                >
                  <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="22" :stroke-width="2" />
                </div>
                <div>
                  <span class="text-[12.5px] font-bold tracking-tight block">{{ t('hardware.stateEnable') }}</span>
                  <span class="text-[10.5px] opacity-75 block mt-0.5">{{ t('hardware.stateEnableHint') }}</span>
                </div>
              </button>

              <!-- Opción Deshabilitar (0) -->
              <button
                type="button"
                @click="estadoSeleccionado = 0"
                :disabled="guardando"
                class="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border transition-all duration-200 text-center cursor-pointer select-none"
                :class="[
                  estadoSeleccionado === 0
                    ? 'bg-rose-500/10 border-rose-500/50 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#0F1115] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10'
                ]"
              >
                <div 
                  class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                  :class="estadoSeleccionado === 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-200/50 dark:bg-white/5 text-slate-400'"
                >
                  <HugeiconsIcon :icon="CancelCircleIcon" :size="22" :stroke-width="2" />
                </div>
                <div>
                  <span class="text-[12.5px] font-bold tracking-tight block">{{ t('hardware.stateDisable') }}</span>
                  <span class="text-[10.5px] opacity-75 block mt-0.5">{{ t('hardware.stateDisableHint') }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>
</template>

<style scoped>
.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.4s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
  backdrop-filter: blur(0px);
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: scale(1);
  backdrop-filter: blur(8px);
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
