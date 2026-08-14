<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  CommandLineIcon,
  Tag01Icon,
  CpuIcon,
  FileCodeIcon,
  Tick01Icon,
  Alert01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import type { Comando } from '../types/comando'
import { createComandoApi, updateComandoApi } from '../services/comandos.api'
import { fetchFamiliasApi } from '../../hardware/services/hardware.api'
import type { FamiliaHardware } from '../../hardware/types/hardware'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import { useToast } from 'primevue/usetoast'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'

const props = defineProps<{
  isOpen: boolean
  editItem?: Comando | null
}>()

const emit = defineEmits(['update:isOpen', 'saved'])

const groupStore = useGroupStore()
const toast = useToast()

const saving = ref(false)
const modalMessage = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null)
const familias = ref<FamiliaHardware[]>([])
const loadingFamilias = ref(false)

const isEditMode = computed(() => !!props.editItem)

const formData = ref({
  id_familia: '',
  nombre: '',
  texto: ''
})

const formErrors = ref({
  id_familia: '',
  nombre: '',
  texto: ''
})

const cargarFamilias = async () => {
  loadingFamilias.value = true
  try {
    familias.value = await fetchFamiliasApi()
  } catch (error) {
    console.error('Error al cargar familias de hardware:', error)
  } finally {
    loadingFamilias.value = false
  }
}

onMounted(() => {
  cargarFamilias()
})

const opcionesFamilias = computed(() => {
  return familias.value.map((f) => ({
    value: String(f.id_familia),
    label: f.nombre
  }))
})

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      if (props.editItem) {
        formData.value = {
          id_familia: String(props.editItem.id_familia || ''),
          nombre: props.editItem.nombre || '',
          texto: props.editItem.texto || ''
        }
      } else {
        formData.value = {
          id_familia: '',
          nombre: '',
          texto: ''
        }
      }
      formErrors.value = {
        id_familia: '',
        nombre: '',
        texto: ''
      }
      modalMessage.value = null
      if (familias.value.length === 0) {
        cargarFamilias()
      }
    }
  }
)

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const validarFormulario = (): boolean => {
  let valido = true
  formErrors.value = { id_familia: '', nombre: '', texto: '' }

  if (!formData.value.nombre.trim()) {
    formErrors.value.nombre = 'El nombre es obligatorio'
    valido = false
  }

  if (!formData.value.id_familia) {
    formErrors.value.id_familia = 'Debe seleccionar una familia'
    valido = false
  }

  if (!formData.value.texto.trim()) {
    formErrors.value.texto = 'El texto o instrucción del comando es obligatorio'
    valido = false
  }

  return valido
}

const handleGuardar = async () => {
  if (!groupStore.selectedGroup?.id) {
    showModalMessage('No hay un grupo seleccionado', 'error')
    return
  }

  if (!validarFormulario()) return

  saving.value = true
  modalMessage.value = null

  try {
    let respuesta
    if (isEditMode.value && (props.editItem?.id_comando || props.editItem?.mask)) {
      const idComando = props.editItem?.id_comando || props.editItem?.mask || ''
      respuesta = await updateComandoApi({
        id_grupo: groupStore.selectedGroup.id,
        id_comando: idComando,
        id_familia: Number(formData.value.id_familia),
        nombre: formData.value.nombre.trim(),
        texto: formData.value.texto.trim()
      })
    } else {
      respuesta = await createComandoApi({
        id_grupo: groupStore.selectedGroup.id,
        id_familia: Number(formData.value.id_familia),
        nombre: formData.value.nombre.trim(),
        texto: formData.value.texto.trim()
      })
    }

    if (respuesta.done) {
      toast.add({
        severity: 'success',
        summary: isEditMode.value ? 'Comando actualizado' : 'Comando creado',
        detail: respuesta.message || (isEditMode.value ? 'El comando ha sido actualizado' : 'El comando ha sido registrado'),
        life: 3000
      })
      emit('saved')
      emit('update:isOpen', false)
    } else {
      showModalMessage(respuesta.message || 'No fue posible guardar el comando', 'error')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      showModalMessage('Error de conexión al guardar el comando', 'error')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="$emit('update:isOpen', $event)"
    @close="$emit('update:isOpen', false)"
    @confirm="handleGuardar"
    :close-on-click-outside="!saving"
    :title="isEditMode ? 'Editar Comando' : 'Nuevo Comando'"
    :confirm-text="isEditMode ? 'Guardar Cambios' : 'Registrar Comando'"
    size="lg"
    :show-footer="false"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="CommandLineIcon" :size="20" :stroke-width="2" />
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
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">
              {{ isEditMode ? 'Actualizando Comando...' : 'Registrando Comando...' }}
            </span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <form @submit.prevent="handleGuardar" class="space-y-6 animate-fade-in">
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

        <div class="space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Nombre del comando -->
            <AppInput
              v-model="formData.nombre"
              label="Nombre del Comando"
              placeholder="Ej: comando prueba 5"
              :icon="Tag01Icon"
              :error="formErrors.nombre"
              :disabled="saving"
            />

            <!-- Selección de Familia (desplegable) -->
            <AppSelect
              v-model="formData.id_familia"
              label="Familia de Hardware"
              placeholder="Selecciona la familia..."
              :options="opcionesFamilias"
              :icon="CpuIcon"
              :disabled="loadingFamilias || saving"
            />
          </div>

          <!-- Texto del comando -->
          <AppInput
            v-model="formData.texto"
            label="Texto / Instrucción del Comando"
            placeholder="Ej: XCF( UU )"
            :icon="FileCodeIcon"
            :error="formErrors.texto"
            :disabled="saving"
          />
        </div>

        <!-- Botones de Acción -->
        <div class="flex flex-col sm:flex-row w-full gap-3 justify-end pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
          <button
            type="button"
            :disabled="saving"
            @click="$emit('update:isOpen', false)"
            class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-6 py-3 bg-white dark:bg-[#1A1D24] text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] focus:outline-none transition-all duration-300 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            :disabled="saving"
            class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)] focus:outline-none transition-all duration-200 border border-[#2563eb] dark:border-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer"
          >
            <HugeiconsIcon v-if="saving" :icon="Loading03Icon" :size="16" class="animate-spin" />
            <span>{{ saving ? (isEditMode ? 'Guardando...' : 'Registrando...') : (isEditMode ? 'Guardar Cambios' : 'Registrar Comando') }}</span>
          </button>
        </div>
      </form>
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
