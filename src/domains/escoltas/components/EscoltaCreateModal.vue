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
import { createEscoltaApi, updateEscoltaApi } from '../services/escoltas.api'
import { createEscoltaSchema, updateEscoltaSchema } from '../../../schemas/escoltas.schema'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { fetchServiciosDropdownApi } from '../../servicios/services/servicios.api'
import { fetchVehiculosServicioSimpleApi, type VehiculoServicioSimple } from '../../vehiculos-servicio/services/vehiculos-servicio.api'
import { fetchHardwareSimplesApi } from '../../servicios/services/servicios.api'
import type { Servicio } from '../../servicios/types/servicio'
import type { HardwareSimple } from '../../servicios/types/servicio'
import type { Escolta } from '../types/escolta'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppDateTimePicker from '../../../components/ui/AppDateTimePicker.vue'
import { useToast } from 'primevue/usetoast'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'

const { t } = useI18n()
const groupStore = useGroupStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  editItem?: Escolta | null
}>()

const emit = defineEmits(['update:isOpen', 'created', 'updated'])

const esModoEdicion = computed(() => !!props.editItem)
const esquemaActivo = computed(() => esModoEdicion.value ? updateEscoltaSchema : createEscoltaSchema)
const formId = computed(() => esModoEdicion.value ? 'escolta-edit-form' : 'escolta-create-form')
const { validate, getFirstError, resetErrors } = useFormValidator(esquemaActivo as any)
const { getError, clearErrors } = useFormError(formId as any)

const isInitializing = ref(true)
const saving = ref(false)
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
    (s.fecha_inicio && s.fecha_inicio.toLowerCase().includes(q)) ||
    (s.modo_fin && s.modo_fin.toLowerCase().includes(q)) ||
    (s.alcance && s.alcance.toLowerCase().includes(q)) ||
    (s.nivel_riesgo && s.nivel_riesgo.toLowerCase().includes(q)) ||
    (s.estado && s.estado.toLowerCase().includes(q))
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
  if (!s) return id
  const partes = [s.fecha_inicio, s.modo_fin, s.estado].filter(Boolean)
  return partes.join(' · ')
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
    resetErrors(formId.value)
    clearErrors()
    isInitializing.value = true
    saving.value = false
    modalMessage.value = null
    panelActivo.value = null
    searchServiciosQuery.value = ''
    searchVehiculosQuery.value = ''
    searchHardwareQuery.value = ''
    searchTipoPaseQuery.value = ''

    // Pre-poblar si es modo edición
    if (props.editItem) {
      const e = props.editItem
      const parsarFecha = (val: any): Date | null => {
        if (!val) return null
        const d = new Date(val)
        return isNaN(d.getTime()) ? null : d
      }
      Object.assign(formData, {
        nombre: e.nombre || '',
        cedula: e.cedula || '',
        email: e.email || '',
        celular: e.celular || '',
        id_servicio: String(e.id_servicio || ''),
        id_vehiculo: String(e.id_vehiculo || ''),
        id_hardware: String(e.id_hardware || ''),
        tipo_pase: e.tipo_pase || '',
        pase: e.pase || '',
        pase_vence: parsarFecha(e.pase_vence)
      })
    } else {
      Object.assign(formData, {
        nombre: '', cedula: '', email: '', celular: '',
        id_servicio: '', id_vehiculo: '', id_hardware: '',
        tipo_pase: '', pase: '', pase_vence: null
      })
    }

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

const handleGuardar = async () => {
  if (saving.value) return
  clearErrors()
  modalMessage.value = null

  if (!groupStore.selectedGroup?.id) {
    showMessage(t('escoltas.alertNoGroup') || 'Seleccione un grupo válido', 'error')
    return
  }

  saving.value = true

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

  if (!validate(payload, formId.value)) {
    saving.value = false
    showMessage(
      getFirstError(formId.value) || t('escoltas.alertValidation', 'Por favor complete todos los campos obligatorios.'),
      'error'
    )
    return
  }

  try {
    if (esModoEdicion.value && props.editItem) {
      const data = await updateEscoltaApi({ ...payload, id_escolta: props.editItem.id_escolta })
      if (data.done) {
        toast.add({
          severity: 'success',
          summary: t('escoltas.alertSuccessUpdateTitle', 'Escolta Actualizado'),
          detail: data.message || t('escoltas.alertSuccessUpdateDetail', 'El escolta ha sido modificado exitosamente.'),
          life: 4000
        })
        emit('updated')
        handleClose()
      } else {
        showMessage(data.message || (t('escoltas.alertErrorUpdate') || 'Error al actualizar'), 'error')
      }
    } else {
      const data = await createEscoltaApi(payload)
      if (data.done) {
        toast.add({
          severity: 'success',
          summary: t('escoltas.alertSuccessCreateTitle', 'Escolta Registrado'),
          detail: data.message || t('escoltas.alertSuccessCreateDetail', 'El escolta ha sido registrado exitosamente.'),
          life: 4000
        })
        emit('created')
        Object.assign(formData, {
          nombre: '', cedula: '', email: '', celular: '',
          id_servicio: '', id_vehiculo: '', id_hardware: '',
          tipo_pase: '', pase: '', pase_vence: null
        })
        resetErrors(formId.value)
        clearErrors()
      } else {
        showMessage(data.message || (t('escoltas.alertErrorCreate') || 'Error al registrar'), 'error')
      }
    }
  } catch (error: any) {
    console.error('Error guardando escolta:', error)
    if (error instanceof ApiError || (error && typeof error === 'object' && ('code' in error || error.name === 'ApiError'))) {
      const code = error.code
      let msg = ''
      if (code === 400 || code === 500 || code === 422) {
        msg = error.message || getErrorMessage(code)
      } else {
        msg = getErrorMessage(code) || error.message
      }
      showMessage(msg, 'error')
    } else {
      showMessage(error.message || (t('escoltas.alertNetError') || 'Error de conexión'), 'error')
    }
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  if (saving.value) return
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
    @confirm="handleGuardar"
    :close-on-click-outside="!saving"
    :title="esModoEdicion ? t('escoltas.modalTitleEdit', 'Editar Escolta') : t('escoltas.modalTitleCreate', 'Nuevo Escolta')"
    :confirm-text="esModoEdicion ? t('escoltas.btnSave', 'Guardar Cambios') : t('escoltas.btnRegister', 'Registrar Escolta')"
    size="xl"
    :show-footer="!isInitializing"
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
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">{{ esModoEdicion ? 'Actualizando Escolta...' : 'Registrando Escolta...' }}</span>
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

      <!-- FORM CONTENT -->
      <div v-else class="animate-fade-in space-y-6">
          <div class="space-y-5">
            <AppInput
              v-model="formData.nombre"
              :label="t('escoltas.labelName', 'Nombre Completo')"
              :placeholder="t('escoltas.placeholderName', 'Ej: Pepito Pérez')"
              :icon="User02Icon"
              :disabled="saving"
            />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AppInput
                v-model="formData.cedula"
                :label="t('escoltas.labelDoc', 'Documento (Cédula)')"
                :placeholder="t('escoltas.placeholderDoc', 'Ej: 79065744')"
                :icon="ContactBookIcon"
                :disabled="saving"
              />
              <AppInput
                v-model="formData.celular"
                :label="t('escoltas.labelMobile', 'Celular')"
                :placeholder="t('escoltas.placeholderMobile', 'Ej: 3023014514')"
                :icon="SmartPhone01Icon"
                :disabled="saving"
              />
            </div>

            <AppInput
              v-model="formData.email"
              :label="t('escoltas.labelEmail', 'Correo Electrónico')"
              :placeholder="t('escoltas.placeholderEmail', 'Ej: escolta@email.com')"
              :icon="Mail01Icon"
              type="email"
              :disabled="saving"
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
                    :disabled="loadingServicios || saving"
                    class="w-full flex items-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300 text-left"
                    :class="[
                      (loadingServicios || saving) ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-white/10',
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
                    :disabled="loadingVehiculosServicio || saving"
                    class="w-full flex items-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300 text-left"
                    :class="[
                      (loadingVehiculosServicio || saving) ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-white/10',
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
                    :disabled="loadingHardware || saving"
                    class="w-full flex items-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300 text-left"
                    :class="[
                      (loadingHardware || saving) ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-white/10',
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
                  :disabled="saving"
                  class="w-full flex items-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300 text-left"
                  :class="[
                    saving ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-white/10',
                    panelActivo === 'tipoPase' ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : ''
                  ]"
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
                :disabled="saving"
              />
              <AppDateTimePicker
                v-model="formData.pase_vence"
                :label="t('escoltas.labelPassExpiry', 'Vencimiento del Pase')"
                :placeholder="t('escoltas.placeholderPassExpiry', 'Seleccione fecha')"
                :disabled="saving"
                only-date
              />
            </div>
          </div>
        </div>
      </div>

    <template #footer>
      <div class="flex flex-col sm:flex-row w-full gap-3 justify-end">
        <button
          type="button"
          :disabled="saving"
          @click="handleClose"
          class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-6 py-3 bg-white dark:bg-[#1A1D24] text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] focus:outline-none transition-all duration-300 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ t('common.cancel', 'Cancelar') }}
        </button>
        <button
          type="button"
          :disabled="saving"
          @click="handleGuardar"
          class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)] focus:outline-none transition-all duration-200 border border-[#2563eb] dark:border-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {{ esModoEdicion ? t('escoltas.btnSave', 'Guardar Cambios') : t('escoltas.btnRegister', 'Registrar Escolta') }}
        </button>
      </div>
    </template>
  </AppModal>

  <!-- Panel flotante de selección -->
  <Teleport to="body">
    <Transition name="panel-flotante">
      <div
        v-if="panelActivo && isOpen && !isInitializing"
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
              <div class="flex flex-col min-w-0 gap-0.5">
                <span class="text-[12px] font-semibold truncate">{{ s.fecha_inicio || '—' }}</span>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span v-if="s.modo_fin" class="text-[10px] text-slate-400 truncate">{{ s.modo_fin }}</span>
                  <span
                    v-if="s.estado"
                    class="text-[9px] rounded px-1 py-0.5 font-semibold leading-none"
                    :class="s.estado === 'EN ESPERA' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'"
                  >{{ s.estado }}</span>
                  <span v-if="s.nivel_riesgo && s.nivel_riesgo !== 'ND'" class="text-[9px] bg-amber-500/10 text-amber-400 rounded px-1 py-0.5 font-semibold leading-none">{{ s.nivel_riesgo }}</span>
                </div>
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
