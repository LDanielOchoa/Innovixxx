<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Calendar01Icon,
  Clock01Icon,
  Car01Icon,
  Tick01Icon,
  Alert01Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  Loading03Icon,
  ServiceIcon,
  ArrowDown01Icon,
  CheckmarkCircle01Icon,
  Search01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import { registrarServicioApi, fetchRutasSimplesApi, fetchVehiculosSimplesApi } from '../services/servicios.api'
import type { ServicioCreatePayload, RutaSimple, VehiculoSimple } from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import AppButton from '../../../components/ui/AppButton.vue'

const { t } = useI18n()
const groupStore = useGroupStore()

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['update:isOpen', 'created'])

const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' } | null>(null)

const rutas = ref<RutaSimple[]>([])
const vehiculos = ref<VehiculoSimple[]>([])
const loadingRutas = ref(false)
const loadingVehiculos = ref(false)

const fechaInicio = ref('')
const horaInicio = ref('')

const selectedVehiculosIds = ref<string[]>([])
const searchQuery = ref('')
const searchRutasQuery = ref('')

const panelActivo = ref<'rutas' | 'vehiculos' | null>(null)
const btnVehiculos = ref<HTMLElement | null>(null)
const btnRutas = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string; left: string; height: string }>({
  top: '0px',
  left: '0px',
  height: '400px'
})

const filteredVehiculos = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return vehiculos.value
  return vehiculos.value.filter(v =>
    v.nombre.toLowerCase().includes(q) ||
    v.placa.toLowerCase().includes(q) ||
    v.tipo.toLowerCase().includes(q)
  )
})

const filteredRutas = computed(() => {
  const q = searchRutasQuery.value.toLowerCase().trim()
  if (!q) return rutas.value
  return rutas.value.filter(r =>
    r.nombre.toLowerCase().includes(q)
  )
})

const modoFinOptions = [
  { value: '1', label: 'Al llegar' },
  { value: '2', label: 'Al descargar' }
]

const formData = reactive({
  id_ruta: '',
  fecha_hora_inicio: '',
  modo_fin: '1'
})

watch([fechaInicio, horaInicio], ([nuevaFecha, nuevaHora]) => {
  if (nuevaFecha && nuevaHora) {
    formData.fecha_hora_inicio = `${nuevaFecha} ${nuevaHora}`
  } else if (nuevaFecha) {
    formData.fecha_hora_inicio = `${nuevaFecha} 00:00`
  } else {
    formData.fecha_hora_inicio = ''
  }
})

const calcularPosicionPanel = (btnRef: HTMLElement | null) => {
  if (!btnRef) return

  const modalEl = document.querySelector('[role="dialog"] .sm\\:my-8') as HTMLElement
  if (!modalEl) return

  const modalRect = modalEl.getBoundingClientRect()

  const panelWidth = 380
  const gap = 12
  const panelHeight = modalRect.height

  let left = modalRect.right + gap
  if (left + panelWidth > window.innerWidth - 16) {
    left = modalRect.left - panelWidth - gap
  }

  let top = modalRect.top
  if (top + panelHeight > window.innerHeight - 16) {
    top = window.innerHeight - panelHeight - 16
  }
  if (top < 8) top = 8

  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    height: `${panelHeight}px`
  }
}

const abrirPanel = async (tipo: 'rutas' | 'vehiculos') => {
  if (panelActivo.value === tipo) {
    panelActivo.value = null
    return
  }
  panelActivo.value = tipo
  await nextTick()

  const refMap = {
    rutas: btnRutas.value,
    vehiculos: btnVehiculos.value
  }
  calcularPosicionPanel(refMap[tipo])
}

const cerrarPanel = () => {
  panelActivo.value = null
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    rutas.value = []
    vehiculos.value = []
    loadingRutas.value = false
    loadingVehiculos.value = false
    selectedVehiculosIds.value = []
    panelActivo.value = null
    searchQuery.value = ''
    searchRutasQuery.value = ''
    fechaInicio.value = ''
    horaInicio.value = ''
    formData.id_ruta = ''
    formData.fecha_hora_inicio = ''
    formData.modo_fin = '1'

    if (groupStore.selectedGroup?.id) {
      loadingRutas.value = true
      loadingVehiculos.value = true
      try {
        const [rutasData, vehiculosData] = await Promise.all([
          fetchRutasSimplesApi(groupStore.selectedGroup.id),
          fetchVehiculosSimplesApi(groupStore.selectedGroup.id)
        ])
        rutas.value = rutasData
        vehiculos.value = vehiculosData
      } catch (error) {
        console.error('Error fetching data:', error)
        modalMessage.value = { text: t('common.errorNetwork') || 'Error al cargar datos', type: 'error' }
      } finally {
        loadingRutas.value = false
        loadingVehiculos.value = false
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  } else {
    panelActivo.value = false
  }
})

const selectVehiculo = (id: string) => {
  const index = selectedVehiculosIds.value.indexOf(id)
  if (index > -1) {
    selectedVehiculosIds.value.splice(index, 1)
  } else {
    selectedVehiculosIds.value.push(id)
  }
}

const selectRuta = (id: string) => {
  formData.id_ruta = id
  cerrarPanel()
}

const getVehiculoLabel = (id: string) => {
  const v = vehiculos.value.find(item => item.id_vehiculo === id)
  return v ? `${v.nombre} (${v.placa})` : id
}

const getRutaLabel = (id: string) => {
  const r = rutas.value.find(item => item.id_ruta === id)
  return r ? r.nombre : id
}

const selectAllVehiculos = () => {
  filteredVehiculos.value.forEach(v => {
    if (!selectedVehiculosIds.value.includes(v.id_vehiculo)) {
      selectedVehiculosIds.value.push(v.id_vehiculo)
    }
  })
}

const clearVehiculos = () => {
  selectedVehiculosIds.value = []
}

const handleClickOutside = (event: MouseEvent) => {
  if (!panelActivo.value) return
  const target = event.target as HTMLElement

  const panelEl = document.querySelector('.panel-flotante-recursos')
  if (panelEl && panelEl.contains(target)) return

  const botones = [btnVehiculos.value, btnRutas.value]
  if (botones.some(btn => btn && btn.contains(target))) return

  panelActivo.value = null
}

const handleResize = () => {
  if (!panelActivo.value) return
  const refMap = {
    rutas: btnRutas.value,
    vehiculos: btnVehiculos.value
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
})

const handleCreate = async () => {
  if (saving.value) return
  if (!groupStore.selectedGroup?.id) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'Seleccione un grupo válido', type: 'error' }
    return
  }

  if (!formData.id_ruta) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'Seleccione una ruta', type: 'error' }
    return
  }

  if (!formData.fecha_hora_inicio.trim()) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'La fecha y hora de inicio es requerida', type: 'error' }
    return
  }

  if (!formData.modo_fin.trim()) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'El modo fin es requerido', type: 'error' }
    return
  }

  if (selectedVehiculosIds.value.length === 0) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'Seleccione al menos un vehículo', type: 'error' }
    return
  }

  saving.value = true
  modalMessage.value = null

  const payload: ServicioCreatePayload = {
    id_grupo: groupStore.selectedGroup.id,
    id_ruta: formData.id_ruta,
    fecha_hora_inicio: formData.fecha_hora_inicio.replace('T', ' ').trim(),
    modo_fin: parseInt(formData.modo_fin.trim(), 10),
    vehiculos_id: selectedVehiculosIds.value
  }

  try {
    const data = await registrarServicioApi(payload)
    if (data.done) {
      isSuccess.value = true
      emit('created')
    } else {
      modalMessage.value = { text: data.message || (t('common.error') || 'Error al registrar'), type: 'error' }
    }
  } catch (error: any) {
    console.error('Error creating servicio:', error)
    modalMessage.value = { text: error.message || (t('common.errorNetwork') || 'Error de conexión'), type: 'error' }
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:isOpen', false)
}

const confirmText = computed(() => {
  if (isSuccess.value) return t('common.close') || 'Cerrar'
  return t('servicios.btnRegister') || 'Registrar Servicio'
})

const rutaOptions = computed(() => {
  return rutas.value.map(r => ({
    value: r.id_ruta,
    label: r.nombre
  }))
})
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    :title="t('servicios.modalTitleCreate') || 'Registrar Servicio'"
    size="xl"
    :show-footer="false"
    :confirm-text="confirmText"
    @confirm="isSuccess ? handleClose() : handleCreate()"
  >
    <template #icon>
      <HugeiconsIcon :icon="ServiceIcon" :size="20" class="text-[#3b82f6]" />
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <!-- OVERLAY DE CARGA -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-[#13161C]/80 backdrop-blur-md rounded-[24px] transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">{{ t('common.saving') || 'Registrando Servicio...' }}</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- SKELETON STATE -->
      <div v-if="isInitializing" class="space-y-6 animate-pulse p-4">
        <div class="space-y-3">
          <div class="h-2 w-16 bg-white/5 rounded-full"></div>
          <div class="h-12 w-full bg-white/5 rounded-xl"></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-3">
            <div class="h-2 w-24 bg-white/5 rounded-full"></div>
            <div class="h-12 w-full bg-white/5 rounded-xl"></div>
          </div>
          <div class="space-y-3">
            <div class="h-2 w-20 bg-white/5 rounded-full"></div>
            <div class="h-12 w-full bg-white/5 rounded-xl"></div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="h-2 w-28 bg-white/5 rounded-full"></div>
          <div class="h-12 w-full bg-white/5 rounded-xl"></div>
        </div>
      </div>

      <!-- SUCCESS STATE -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="isSuccess" class="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div class="relative group mb-2">
            <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_16px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 transform transition-transform duration-500 hover:scale-105">
              <HugeiconsIcon :icon="Tick01Icon" :size="32" class="text-white drop-shadow-sm" />
            </div>
          </div>
          <h3 class="text-xl font-black text-white tracking-tight">{{ t('servicios.alertSuccessCreate') || 'Servicio Registrado' }}</h3>
          <p class="text-[13px] text-slate-400 max-w-[320px]">
            {{ t('servicios.successCreateMsg') || 'El servicio ha sido registrado exitosamente.' }}
          </p>
          <div class="pt-4">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              {{ t('common.close') || 'Cerrar Ventana' }}
            </AppButton>
          </div>
        </div>

        <!-- FORM CONTENT -->
        <div v-else-if="!isInitializing" class="animate-fade-in space-y-6">
          <!-- Card Glassmorphic -->
          <div class="modal-card space-y-8 bg-gradient-to-b from-[#1A1D24]/90 to-[#0F1115]/95 backdrop-blur-2xl p-6 sm:p-8 rounded-[24px] border border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.4)] relative group/form overflow-visible">
            <!-- Ambient Glow -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Header del Form -->
            <div class="flex items-center gap-3 relative z-10 border-b border-white/5 pb-5">
              <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-[#5da6fc] border border-blue-500/30">
                <HugeiconsIcon :icon="Route01Icon" :size="20" class="drop-shadow-sm" />
              </div>
              <div>
                <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ t('servicios.formSectionData') || 'Datos del Servicio' }}</h3>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">{{ t('servicios.formSectionDataDesc') || 'Asignar ruta, fecha, hora y modo de finalización.' }}</p>
              </div>
            </div>

            <!-- Feedback Message -->
            <Transition name="fade">
              <div v-if="modalMessage"
                   class="flex items-center gap-2.5 p-3.5 rounded-[14px] text-[12px] font-bold border animate-fade-in-up relative z-10"
                   :class="modalMessage.type === 'error'
                     ? 'bg-gradient-to-r from-red-500/10 to-red-500/5 text-red-400 border-red-500/20'
                     : 'bg-gradient-to-r from-[#3b82f6]/10 to-[#3b82f6]/5 text-[#5da6fc] border-[#3b82f6]/20'">
                <HugeiconsIcon :icon="modalMessage.type === 'error' ? Alert01Icon : Tick01Icon" :size="16" />
                {{ modalMessage.text }}
              </div>
            </Transition>

            <!-- Fields -->
            <div class="space-y-5 relative z-10 modal-form-fields">
              <!-- Ruta -->
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                  :class="panelActivo === 'rutas' ? 'text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                >
                  {{ t('servicios.labelRoute') || 'Ruta de Viaje' }}
                </label>
                <button
                  ref="btnRutas"
                  type="button"
                  @click="abrirPanel('rutas')"
                  :disabled="loadingRutas"
                  class="selector-btn"
                  :class="[
                    loadingRutas ? 'opacity-60 cursor-not-allowed' : '',
                    panelActivo === 'rutas'
                      ? 'border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20'
                      : 'hover:border-white/15'
                  ]"
                >
                  <div class="text-slate-400 pr-2 shrink-0">
                    <HugeiconsIcon :icon="Route01Icon" :size="18" :stroke-width="1.8" />
                  </div>
                  <div class="flex-1 flex flex-wrap gap-1.5 py-0.5 min-h-[28px]">
                    <template v-if="formData.id_ruta">
                      <div class="badge-recurso">
                        <span class="truncate">{{ getRutaLabel(formData.id_ruta) }}</span>
                        <button type="button" @click.stop="formData.id_ruta = ''" class="hover:text-red-400 transition-colors shrink-0">
                          <HugeiconsIcon :icon="Cancel01Icon" :size="9" :stroke-width="3" />
                        </button>
                      </div>
                    </template>
                    <span v-else class="text-slate-400 text-[13px] font-medium">
                      {{ loadingRutas ? 'Cargando...' : (t('servicios.placeholderRoute') || 'Seleccione una ruta de destino') }}
                    </span>
                  </div>
                  <div class="text-slate-400 pl-2 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': panelActivo === 'rutas' }">
                    <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2" />
                  </div>
                </button>
              </div>

              <!-- Fila 1: Fecha y Hora -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <AppInput
                  v-model="fechaInicio"
                  type="date"
                  :label="t('servicios.labelDate') || 'Fecha de Inicio'"
                  :icon="Calendar01Icon"
                  class="custom-datetime-input"
                />
                <AppInput
                  v-model="horaInicio"
                  type="time"
                  :label="t('servicios.labelTime') || 'Hora de Inicio'"
                  :icon="Clock01Icon"
                  class="custom-datetime-input"
                />
              </div>

              <!-- Fila 2: Modo Fin -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <AppSelect
                  v-model="formData.modo_fin"
                  :label="t('servicios.labelEndMode') || 'Modo Fin'"
                  :placeholder="t('servicios.placeholderEndMode') || 'Modo de Finalización'"
                  :icon="Clock01Icon"
                  :options="modoFinOptions"
                />
              </div>
            </div>

            <!-- SECCIÓN: SELECTOR DE VEHÍCULOS -->
            <div class="pt-6 border-t border-white/5 space-y-5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-[#5da6fc] border border-blue-500/30">
                  <HugeiconsIcon :icon="Car01Icon" :size="20" class="drop-shadow-sm" />
                </div>
                <div>
                  <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ t('servicios.labelVehicles') || 'Asignación de Vehículos' }}</h3>
                  <p class="text-[11px] text-slate-400 font-medium mt-0.5">{{ t('servicios.labelVehiclesDesc') || 'Seleccionar vehículos de la flota disponible.' }}</p>
                </div>
              </div>

              <div class="grid grid-cols-1">
                <!-- VEHÍCULOS -->
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="panelActivo === 'vehiculos' ? 'text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                  >
                    {{ t('servicios.labelVehiclesAvailable') || 'Vehículos Disponibles' }}
                  </label>
                  <button
                    ref="btnVehiculos"
                    type="button"
                    @click="abrirPanel('vehiculos')"
                    :disabled="loadingVehiculos"
                    class="selector-btn"
                    :class="[
                      loadingVehiculos ? 'opacity-60 cursor-not-allowed' : '',
                      panelActivo === 'vehiculos'
                        ? 'border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20'
                        : 'hover:border-white/15'
                    ]"
                  >
                    <div class="text-slate-400 pr-2 shrink-0">
                      <HugeiconsIcon :icon="Car01Icon" :size="18" :stroke-width="1.8" />
                    </div>
                    <div class="flex-1 flex flex-wrap gap-1.5 py-0.5 min-h-[28px]">
                      <template v-if="selectedVehiculosIds.length > 0">
                        <template v-if="selectedVehiculosIds.length <= 2">
                          <div
                            v-for="id in selectedVehiculosIds"
                            :key="id"
                            class="badge-recurso"
                          >
                            <span class="truncate max-w-[80px]">{{ getVehiculoLabel(id) }}</span>
                            <button type="button" @click.stop="selectVehiculo(id)" class="hover:text-red-400 transition-colors shrink-0">
                              <HugeiconsIcon :icon="Cancel01Icon" :size="9" :stroke-width="3" />
                            </button>
                          </div>
                        </template>
                        <template v-else>
                          <div class="badge-recurso">
                            <span>{{ selectedVehiculosIds.length }} vehículos</span>
                            <button type="button" @click.stop="clearVehiculos" class="hover:text-red-400 transition-colors shrink-0">
                              <HugeiconsIcon :icon="Cancel01Icon" :size="9" :stroke-width="3" />
                            </button>
                          </div>
                        </template>
                      </template>
                      <span v-else class="text-slate-400 text-[13px] font-medium">
                        {{ loadingVehiculos ? 'Cargando...' : (t('servicios.placeholderVehicles') || 'Seleccione vehículos') }}
                      </span>
                    </div>
                    <div class="text-slate-400 pl-2 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': panelActivo === 'vehiculos' }">
                      <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 justify-end pt-2 relative z-10">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              {{ t('common.cancel') || 'Cancelar' }}
            </AppButton>
            <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="handleCreate">
              {{ t('servicios.btnRegister') || 'Registrar Servicio' }}
            </AppButton>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>

  <!-- PANEL FLOTANTE DE SELECCIÓN — Teleport fuera del modal -->
  <Teleport to="body">
    <Transition name="panel-flotante">
      <div
        v-if="panelActivo && isOpen && !isSuccess && !isInitializing"
        class="panel-flotante-recursos fixed z-[200] flex flex-col overflow-hidden"
        :style="{
          top: panelStyle.top,
          left: panelStyle.left,
          width: '356px',
          height: panelStyle.height,
        }"
      >
        <!-- Franja superior de color -->
        <div class="panel-acento shrink-0" />

        <!-- ========== CABECERA ========== -->
        <div class="panel-head px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="panel-head-icon">
              <HugeiconsIcon :icon="panelActivo === 'rutas' ? Route01Icon : Car01Icon" :size="17" />
            </div>
            <div>
              <h4 class="text-[12px] font-black text-white tracking-tight">
                {{ panelActivo === 'rutas' ? (t('servicios.panelRoutesTitle') || 'Rutas disponibles') : (t('servicios.panelVehiclesTitle') || 'Vehículos disponibles') }}
              </h4>
              <p class="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                {{
                  panelActivo === 'rutas'
                    ? `${filteredRutas.length} ${t('servicios.panelRoutesCount') || 'rutas'}`
                    : `${filteredVehiculos.length} ${t('servicios.panelVehiclesCount') || 'en flota'}`
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

        <!-- ========== BUSCADOR ========== -->
        <div class="px-4 pb-3 shrink-0">
          <div class="panel-search-wrap">
            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 shrink-0" />
            <input
              v-if="panelActivo === 'rutas'"
              v-model="searchRutasQuery"
              type="text"
              :placeholder="t('common.search') || 'Buscar ruta...'"
              class="panel-search-input"
              @click.stop
            />
            <input
              v-else
              v-model="searchQuery"
              type="text"
              :placeholder="t('common.search') || 'Nombre, placa o tipo...'"
              class="panel-search-input"
              @click.stop
            />
            <button
              v-if="(panelActivo === 'rutas' && searchRutasQuery) || (panelActivo === 'vehiculos' && searchQuery)"
              type="button"
              @click.stop="panelActivo === 'rutas' ? searchRutasQuery = '' : searchQuery = ''"
              class="text-slate-400 hover:text-slate-300 transition-colors shrink-0"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="11" />
            </button>
          </div>
        </div>

        <!-- ========== BARRA CONTROL (solo vehiculos) ========== -->
        <div v-if="panelActivo === 'vehiculos'" class="px-4 py-1.5 flex items-center justify-between shrink-0 border-y border-white/5">
          <span class="text-[10px] font-bold tabular-nums text-blue-500 dark:text-blue-400">
            {{ selectedVehiculosIds.length }} {{ t('servicios.panelSelected') || 'seleccionados' }}
          </span>
          <div class="flex items-center gap-3 text-[10px] font-semibold">
            <button
              type="button"
              @click.stop="selectAllVehiculos()"
              class="text-slate-400 hover:text-[#5da6fc] transition-colors"
            >
              {{ t('servicios.panelAll') || 'Todos' }}
            </button>
            <span class="w-px h-3 bg-white/10"></span>
            <button
              type="button"
              @click.stop="clearVehiculos()"
              class="text-slate-400 hover:text-red-400 transition-colors"
            >
              {{ t('servicios.panelClear') || 'Limpiar' }}
            </button>
          </div>
        </div>

        <!-- ========== LISTADO ========== -->
        <div class="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
          <!-- Rutas -->
          <template v-if="panelActivo === 'rutas'">
            <button
              v-for="r in filteredRutas"
              :key="r.id_ruta"
              type="button"
              @click="selectRuta(r.id_ruta)"
              class="panel-row group/row"
              :class="formData.id_ruta === r.id_ruta ? 'panel-row--on' : 'panel-row--off'"
            >
              <div
                class="panel-row-dot shrink-0"
                :class="formData.id_ruta === r.id_ruta ? 'panel-row-dot--on' : 'panel-row-dot--off'"
              >
                <HugeiconsIcon v-if="formData.id_ruta === r.id_ruta" :icon="Tick01Icon" :size="9" :stroke-width="3" />
              </div>
              <div class="flex flex-col flex-1 min-w-0 text-left">
                <span class="text-[12px] font-semibold truncate leading-snug">{{ r.nombre }}</span>
              </div>
            </button>
            <div v-if="filteredRutas.length === 0" class="panel-empty">
              <HugeiconsIcon :icon="Route01Icon" :size="24" class="opacity-30 mb-2" />
              <span>{{ searchRutasQuery ? 'No se encontraron rutas.' : 'Sin rutas disponibles' }}</span>
            </div>
          </template>

          <!-- Vehículos -->
          <template v-else>
            <button
              v-for="v in filteredVehiculos"
              :key="v.id_vehiculo"
              type="button"
              @click="selectVehiculo(v.id_vehiculo)"
              class="panel-row group/row"
              :class="selectedVehiculosIds.includes(v.id_vehiculo) ? 'panel-row--on' : 'panel-row--off'"
            >
              <div
                class="panel-row-dot shrink-0"
                :class="selectedVehiculosIds.includes(v.id_vehiculo) ? 'panel-row-dot--on' : 'panel-row-dot--off'"
              >
                <HugeiconsIcon v-if="selectedVehiculosIds.includes(v.id_vehiculo)" :icon="Tick01Icon" :size="9" :stroke-width="3" />
              </div>
              <div class="flex flex-col flex-1 min-w-0 text-left">
                <span class="text-[12px] font-semibold truncate leading-snug">
                  {{ v.nombre }}
                  <span class="text-[10px] font-mono opacity-50 ml-1">{{ v.placa }}</span>
                </span>
                <span class="text-[10px] truncate leading-none mt-0.5 text-slate-400">{{ v.tipo }}</span>
              </div>
            </button>
            <div v-if="filteredVehiculos.length === 0" class="panel-empty">
              <HugeiconsIcon :icon="Car01Icon" :size="24" class="opacity-30 mb-2" />
              <span>{{ searchQuery ? 'No se encontraron vehículos.' : (t('servicios.noVehiclesAvailable') || 'Sin vehículos disponibles') }}</span>
            </div>
          </template>
        </div>

        <!-- ========== FOOTER ========== -->
        <div class="px-4 py-3.5 shrink-0 panel-footer">
          <button
            type="button"
            @click="cerrarPanel"
            class="panel-confirm-btn"
          >
            <HugeiconsIcon :icon="Tick01Icon" :size="14" />
            {{ panelActivo === 'rutas' ? (t('servicios.panelConfirmRoute') || 'Confirmar Ruta') : (t('servicios.panelConfirm') || 'Confirmar Selección') }}
            <template v-if="panelActivo === 'rutas' && formData.id_ruta">(1)</template>
            <template v-else-if="panelActivo === 'vehiculos'">({{ selectedVehiculosIds.length }})</template>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* =====================================================
   SELECTOR BUTTONS (dentro del formulario)
===================================================== */
.selector-btn {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  background: linear-gradient(180deg, rgba(32,36,45,0.9) 0%, rgba(19,22,28,0.95) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 0.5rem 1rem;
  text-align: left;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
}
.selector-btn:hover {
  border-color: rgba(255,255,255,0.15);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
}
.selector-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03);
}
.selector-btn.border-\[\#3b82f6\] {
  border-color: rgba(59,130,246,0.5);
  box-shadow: 0 4px 16px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08);
}

.badge-recurso {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(59,130,246,0.15);
  color: #5da6fc;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid rgba(59,130,246,0.25);
}

/* =====================================================
   PANEL FLOTANTE — Estructura
===================================================== */
.panel-flotante-recursos {
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(26,29,36,0.95) 0%, rgba(15,17,21,0.98) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 32px 64px -12px rgba(0,0,0,0.5),
    0 8px 24px -4px rgba(0,0,0,0.3);
}
:global(.dark) .panel-flotante-recursos {
  background: linear-gradient(180deg, rgba(26,29,36,0.95) 0%, rgba(15,17,21,0.98) 100%);
  border-color: rgba(255,255,255,0.07);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 32px 64px -12px rgba(0,0,0,0.55),
    0 8px 24px -4px rgba(0,0,0,0.3);
}

/* Franja de acento superior */
.panel-acento {
  height: 3px;
  width: 100%;
  border-radius: 18px 18px 0 0;
  background: linear-gradient(90deg, #3b82f6, #5da6fc);
}

/* Cabecera */
.panel-head {
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.panel-head-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(59,130,246,0.15);
  color: #5da6fc;
  border: 1px solid rgba(59,130,246,0.25);
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
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
}

/* Buscador */
.panel-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 8px 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.panel-search-wrap:focus-within {
  border-color: #5da6fc;
  box-shadow: 0 0 0 3px rgba(93,166,252,0.12);
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
.panel-search-input::placeholder { color: #475569; }

/* Filas del listado */
.panel-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  cursor: pointer;
  transition: background 0.12s ease;
  outline: none;
  color: #cbd5e1;
}
.panel-row--off:hover { background: rgba(255,255,255,0.04); }

.panel-row--on { background: transparent; }
.panel-row--on:hover { background: rgba(255,255,255,0.03); }

/* Indicador circular de selección */
.panel-row-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.panel-row-dot--off {
  border: 1.5px solid rgba(100,116,139,0.5);
}

.panel-row-dot--on {
  color: #fff;
  background: #3b82f6;
}

/* Estado vacío */
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

/* Footer */
.panel-footer {
  border-top: 1px solid rgba(255,255,255,0.06);
}

.panel-confirm-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 16px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #3b82f6;
  box-shadow: 0 2px 12px rgba(59,130,246,0.35), 0 1px 3px rgba(59,130,246,0.2);
  transition: all 0.15s ease;
  letter-spacing: 0.01em;
}
.panel-confirm-btn:hover {
  background: #2563eb;
  box-shadow: 0 4px 16px rgba(59,130,246,0.45);
}
.panel-confirm-btn:active { transform: translateY(1px); }

/* Animaciones */
.animate-fade-in {
  animation: fadeIn 0.5s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(1.03);
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Animación del panel flotante */
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

/* Scrollbar del panel */
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

/* Inputs de fecha/hora */
:deep(.custom-datetime-input input[type="date"]),
:deep(.custom-datetime-input input[type="time"]) {
  position: relative;
  cursor: pointer;
}

:deep(.custom-datetime-input input[type="date"]::-webkit-calendar-picker-indicator),
:deep(.custom-datetime-input input[type="time"]::-webkit-calendar-picker-indicator) {
  background: transparent;
  bottom: 0;
  color: transparent;
  cursor: pointer;
  height: auto;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: auto;
  z-index: 10;
}

/* Overrides para inputs dentro del modal - estilo glassmorphism dark */
:deep(.modal-card .bg-slate-50) {
  background: linear-gradient(180deg, rgba(32,36,45,0.9) 0%, rgba(19,22,28,0.95) 100%) !important;
}

:deep(.modal-card .border-slate-200) {
  border-color: rgba(255,255,255,0.08) !important;
}

:deep(.modal-card .text-slate-800) {
  color: #e2e8f0 !important;
}

:deep(.modal-card .placeholder-slate-400) {
  color: #475569 !important;
}

:deep(.modal-card .placeholder-slate-600) {
  color: #475569 !important;
}

:deep(.modal-card .text-slate-700) {
  color: #e2e8f0 !important;
}

:deep(.modal-card .bg-white) {
  background: linear-gradient(180deg, rgba(26,29,36,0.98) 0%, rgba(15,17,21,0.99) 100%) !important;
}
</style>
