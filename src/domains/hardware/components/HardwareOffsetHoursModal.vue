<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Clock01Icon,
  Loading03Icon,
  Alert01Icon,
  InformationCircleIcon
} from '@hugeicons/core-free-icons'
import { setOffsetHoursHardwareApi } from '../services/hardware.api'
import type { Hardware } from '../types/hardware'
import { useGroupStore } from '../../../stores/group.store'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'
import { useToast } from 'primevue/usetoast'
import AppModal from '../../../components/ui/AppModal.vue'

const props = defineProps<{
  isOpen: boolean
  hardware: Hardware | null
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'updated'): void
}>()

const groupStore = useGroupStore()
const authStore = useAuthStore()
const toast = useToast()

const isLoading = ref(true)
const saving = ref(false)
const offsetValue = ref<string>('0')

const hasPermission = computed(() => {
  // Verificamos permisos para hardware (editar o comandos)
  return authStore.hasPermission(PERMISSIONS.HARDWARE_EDIT) || authStore.hasPermission(PERMISSIONS.HARDWARE_COMMANDS)
})

const isValidOffset = computed(() => {
  if (offsetValue.value === '' || offsetValue.value === '-') return false
  const num = Number(offsetValue.value)
  return !isNaN(num) && Number.isFinite(num)
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    saving.value = false
    offsetValue.value = '0'

    setTimeout(() => {
      isLoading.value = false
    }, 200)
  }
})

const handleOffsetInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let val = target.value

  // Permitir solo números y el signo negativo al inicio
  val = val.replace(/[^0-9-]/g, '')
  if (val.indexOf('-') > 0) {
    val = val.replace(/(?!^)-/g, '')
  }

  offsetValue.value = val
}

const adjustOffset = (amount: number) => {
  const current = Number(offsetValue.value) || 0
  offsetValue.value = String(current + amount)
}

const handleGuardarOffset = async () => {
  if (saving.value) return
  if (!props.hardware) return

  if (!isValidOffset.value) {
    toast.add({
      severity: 'warn',
      summary: 'Valor inválido',
      detail: 'Por favor ingresa un número válido para el offset.',
      life: 4000
    })
    return
  }

  saving.value = true

  try {
    const data = await setOffsetHoursHardwareApi({
      id_grupo: groupStore.selectedGroup?.id || '',
      id_hardware: props.hardware.id_hardware,
      offset: Number(offsetValue.value)
    })

    if (data.done) {
      toast.add({
        severity: 'success',
        summary: 'Offset actualizado',
        detail: data.message || `Se configuró el offset de ${offsetValue.value} horas para ${props.hardware.nombre}.`,
        life: 4000
      })
      emit('updated')
      handleClose()
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error al actualizar',
        detail: data.message || 'No se pudo guardar el offset de horas. Intente de nuevo.',
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error en setOffsetHoursHardwareApi:', error)
    toast.add({
      severity: 'error',
      summary: 'Error de servidor',
      detail: error?.message || 'Error de conexión con el servidor.',
      life: 4000
    })
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  if (saving.value) return
  emit('update:isOpen', false)
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    @confirm="handleGuardarOffset"
    title="Offset de Horas"
    confirm-text="Guardar Offset"
    size="md"
    :show-footer="!isLoading && hasPermission"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Clock01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <!-- Loading Overlay -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Guardando Offset...</span>
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
        <div class="h-14 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
        <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
      </div>

      <div v-if="!isLoading && !hasPermission" class="flex items-start gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <HugeiconsIcon :icon="Alert01Icon" :size="18" class="shrink-0 mt-0.5" />
        <div>
          <p class="font-bold">Sin permisos</p>
          <p class="text-[12px] font-medium opacity-80 mt-0.5">No tienes permisos para modificar la configuración de este hardware.</p>
        </div>
      </div>

      <Transition name="fade-slide" mode="out-in">
        <div v-if="!isLoading && hasPermission" class="animate-fade-in space-y-5">
          <!-- Dispositivo Info Card -->
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
              Dispositivo Seleccionado
            </label>
            <div class="bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:bg-[#0F1115] dark:border-white/5 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]">
              <div class="flex items-center gap-3 px-4 py-3.5">
                <div class="w-10 h-10 rounded-xl bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] shrink-0">
                  <HugeiconsIcon :icon="Clock01Icon" :size="20" :stroke-width="1.8" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[13.5px] font-bold text-slate-800 dark:text-white tracking-tight truncate">
                    {{ hardware?.nombre || 'Hardware' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Input de Offset -->
          <div class="space-y-2">
            <div class="flex items-center justify-between ml-1">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Valor de Offset (Horas)
              </label>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="adjustOffset(-1)"
                :disabled="saving"
                class="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-base font-bold select-none cursor-pointer shrink-0"
                title="Restar 1 hora"
              >
                -1
              </button>

              <div class="relative flex-1">
                <input
                  :value="offsetValue"
                  @input="handleOffsetInput"
                  type="text"
                  placeholder="Ej: -5, 0, 12"
                  :disabled="saving"
                  class="w-full text-center px-4 py-2.5 bg-white dark:bg-[#13161C]/80 border border-slate-200 dark:border-white/10 rounded-xl text-base font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all font-mono"
                />
              </div>

              <button
                type="button"
                @click="adjustOffset(1)"
                :disabled="saving"
                class="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-base font-bold select-none cursor-pointer shrink-0"
                title="Sumar 1 hora"
              >
                +1
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
