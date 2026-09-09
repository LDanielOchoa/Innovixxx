<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  PlayIcon,
  CpuIcon,
  Alert01Icon,
  Tick01Icon,
  Loading03Icon,
  BatteryFullIcon,
  BatteryMedium01Icon,
  BatteryLowIcon,
  BatteryEmptyIcon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import type { Comando } from '../types/comando'
import type { Hardware, FamiliaHardware } from '../../hardware/types/hardware'
import { ejecutarComandoApi } from '../services/comandos.api'
import { fetchHardwareApi, fetchFamiliasApi } from '../../hardware/services/hardware.api'
import AppModal from '../../../components/ui/AppModal.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import { useToast } from 'primevue/usetoast'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'

const { t } = useI18n()

const props = defineProps<{
  isOpen: boolean
  comando: Comando | null
}>()

const emit = defineEmits(['update:isOpen', 'executed'])

const groupStore = useGroupStore()
const toast = useToast()

const ejecutando = ref(false)
const modalMessage = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null)
const hardwareList = ref<Hardware[]>([])
const familias = ref<FamiliaHardware[]>([])
const loadingHardware = ref(false)
const selectedHardware = ref('')

const cargarHardware = async () => {
  if (!groupStore.selectedGroup?.id) return
  loadingHardware.value = true
  try {
    const [hwData, famData] = await Promise.all([
      fetchHardwareApi(groupStore.selectedGroup.id),
      fetchFamiliasApi()
    ])
    hardwareList.value = hwData
    familias.value = famData
  } catch (error) {
    console.error('Error al cargar dispositivos:', error)
  } finally {
    loadingHardware.value = false
  }
}

// Helpers para formato e icono de batería
const getBatteryIcon = (bateria: number | string | undefined | null) => {
  if (bateria === undefined || bateria === null || bateria === '') return BatteryEmptyIcon
  const nivel = Number(bateria)
  if (nivel >= 75) return BatteryFullIcon
  if (nivel >= 40) return BatteryMedium01Icon
  if (nivel >= 15) return BatteryLowIcon
  return BatteryEmptyIcon
}

const getBatteryClass = (bateria: number | string | undefined | null) => {
  if (bateria === undefined || bateria === null || bateria === '') {
    return 'text-slate-400 dark:text-slate-500'
  }
  const nivel = Number(bateria)
  if (nivel >= 50) return 'text-emerald-500 dark:text-emerald-400'
  if (nivel >= 20) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

// Nombre de la familia a la que pertenece el comando seleccionado
const nombreFamiliaComando = computed(() => {
  if (!props.comando?.id_familia) return ''
  const idTarget = Number(props.comando.id_familia)
  const encontrada = familias.value.find((f) => Number(f.id_familia) === idTarget)
  return encontrada ? encontrada.nombre : `${t('comandos.familyPrefix')} ${props.comando.id_familia}`
})

// Filtrar dispositivos de hardware exclusivos de la familia del comando
const hardwaresFiltrados = computed(() => {
  if (!props.comando?.id_familia) return hardwareList.value

  const idTarget = Number(props.comando.id_familia)
  const nombreTarget = nombreFamiliaComando.value.toLowerCase().trim()

  return hardwareList.value.filter((hw) => {
    // Comparación por ID de familia
    if (hw.id_familia !== undefined && Number(hw.id_familia) === idTarget) {
      return true
    }
    // Comparación por nombre de familia
    if (hw.familia && nombreTarget && hw.familia.toLowerCase().trim() === nombreTarget) {
      return true
    }
    return false
  })
})

// Opciones del select según los hardwares filtrados
const opcionesHardware = computed(() => {
  return hardwaresFiltrados.value.map((hw) => {
    const textoBateria = hw.bateria !== undefined && hw.bateria !== null && hw.bateria !== '' ? ` (${hw.bateria}%)` : ''
    return {
      value: hw.id_hardware,
      label: `${hw.nombre} — ${hw.familia || nombreFamiliaComando.value || t('comandos.noFamily')}${textoBateria}${hw.estado ? ` [${hw.estado}]` : ''}`
    }
  })
})

// Info del hardware seleccionado
const hardwareSeleccionado = computed(() => {
  return hardwaresFiltrados.value.find((hw) => hw.id_hardware === selectedHardware.value)
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
    mostrarMensaje(t('comandos.noGroupSelected'), 'error')
    return
  }
  if (!props.comando) {
    mostrarMensaje(t('comandos.noCommandSelected'), 'error')
    return
  }
  if (!selectedHardware.value) {
    mostrarMensaje(t('comandos.noHardwareSelected'), 'warning')
    return
  }

  const idComando = props.comando.id_comando || props.comando.mask
  if (!idComando) {
    mostrarMensaje(t('comandos.invalidCommandId'), 'error')
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
        summary: t('comandos.alertSuccessExecuteTitle'),
        detail: respuesta.message || t('comandos.alertSuccessExecuteDetail'),
        life: 3000
      })
      emit('executed')
      emit('update:isOpen', false)
    } else {
      mostrarMensaje(respuesta.message || t('comandos.alertErrorExecute'), 'error')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      mostrarMensaje(getErrorMessage(error.code), 'error')
    } else {
      mostrarMensaje(t('comandos.alertNetErrorExecute'), 'error')
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
    :title="t('comandos.executeModalTitle')"
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
              {{ t('comandos.sendingCommand') }}
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
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{{ t('comandos.commandToExecute') }}</span>
            <span v-if="nombreFamiliaComando" class="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20">
              {{ t('comandos.familyLabel', { name: nombreFamiliaComando }) }}
            </span>
          </div>
          <div class="text-[14px] font-bold text-slate-800 dark:text-white">{{ comando.nombre || t('comandos.noName') }}</div>
          <div class="mt-1 font-mono text-[12px] text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-black/20 px-2 py-1 rounded-lg inline-block">
            {{ comando.texto || t('comandos.noCommandText') }}
          </div>
        </div>

        <!-- Selección de Hardware -->
        <div class="space-y-2">
          <AppSelect
            v-model="selectedHardware"
            :label="t('comandos.labelHardware')"
            :placeholder="hardwaresFiltrados.length === 0 && !loadingHardware ? t('comandos.noDevicesForFamily') : t('comandos.placeholderHardware')"
            :options="opcionesHardware"
            :icon="CpuIcon"
            :disabled="loadingHardware || ejecutando || hardwaresFiltrados.length === 0"
          />

          <!-- Spinner de carga de hardware -->
          <div v-if="loadingHardware" class="flex items-center gap-2 text-xs text-slate-400">
            <HugeiconsIcon :icon="Loading03Icon" :size="14" class="animate-spin" />
            <span>{{ t('comandos.loadingDevices') }}</span>
          </div>

          <!-- Mensaje cuando no hay dispositivos de la familia del comando -->
          <div v-else-if="hardwaresFiltrados.length === 0" class="flex items-center gap-2 text-xs text-amber-500/90 font-medium px-1 pt-1">
            <HugeiconsIcon :icon="Alert01Icon" :size="14" class="shrink-0" />
            <span>{{ t('comandos.noDevicesFoundWarning', { name: nombreFamiliaComando || t('comandos.noFamily') }) }}</span>
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
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{{ t('comandos.familyPrefix') }}: <strong class="font-semibold text-slate-700 dark:text-slate-300">{{ hardwareSeleccionado.familia || 'N/A' }}</strong></span>
                    <template v-if="hardwareSeleccionado.bateria !== undefined && hardwareSeleccionado.bateria !== null && hardwareSeleccionado.bateria !== ''">
                      <span>·</span>
                      <span class="inline-flex items-center gap-1 font-semibold" :class="getBatteryClass(hardwareSeleccionado.bateria)">
                        <HugeiconsIcon :icon="getBatteryIcon(hardwareSeleccionado.bateria)" :size="13" />
                        {{ hardwareSeleccionado.bateria }}%
                      </span>
                    </template>
                    <span>·</span>
                    <span>{{ t('comandos.status') }} <strong class="font-semibold" :class="hardwareSeleccionado.estado === 'DISPONIBLE' ? 'text-emerald-500' : 'text-amber-500'">{{ hardwareSeleccionado.estado }}</strong></span>
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
            {{ t('common.cancel') }}
          </button>

          <button
            type="button"
            :disabled="ejecutando || !selectedHardware"
            @click="handleEjecutar"
            class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600 hover:from-emerald-500 hover:to-emerald-600 dark:hover:from-emerald-400 dark:hover:to-emerald-500 px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#059669,0_8px_20px_rgba(16,185,129,0.4)] dark:shadow-[0_4px_0_#047857,0_8px_20px_rgba(16,185,129,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#059669,0_4px_10px_rgba(16,185,129,0.4)] dark:active:shadow-[0_0px_0_#047857,0_4px_10px_rgba(16,185,129,0.2)] focus:outline-none transition-all duration-200 border border-emerald-600 dark:border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer"
          >
            <HugeiconsIcon v-if="ejecutando" :icon="Loading03Icon" :size="16" class="animate-spin" />
            <HugeiconsIcon v-else :icon="PlayIcon" :size="16" />
            <span>{{ ejecutando ? t('comandos.executing') : t('comandos.btnExecute') }}</span>
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
