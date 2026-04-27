<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  FloppyDiskIcon,
  Tick01Icon,
  Alert01Icon,
  User02Icon,
  ContactBookIcon,
  SmartPhone01Icon,
  Mail01Icon
} from '@hugeicons/core-free-icons'

import {
  fetchEscoltasApi,
  createEscoltaApi,
  updateEscoltaApi
} from '../services/escoltas.api'

import type { Escolta } from '../types/escolta'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import AppDataLayout from '../../../components/ui/AppDataLayout.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()

const isEditMode = computed(() => route.name === 'escoltas-editar' || !!route.params.id)
const editId = computed(() => route.params.id as string)

const formData = ref({
  nombre: '',
  cedula: '',
  email: '',
  celular: ''
})

const loadingInit = ref(isEditMode.value)
const saving = ref(false)
const pageMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  pageMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (pageMessage.value?.text === text) pageMessage.value = null
    }, 4000)
  }
}

const initData = async () => {
  if (isEditMode.value && editId.value && selectedGroup.value?.id) {
    try {
      const items = await fetchEscoltasApi(selectedGroup.value.id)
      const target = items.find((e: Escolta) => String(e.id_escolta) === String(editId.value))

      if (target) {
        formData.value = {
          nombre: target.nombre || '',
          cedula: target.cedula || '',
          email: target.email || '',
          celular: target.celular || ''
        }
      } else {
        showMessage('No se pudo cargar la información del escolta.', 'error')
      }
    } catch (e) {
      console.error(e)
      showMessage('Error al cargar datos del escolta', 'error')
    } finally {
      loadingInit.value = false
    }
  } else {
    loadingInit.value = false
  }
}

onMounted(() => {
  initData()
})

const saveEscolta = async () => {
  if (saving.value) return
  if (!selectedGroup.value?.id) {
    showMessage('Debe seleccionar un grupo válido', 'error')
    return
  }

  saving.value = true
  pageMessage.value = null

  try {
    const payload = {
      ...formData.value,
      id_grupo: selectedGroup.value.id
    }

    if (isEditMode.value && editId.value) {
      const data = await updateEscoltaApi({ ...payload, id_escolta: editId.value })
      if (data.done) {
        showMessage(t('escoltas.alertSuccessUpdate') || 'Escolta actualizado exitosamente', 'success')
        setTimeout(() => router.push('/escoltas'), 1500)
      } else {
        showMessage(data.message || t('escoltas.alertErrorUpdate') || 'Error al actualizar', 'error')
      }
    } else {
      const data = await createEscoltaApi(payload)
      if (data.done) {
        showMessage(t('escoltas.alertSuccessCreate') || 'Escolta registrado exitosamente', 'success')
        setTimeout(() => router.push('/escoltas'), 1500)
      } else {
        showMessage(data.message || t('escoltas.alertErrorCreate') || 'Error al registrar', 'error')
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error saving escolta:', error)
      showMessage(t('escoltas.alertNetError') || 'Error de conexión', 'error')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDataLayout
    class="theme-sync"
    :title="isEditMode ? (t('escoltas.modalTitleEdit') || 'Actualizar Escolta') : (t('escoltas.modalTitleCreate') || 'Registrar Escolta')"
    :subtitle="isEditMode ? 'Modifique los datos del escolta seleccionado' : 'Registre un nuevo agente escolta en el sistema'"
  >
    <template #actions>
      <AppButton
        variant="secondary"
        :icon="ArrowLeft01Icon"
        @click="router.push('/escoltas')"
      >
        <span>{{ t('common.cancel') || 'Cancelar' }}</span>
      </AppButton>

      <AppButton
        variant="primary"
        :icon="FloppyDiskIcon"
        :loading="saving"
        :disabled="loadingInit"
        @click="saveEscolta"
      >
        <span>{{ isEditMode ? (t('escoltas.btnSave') || 'Guardar Cambios') : (t('escoltas.btnRegister') || 'Registrar Escolta') }}</span>
      </AppButton>
    </template>

    <div class="max-w-4xl mx-auto w-full px-4 py-6">
      <!-- Feedback Banner -->
      <Transition name="fade">
        <div
          v-if="pageMessage"
          class="mb-8 flex items-center gap-3 py-3.5 px-5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 shadow-lg border backdrop-blur-md"
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

      <Transition name="fade-slide" mode="out-in">
        <!-- Skeleton Loading -->
        <div v-if="loadingInit" key="loading" class="space-y-12 py-10 px-6 md:px-12 max-w-4xl mx-auto animate-pulse">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
            <div v-for="i in 4" :key="i" class="space-y-3">
              <div class="h-2 w-24 bg-slate-200 dark:bg-white/[0.03] rounded-full mx-1"></div>
              <div class="h-12 w-full bg-slate-100/50 dark:bg-white/[0.02] rounded-[20px] border border-slate-200/40 dark:border-white/[0.02]"></div>
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <div v-else key="content" class="space-y-10 py-10 px-6 md:px-12 max-w-4xl mx-auto pb-64">
          <div class="space-y-8">

            <!-- Fila 1: Nombre completo (full width) -->
            <AppFormInput
              v-model="formData.nombre"
              :label="t('escoltas.labelName') || 'Nombre Completo'"
              :placeholder="t('escoltas.placeholderName') || 'Ej: Pepito Pérez'"
              :icon="User02Icon"
            />

            <!-- Fila 2: Cédula y Celular -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AppFormInput
                v-model="formData.cedula"
                :label="t('escoltas.labelDoc') || 'Documento (Cédula)'"
                :placeholder="t('escoltas.placeholderDoc') || 'Ej: 79065744'"
                :icon="ContactBookIcon"
              />

              <AppFormInput
                v-model="formData.celular"
                :label="t('escoltas.labelMobile') || 'Celular'"
                :placeholder="t('escoltas.placeholderMobile') || 'Ej: 3023014514'"
                :icon="SmartPhone01Icon"
              />
            </div>

            <!-- Fila 3: Email (full width) con nota -->
            <div class="pt-6 border-t border-slate-100 dark:border-white/5 space-y-2">
              <AppFormInput
                v-model="formData.email"
                :label="t('escoltas.labelEmail') || 'Correo Electrónico'"
                :placeholder="t('escoltas.placeholderEmail') || 'Ej: escolta@email.com'"
                :icon="Mail01Icon"
                type="email"
              />
              <p class="text-[11px] text-slate-400 dark:text-slate-600 mt-1 pl-1 font-medium italic">
                Máximo 32 caracteres. Se utilizará para notificaciones del sistema.
              </p>
            </div>

          </div>
        </div>
      </Transition>
    </div>
  </AppDataLayout>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.theme-sync {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.8s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.98);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(1.02);
}
</style>
