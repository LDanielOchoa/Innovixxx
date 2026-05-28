<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
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
  Calendar01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import { createEscoltaApi } from '../services/escoltas.api'
import { createEscoltaSchema } from '../../../schemas/escoltas.schema'
import { useFormValidator } from '../../../composables/useFormValidator'
import { fetchServiciosDropdownApi } from '../../servicios/services/servicios.api'
import { fetchVehiculosServicioApi } from '../../vehiculos-servicio/services/vehiculos-servicio.api'
import { fetchHardwareSimplesApi } from '../../servicios/services/servicios.api'
import type { Servicio } from '../../servicios/types/servicio'
import type { VehiculoServicio } from '../../vehiculos-servicio/types/vehiculo-servicio'
import type { HardwareSimple } from '../../servicios/types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'

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
  pase_vence: ''
})

const servicios = ref<Servicio[]>([])
const vehiculosServicio = ref<VehiculoServicio[]>([])
const hardwareList = ref<HardwareSimple[]>([])

const loadingServicios = ref(false)
const loadingVehiculosServicio = ref(false)
const loadingHardware = ref(false)

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

const servicioOptions = computed(() =>
  servicios.value.map(s => ({
    value: s.id_servicio,
    label: `${s.id_servicio}${s.fecha_inicio ? ` - ${s.fecha_inicio}` : ''}`
  }))
)

const vehiculoServicioOptions = computed(() =>
  vehiculosServicio.value.map(v => ({
    value: v.id_vehiculo,
    label: `${v.placa}${v.marca ? ` (${v.marca}${v.referencia ? ` ${v.referencia}` : ''})` : ''}`
  }))
)

const hardwareOptions = computed(() =>
  hardwareList.value.map(h => ({
    value: h.id_hardware,
    label: h.nombre
  }))
)

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
    Object.assign(formData, {
      nombre: '', cedula: '', email: '', celular: '',
      id_servicio: '', id_vehiculo: '', id_hardware: '',
      tipo_pase: '', pase: '', pase_vence: ''
    })

    if (groupStore.selectedGroup?.id) {
      loadingServicios.value = true
      loadingVehiculosServicio.value = true
      loadingHardware.value = true

      try {
        const [serviciosData, vehiculosServicioData, hardwareData] = await Promise.all([
          fetchServiciosDropdownApi(groupStore.selectedGroup.id),
          fetchVehiculosServicioApi(groupStore.selectedGroup.id),
          fetchHardwareSimplesApi(groupStore.selectedGroup.id)
        ])
        servicios.value = serviciosData
        vehiculosServicio.value = vehiculosServicioData
        hardwareList.value = hardwareData
      } catch (error) {
        console.error('Error al cargar datos maestros:', error)
        showMessage(t('escoltas.alertNetError') || 'Error al cargar datos', 'error')
      } finally {
        loadingServicios.value = false
        loadingVehiculosServicio.value = false
        loadingHardware.value = false
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  }
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
    pase_vence: formData.pase_vence || ''
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

    <div class="flex flex-col gap-5 relative p-1">
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
                <AppSelect
                  v-model="formData.id_servicio"
                  :label="t('escoltas.labelService', 'Servicio')"
                  :placeholder="loadingServicios ? 'Cargando...' : t('escoltas.placeholderService', 'Seleccione un servicio')"
                  :icon="Route01Icon"
                  :options="servicioOptions"
                  :disabled="loadingServicios"
                />
                <AppSelect
                  v-model="formData.id_vehiculo"
                  :label="t('escoltas.labelVehicle', 'Vehículo de Servicio')"
                  :placeholder="loadingVehiculosServicio ? 'Cargando...' : t('escoltas.placeholderVehicle', 'Seleccione un vehículo')"
                  :icon="Car01Icon"
                  :options="vehiculoServicioOptions"
                  :disabled="loadingVehiculosServicio"
                />
                <AppSelect
                  v-model="formData.id_hardware"
                  :label="t('escoltas.labelHardware', 'Dispositivo Hardware')"
                  :placeholder="loadingHardware ? 'Cargando...' : t('escoltas.placeholderHardware', 'Seleccione un dispositivo')"
                  :icon="CpuIcon"
                  :options="hardwareOptions"
                  :disabled="loadingHardware"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AppSelect
                v-model="formData.tipo_pase"
                :label="t('escoltas.labelPassType', 'Tipo de Pase')"
                :placeholder="t('escoltas.placeholderPassType', 'Seleccione tipo de pase')"
                :icon="LicenseIcon"
                :options="tipoPaseOptions"
              />
              <AppInput
                v-model="formData.pase"
                :label="t('escoltas.labelPass', 'Número de Pase')"
                :placeholder="t('escoltas.placeholderPass', 'Ej: 79065744')"
                :icon="ContactBookIcon"
              />
              <AppInput
                v-model="formData.pase_vence"
                type="date"
                :label="t('escoltas.labelPassExpiry', 'Vencimiento del Pase')"
                :icon="Calendar01Icon"
              />
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>
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
