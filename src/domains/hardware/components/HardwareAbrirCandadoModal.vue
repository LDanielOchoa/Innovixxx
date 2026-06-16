<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  LockKeyIcon,
  Loading03Icon,
  Alert01Icon,
  Tick02Icon,
  SmartPhone01Icon
} from '@hugeicons/core-free-icons'
import { abrirCandadoHardwareApi } from '../services/hardware.api'
import type { Hardware } from '../types/hardware'
import { useGroupStore } from '../../../stores/group.store'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'
import { useToast } from 'primevue/usetoast'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'

const props = defineProps<{
  isOpen: boolean
  hardware: Hardware | null
}>()

const emit = defineEmits(['update:isOpen', 'updated'])

const groupStore = useGroupStore()
const authStore = useAuthStore()
const toast = useToast()

const isLoading = ref(true)
const saving = ref(false)
const clave = ref('')

const hasPermission = computed(() => authStore.hasPermission(PERMISSIONS.HARDWARE_COMMANDS))

const isValidClave = computed(() => /^\d{6}$/.test(clave.value))

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    saving.value = false
    clave.value = ''

    setTimeout(() => {
      isLoading.value = false
    }, 250)
  }
})

const handleClaveInput = (value: string | number) => {
  clave.value = String(value ?? '').replace(/\D/g, '').slice(0, 6)
}

const handleAbrirCandado = async () => {
  if (saving.value) return
  if (!props.hardware) return

  if (!isValidClave.value) {
    toast.add({
      severity: 'warn',
      summary: 'Clave inválida',
      detail: 'La clave debe tener exactamente 6 dígitos numéricos.',
      life: 4000
    })
    return
  }

  saving.value = true

  try {
    const data = await abrirCandadoHardwareApi({
      id_grupo: groupStore.selectedGroup?.id || '',
      id_hardware: props.hardware.id_hardware,
      clave_hardware: clave.value,
      modo: 'sms'
    })

    if (data.done) {
      toast.add({
        severity: 'success',
        summary: 'Candado abierto',
        detail: data.message || `Se ha enviado la orden de apertura al dispositivo ${props.hardware.nombre}.`,
        life: 4000
      })
      emit('updated')
      handleClose()
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error al abrir candado',
        detail: data.message || 'No se pudo abrir el candado. Intente nuevamente.',
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error en abrirCandadoHardwareApi:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
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
    @confirm="handleAbrirCandado"
    title="Abrir Candado"
    confirm-text="Enviar Apertura"
    size="md"
    :show-footer="!isLoading && hasPermission"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="LockKeyIcon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Enviando Apertura...</span>
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
        <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
        <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
      </div>

      <div v-if="!isLoading && !hasPermission" class="flex items-start gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <HugeiconsIcon :icon="Alert01Icon" :size="18" class="shrink-0 mt-0.5" />
        <div>
          <p class="font-bold">Sin permisos</p>
          <p class="text-[12px] font-medium opacity-80 mt-0.5">No tienes permisos para enviar comandos al hardware.</p>
        </div>
      </div>

      <Transition name="fade-slide" mode="out-in">
        <div v-if="!isLoading && hasPermission" class="animate-fade-in space-y-5">
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
              Dispositivo
            </label>
            <div class="bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:bg-[#0F1115] dark:border-white/5 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]">
              <div class="flex items-center gap-3 px-4 py-3.5">
                <div class="w-9 h-9 rounded-lg bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] shrink-0">
                  <HugeiconsIcon :icon="LockKeyIcon" :size="18" :stroke-width="1.8" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[13px] font-bold text-slate-800 dark:text-white tracking-tight truncate">
                    {{ hardware?.nombre || 'Hardware' }}
                  </p>
                  <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                    {{ hardware?.serial || '---' }}
                  </p>
                </div>
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap shrink-0"
                  :class="{
                    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20': hardware?.estado === 'DISPONIBLE',
                    'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20': hardware?.estado === 'OCUPADO EN SERVICIO' || hardware?.estado === 'EN SERVICIO',
                    'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20': hardware?.estado === 'NO DISPONIBLE',
                    'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/20': !hardware?.estado
                  }"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="{
                      'bg-emerald-500': hardware?.estado === 'DISPONIBLE',
                      'bg-blue-500': hardware?.estado === 'OCUPADO EN SERVICIO' || hardware?.estado === 'EN SERVICIO',
                      'bg-red-500': hardware?.estado === 'NO DISPONIBLE',
                      'bg-slate-400': !hardware?.estado
                    }"
                  ></span>
                  {{ hardware?.estado || '---' }}
                </span>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
              Modo de Apertura
            </label>
            <div class="grid grid-cols-1 gap-2">
              <div class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 bg-[#3b82f6]/10 border-[#3b82f6]/40 text-[#3b82f6] dark:bg-[#3b82f6]/15 dark:border-[#5da6fc]/40 dark:text-[#5da6fc]">
                <HugeiconsIcon :icon="SmartPhone01Icon" :size="18" :stroke-width="1.8" />
                <div class="flex-1">
                  <p class="text-[12px] font-bold uppercase tracking-wider">SMS</p>
                </div>
                <HugeiconsIcon :icon="Tick02Icon" :size="16" />
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <AppInput
              :model-value="clave"
              @update:model-value="handleClaveInput"
              type="password"
              label="Clave del Hardware"
              placeholder="6 dígitos numéricos"
              :icon="LockKeyIcon"
              :disabled="saving"
            />
            <p class="text-[10.5px] text-slate-400 dark:text-slate-500 ml-1">
              {{ clave.length }}/6 dígitos. Solo se admiten números.
            </p>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>
</template>

<style scoped>
.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.5s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(1.03);
  backdrop-filter: blur(0px);
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: scale(1);
  backdrop-filter: blur(12px);
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
