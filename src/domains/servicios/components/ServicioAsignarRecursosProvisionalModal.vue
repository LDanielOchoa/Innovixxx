<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  CpuIcon,
  User02Icon,
  Cancel01Icon,
  Search01Icon,
  Tick01Icon,
  Loading03Icon,
  ArrowDown01Icon,
  BatteryFullIcon,
  BatteryMedium01Icon,
  BatteryLowIcon,
  BatteryEmptyIcon,
  Copy01Icon,
  CheckmarkCircle01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import { loadModuleMessages } from '../../../i18n'
import {
  fetchHardwareSimplesApi,
  fetchEscoltasSimplesApi,
  fetchRecursosProvisionalesServicioApi,
  asignarRecursosProvisionalServicioApi
} from '../services/servicios.api'
import type {
  Servicio,
  ServicioDashboard,
  HardwareSimple,
  EscoltaSimple,
  ServicioAsignarRecursosProvisionalPayload
} from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'
import { useToast } from 'primevue/usetoast'

loadModuleMessages('servicios')
const { t } = useI18n()
const groupStore = useGroupStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  servicio: Servicio | ServicioDashboard | null
}>()

const emit = defineEmits(['update:isOpen', 'assigned'])

// Estados de inicialización y guardado
const isInitializing = ref(true)
const saving = ref(false)

// Catálogos
const hardware = ref<HardwareSimple[]>([])
const escoltas = ref<EscoltaSimple[]>([])

// Estados de carga individuales
const loadingHardware = ref(false)
const loadingEscoltas = ref(false)

// Selecciones múltiples
const selectedHardwareIds = ref<string[]>([])
const inicialesHardwareIds = ref<string[]>([])
const preasignadosHardwareIds = ref<string[]>([])
const selectedEscoltasIds = ref<string[]>([])
const inicialesEscoltasIds = ref<string[]>([])
const preasignadosEscoltasIds = ref<string[]>([])

// Panel activo: 'hardware' | 'escoltas' | null
const panelActivo = ref<'hardware' | 'escoltas' | null>(null)

// Refs de botones para calcular posición del panel
const btnHardware = ref<HTMLElement | null>(null)
const btnEscoltas = ref<HTMLElement | null>(null)

// Posición del panel flotante
const panelStyle = ref<{ top: string; left: string; height: string }>({
  top: '0px',
  left: '0px',
  height: '400px'
})

// Filtros de búsqueda local
const searchHardwareQuery = ref('')
const searchEscoltasQuery = ref('')

// Helpers de batería
const getBatteryIcon = (bateria: number | string | undefined | null) => {
  if (bateria === undefined || bateria === null || bateria === '') return BatteryEmptyIcon
  const nivel = Number(bateria)
  if (nivel >= 75) return BatteryFullIcon
  if (nivel >= 40) return BatteryMedium01Icon
  if (nivel >= 15) return BatteryLowIcon
  return BatteryEmptyIcon
}

const getBatteryClass = (bateria: number | string | undefined | null) => {
  if (bateria === undefined || bateria === null || bateria === '') return 'text-slate-400'
  const nivel = Number(bateria)
  if (nivel >= 50) return 'text-emerald-500 dark:text-emerald-400'
  if (nivel >= 20) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

// Filtrado de hardware ordenando preasignados primero
const filteredHardware = computed(() => {
  const q = searchHardwareQuery.value.toLowerCase().trim()
  let list = hardware.value
  if (q) {
    list = list.filter(h =>
      (h.nombre && h.nombre.toLowerCase().includes(q)) ||
      (h.familia && h.familia.toLowerCase().includes(q)) ||
      h.id_hardware.toLowerCase().includes(q)
    )
  }
  return [...list].sort((a, b) => {
    const aPre = preasignadosHardwareIds.value.includes(a.id_hardware) ? 1 : 0
    const bPre = preasignadosHardwareIds.value.includes(b.id_hardware) ? 1 : 0
    return bPre - aPre
  })
})

// Filtrado de escoltas ordenando preasignados primero
const filteredEscoltas = computed(() => {
  const q = searchEscoltasQuery.value.toLowerCase().trim()
  let list = escoltas.value
  if (q) {
    list = list.filter(e =>
      (e.nombre && e.nombre.toLowerCase().includes(q)) ||
      (e.celular && e.celular.toLowerCase().includes(q)) ||
      e.id_escolta.toLowerCase().includes(q)
    )
  }
  return [...list].sort((a, b) => {
    const aPre = preasignadosEscoltasIds.value.includes(a.id_escolta) ? 1 : 0
    const bPre = preasignadosEscoltasIds.value.includes(b.id_escolta) ? 1 : 0
    return bPre - aPre
  })
})

// Cálculo de posición del panel flotante
const calcularPosicionPanel = (btnRef: HTMLElement | null) => {
  if (!btnRef) return

  const modalEl = document.querySelector('[role="dialog"] .sm\\:my-8') as HTMLElement
  if (!modalEl) return

  const modalRect = modalEl.getBoundingClientRect()

  const panelWidth = 385
  const gap = 16
  // Altura generosa alineada con el modal principal alargado
  const panelHeight = Math.max(modalRect.height, 580)

  let left = modalRect.right + gap
  if (left + panelWidth > window.innerWidth - 16) {
    left = modalRect.left - panelWidth - gap
  }

  let top = modalRect.top
  if (top + panelHeight > window.innerHeight - 16) {
    top = window.innerHeight - panelHeight - 16
  }
  if (top < 16) top = 16

  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    height: `${panelHeight}px`
  }
}

// Abrir o cerrar panel
const abrirPanel = async (tipo: 'hardware' | 'escoltas') => {
  if (panelActivo.value === tipo) {
    panelActivo.value = null
    return
  }
  panelActivo.value = tipo
  await nextTick()

  const refMap = {
    hardware: btnHardware.value,
    escoltas: btnEscoltas.value
  }
  calcularPosicionPanel(refMap[tipo])
}

const cerrarPanel = () => {
  panelActivo.value = null
}

// Observar apertura del modal
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    saving.value = false

    selectedHardwareIds.value = []
    inicialesHardwareIds.value = []
    preasignadosHardwareIds.value = []
    selectedEscoltasIds.value = []
    inicialesEscoltasIds.value = []
    preasignadosEscoltasIds.value = []

    searchHardwareQuery.value = ''
    searchEscoltasQuery.value = ''
    panelActivo.value = null

    // Pre-cargar si el servicio ya tiene recursos
    if (props.servicio) {
      if (props.servicio.vehiculos) {
        const hwIds = Object.values(props.servicio.vehiculos).flat().map(String)
        selectedHardwareIds.value = [...hwIds]
        inicialesHardwareIds.value = [...hwIds]
      }
      if (props.servicio.escoltas && Array.isArray(props.servicio.escoltas)) {
        selectedEscoltasIds.value = props.servicio.escoltas.map(String)
        inicialesEscoltasIds.value = [...props.servicio.escoltas.map(String)]
      }
    }

    if (groupStore.selectedGroup?.id) {
      loadingHardware.value = true
      loadingEscoltas.value = true

      try {
        const promesas: Promise<any>[] = [
          fetchHardwareSimplesApi(groupStore.selectedGroup.id, 0),
          fetchEscoltasSimplesApi(groupStore.selectedGroup.id, 0)
        ]

        if (props.servicio?.id_servicio) {
          promesas.push(
            fetchRecursosProvisionalesServicioApi({
              id_grupo: groupStore.selectedGroup.id,
              id_servicio: props.servicio.id_servicio
            })
          )
        }

        const resultados = await Promise.allSettled(promesas)
        if (resultados[0].status === 'fulfilled') hardware.value = resultados[0].value
        if (resultados[1].status === 'fulfilled') escoltas.value = resultados[1].value
        if (resultados[2] && resultados[2].status === 'fulfilled' && resultados[2].value?.data) {
          const dataProv = resultados[2].value.data
          preasignadosHardwareIds.value = dataProv.hardware || []
          preasignadosEscoltasIds.value = dataProv.escoltas || []

          // Si el servicio no tenía recursos seleccionados previamente, pre-cargar los provisionales
          if (selectedHardwareIds.value.length === 0 && dataProv.hardware && dataProv.hardware.length > 0) {
            selectedHardwareIds.value = [...dataProv.hardware]
          }
          if (selectedEscoltasIds.value.length === 0 && dataProv.escoltas && dataProv.escoltas.length > 0) {
            selectedEscoltasIds.value = [...dataProv.escoltas]
          }
        }
      } catch (error) {
        console.error('Error al cargar datos maestros para asignación provisional:', error)
      } finally {
        loadingHardware.value = false
        loadingEscoltas.value = false
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 450)
  } else {
    panelActivo.value = null
  }
})

// Selección interactiva de Hardware
const selectHardware = (id: string) => {
  const hwObj = hardware.value.find(h => h.id_hardware === id)
  const isDisponible = !hwObj?.estado || hwObj.estado.toUpperCase() === 'DISPONIBLE'
  const eraInicial = inicialesHardwareIds.value.includes(id)

  if (hwObj && !isDisponible && !eraInicial && !selectedHardwareIds.value.includes(id)) {
    toast.add({
      severity: 'warn',
      summary: t('servicios.toastOccupiedHardwareSummary'),
      detail: t('servicios.toastOccupiedHardwareInUse'),
      life: 4000
    })
    return
  }

  const index = selectedHardwareIds.value.indexOf(id)
  if (index > -1) {
    selectedHardwareIds.value.splice(index, 1)
  } else {
    selectedHardwareIds.value.push(id)
  }
}

const selectAllHardware = () => {
  filteredHardware.value.forEach(h => {
    const isDisponible = !h.estado || h.estado.toUpperCase() === 'DISPONIBLE'
    const eraInicial = inicialesHardwareIds.value.includes(h.id_hardware)
    if ((isDisponible || eraInicial) && !selectedHardwareIds.value.includes(h.id_hardware)) {
      selectedHardwareIds.value.push(h.id_hardware)
    }
  })
}

const clearHardware = () => {
  selectedHardwareIds.value = []
}

// Selección interactiva de Escolta
const copiedEscoltaId = ref<string | null>(null)
let copyTimeout: ReturnType<typeof setTimeout> | null = null

const selectEscolta = (id: string) => {
  const eObj = escoltas.value.find(e => e.id_escolta === id)
  const isDisponible = !eObj?.estado || eObj.estado.toUpperCase() === 'DISPONIBLE'
  const eraInicial = inicialesEscoltasIds.value.includes(id)

  if (eObj && !isDisponible && !eraInicial && !selectedEscoltasIds.value.includes(id)) {
    toast.add({
      severity: 'warn',
      summary: t('servicios.toastOccupiedEscortSummary'),
      detail: t('servicios.toastOccupiedEscortDetail', { estado: eObj.estado }),
      life: 4000
    })
    return
  }

  const index = selectedEscoltasIds.value.indexOf(id)
  if (index > -1) {
    selectedEscoltasIds.value.splice(index, 1)
  } else {
    selectedEscoltasIds.value.push(id)
  }

  if (eObj && eObj.celular) {
    navigator.clipboard.writeText(eObj.celular).then(() => {
      copiedEscoltaId.value = id
      if (copyTimeout) clearTimeout(copyTimeout)
      copyTimeout = setTimeout(() => {
        copiedEscoltaId.value = null
        copyTimeout = null
      }, 2000)
    }).catch(() => {})
  }
}

const selectAllEscoltas = () => {
  filteredEscoltas.value.forEach(e => {
    const isDisponible = !e.estado || e.estado.toUpperCase() === 'DISPONIBLE'
    const eraInicial = inicialesEscoltasIds.value.includes(e.id_escolta)
    if ((isDisponible || eraInicial) && !selectedEscoltasIds.value.includes(e.id_escolta)) {
      selectedEscoltasIds.value.push(e.id_escolta)
    }
  })
}

const clearEscoltas = () => {
  selectedEscoltasIds.value = []
}

// Labels informativos
const getHardwareLabel = (id: string): string => {
  const h = hardware.value.find(item => item.id_hardware === id)
  return h ? (h.nombre || h.id_hardware) : id
}

const getEscoltaLabel = (id: string): string => {
  const e = escoltas.value.find(item => item.id_escolta === id)
  return e ? e.nombre : id
}

// Cerrar panel al hacer click fuera
const handleClickOutside = (event: MouseEvent) => {
  if (!panelActivo.value) return
  const target = event.target as HTMLElement

  const panelEl = document.querySelector('.panel-flotante-recursos')
  if (panelEl && panelEl.contains(target)) return

  const botones = [btnHardware.value, btnEscoltas.value]
  if (botones.some(btn => btn && btn.contains(target))) return

  panelActivo.value = null
}

const handleResize = () => {
  if (!panelActivo.value) return
  const refMap = {
    hardware: btnHardware.value,
    escoltas: btnEscoltas.value
  }
  calcularPosicionPanel(refMap[panelActivo.value])
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  if (copyTimeout) clearTimeout(copyTimeout)
})

// Enviar asignación provisional
const handleAsignarProvisional = async () => {
  if (saving.value) return
  if (!groupStore.selectedGroup?.id || !props.servicio?.id_servicio) return

  if (selectedHardwareIds.value.length === 0 && selectedEscoltasIds.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: t('servicios.toastValidation'),
      detail: t('servicios.provisionalRequiredError'),
      life: 4000
    })
    return
  }

  saving.value = true

  const payload: ServicioAsignarRecursosProvisionalPayload = {
    id_grupo: groupStore.selectedGroup.id,
    id_servicio: props.servicio.id_servicio,
    hardware: selectedHardwareIds.value,
    escoltas: selectedEscoltasIds.value
  }

  try {
    const data = await asignarRecursosProvisionalServicioApi(payload)
    if (data.done !== false) {
      handleClose()
      emit('assigned')
      toast.add({
        severity: 'success',
        summary: t('servicios.toastAssignedProvisionalSuccess'),
        detail: data.message || t('servicios.toastAssignedProvisionalDetail'),
        life: 4000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: t('servicios.toastError'),
        detail: data.message || t('servicios.toastConnectionError'),
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error en asignarRecursosProvisionalServicioApi:', error)
    toast.add({
      severity: 'error',
      summary: t('servicios.toastError'),
      detail: error.message || t('servicios.toastConnectionError'),
      life: 4000
    })
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:isOpen', false)
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    @confirm="handleAsignarProvisional"
    :title="t('servicios.modalTitleAssignProvisional')"
    :confirm-text="t('servicios.btnConfirmProvisionalAssignment')"
    size="xl"
    max-width="max-w-3xl"
    :show-footer="!isInitializing"
  >
    <template #icon>
      <div class="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400 border border-blue-500/20 shadow-sm">
        <HugeiconsIcon :icon="CpuIcon" :size="22" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col min-h-[500px] sm:min-h-[560px] justify-between relative p-1.5 gap-6">
      <!-- PANTALLA DE CARGA GLOBAL -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/70 dark:bg-[#13161C]/75 backdrop-blur-md rounded-2xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="48" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[12px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1.5">{{ t('servicios.assigningProvisionalResources') }}</span>
            <div class="flex gap-1.5">
              <span class="w-2 h-2 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-2 h-2 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-2 h-2 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- SKELETON CARGANDO -->
      <div v-if="isInitializing" class="space-y-8 animate-pulse p-4 my-auto">
        <div class="space-y-4">
          <div class="h-4 w-48 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-20 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-2xl"></div>
        </div>
        <div class="space-y-4">
          <div class="h-4 w-48 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-20 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-2xl"></div>
        </div>
      </div>

      <!-- CONTENIDO DEL FORMULARIO -->
      <div v-if="!isInitializing" class="animate-fade-in flex flex-col justify-between flex-1 space-y-6">
        <!-- SELECTORES DE RECURSOS PROVISIONALES -->
        <div class="space-y-6 flex-1">
          <!-- 1. SELECTOR DE HARDWARE -->
          <div class="p-5 sm:p-6 rounded-2xl bg-white/50 dark:bg-[#13161C]/60 border border-slate-200/70 dark:border-white/5 shadow-sm space-y-3.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <HugeiconsIcon :icon="CpuIcon" :size="16" />
                </div>
                <div>
                  <label
                    class="text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-300 block"
                    :class="panelActivo === 'hardware' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                  >
                    {{ t('servicios.thHardware') }}
                  </label>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {{ t('servicios.provisionalHardwareSubtitle') }}
                  </span>
                </div>
              </div>
              <span class="text-[11px] font-bold text-blue-500 dark:text-blue-400 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                {{ selectedHardwareIds.length > 0 ? t('servicios.availableHardwareCount', { count: selectedHardwareIds.length }) : t('servicios.unassigned') }}
              </span>
            </div>

            <button
              ref="btnHardware"
              type="button"
              @click="abrirPanel('hardware')"
              :disabled="loadingHardware"
              class="selector-btn min-h-[64px] bg-slate-50/80 border border-slate-200 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:bg-[#0F1115] dark:border-white/5 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)] hover:border-blue-500/40"
              :class="[
                loadingHardware ? 'opacity-60 cursor-not-allowed' : '',
                panelActivo === 'hardware' ? 'panel-on' : ''
              ]"
            >
              <div 
                class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300 pointer-events-none"
                :class="{ 'opacity-100 left-2 right-2': panelActivo === 'hardware' }"
              ></div>

              <div 
                class="relative z-10 text-slate-400 dark:text-slate-500 transition-colors duration-300 mr-3 shrink-0"
                :class="panelActivo === 'hardware' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : ''"
              >
                <HugeiconsIcon :icon="CpuIcon" :size="22" :stroke-width="1.8" />
              </div>

              <div class="relative z-10 flex-1 flex flex-wrap gap-2 py-1.5 min-h-[36px] items-center">
                <template v-if="selectedHardwareIds.length > 0">
                  <div
                    v-for="id in selectedHardwareIds"
                    :key="id"
                    class="badge-recurso"
                  >
                    <span class="truncate max-w-[160px]">{{ getHardwareLabel(id) }}</span>
                    <button type="button" @click.stop="selectHardware(id)" class="hover:text-red-400 transition-colors shrink-0 cursor-pointer p-0.5">
                      <HugeiconsIcon :icon="Cancel01Icon" :size="11" :stroke-width="3" />
                    </button>
                  </div>
                </template>
                <span v-else class="text-slate-400 dark:text-slate-500 text-xs font-medium">
                  {{ loadingHardware ? t('servicios.changingRoute') : t('servicios.assignedHardwareTitle') }}
                </span>
              </div>

              <div 
                class="relative z-10 text-slate-400 dark:text-slate-500 pl-3 shrink-0 transition-all duration-300"
                :class="[
                  panelActivo === 'hardware' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : '',
                  { 'rotate-180': panelActivo === 'hardware' }
                ]"
              >
                <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" />
              </div>
            </button>
          </div>

          <!-- 2. SELECTOR DE ESCOLTAS -->
          <div class="p-5 sm:p-6 rounded-2xl bg-white/50 dark:bg-[#13161C]/60 border border-slate-200/70 dark:border-white/5 shadow-sm space-y-3.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <HugeiconsIcon :icon="User02Icon" :size="16" />
                </div>
                <div>
                  <label
                    class="text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-300 block"
                    :class="panelActivo === 'escoltas' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                  >
                    {{ t('servicios.labelEscorts') }}
                  </label>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {{ t('servicios.provisionalEscortsSubtitle') }}
                  </span>
                </div>
              </div>
              <span class="text-[11px] font-bold text-blue-500 dark:text-blue-400 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                {{ selectedEscoltasIds.length > 0 ? t('servicios.availableEscortsCount', { count: selectedEscoltasIds.length }) : t('servicios.unassigned') }}
              </span>
            </div>

            <button
              ref="btnEscoltas"
              type="button"
              @click="abrirPanel('escoltas')"
              :disabled="loadingEscoltas"
              class="selector-btn min-h-[64px] bg-slate-50/80 border border-slate-200 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:bg-[#0F1115] dark:border-white/5 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)] hover:border-blue-500/40"
              :class="[
                loadingEscoltas ? 'opacity-60 cursor-not-allowed' : '',
                panelActivo === 'escoltas' ? 'panel-on' : ''
              ]"
            >
              <div 
                class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300 pointer-events-none"
                :class="{ 'opacity-100 left-2 right-2': panelActivo === 'escoltas' }"
              ></div>

              <div 
                class="relative z-10 text-slate-400 dark:text-slate-500 transition-colors duration-300 mr-3 shrink-0"
                :class="panelActivo === 'escoltas' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : ''"
              >
                <HugeiconsIcon :icon="User02Icon" :size="22" :stroke-width="1.8" />
              </div>

              <div class="relative z-10 flex-1 flex flex-wrap gap-2 py-1.5 min-h-[36px] items-center">
                <template v-if="selectedEscoltasIds.length > 0">
                  <div
                    v-for="id in selectedEscoltasIds"
                    :key="id"
                    class="badge-recurso"
                  >
                    <span class="truncate max-w-[160px]">{{ getEscoltaLabel(id) }}</span>
                    <button type="button" @click.stop="selectEscolta(id)" class="hover:text-red-400 transition-colors shrink-0 cursor-pointer p-0.5">
                      <HugeiconsIcon :icon="Cancel01Icon" :size="11" :stroke-width="3" />
                    </button>
                  </div>
                </template>
                <span v-else class="text-slate-400 dark:text-slate-500 text-xs font-medium">
                  {{ loadingEscoltas ? t('servicios.changingRoute') : t('servicios.placeholderEscorts') }}
                </span>
              </div>

              <div 
                class="relative z-10 text-slate-400 dark:text-slate-500 pl-3 shrink-0 transition-all duration-300"
                :class="[
                  panelActivo === 'escoltas' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : '',
                  { 'rotate-180': panelActivo === 'escoltas' }
                ]"
              >
                <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" />
              </div>
            </button>
          </div>
        </div>

        <!-- RESUMEN INFORMATIVO INFERIOR -->
        <div class="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-[#0F1115]/50 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
          <div class="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" :class="selectedHardwareIds.length > 0 ? 'bg-blue-500' : 'bg-slate-400'"></span>
              <span>Hardware: <strong class="text-slate-700 dark:text-slate-200">{{ selectedHardwareIds.length }}</strong></span>
            </span>
            <span class="w-px h-3.5 bg-slate-200 dark:bg-white/10"></span>
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" :class="selectedEscoltasIds.length > 0 ? 'bg-blue-500' : 'bg-slate-400'"></span>
              <span>Escoltas: <strong class="text-slate-700 dark:text-slate-200">{{ selectedEscoltasIds.length }}</strong></span>
            </span>
          </div>

          <button
            v-if="selectedHardwareIds.length > 0 || selectedEscoltasIds.length > 0"
            type="button"
            @click="clearHardware(); clearEscoltas();"
            class="text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-colors"
          >
            {{ t('servicios.btnClearAll') }}
          </button>
        </div>
      </div>
    </div>
  </AppModal>

  <!-- PANEL FLOTANTE TELEPORT -->
  <Teleport to="body">
    <Transition name="panel-flotante">
      <div
        v-if="panelActivo && isOpen && !isInitializing"
        class="panel-flotante-recursos fixed z-[200] flex flex-col overflow-hidden bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.15)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]"
        :style="{
          top: panelStyle.top,
          left: panelStyle.left,
          width: '385px',
          height: panelStyle.height,
        }"
      >
        <!-- Franja superior de color -->
        <div class="panel-acento shrink-0" />

        <!-- Cabecera -->
        <div class="panel-head px-5 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-slate-200/80 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="panel-head-icon">
              <HugeiconsIcon
                :icon="panelActivo === 'hardware' ? CpuIcon : User02Icon"
                :size="17"
              />
            </div>
            <div>
              <h4 class="text-[12px] font-black text-slate-800 dark:text-white tracking-tight">
                {{
                  panelActivo === 'hardware'
                    ? t('servicios.availableHardwarePanelTitle')
                    : t('servicios.availableEscortsPanelTitle')
                }}
              </h4>
              <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
                {{
                  panelActivo === 'hardware'
                    ? t('servicios.devicesInStock', { count: filteredHardware.length })
                    : t('servicios.escortsInTeam', { count: filteredEscoltas.length })
                }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="cerrarPanel"
            class="panel-close-btn"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
          </button>
        </div>

        <!-- Buscador -->
        <div class="px-4 pb-3 shrink-0">
          <div class="panel-search-wrap">
            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              v-if="panelActivo === 'hardware'"
              v-model="searchHardwareQuery"
              type="text"
              :placeholder="t('servicios.filterSearchType')"
              class="panel-search-input"
              @click.stop
            />
            <input
              v-else-if="panelActivo === 'escoltas'"
              v-model="searchEscoltasQuery"
              type="text"
              :placeholder="t('servicios.filterSearchEscort')"
              class="panel-search-input"
              @click.stop
            />
            <button
              v-if="(panelActivo === 'hardware' && searchHardwareQuery) || (panelActivo === 'escoltas' && searchEscoltasQuery)"
              type="button"
              @click.stop="panelActivo === 'hardware' ? searchHardwareQuery = '' : searchEscoltasQuery = ''"
              class="text-slate-400 hover:text-slate-300 transition-colors shrink-0"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="11" />
            </button>
          </div>
        </div>

        <!-- Barra Control Selección -->
        <div class="px-4 py-1.5 flex items-center justify-between shrink-0 border-y border-slate-100 dark:border-white/5">
          <span class="text-[10px] font-bold tabular-nums text-blue-500 dark:text-blue-400">
            {{
              panelActivo === 'hardware'
                ? t('servicios.selectedCount', { count: selectedHardwareIds.length })
                : t('servicios.selectedCount', { count: selectedEscoltasIds.length })
            }}
          </span>
          <div class="flex items-center gap-3 text-[10px] font-semibold">
            <button
              type="button"
              @click.stop="panelActivo === 'hardware' ? selectAllHardware() : selectAllEscoltas()"
              class="text-slate-400 hover:text-[#5da6fc] transition-colors"
            >
              {{ t('servicios.btnSelectAll') }}
            </button>
            <span class="w-px h-3 bg-slate-200 dark:bg-white/10"></span>
            <button
              type="button"
              @click.stop="panelActivo === 'hardware' ? clearHardware() : clearEscoltas()"
              class="text-slate-400 hover:text-red-400 transition-colors"
            >
              {{ t('servicios.btnClearAll') }}
            </button>
          </div>
        </div>

        <!-- Listado -->
        <div class="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-1">
          <!-- Hardware List -->
          <template v-if="panelActivo === 'hardware'">
            <button
              v-for="h in filteredHardware"
              :key="h.id_hardware"
              type="button"
              @click="selectHardware(h.id_hardware)"
              class="panel-row group/row"
              :class="[
                selectedHardwareIds.includes(h.id_hardware) ? 'panel-row--on' : 'panel-row--off',
                h.estado && h.estado.toUpperCase() !== 'DISPONIBLE' && !inicialesHardwareIds.includes(h.id_hardware) && !selectedHardwareIds.includes(h.id_hardware) ? 'opacity-50 cursor-not-allowed bg-amber-500/5' : '',
                !selectedHardwareIds.includes(h.id_hardware) && preasignadosHardwareIds.includes(h.id_hardware) ? '!border-amber-500/40 bg-amber-500/[0.04]' : ''
              ]"
            >
              <div
                class="panel-row-dot shrink-0"
                :class="[
                  selectedHardwareIds.includes(h.id_hardware) ? 'panel-row-dot--on' : 'panel-row-dot--off',
                  h.estado && h.estado.toUpperCase() !== 'DISPONIBLE' && !inicialesHardwareIds.includes(h.id_hardware) && !selectedHardwareIds.includes(h.id_hardware) ? '!bg-amber-500/20 !border-amber-500/30' : '',
                  !selectedHardwareIds.includes(h.id_hardware) && preasignadosHardwareIds.includes(h.id_hardware) ? '!border-amber-500/50' : ''
                ]"
              >
                <HugeiconsIcon v-if="selectedHardwareIds.includes(h.id_hardware)" :icon="Tick01Icon" :size="9" :stroke-width="3" />
                <HugeiconsIcon v-else-if="h.estado && h.estado.toUpperCase() !== 'DISPONIBLE' && !inicialesHardwareIds.includes(h.id_hardware)" :icon="Cancel01Icon" :size="8" class="text-amber-500" />
                <div v-else-if="preasignadosHardwareIds.includes(h.id_hardware)" class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              </div>
              <div class="flex flex-col flex-1 min-w-0 text-left">
                <div class="flex items-center justify-between gap-1.5">
                  <span class="text-[12px] font-semibold truncate leading-snug">{{ h.nombre }}</span>
                  <span
                    v-if="preasignadosHardwareIds.includes(h.id_hardware)"
                    class="inline-flex items-center gap-1 font-bold text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shrink-0"
                  >
                    <HugeiconsIcon :icon="CpuIcon" :size="9" />
                    {{ t('servicios.badgePreassigned') }}
                  </span>
                </div>
                <span class="text-[10px] truncate leading-none mt-0.5 flex justify-between items-center pr-1 gap-1">
                  <span class="text-slate-400 dark:text-slate-500 flex items-center gap-1.5 min-w-0 truncate">
                    <span class="truncate">{{ h.familia || t('servicios.noHardwareAssigned') }}</span>
                    <span v-if="h.bateria !== undefined && h.bateria !== null && h.bateria !== ''" class="inline-flex items-center gap-0.5 font-semibold shrink-0" :class="getBatteryClass(h.bateria)">
                      <HugeiconsIcon :icon="getBatteryIcon(h.bateria)" :size="10.5" />
                      {{ h.bateria }}%
                    </span>
                  </span>
                  <span v-if="h.estado && h.estado.toUpperCase() !== 'DISPONIBLE' && !inicialesHardwareIds.includes(h.id_hardware)" class="text-amber-500 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wide shrink-0">
                    {{ h.estado }}
                  </span>
                </span>
              </div>
            </button>
            <div v-if="filteredHardware.length === 0" class="panel-empty">
              <HugeiconsIcon :icon="CpuIcon" :size="24" class="opacity-30 mb-2" />
              <span>{{ t('servicios.noHardwareFound') }}</span>
            </div>
          </template>

          <!-- Escoltas List -->
          <template v-else-if="panelActivo === 'escoltas'">
            <button
              v-for="e in filteredEscoltas"
              :key="e.id_escolta"
              type="button"
              @click="selectEscolta(e.id_escolta)"
              class="panel-row group/row"
              :class="[
                selectedEscoltasIds.includes(e.id_escolta) ? 'panel-row--on' : 'panel-row--off',
                e.estado && e.estado.toUpperCase() !== 'DISPONIBLE' && !inicialesEscoltasIds.includes(e.id_escolta) && !selectedEscoltasIds.includes(e.id_escolta) ? 'opacity-50 cursor-not-allowed' : '',
                !selectedEscoltasIds.includes(e.id_escolta) && preasignadosEscoltasIds.includes(e.id_escolta) ? '!border-amber-500/40 bg-amber-500/[0.04]' : ''
              ]"
            >
              <div
                class="panel-row-dot shrink-0"
                :class="[
                  selectedEscoltasIds.includes(e.id_escolta) ? 'panel-row-dot--on' : 'panel-row-dot--off',
                  e.estado && e.estado.toUpperCase() !== 'DISPONIBLE' && !inicialesEscoltasIds.includes(e.id_escolta) && !selectedEscoltasIds.includes(e.id_escolta) ? '!bg-amber-500/20 !border-amber-500/30' : '',
                  !selectedEscoltasIds.includes(e.id_escolta) && preasignadosEscoltasIds.includes(e.id_escolta) ? '!border-amber-500/50' : ''
                ]"
              >
                <HugeiconsIcon v-if="selectedEscoltasIds.includes(e.id_escolta)" :icon="Tick01Icon" :size="9" :stroke-width="3" />
                <HugeiconsIcon v-else-if="e.estado && e.estado.toUpperCase() !== 'DISPONIBLE' && !inicialesEscoltasIds.includes(e.id_escolta)" :icon="Cancel01Icon" :size="8" class="text-amber-500" />
                <div v-else-if="preasignadosEscoltasIds.includes(e.id_escolta)" class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              </div>
              <div class="flex flex-col flex-1 min-w-0 text-left">
                <div class="flex items-center justify-between gap-1.5">
                  <span class="text-[12px] font-semibold truncate leading-snug">{{ e.nombre }}</span>
                  <span
                    v-if="preasignadosEscoltasIds.includes(e.id_escolta)"
                    class="inline-flex items-center gap-1 font-bold text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shrink-0"
                  >
                    <HugeiconsIcon :icon="User02Icon" :size="9" />
                    {{ t('servicios.badgePreassigned') }}
                  </span>
                </div>
                <span class="text-[10px] truncate leading-none mt-0.5 flex justify-between items-center pr-1">
                  <span class="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <span>{{ e.celular || '---' }}</span>
                    <HugeiconsIcon
                      v-if="e.celular"
                      :icon="copiedEscoltaId === e.id_escolta ? CheckmarkCircle01Icon : Copy01Icon"
                      :size="10"
                      class="transition-colors"
                      :class="copiedEscoltaId === e.id_escolta ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-300'"
                    />
                  </span>
                  <span v-if="e.estado && e.estado.toUpperCase() !== 'DISPONIBLE' && !inicialesEscoltasIds.includes(e.id_escolta)" class="text-amber-500 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wide">
                    {{ e.estado }}
                  </span>
                </span>
              </div>
            </button>
            <div v-if="filteredEscoltas.length === 0" class="panel-empty">
              <HugeiconsIcon :icon="User02Icon" :size="24" class="opacity-30 mb-2" />
              <span>{{ t('servicios.noEscortsFound') }}</span>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="panel-footer p-3 shrink-0">
          <button
            type="button"
            @click="cerrarPanel"
            class="panel-confirm-btn cursor-pointer"
          >
            <HugeiconsIcon :icon="Tick01Icon" :size="16" />
            <span>{{ t('servicios.btnConfirmSelection') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Selector interactivo estilo botón */
.selector-btn {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 8px 14px;
  cursor: pointer;
  outline: none;
  position: relative;
  text-align: left;
  transition: all 0.3s ease;
}
.selector-btn:hover:not(:disabled) {
  border-color: #cbd5e1;
}
:global(.dark) .selector-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.1);
}

.selector-btn.panel-on {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2), inset 0 1px 3px rgba(0,0,0,0.1) !important;
}
:global(.dark) .selector-btn.panel-on {
  border-color: #5da6fc !important;
  box-shadow: 0 0 0 1px rgba(93, 166, 252, 0.2), inset 0 1px 3px rgba(0,0,0,0.3) !important;
}

.badge-recurso {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.25);
  font-size: 11px;
  font-weight: 700;
  max-width: 100%;
}
:global(.dark) .badge-recurso {
  background: rgba(59, 130, 246, 0.15);
  color: #5da6fc;
  border-color: rgba(59, 130, 246, 0.3);
}

.panel-flotante-recursos {
  border-radius: 20px;
  animation: none;
}

.panel-acento {
  height: 3px;
  width: 100%;
  border-radius: 18px 18px 0 0;
  background: linear-gradient(90deg, #60a5fa, #3b82f6);
}

.panel-head-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(59, 130, 246, 0.1);
  color: #5da6fc;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.panel-close-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.panel-close-btn:hover {
  background: rgba(0,0,0,0.04);
  color: #475569;
}
:global(.dark) .panel-close-btn:hover {
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
}

.panel-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f1115;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 14px;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.25);
}
.panel-search-wrap:focus-within {
  border-color: #5da6fc;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(93,166,252,0.2);
}

.panel-search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  outline: none;
  box-shadow: none;
  padding: 0;
}
.panel-search-input::placeholder { color: #64748b; }

.panel-row {
  width: calc(100% - 24px);
  margin: 4px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  color: #cbd5e1;
}

.panel-row--off {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}
.panel-row--off:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.panel-row--on {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #ffffff;
}

.panel-row-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-row-dot--off {
  border: 1.5px solid rgba(148, 163, 184, 0.3);
  background: transparent;
}
.panel-row-dot--on {
  color: #fff;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 2px 6px rgba(59,130,246,0.4);
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
}

.panel-footer {
  border-top: 1px solid rgba(255,255,255,0.06);
}

.panel-confirm-btn {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;
}
.panel-confirm-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}
.panel-confirm-btn:active { transform: translateY(1px); }

.animate-fade-in {
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

.panel-flotante-enter-active {
  transition:
    opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-flotante-leave-active {
  transition:
    opacity 0.18s cubic-bezier(0.4, 0, 1, 1),
    transform 0.18s cubic-bezier(0.4, 0, 1, 1);
}
.panel-flotante-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
.panel-flotante-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1A1D24;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3b82f6;
}
</style>
