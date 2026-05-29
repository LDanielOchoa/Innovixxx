<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  User02Icon,
  ContactBookIcon,
  SmartPhone01Icon,
  Mail01Icon,
  Tick01Icon,
  Alert01Icon,
  Cancel01Icon,
  Loading03Icon,
  Shield02Icon,
  Route01Icon,
  Car01Icon,
  CpuIcon,
  LicenseIcon,
  Search01Icon,
  ArrowDown01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import { createEscoltaApi } from '../services/escoltas.api'
import { createEscoltaSchema } from '../../../schemas/escoltas.schema'
import { useFormValidator } from '../../../composables/useFormValidator'
import { fetchServiciosDropdownApi } from '../../servicios/services/servicios.api'
import { fetchVehiculosServicioSimpleApi, type VehiculoServicioSimple } from '../../vehiculos-servicio/services/vehiculos-servicio.api'
import { fetchHardwareSimplesApi } from '../../servicios/services/servicios.api'
import type { Servicio } from '../../servicios/types/servicio'
import type { HardwareSimple } from '../../servicios/types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppDateTimePicker from '../../../components/ui/AppDateTimePicker.vue'

const { t } = useI18n()
const groupStore = useGroupStore()

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['update:isOpen', 'created'])

const { validate } = useFormValidator(createEscoltaSchema as any)

const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const formData = reactive({
  nombre: '',
  cedula: '',
  email: '',
  celular: '',
  id_servicio: '',
  id_vehiculo: '',
  id_hardware: '',
  tipo_pase: '',
  pase: '',
  pase_vence: null as Date | null
})

const servicios = ref<Servicio[]>([])
const vehiculosList = ref<VehiculoServicioSimple[]>([])
const hardwareList = ref<HardwareSimple[]>([])

const loadingServicios = ref(false)
const loadingVehiculosServicio = ref(false)
const loadingHardware = ref(false)

// Panel flotante
const panelActivo = ref<'servicios' | 'vehiculos' | 'hardware' | 'tipoPase' | null>(null)
const btnServicios = ref<HTMLElement | null>(null)
const btnVehiculos = ref<HTMLElement | null>(null)
const btnHardware = ref<HTMLElement | null>(null)
const btnTipoPase = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string; left: string; height: string }>({
  top: '0px',
  left: '0px',
  height: '400px'
})

// Búsqueda local
const searchServiciosQuery = ref('')
const searchVehiculosQuery = ref('')
const searchHardwareQuery = ref('')
const searchTipoPaseQuery = ref('')

const tipoPaseOptions = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'B3', label: 'B3' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
  { value: 'C3', label: 'C3' }
]

// Filtrado reactivo
const filteredServicios = computed(() => {
  const q = searchServiciosQuery.value.toLowerCase().trim()
  if (!q) return servicios.value
  return servicios.value.filter(s =>
    s.id_servicio.toLowerCase().includes(q) ||
    (s.fecha_inicio && s.fecha_inicio.toLowerCase().includes(q))
  )
})

const filteredVehiculos = computed(() => {
  const q = searchVehiculosQuery.value.toLowerCase().trim()
  if (!q) return vehiculosList.value
  return vehiculosList.value.filter(v =>
    v.placa.toLowerCase().includes(q) ||
    v.tipo.toLowerCase().includes(q)
  )
})

const filteredHardware = computed(() => {
  const q = searchHardwareQuery.value.toLowerCase().trim()
  if (!q) return hardwareList.value
  return hardwareList.value.filter(h =>
    h.nombre.toLowerCase().includes(q)
  )
})

const filteredTipoPase = computed(() => {
  const q = searchTipoPaseQuery.value.toLowerCase().trim()
  if (!q) return tipoPaseOptions
  return tipoPaseOptions.filter(t => t.value.toLowerCase().includes(q))
})

// Calcular posición del panel
const calcularPosicionPanel = (btnRef: HTMLElement | null) => {
  if (!btnRef) return
  const modalEl = document.querySelector('[role="dialog"] .sm\\:my-8') as HTMLElement
  if (!modalEl) return
  const modalRect = modalEl.getBoundingClientRect()
  const panelWidth = 356
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
  panelStyle.value = { top: `${top}px`, left: `${left}px`, height: `${panelHeight}px` }
}

const abrirPanel = async (tipo: 'servicios' | 'vehiculos' | 'hardware' | 'tipoPase') => {
  if (panelActivo.value === tipo) {
    panelActivo.value = null
    return
  }
  panelActivo.value = tipo
  await nextTick()
  const refMap = { servicios: btnServicios.value, vehiculos: btnVehiculos.value, hardware: btnHardware.value, tipoPase: btnTipoPase.value }
  calcularPosicionPanel(refMap[tipo])
}

const cerrarPanel = () => {
  panelActivo.value = null
}

const selectServicio = (id: string) => {
  formData.id_servicio = id
}

const selectVehiculo = (id: string) => {
  formData.id_vehiculo = id
}

const selectHardware = (id: string) => {
  formData.id_hardware = id
}

const selectTipoPase = (value: string) => {
  formData.tipo_pase = value
}

const getServicioLabel = (id: string) => {
  const s = servicios.value.find(item => item.id_servicio === id)
  return s ? `${s.id_servicio}${s.fecha_inicio ? ` - ${s.fecha_inicio}` : ''}` : id
}

const getVehiculoLabel = (id: string) => {
  const v = vehiculosList.value.find(item => item.id_vehiculo === id)
  return v ? `${v.placa}${v.tipo ? ` (${v.tipo})` : ''}` : id
}

const getHardwareLabel = (id: string) => {
  const h = hardwareList.value.find(item => item.id_hardware === id)
  return h ? h.nombre : id
}

// Click outside handler
const handleClickOutside = (event: MouseEvent) => {
  if (!panelActivo.value) return
  const target = event.target as HTMLElement
  const panelEl = document.querySelector('.panel-flotante-escolta')
  if (panelEl && panelEl.contains(target)) return
  const botones = [btnServicios.value, btnVehiculos.value, btnHardware.value, btnTipoPase.value]
  if (botones.some(btn => btn && btn.contains(target))) return
  panelActivo.value = null
}

const handleResize = () => {
  if (!panelActivo.value) return
  const refMap = { servicios: btnServicios.value, vehiculos: btnVehiculos.value, hardware: btnHardware.value, tipoPase: btnTipoPase.value }
  calcularPosicionPanel(refMap[panelActivo.value])
}

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    panelActivo.value = null
    searchServiciosQuery.value = ''
    searchVehiculosQuery.value = ''
    searchHardwareQuery.value = ''
    searchTipoPaseQuery.value = ''
    Object.assign(formData, {
      nombre: '', cedula: '', email: '', celular: '',
      id_servicio: '', id_vehiculo: '', id_hardware: '',
      tipo_pase: '', pase: '', pase_vence: null
    })

    if (groupStore.selectedGroup?.id) {
      loadingServicios.value = true
      loadingVehiculosServicio.value = true
      loadingHardware.value = true

      // Cargar independientemente para que un error no bloquee los demás
      try {
        const serviciosData = await fetchServiciosDropdownApi(groupStore.selectedGroup.id)
        servicios.value = serviciosData
      } catch (error) {
        console.error('Error al cargar servicios:', error)
      } finally {
        loadingServicios.value = false
      }

      try {
        const vehiculosData = await fetchVehiculosServicioSimpleApi(groupStore.selectedGroup.id)
        vehiculosList.value = vehiculosData
        console.log('Vehiculos cargados:', vehiculosData)
      } catch (error) {
        console.error('Error al cargar vehiculos:', error)
      } finally {
        loadingVehiculosServicio.value = false
      }

      try {
        const hardwareData = await fetchHardwareSimplesApi(groupStore.selectedGroup.id)
        hardwareList.value = hardwareData
      } catch (error) {
        console.error('Error al cargar hardware:', error)
      } finally {
        loadingHardware.value = false
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  } else {
    panelActivo.value = null
  }
})

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
    showMessage(t('escoltas.alertNoGroup') || 'Seleccione un grupo válido', 'error')
    return
  }

  saving.value = true
  modalMessage.value = null

  const payload = {
    nombre: formData.nombre,
    cedula: formData.cedula,
    email: formData.email || '',
    celular: formData.celular || '',
    id_grupo: groupStore.selectedGroup.id,
    id_servicio: formData.id_servicio || '',
    id_vehiculo: formData.id_vehiculo || '',
    id_hardware: formData.id_hardware || '',
    tipo_pase: formData.tipo_pase || '',
    pase: formData.pase || '',
    pase_vence: formatFecha(formData.pase_vence)
  }

  if (!validate(payload, 'escolta-create-form')) {
    saving.value = false
    return
  }

  try {
    const data = await createEscoltaApi(payload)
    if (data.done) {
      isSuccess.value = true
      emit('created')
    } else {
      showMessage(data.message || (t('escoltas.alertErrorCreate') || 'Error al registrar'), 'error')
    }
  } catch (error: any) {
    console.error('Error creating escolta:', error)
    showMessage(error.message || (t('escoltas.alertNetError') || 'Error de conexión'), 'error')
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:isOpen', false)
}

const formatFecha = (date: Date | null): string => {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    @confirm="handleCreate"
    :title="t('escoltas.modalTitleCreate', 'Nuevo Escolta')"
    :confirm-text="t('escoltas.btnRegister', 'Registrar Escolta')"
    size="xl"
    :show-footer="!isSuccess && !isInitializing"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Shield02Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-5 relative p-1 modal-escolta-content">
      <!-- OVERLAY DE CARGA -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Registrando Escolta...</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- SKELETON STATE -->
      <div v-if="isInitializing" class="space-y-6 animate-pulse p-2">
        <div class="grid grid-cols-2 gap-4">
          <div v-for="i in 4" :key="i" class="space-y-3">
            <div class="h-2 w-20 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
            <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
          </div>
        </div>
        <div class="space-y-3 pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div class="h-2 w-24 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="grid grid-cols-3 gap-4">
            <div v-for="i in 3" :key="i" class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
          </div>
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
          <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">Escolta Registrado Exitosamente</h3>
          <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[320px]">
            El agente escolta ha sido registrado exitosamente en el sistema.
          </p>
          <div class="pt-4">
            <button
              @click="handleClose"
              class="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 px-6 py-3 text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] transition-all duration-300 shadow-sm active:scale-[0.98]"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="16" :stroke-width="2" />
              Cerrar Ventana
            </button>
          </div>
        </div>

        <!-- FORM CONTENT -->
        <div v-else-if="!isInitializing" class="animate-fade-in space-y-6">
          <div class="space-y-5">
            <AppInput
              v-model="formData.nombre"
              :label="t('escoltas.labelName', 'Nombre Completo')"
              :placeholder="t('escoltas.placeholderName', 'Ej: Pepito Pérez')"
              :icon="User02Icon"
            />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AppInput
                v-model="formData.cedula"
                :label="t('escoltas.labelDoc', 'Documento (Cédula)')"
                :placeholder="t('escoltas.placeholderDoc', 'Ej: 79065744')"
                :icon="ContactBookIcon"
              />
              <AppInput
                v-model="formData.celular"
                :label="t('escoltas.labelMobile', 'Celular')"
                :placeholder="t('escoltas.placeholderMobile', 'Ej: 3023014514')"
                :icon="SmartPhone01Icon"
              />
            </div>

            <AppInput
              v-model="formData.email"
              :label="t('escoltas.labelEmail', 'Correo Electrónico')"
              :placeholder="t('escoltas.placeholderEmail', 'Ej: escolta@email.com')"
              :icon="Mail01Icon"
              type="email"
            />

            <div class="pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Servicio -->
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="panelActivo === 'servicios' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                  >
                    {{ t('escoltas.labelService', 'Servicio') }}
                  </label>
                  <button
                    ref="btnServicios"
                    type="button"
                    @click="abrirPanel('servicios')"
                    :disabled="loadingServicios"
                    class="w-full flex items-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300 text-left"
                    :class="[
                      loadingServicios ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-white/10',
                      panelActivo === 'servicios' ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : ''
                    ]"
                  >
                    <HugeiconsIcon :icon="Route01Icon" :size="18" class="text-slate-400 dark:text-slate-500 mr-2 shrink-0" :class="panelActivo === 'servicios' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : ''" />
                    <span class="flex-1 text-sm font-medium truncate" :class="formData.id_servicio ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
                      {{ formData.id_servicio ? getServicioLabel(formData.id_servicio) : (loadingServicios ? 'Cargando...' : t('escoltas.placeholderService', 'Seleccione un servicio')) }}
                    </span>
                    <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" class="text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': panelActivo === 'servicios' }" />
                  </button>
                </div>

                <!-- Vehículo -->
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="panelActivo === 'vehiculos' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                  >
                    {{ t('escoltas.labelVehicle', 'Vehículo de Servicio') }}
                  </label>
                  <button
                    ref="btnVehiculos"
                    type="button"
                    @click="abrirPanel('vehiculos')"
                    :disabled="loadingVehiculosServicio"
                    class="w-full flex items-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300 text-left"
                    :class="[
                      loadingVehiculosServicio ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-white/10',
                      panelActivo === 'vehiculos' ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : ''
                    ]"
                  >
                    <HugeiconsIcon :icon="Car01Icon" :size="18" class="text-slate-400 dark:text-slate-500 mr-2 shrink-0" :class="panelActivo === 'vehiculos' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : ''" />
                    <span class="flex-1 text-sm font-medium truncate" :class="formData.id_vehiculo ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
                      {{ formData.id_vehiculo ? getVehiculoLabel(formData.id_vehiculo) : (loadingVehiculosServicio ? 'Cargando...' : t('escoltas.placeholderVehicle', 'Seleccione un vehículo')) }}
                    </span>
                    <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" class="text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': panelActivo === 'vehiculos' }" />
                  </button>
                </div>

                <!-- Hardware -->
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="panelActivo === 'hardware' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                  >
                    {{ t('escoltas.labelHardware', 'Dispositivo Hardware') }}
                  </label>
                  <button
                    ref="btnHardware"
                    type="button"
                    @click="abrirPanel('hardware')"
                    :disabled="loadingHardware"
                    class="w-full flex items-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300 text-left"
                    :class="[
                      loadingHardware ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-white/10',
                      panelActivo === 'hardware' ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : ''
                    ]"
                  >
                    <HugeiconsIcon :icon="CpuIcon" :size="18" class="text-slate-400 dark:text-slate-500 mr-2 shrink-0" :class="panelActivo === 'hardware' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : ''" />
                    <span class="flex-1 text-sm font-medium truncate" :class="formData.id_hardware ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
                      {{ formData.id_hardware ? getHardwareLabel(formData.id_hardware) : (loadingHardware ? 'Cargando...' : t('escoltas.placeholderHardware', 'Seleccione un dispositivo')) }}
                    </span>
                    <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" class="text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': panelActivo === 'hardware' }" />
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Tipo de Pase -->
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                  :class="panelActivo === 'tipoPase' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                >
                  {{ t('escoltas.labelPassType', 'Tipo de Pase') }}
                </label>
                <button
                  ref="btnTipoPase"
                  type="button"
                  @click="abrirPanel('tipoPase')"
                  class="w-full flex items-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300 text-left"
                  :class="panelActivo === 'tipoPase' ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : 'hover:border-slate-300 dark:hover:border-white/10'"
                >
                  <HugeiconsIcon :icon="LicenseIcon" :size="18" class="text-slate-400 dark:text-slate-500 mr-2 shrink-0" :class="panelActivo === 'tipoPase' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : ''" />
                  <span class="flex-1 text-sm font-medium truncate" :class="formData.tipo_pase ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
                    {{ formData.tipo_pase || t('escoltas.placeholderPassType', 'Seleccione tipo de pase') }}
                  </span>
                  <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" class="text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': panelActivo === 'tipoPase' }" />
                </button>
              </div>
              <AppInput
                v-model="formData.pase"
                :label="t('escoltas.labelPass', 'Número de Pase')"
                :placeholder="t('escoltas.placeholderPass', 'Ej: 79065744')"
                :icon="ContactBookIcon"
              />
              <AppDateTimePicker
                v-model="formData.pase_vence"
                :label="t('escoltas.labelPassExpiry', 'Vencimiento del Pase')"
                :placeholder="t('escoltas.placeholderPassExpiry', 'Seleccione fecha')"
              />
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>

  <!-- Panel flotante de selección -->
  <Teleport to="body">
    <Transition name="panel-flotante">
      <div
        v-if="panelActivo && isOpen && !isSuccess && !isInitializing"
        class="panel-flotante-escolta fixed z-[200] flex flex-col overflow-hidden"
        :style="{
          top: panelStyle.top,
          left: panelStyle.left,
          width: '356px',
          height: panelStyle.height,
        }"
      >
        <div class="h-1 bg-gradient-to-r from-[#3b82f6] to-[#5da6fc] shrink-0" />

        <div class="bg-[#1A1D24] px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center text-[#5da6fc]">
              <HugeiconsIcon
                :icon="panelActivo === 'servicios' ? Route01Icon : panelActivo === 'vehiculos' ? Car01Icon : panelActivo === 'hardware' ? CpuIcon : LicenseIcon"
                :size="17"
              />
            </div>
            <div>
              <h4 class="text-[12px] font-black text-white tracking-tight">
                {{ panelActivo === 'servicios' ? 'Servicios disponibles' : panelActivo === 'vehiculos' ? 'Vehículos disponibles' : panelActivo === 'hardware' ? 'Hardware disponible' : 'Tipos de Pase' }}
              </h4>
              <p class="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                {{
                  panelActivo === 'servicios' ? `${filteredServicios.length} servicios` :
                  panelActivo === 'vehiculos' ? `${filteredVehiculos.length} vehículos` :
                  panelActivo === 'hardware' ? `${filteredHardware.length} dispositivos` :
                  `${filteredTipoPase.length} opciones`
                }}
              </p>
            </div>
          </div>
          <button type="button" @click="cerrarPanel" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
          </button>
        </div>

        <div class="bg-[#1A1D24] px-4 pb-3 shrink-0">
          <div class="flex items-center gap-2 bg-[#0F1115] border border-white/5 rounded-lg px-3 py-2">
            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 shrink-0" />
            <input
              v-if="panelActivo === 'servicios'"
              v-model="searchServiciosQuery"
              type="text"
              placeholder="Buscar servicio..."
              class="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
              @click.stop
            />
            <input
              v-else-if="panelActivo === 'vehiculos'"
              v-model="searchVehiculosQuery"
              type="text"
              placeholder="Buscar por placa o tipo..."
              class="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
              @click.stop
            />
            <input
              v-else-if="panelActivo === 'hardware'"
              v-model="searchHardwareQuery"
              type="text"
              placeholder="Buscar hardware..."
              class="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
              @click.stop
            />
            <input
              v-else-if="panelActivo === 'tipoPase'"
              v-model="searchTipoPaseQuery"
              type="text"
              placeholder="Buscar tipo..."
              class="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
              @click.stop
            />
            <button
              v-if="searchServiciosQuery || searchVehiculosQuery || searchHardwareQuery || searchTipoPaseQuery"
              type="button"
              @click.stop="searchServiciosQuery = ''; searchVehiculosQuery = ''; searchHardwareQuery = ''; searchTipoPaseQuery = ''"
              class="text-slate-400 hover:text-slate-300 transition-colors shrink-0"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="11" />
            </button>
          </div>
        </div>

        <div class="bg-[#1A1D24] px-4 py-1.5 flex items-center justify-between shrink-0 border-y border-white/5">
          <span class="text-[10px] font-bold tabular-nums text-blue-400">
            {{ panelActivo === 'servicios' ? (formData.id_servicio ? '1 seleccionado' : 'Sin seleccionar') :
               panelActivo === 'vehiculos' ? (formData.id_vehiculo ? '1 seleccionado' : 'Sin seleccionar') :
               panelActivo === 'hardware' ? (formData.id_hardware ? '1 seleccionado' : 'Sin seleccionar') :
               (formData.tipo_pase ? '1 seleccionado' : 'Sin seleccionar') }}
          </span>
          <button
            type="button"
            @click.stop="panelActivo === 'servicios' ? formData.id_servicio = '' : panelActivo === 'vehiculos' ? formData.id_vehiculo = '' : panelActivo === 'hardware' ? formData.id_hardware = '' : formData.tipo_pase = ''"
            class="text-[10px] font-semibold text-slate-400 hover:text-red-400 transition-colors"
          >
            Limpiar
          </button>
        </div>

        <div class="flex-1 overflow-y-auto bg-[#1A1D24] py-3 space-y-1 px-3">
          <!-- Servicios -->
          <template v-if="panelActivo === 'servicios'">
            <button
              v-for="s in filteredServicios"
              :key="s.id_servicio"
              type="button"
              @click="selectServicio(s.id_servicio)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              :class="formData.id_servicio === s.id_servicio ? 'bg-[#3b82f6]/10 text-[#5da6fc]' : 'text-slate-300 hover:bg-white/5'"
            >
              <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                :class="formData.id_servicio === s.id_servicio ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-slate-500'">
                <HugeiconsIcon v-if="formData.id_servicio === s.id_servicio" :icon="Tick01Icon" :size="10" :stroke-width="3" class="text-white" />
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-[12px] font-semibold truncate">{{ s.id_servicio }}</span>
                <span v-if="s.fecha_inicio" class="text-[10px] text-slate-400 truncate">{{ s.fecha_inicio }}</span>
              </div>
            </button>
            <div v-if="filteredServicios.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-500">
              <HugeiconsIcon :icon="Route01Icon" :size="24" class="opacity-30 mb-2" />
              <span class="text-sm">Sin servicios disponibles</span>
            </div>
          </template>

          <!-- Vehículos -->
          <template v-else-if="panelActivo === 'vehiculos'">
            <button
              v-for="v in filteredVehiculos"
              :key="v.id_vehiculo"
              type="button"
              @click="selectVehiculo(v.id_vehiculo)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              :class="formData.id_vehiculo === v.id_vehiculo ? 'bg-[#3b82f6]/10 text-[#5da6fc]' : 'text-slate-300 hover:bg-white/5'"
            >
              <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                :class="formData.id_vehiculo === v.id_vehiculo ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-slate-500'">
                <HugeiconsIcon v-if="formData.id_vehiculo === v.id_vehiculo" :icon="Tick01Icon" :size="10" :stroke-width="3" class="text-white" />
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-[12px] font-semibold truncate">{{ v.placa }}</span>
                <span class="text-[10px] text-slate-400 truncate">{{ v.tipo }}</span>
              </div>
            </button>
            <div v-if="filteredVehiculos.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-500">
              <HugeiconsIcon :icon="Car01Icon" :size="24" class="opacity-30 mb-2" />
              <span class="text-sm">Sin vehículos disponibles</span>
            </div>
          </template>

          <!-- Hardware -->
          <template v-else-if="panelActivo === 'hardware'">
            <button
              v-for="h in filteredHardware"
              :key="h.id_hardware"
              type="button"
              @click="selectHardware(h.id_hardware)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              :class="formData.id_hardware === h.id_hardware ? 'bg-[#3b82f6]/10 text-[#5da6fc]' : 'text-slate-300 hover:bg-white/5'"
            >
              <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                :class="formData.id_hardware === h.id_hardware ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-slate-500'">
                <HugeiconsIcon v-if="formData.id_hardware === h.id_hardware" :icon="Tick01Icon" :size="10" :stroke-width="3" class="text-white" />
              </div>
              <span class="text-[12px] font-semibold truncate">{{ h.nombre }}</span>
            </button>
            <div v-if="filteredHardware.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-500">
              <HugeiconsIcon :icon="CpuIcon" :size="24" class="opacity-30 mb-2" />
              <span class="text-sm">Sin hardware disponible</span>
            </div>
          </template>

          <!-- Tipo de Pase -->
          <template v-else-if="panelActivo === 'tipoPase'">
            <button
              v-for="t in filteredTipoPase"
              :key="t.value"
              type="button"
              @click="selectTipoPase(t.value)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              :class="formData.tipo_pase === t.value ? 'bg-[#3b82f6]/10 text-[#5da6fc]' : 'text-slate-300 hover:bg-white/5'"
            >
              <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                :class="formData.tipo_pase === t.value ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-slate-500'">
                <HugeiconsIcon v-if="formData.tipo_pase === t.value" :icon="Tick01Icon" :size="10" :stroke-width="3" class="text-white" />
              </div>
              <span class="text-[12px] font-semibold">{{ t.label }}</span>
            </button>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
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

.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.message-fade-enter-active,
.message-fade-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Overrides para inputs dentro del modal */
:deep(.modal-card > div > .bg-slate-50) {
  background: linear-gradient(180deg, rgba(32,36,45,0.9) 0%, rgba(19,22,28,0.95) 100%) !important;
}
:deep(.modal-card > div > .border-slate-200) {
  border-color: rgba(255,255,255,0.08) !important;
}
:deep(.modal-card > div > .text-slate-800) {
  color: #e2e8f0 !important;
}
:deep(.modal-card > div > .placeholder-slate-400) {
  color: #475569 !important;
}
:deep(.modal-card > div > .placeholder-slate-600) {
  color: #475569 !important;
}
:deep(.modal-card > div > .text-slate-700) {
  color: #e2e8f0 !important;
}

.panel-flotante-escolta {
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.panel-flotante-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-flotante-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}
.panel-flotante-enter-from {
  opacity: 0;
  transform: translateX(-12px) scale(0.96);
}
.panel-flotante-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.98);
}
</style>
