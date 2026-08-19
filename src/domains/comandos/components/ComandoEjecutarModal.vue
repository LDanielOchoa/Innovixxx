<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  PlayIcon,
  CpuIcon,
  Alert01Icon,
  Tick01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import type { Comando } from '../types/comando'
import type { HardwareSimple } from '../../servicios/types/servicio'
import { ejecutarComandoApi } from '../services/comandos.api'
import { fetchHardwareSimplesApi } from '../../servicios/services/servicios.api'
import AppModal from '../../../components/ui/AppModal.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import { useToast } from 'primevue/usetoast'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'

const props = defineProps<{
  isOpen: boolean
  comando: Comando | null
}>()

const emit = defineEmits(['update:isOpen', 'executed'])

const groupStore = useGroupStore()
const toast = useToast()

const ejecutando = ref(false)
const modalMessage = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null)
const hardwareList = ref<HardwareSimple[]>([])
const loadingHardware = ref(false)
const selectedHardware = ref('')

const cargarHardware = async () => {
  if (!groupStore.selectedGroup?.id) return
  loadingHardware.value = true
  try {
    hardwareList.value = await fetchHardwareSimplesApi(groupStore.selectedGroup.id, 0)
  } catch (error) {
    console.error('Error al cargar dispositivos:', error)
  } finally {
    loadingHardware.value = false
  }
}

// Opciones del select agrupadas por familia
const opcionesHardware = computed(() => {
  return hardwareList.value.map((hw) => ({
    value: hw.id_hardware,
    label: `${hw.nombre} — ${hw.familia || 'Sin familia'} (${hw.estado})`
  }))
})

// Info del hardware seleccionado
const hardwareSeleccionado = computed(() => {
  return hardwareList.value.find((hw) => hw.id_hardware === selectedHardware.value)
})

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      selectedHardware.value = ''
      modalMessage.value = null
      cargarHardware()
    }
  }
)

const mostrarMensaje = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const handleEjecutar = async () => {
  if (!groupStore.selectedGroup?.id) {
    mostrarMensaje('No hay un grupo seleccionado', 'error')
    return
  }
  if (!props.comando) {
    mostrarMensaje('No se ha seleccionado un comando', 'error')
    return
  }
  if (!selectedHardware.value) {
    mostrarMensaje('Debes seleccionar un dispositivo de hardware', 'warning')
    return
  }

  const idComando = props.comando.id_comando || props.comando.mask
  if (!idComando) {
    mostrarMensaje('El comando no tiene un identificador válido', 'error')
    return
  }

  ejecutando.value = true
  modalMessage.value = null

  try {
    const respuesta = await ejecutarComandoApi({
      id_grupo: groupStore.selectedGroup.id,
      id_comando: idComando,
      id_hardware: selectedHardware.value
    })

    if (respuesta.done) {
      toast.add({
        severity: 'success',
        summary: 'Comando ejecutado',
        detail: respuesta.message || 'El comando se ha enviado correctamente',
        life: 3000
      })
      emit('executed')
      emit('update:isOpen', false)
    } else {
      mostrarMensaje(respuesta.message || 'No fue posible ejecutar el comando', 'error')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      mostrarMensaje(getErrorMessage(error.code), 'error')
    } else {
      mostrarMensaje('Error de conexión al ejecutar el comando', 'error')
    }
  } finally {
    ejecutando.value = false
  }
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="$emit('update:isOpen', $event)"
    @close="$emit('update:isOpen', false)"
    :close-on-click-outside="!ejecutando"
    title="Ejecutar Comando"
    size="lg"
    :show-footer="false"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-100/50 dark:border-emerald-500/20">
        <HugeiconsIcon :icon="PlayIcon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <!-- OVERLAY DE CARGA AL EJECUTAR -->
      <Transition name="fade">
        <div v-if="ejecutando" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-emerald-500 animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">
              Enviando Comando...
            </span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <div class="space-y-6 animate-fade-in">
        <!-- Mensaje de Feedback -->
        <Transition name="fade">
          <div 
            v-if="modalMessage"
            class="flex items-center gap-3 p-3.5 rounded-xl border text-xs font-semibold shadow-sm transition-all"
            :class="{
              'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400': modalMessage.type === 'success',
              'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400': modalMessage.type === 'error',
              'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400': modalMessage.type === 'warning'
            }"
          >
            <HugeiconsIcon 
              :icon="modalMessage.type === 'error' ? Alert01Icon : modalMessage.type === 'warning' ? Alert01Icon : Tick01Icon" 
              :size="18" 
              class="shrink-0"
            />
            <span class="flex-1">{{ modalMessage.text }}</span>
          </div>
        </Transition>

        <!-- Info del comando a ejecutar -->
        <div v-if="comando" class="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
          <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Comando a ejecutar</div>
          <div class="text-[14px] font-bold text-slate-800 dark:text-white">{{ comando.nombre || 'Sin nombre' }}</div>
          <div class="mt-1 font-mono text-[12px] text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-black/20 px-2 py-1 rounded-lg inline-block">
            {{ comando.texto || 'Sin texto' }}
          </div>
        </div>

        <!-- Selección de Hardware -->
        <div class="space-y-2">
          <AppSelect
            v-model="selectedHardware"
            label="Dispositivo de Hardware"
            placeholder="Selecciona el dispositivo..."
            :options="opcionesHardware"
            :icon="CpuIcon"
            :disabled="loadingHardware || ejecutando"
          />

          <!-- Spinner de carga de hardware -->
          <div v-if="loadingHardware" class="flex items-center gap-2 text-xs text-slate-400">
            <HugeiconsIcon :icon="Loading03Icon" :size="14" class="animate-spin" />
            <span>Cargando dispositivos...</span>
          </div>

          <!-- Info del hardware seleccionado -->
          <Transition name="fade">
            <div 
              v-if="hardwareSeleccionado" 
              class="mt-2 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/15"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <HugeiconsIcon :icon="CpuIcon" :size="16" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[13px] font-bold text-slate-800 dark:text-white truncate">
                    {{ hardwareSeleccionado.nombre }}
                  </div>
                  <div class="text-[11px] text-slate-500 dark:text-slate-400">
                    Familia: <span class="font-semibold">{{ hardwareSeleccionado.familia || 'N/A' }}</span> · 
                    Estado: <span class="font-semibold" :class="hardwareSeleccionado.estado === 'DISPONIBLE' ? 'text-emerald-500' : 'text-amber-500'">{{ hardwareSeleccionado.estado }}</span>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Botones de Acción -->
        <div class="flex flex-col sm:flex-row w-full gap-3 justify-end pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
          <button
            type="button"
            :disabled="ejecutando"
            @click="$emit('update:isOpen', false)"
            class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-6 py-3 bg-white dark:bg-[#1A1D24] text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] focus:outline-none transition-all duration-300 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            :disabled="ejecutando || !selectedHardware"
            @click="handleEjecutar"
            class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600 hover:from-emerald-500 hover:to-emerald-600 dark:hover:from-emerald-400 dark:hover:to-emerald-500 px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#059669,0_8px_20px_rgba(16,185,129,0.4)] dark:shadow-[0_4px_0_#047857,0_8px_20px_rgba(16,185,129,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#059669,0_4px_10px_rgba(16,185,129,0.4)] dark:active:shadow-[0_0px_0_#047857,0_4px_10px_rgba(16,185,129,0.2)] focus:outline-none transition-all duration-200 border border-emerald-600 dark:border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer"
          >
            <HugeiconsIcon v-if="ejecutando" :icon="Loading03Icon" :size="16" class="animate-spin" />
            <HugeiconsIcon v-else :icon="PlayIcon" :size="16" />
            <span>{{ ejecutando ? 'Ejecutando...' : 'Ejecutar Comando' }}</span>
          </button>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
