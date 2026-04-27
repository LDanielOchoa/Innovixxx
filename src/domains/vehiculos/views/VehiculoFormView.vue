<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  FloppyDiskIcon,
  Car01Icon,
  LicenseIcon,
  FingerPrintIcon,
  TruckIcon,
  Alert01Icon,
  Tick01Icon
} from '@hugeicons/core-free-icons'
import {
  fetchVehiculosApi,
  fetchVehicleTypesApi,
  createVehiculoApi,
  updateVehiculoApi
} from '../services/vehiculos.api'
import type { Vehiculo, TipoVehiculo } from '../types/vehiculo'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import AppDataLayout from '../../../components/ui/AppDataLayout.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const isEditMode = computed(() => route.name === 'vehiculos-editar' || !!route.params.id)

const formData = ref({
  nombre: '',
  placa: '',
  serial: '',
  tipo: '' as number | string
})

const saving = ref(false)
const vehicleTypes = ref<TipoVehiculo[]>([])
const pageMessage = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null)

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  pageMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (pageMessage.value?.text === text) pageMessage.value = null
    }, 4000)
  }
}

// Type picker
const isTypeOpen = ref(false)
const typeSearch = ref('')

const filteredTypes = computed(() => {
  if (!typeSearch.value) return vehicleTypes.value
  const query = typeSearch.value.toLowerCase()
  return vehicleTypes.value.filter(t => t.nombre.toLowerCase().includes(query))
})

const selectType = (type: TipoVehiculo) => {
  formData.value.tipo = type.id_tipo
  isTypeOpen.value = false
  typeSearch.value = ''
}

const selectedTypeLabel = computed(() => {
  if (!formData.value.tipo) return ''
  const found = vehicleTypes.value.find(t => t.id_tipo === formData.value.tipo || t.nombre === formData.value.tipo)
  return found ? found.nombre : formData.value.tipo
})

const fetchTypes = async () => {
  try {
    vehicleTypes.value = await fetchVehicleTypesApi()
  } catch (error) {
    console.error('Error fetching vehicle types:', error)
  }
}

const loadVehicle = async () => {
  if (!isEditMode.value || !route.params.id) return
  try {
    const all = await fetchVehiculosApi(selectedGroup.value.id)
    const vehicle = all.find((v: Vehiculo) => v.id_vehiculo === route.params.id)
    if (vehicle) {
      const tipoEncontrado = vehicleTypes.value.find(
        t => t.nombre === vehicle.tipo || t.id_tipo === vehicle.tipo
      )
      formData.value = {
        nombre: vehicle.nombre,
        placa: vehicle.placa,
        serial: vehicle.serial || '',
        tipo: tipoEncontrado ? tipoEncontrado.id_tipo : (typeof vehicle.tipo === 'number' ? vehicle.tipo : '')
      }
    }
  } catch (error) {
    console.error('Error loading vehicle:', error)
    showMessage('No se pudo cargar el vehículo.', 'error')
  }
}

onMounted(async () => {
  await fetchTypes()
  await loadVehicle()
})

const handleSubmit = async () => {
  if (saving.value) return
  if (!formData.value.nombre || !formData.value.placa) {
    showMessage('El nombre y la placa son obligatorios.', 'error')
    return
  }
  saving.value = true
  pageMessage.value = null

  try {
    const payload = {
      ...formData.value,
      id_grupo: selectedGroup.value.id
    }

    if (isEditMode.value && route.params.id) {
      const data = await updateVehiculoApi({ ...payload, id_vehiculo: String(route.params.id) })
      if (data.done) {
        showMessage(t('vehiculos.alertSuccessUpdate', 'Vehículo actualizado correctamente.'), 'success')
        setTimeout(() => router.push('/vehiculos'), 1500)
      } else {
        showMessage(data.message || t('vehiculos.alertErrorUpdate', 'Error al actualizar.'), 'error')
      }
    } else {
      const data = await createVehiculoApi(payload)
      if (data.done) {
        showMessage(t('vehiculos.alertSuccessCreate', 'Vehículo creado correctamente.'), 'success')
        setTimeout(() => router.push('/vehiculos'), 1500)
      } else {
        showMessage(data.message || t('vehiculos.alertErrorCreate', 'Error al crear.'), 'error')
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showMessage(getErrorMessage(error.code), 'error')
    } else {
      showMessage('Error de red al procesar la solicitud.', 'error')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDataLayout
    :title="isEditMode ? t('vehiculos.editTitle', 'Editar Vehículo') : t('vehiculos.newTitle', 'Nuevo Vehículo')"
    :subtitle="isEditMode ? t('vehiculos.editSubtitle', 'Modifica los datos del vehículo') : t('vehiculos.newSubtitle', 'Registra un nuevo vehículo en el sistema')"
    allow-overflow
  >
    <template #actions>
      <AppButton variant="secondary" :icon="ArrowLeft01Icon" @click="router.push('/vehiculos')">
        <span>{{ t('common.back', 'Volver') }}</span>
      </AppButton>
      <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="handleSubmit">
        <span>{{ isEditMode ? t('vehiculos.btnSave', 'Guardar Cambios') : t('vehiculos.btnRegister', 'Registrar') }}</span>
      </AppButton>
    </template>

    <div class="max-w-2xl mx-auto w-full px-4 md:px-8 py-10 pb-32 flex flex-col gap-10">

      <!-- Feedback -->
      <Transition name="fade">
        <div
          v-if="pageMessage"
          class="flex items-center gap-3 py-3.5 px-5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 shadow-lg border backdrop-blur-md"
          :class="{
            'text-red-500 bg-red-500/10 border-red-500/20': pageMessage.type === 'error',
            'text-amber-500 bg-amber-500/10 border-amber-500/20': pageMessage.type === 'warning',
            'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': pageMessage.type === 'success'
          }"
        >
          <HugeiconsIcon v-if="pageMessage.type === 'error' || pageMessage.type === 'warning'" :icon="Alert01Icon" :size="20" />
          <HugeiconsIcon v-else :icon="Tick01Icon" :size="20" />
          {{ pageMessage.text }}
        </div>
      </Transition>

      <div class="space-y-5 bg-white/50 dark:bg-[#13161C]/50 backdrop-blur-xl p-8 rounded-[32px] border border-slate-200/60 dark:border-white/5 shadow-sm">

        <!-- Nombre -->
        <AppFormInput
          v-model="formData.nombre"
          :label="t('vehiculos.labelName', 'Nombre del Vehículo')"
          :placeholder="t('vehiculos.placeholderName', 'Ej. Camión Principal')"
          :icon="LicenseIcon"
          required
        />

        <!-- Placa y Serial -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AppFormInput
            v-model="formData.placa"
            :label="t('vehiculos.labelPlate', 'Placa')"
            :placeholder="t('vehiculos.placeholderPlate', 'Ej. ABC-123')"
            :icon="LicenseIcon"
            required
          />
          <AppFormInput
            v-model="formData.serial"
            :label="t('vehiculos.labelSerial', 'Serial / VIN')"
            :placeholder="t('vehiculos.placeholderSerial', 'Ej. 1HGBH41JXMN109186')"
            :icon="FingerPrintIcon"
          />
        </div>

        <!-- Tipo de vehículo Personalizado -->
        <div class="space-y-2 relative">
          <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">
            {{ t('vehiculos.labelType', 'Tipo de Vehículo') }}
          </label>
          
          <div
            @click="isTypeOpen = !isTypeOpen"
            class="relative flex items-center justify-between group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] px-4 py-3.5 cursor-pointer hover:border-[#3b82f6]/40 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
          >
            <div class="flex items-center gap-3">
              <HugeiconsIcon :icon="TruckIcon" :size="18" :stroke-width="2.2" class="text-slate-400 dark:text-slate-600 group-hover/input:text-[#3b82f6] transition-colors" />
              <span class="text-[13px] font-bold" :class="formData.tipo ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-700'">
                {{ selectedTypeLabel || t('vehiculos.placeholderType', 'Seleccionar tipo') }}
              </span>
            </div>
            <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" class="transition-all text-slate-400 group-hover/input:text-[#3b82f6]" :class="isTypeOpen ? 'rotate-90' : '-rotate-90'" />
          </div>

          <!-- Type Dropdown -->
          <Transition name="fade-slide">
            <div v-if="isTypeOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white/70 dark:bg-[#0F1115]/70 backdrop-blur-[32px] border border-white/40 dark:border-white/[0.08] rounded-[24px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-[60] overflow-hidden py-2 ring-1 ring-black/5 dark:ring-white/5">
              <!-- Search -->
              <div class="px-3 pb-2">
                <div class="relative flex items-center group/search">
                  <HugeiconsIcon :icon="Search01Icon" :size="16" class="absolute left-4 text-slate-400 dark:text-slate-500 group-focus-within/search:text-[#3b82f6] transition-colors" />
                  <input
                    v-model="typeSearch"
                    type="text"
                    :placeholder="t('common.search', 'Buscar...')"
                    class="w-full pl-11 pr-4 py-3 bg-slate-100/60 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#1A1D24]/80 rounded-[14px] text-[13px] font-bold text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 dark:focus:ring-[#5da6fc]/30 transition-all shadow-inner"
                    @click.stop
                    autocomplete="off"
                  />
                </div>
              </div>
              <!-- List -->
              <ul class="max-h-60 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                <li
                  v-for="type in filteredTypes"
                  :key="type.id_tipo"
                  @click="selectType(type)"
                  class="flex items-center justify-between px-4 py-3 rounded-[14px] cursor-pointer text-[13px] font-bold transition-all duration-200"
                  :class="formData.tipo === type.id_tipo ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'"
                >
                  <span>{{ type.nombre }}</span>
                  <HugeiconsIcon v-if="formData.tipo === type.id_tipo" :icon="Tick01Icon" :size="16" :stroke-width="3" />
                </li>
              </ul>
            </div>
          </Transition>
        </div>

      </div>
    </div>
  </AppDataLayout>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-6px); }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-6px); }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.4); }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); }
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
</style>
