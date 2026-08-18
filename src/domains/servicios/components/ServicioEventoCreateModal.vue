<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Calendar01Icon,
  Alert01Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  CheckmarkCircle01Icon,
  Upload04Icon,
  ServiceIcon,
  Route01Icon,
  Car01Icon,
  User02Icon,
  UserAdd01Icon,
  CpuIcon,
  Edit01Icon,
  Search01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { registrarServicioEventoApi, fetchServiciosDropdownApi } from '../services/servicios.api'
import { SERVICIO_EVENTO_TIPOS, SERVICIO_EVENTO_TIPOS_LABELS, SERVICIO_ESTADOS_LABELS } from '../types/servicio'
import type { Servicio } from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'

const props = withDefaults(defineProps<{
  isOpen: boolean
  defaultIdServicio?: string
}>(), {
  defaultIdServicio: ''
})

const emit = defineEmits(['update:isOpen', 'created'])

const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const isSaving = ref(false)
const isLoadingServicios = ref(false)
const modalMessage = ref<{ text: string; type: 'success' | 'error' } | null>(null)
const serviciosDisponibles = ref<Servicio[]>([])

// Dropdowns interactivos dentro del modal
const isServicioDropdownOpen = ref(false)
const isTipoDropdownOpen = ref(false)
const searchServicioText = ref('')

const servicioDropdownModalRef = ref<HTMLElement | null>(null)
const tipoDropdownModalRef = ref<HTMLElement | null>(null)

const formData = reactive({
  id_servicio: '',
  tipo_evento: SERVICIO_EVENTO_TIPOS.EVENTO_REGISTRO,
  observacion: ''
})

// Gestión de fotos (hasta 3)
interface ImageFileSlot {
  file: File | null
  previewUrl: string | null
  name: string
  size: string
}

const images = reactive<[ImageFileSlot, ImageFileSlot, ImageFileSlot]>([
  { file: null, previewUrl: null, name: '', size: '' },
  { file: null, previewUrl: null, name: '', size: '' },
  { file: null, previewUrl: null, name: '', size: '' }
])

const eventTypeConfig = [
  { value: SERVICIO_EVENTO_TIPOS.EVENTO_REGISTRO, label: 'Registro de Servicio', icon: Calendar01Icon, colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { value: SERVICIO_EVENTO_TIPOS.EVENTO_ASIGNACION_RECURSOS, label: 'Asignación de Recursos', icon: ServiceIcon, colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { value: SERVICIO_EVENTO_TIPOS.EVENTO_CAMBIO_RUTA, label: 'Cambio de Ruta', icon: Route01Icon, colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { value: SERVICIO_EVENTO_TIPOS.EVENTO_CAMBIO_HARDWARE, label: 'Cambio de Hardware', icon: CpuIcon, colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  { value: SERVICIO_EVENTO_TIPOS.EVENTO_CAMBIO_VEHICLE, label: 'Cambio de Vehículo', icon: Car01Icon, colorClass: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  { value: SERVICIO_EVENTO_TIPOS.EVENTO_CAMBIO_ESCOLTA, label: 'Cambio de Escolta', icon: User02Icon, colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  { value: SERVICIO_EVENTO_TIPOS.EVENTO_AGREGAR_ESCOLTA, label: 'Agregar Escolta', icon: UserAdd01Icon, colorClass: 'text-teal-500 bg-teal-500/10 border-teal-500/20' },
  { value: SERVICIO_EVENTO_TIPOS.EVENTO_CAMBIO_ESTADO, label: 'Cambio de Estado', icon: Edit01Icon, colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20' }
]

const selectedTipoConfig = computed(() => {
  return eventTypeConfig.find(e => e.value === formData.tipo_evento) || eventTypeConfig[0]
})

const selectedServicioObj = computed(() => {
  return serviciosDisponibles.value.find(s => s.id_servicio === formData.id_servicio)
})

const getEstadoLabel = (estado: any): string => {
  if (typeof estado === 'number') {
    return SERVICIO_ESTADOS_LABELS[estado] || String(estado)
  }
  if (typeof estado === 'string') {
    const num = Number(estado)
    if (!isNaN(num) && SERVICIO_ESTADOS_LABELS[num]) {
      return SERVICIO_ESTADOS_LABELS[num]
    }
    return estado
  }
  return '---'
}

const getEstadoBadgeClass = (estado: any): string => {
  const lbl = getEstadoLabel(estado).toUpperCase().replace(/\s+/g, '_')
  if (lbl.includes('PRERCARGA') || lbl === '1') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  if (lbl.includes('ESPERA') || lbl === '2') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  if (lbl.includes('OK') || lbl.includes('EJECUCION_OK') || lbl === '3') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (lbl.includes('FAIL') || lbl === '4') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
  if (lbl.includes('FINALIZADO') || lbl === '5') return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  if (lbl.includes('CANCELADO') || lbl === '6') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
}

const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '---'
  const parts = dateStr.split(' ')
  const dPart = parts[0]
  const tPart = parts[1] || ''
  if (!dPart) return dateStr
  const [y, m, d] = dPart.split('-')
  return `${d}/${m}/${y}${tPart ? ' ' + tPart.substring(0, 5) : ''}`
}

const filteredServiciosList = computed(() => {
  if (!searchServicioText.value.trim()) return serviciosDisponibles.value
  const q = searchServicioText.value.toLowerCase().trim()
  return serviciosDisponibles.value.filter(s =>
    s.id_servicio?.toLowerCase().includes(q) ||
    s.id_ruta?.toLowerCase().includes(q) ||
    s.fecha_inicio?.toLowerCase().includes(q) ||
    getEstadoLabel(s.estado).toLowerCase().includes(q)
  )
})

const loadServicios = async () => {
  if (!selectedGroup.value?.id) return
  isLoadingServicios.value = true
  try {
    const list = await fetchServiciosDropdownApi(selectedGroup.value.id)
    serviciosDisponibles.value = list
  } catch (error) {
    console.error('Error al cargar lista de servicios:', error)
  } finally {
    isLoadingServicios.value = false
  }
}

const selectServicio = (id: string) => {
  formData.id_servicio = id
  isServicioDropdownOpen.value = false
  searchServicioText.value = ''
}

const selectTipo = (tipo: number) => {
  formData.tipo_evento = tipo
  isTipoDropdownOpen.value = false
}

const resetForm = () => {
  formData.id_servicio = props.defaultIdServicio || ''
  formData.tipo_evento = SERVICIO_EVENTO_TIPOS.EVENTO_REGISTRO
  formData.observacion = ''
  modalMessage.value = null
  isServicioDropdownOpen.value = false
  isTipoDropdownOpen.value = false
  searchServicioText.value = ''

  images.forEach((img, idx) => {
    if (img.previewUrl) {
      URL.revokeObjectURL(img.previewUrl)
    }
    images[idx] = { file: null, previewUrl: null, name: '', size: '' }
  })
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const handleFileChange = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]
  if (!file) return

  if (images[index].previewUrl) {
    URL.revokeObjectURL(images[index].previewUrl!)
  }

  images[index] = {
    file,
    previewUrl: URL.createObjectURL(file),
    name: file.name,
    size: formatFileSize(file.size)
  }
  input.value = ''
}

const removeImage = (index: number) => {
  if (images[index].previewUrl) {
    URL.revokeObjectURL(images[index].previewUrl!)
  }
  images[index] = { file: null, previewUrl: null, name: '', size: '' }
}

const isFormValid = computed(() => {
  return formData.id_servicio.trim() !== '' && formData.observacion.trim() !== ''
})

const handleSubmit = async () => {
  if (!selectedGroup.value?.id) {
    modalMessage.value = { text: 'Debes tener una empresa o grupo activo seleccionado.', type: 'error' }
    return
  }

  if (!formData.id_servicio.trim()) {
    modalMessage.value = { text: 'Selecciona o ingresa el ID del servicio.', type: 'error' }
    return
  }

  if (!formData.observacion.trim()) {
    modalMessage.value = { text: 'La observación del evento es obligatoria.', type: 'error' }
    return
  }

  isSaving.value = true
  modalMessage.value = null

  try {
    const res = await registrarServicioEventoApi({
      id_grupo: selectedGroup.value.id,
      id_servicio: formData.id_servicio.trim(),
      tipo_evento: Number(formData.tipo_evento),
      observacion: formData.observacion.trim(),
      foto_1: images[0].file,
      foto_2: images[1].file,
      foto_3: images[2].file
    })

    if (res && res.done !== false) {
      modalMessage.value = { text: 'Evento registrado exitosamente.', type: 'success' }
      setTimeout(() => {
        emit('created')
        emit('update:isOpen', false)
      }, 900)
    } else {
      modalMessage.value = { text: res?.message || 'Error al registrar el evento.', type: 'error' }
    }
  } catch (error: any) {
    console.error('Error al registrar evento de servicio:', error)
    modalMessage.value = {
      text: error?.message || 'Error de conexión con el servidor.',
      type: 'error'
    }
  } finally {
    isSaving.value = false
  }
}

const handleClickOutsideModal = (e: MouseEvent) => {
  if (servicioDropdownModalRef.value && !servicioDropdownModalRef.value.contains(e.target as Node)) {
    isServicioDropdownOpen.value = false
  }
  if (tipoDropdownModalRef.value && !tipoDropdownModalRef.value.contains(e.target as Node)) {
    isTipoDropdownOpen.value = false
  }
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      resetForm()
      loadServicios()
    }
  }
)

onMounted(() => {
  document.addEventListener('click', handleClickOutsideModal)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutsideModal)
})
</script>

<template>
  <AppModal
    :isOpen="isOpen"
    title="Registrar Evento de Servicio"
    maxWidth="max-w-2xl"
    @update:isOpen="emit('update:isOpen', $event)"
  >
    <div class="space-y-6">
      <!-- Mensaje Feedback -->
      <Transition name="feedback-fade">
        <div
          v-if="modalMessage"
          class="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all shadow-sm"
          :class="modalMessage.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
        >
          <HugeiconsIcon
            :icon="modalMessage.type === 'success' ? CheckmarkCircle01Icon : Alert01Icon"
            :size="18"
            class="shrink-0"
          />
          <span>{{ modalMessage.text }}</span>
        </div>
      </Transition>

      <!-- Fila: Servicio y Tipo de Evento como Desplegables Modernos -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Desplegable Servicio -->
        <div ref="servicioDropdownModalRef" class="relative">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
            <span>Servicio <span class="text-rose-500">*</span></span>
            <span v-if="formData.id_servicio" class="text-[10px] font-mono text-blue-500 font-normal">
              Seleccionado: {{ formData.id_servicio }}
            </span>
          </label>

          <!-- Trigger del Dropdown Servicio -->
          <button
            type="button"
            @click.stop="isServicioDropdownOpen = !isServicioDropdownOpen"
            class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13161C]/80 border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#3b82f6]/50 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/10 transition-all min-h-[42px] cursor-pointer"
            :class="{ 'border-[#3b82f6]/50 ring-4 ring-[#3b82f6]/10': isServicioDropdownOpen }"
          >
            <div class="flex items-center gap-2.5 truncate flex-1 min-w-0">
              <div class="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <HugeiconsIcon :icon="ServiceIcon" :size="13" />
              </div>
              <template v-if="formData.id_servicio">
                <div class="flex items-center gap-2 truncate">
                  <span class="font-mono font-bold text-slate-800 dark:text-white truncate">
                    {{ formData.id_servicio }}
                  </span>
                  <span
                    v-if="selectedServicioObj?.estado"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border"
                    :class="getEstadoBadgeClass(selectedServicioObj.estado)"
                  >
                    {{ getEstadoLabel(selectedServicioObj.estado) }}
                  </span>
                  <span v-if="selectedServicioObj?.fecha_inicio" class="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    ({{ formatDateShort(selectedServicioObj.fecha_inicio) }})
                  </span>
                </div>
              </template>
              <span v-else class="text-slate-400 font-normal">
                Seleccionar servicio...
              </span>
            </div>

            <svg
              class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200"
              :class="{ 'rotate-180': isServicioDropdownOpen }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Menú Flotante Servicio -->
          <Transition name="custom-dropdown">
            <div
              v-if="isServicioDropdownOpen"
              class="absolute left-0 right-0 z-50 mt-1.5 bg-white dark:bg-[#1A1D24] border border-slate-200/70 dark:border-white/[0.1] rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <!-- Buscador dentro del menú -->
              <div class="p-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <div class="relative">
                  <input
                    v-model="searchServicioText"
                    type="text"
                    placeholder="Buscar o escribir ID..."
                    class="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#13161C] border border-slate-200/60 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50"
                  />
                  <div class="absolute left-2.5 top-2 text-slate-400 pointer-events-none">
                    <HugeiconsIcon :icon="Search01Icon" :size="13" />
                  </div>
                </div>
              </div>

              <!-- Lista de Opciones -->
              <div class="max-h-[260px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5">
                <!-- Opción de usar el texto manual si no coincide -->
                <button
                  v-if="searchServicioText.trim() && !filteredServiciosList.some(s => s.id_servicio === searchServicioText.trim())"
                  type="button"
                  @click="selectServicio(searchServicioText.trim())"
                  class="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-blue-50/50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors"
                >
                  <span class="flex items-center gap-2">
                    <span class="font-normal text-slate-400">Usar ID:</span>
                    <span class="font-mono font-bold">{{ searchServicioText.trim() }}</span>
                  </span>
                  <span class="text-[10px] uppercase font-bold bg-blue-100 dark:bg-blue-500/20 px-1.5 py-0.5 rounded">Manual</span>
                </button>

                <!-- Servicios listados -->
                <template v-if="filteredServiciosList.length > 0">
                  <button
                    v-for="serv in filteredServiciosList"
                    :key="serv.id_servicio"
                    type="button"
                    @click="selectServicio(serv.id_servicio)"
                    class="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    :class="formData.id_servicio === serv.id_servicio ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'"
                  >
                    <div class="flex flex-col gap-1 min-w-0 flex-1 pr-2">
                      <!-- Fila superior: ID y Estado Badge -->
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-mono font-bold text-slate-800 dark:text-white text-xs">
                          {{ serv.id_servicio }}
                        </span>
                        <span
                          v-if="serv.estado"
                          class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wider"
                          :class="getEstadoBadgeClass(serv.estado)"
                        >
                          {{ getEstadoLabel(serv.estado) }}
                        </span>
                      </div>

                      <!-- Fila inferior: Fecha y Ruta -->
                      <div class="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                        <span v-if="serv.fecha_inicio" class="flex items-center gap-1 font-mono">
                          <HugeiconsIcon :icon="Clock01Icon" :size="12" class="text-slate-400" />
                          {{ formatDateShort(serv.fecha_inicio) }}
                        </span>
                        <span v-if="serv.id_ruta" class="truncate">
                          • Ruta: {{ serv.id_ruta }}
                        </span>
                      </div>
                    </div>

                    <svg
                      v-if="formData.id_servicio === serv.id_servicio"
                      class="w-4 h-4 text-blue-500 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </template>
                <div v-else-if="!searchServicioText.trim()" class="px-3.5 py-4 text-center text-xs text-slate-400">
                  {{ isLoadingServicios ? 'Cargando servicios...' : 'No hay servicios disponibles' }}
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Desplegable Tipo de Evento -->
        <div ref="tipoDropdownModalRef" class="relative">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
            Tipo de Evento <span class="text-rose-500">*</span>
          </label>

          <!-- Trigger del Dropdown Tipo de Evento -->
          <button
            type="button"
            @click.stop="isTipoDropdownOpen = !isTipoDropdownOpen"
            class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13161C]/80 border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#3b82f6]/50 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/10 transition-all h-[42px] cursor-pointer"
            :class="{ 'border-[#3b82f6]/50 ring-4 ring-[#3b82f6]/10': isTipoDropdownOpen }"
          >
            <div class="flex items-center gap-2.5 truncate">
              <div
                class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border"
                :class="selectedTipoConfig.colorClass"
              >
                <HugeiconsIcon :icon="selectedTipoConfig.icon" :size="13" />
              </div>
              <span class="font-bold text-slate-800 dark:text-white truncate">
                {{ selectedTipoConfig.label }}
              </span>
            </div>

            <svg
              class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200"
              :class="{ 'rotate-180': isTipoDropdownOpen }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Menú Flotante Tipo de Evento -->
          <Transition name="custom-dropdown">
            <div
              v-if="isTipoDropdownOpen"
              class="absolute left-0 right-0 z-50 mt-1.5 bg-white dark:bg-[#1A1D24] border border-slate-200/70 dark:border-white/[0.1] rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden max-h-[260px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5"
            >
              <button
                v-for="op in eventTypeConfig"
                :key="op.value"
                type="button"
                @click="selectTipo(op.value)"
                class="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                :class="formData.tipo_evento === op.value ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'"
              >
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border"
                    :class="op.colorClass"
                  >
                    <HugeiconsIcon :icon="op.icon" :size="13" />
                  </div>
                  <span class="font-bold text-slate-800 dark:text-white">{{ op.label }}</span>
                </div>
                <svg
                  v-if="formData.tipo_evento === op.value"
                  class="w-4 h-4 text-blue-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Campo Observación -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">
            Observación <span class="text-rose-500">*</span>
          </label>
          <span class="text-[11px] text-slate-400 font-mono">
            {{ formData.observacion.length }} caracteres
          </span>
        </div>
        <textarea
          v-model="formData.observacion"
          rows="3"
          placeholder="Escribe los detalles y observaciones del evento..."
          class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#13161C]/80 border border-slate-200/80 dark:border-white/[0.08] rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all resize-none leading-relaxed"
        ></textarea>
      </div>

      <!-- Sección de Fotos (Hasta 3 imágenes) -->
      <div>
        <div class="flex items-center justify-between mb-2.5">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <span>Evidencia Fotográfica</span>
            <span class="text-[11px] font-normal text-slate-400">(Hasta 3 imágenes opcionales)</span>
          </label>
          <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
            PNG, JPG, BMP
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            v-for="(slot, idx) in images"
            :key="idx"
            class="relative border border-dashed rounded-xl p-3 flex flex-col items-center justify-center min-h-[120px] transition-all group overflow-hidden"
            :class="slot.previewUrl 
              ? 'border-blue-500/40 bg-blue-50/10 dark:bg-blue-500/5' 
              : 'border-slate-200/90 dark:border-white/10 hover:border-[#3b82f6]/50 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] bg-slate-50/40 dark:bg-white/[0.01]'"
          >
            <!-- Si tiene imagen cargada -->
            <template v-if="slot.previewUrl">
              <div class="relative w-full h-20 rounded-lg overflow-hidden mb-1.5 bg-black/10 flex items-center justify-center">
                <img
                  :src="slot.previewUrl"
                  :alt="slot.name"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    @click="removeImage(idx)"
                    title="Eliminar imagen"
                    class="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
                  </button>
                </div>
              </div>
              <div class="w-full text-center">
                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate block">
                  Foto {{ idx + 1 }}
                </span>
                <span class="text-[10px] text-slate-400 font-mono block">{{ slot.size }}</span>
              </div>
            </template>

            <!-- Slot vacío para subir -->
            <template v-else>
              <label class="w-full h-full flex flex-col items-center justify-center cursor-pointer p-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/bmp,image/webp"
                  class="hidden"
                  @change="handleFileChange(idx, $event)"
                />
                <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-400 group-hover:text-[#3b82f6] group-hover:border-[#3b82f6]/30 mb-2 transition-all group-hover:scale-110">
                  <HugeiconsIcon :icon="Upload04Icon" :size="17" />
                </div>
                <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#3b82f6] transition-colors">
                  Foto {{ idx + 1 }}
                </span>
                <span class="text-[10px] text-slate-400 font-medium mt-0.5">Click para subir</span>
              </label>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Acciones -->
    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <AppButton
          variant="secondary"
          size="md"
          :disabled="isSaving"
          @click="emit('update:isOpen', false)"
        >
          Cancelar
        </AppButton>

        <AppButton
          variant="primary"
          size="md"
          :icon="FloppyDiskIcon"
          :loading="isSaving"
          :disabled="!isFormValid || isSaving"
          @click="handleSubmit"
        >
          Guardar Evento
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.custom-dropdown-enter-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.custom-dropdown-leave-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 1, 1);
}
.custom-dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
.custom-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.99);
}

.feedback-fade-enter-active,
.feedback-fade-leave-active {
  transition: all 0.2s ease;
}
.feedback-fade-enter-from,
.feedback-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb { background: #2D3748; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
</style>
