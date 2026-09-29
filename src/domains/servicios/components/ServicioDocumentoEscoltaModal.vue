<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  User02Icon,
  Search01Icon,
  Tick01Icon,
  Loading03Icon,
  Download01Icon,
  Alert01Icon,
  ServiceIcon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import {
  generarDocumentoEscoltaFirmarApi,
  fetchRecursosProvisionalesServicioApi
} from '../services/servicios.api'
import type { Servicio, ServicioDashboard } from '../types/servicio'
import type { Escolta } from '../../escoltas/types/escolta'
import { obtenerUrlImagen } from '../../../utils/imagenes'
import { useToast } from 'primevue/usetoast'
import AppModal from '../../../components/ui/AppModal.vue'

const props = defineProps<{
  isOpen: boolean
  servicio: Servicio | ServicioDashboard | null
  escoltasCatalogo: Escolta[]
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

const { t } = useI18n()
const groupStore = useGroupStore()
const toast = useToast()

const selectedEscoltaId = ref<string>('')
const searchQuery = ref<string>('')
const isLoadingEscoltas = ref<boolean>(false)
const isGenerating = ref<boolean>(false)

interface EscoltaOpcion {
  id_escolta: string
  nombre: string
  cedula?: string
  celular?: string
}

const listaEscoltas = ref<EscoltaOpcion[]>([])

// Cargar escoltas asociados al servicio (tanto definitivos como provisionales)
const cargarEscoltasServicio = async () => {
  if (!props.servicio?.id_servicio || !groupStore.selectedGroup?.id) {
    listaEscoltas.value = []
    return
  }

  isLoadingEscoltas.value = true
  const idsSet = new Set<string>()

  // Escoltas directos del servicio
  if (Array.isArray(props.servicio.escoltas)) {
    props.servicio.escoltas.forEach(id => {
      if (id) idsSet.add(String(id))
    })
  }

  // Escoltas provisionales asignados en precarga
  try {
    const res = await fetchRecursosProvisionalesServicioApi({
      id_grupo: groupStore.selectedGroup.id,
      id_servicio: props.servicio.id_servicio
    })
    if (res.done && res.data?.escoltas) {
      res.data.escoltas.forEach(id => {
        if (id) idsSet.add(String(id))
      })
    }
  } catch (error) {
    console.error('Error al cargar escoltas provisionales para documento:', error)
  }

  const idsArray = Array.from(idsSet)
  
  if (idsArray.length > 0) {
    listaEscoltas.value = idsArray.map(id => {
      const e = props.escoltasCatalogo.find(item => String(item.id_escolta) === id)
      return {
        id_escolta: id,
        nombre: e?.nombre || id,
        cedula: e?.cedula || '',
        celular: e?.celular || ''
      }
    })
  } else {
    // Si no tiene asignados previamente, se muestra el catálogo de escoltas disponibles
    listaEscoltas.value = props.escoltasCatalogo.map(e => ({
      id_escolta: e.id_escolta,
      nombre: e.nombre,
      cedula: e.cedula,
      celular: e.celular
    }))
  }

  // Preseleccionar si solo hay 1 escolta
  if (listaEscoltas.value.length === 1) {
    selectedEscoltaId.value = listaEscoltas.value[0].id_escolta
  } else {
    selectedEscoltaId.value = ''
  }

  isLoadingEscoltas.value = false
}

watch(() => props.isOpen, (abierto) => {
  if (abierto) {
    searchQuery.value = ''
    selectedEscoltaId.value = ''
    isGenerating.value = false
    cargarEscoltasServicio()
  }
})

const filteredEscoltas = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return listaEscoltas.value
  return listaEscoltas.value.filter(e =>
    e.nombre.toLowerCase().includes(q) ||
    (e.cedula && e.cedula.toLowerCase().includes(q)) ||
    (e.celular && e.celular.toLowerCase().includes(q))
  )
})

const handleGenerarDocumento = async () => {
  if (isGenerating.value) return
  if (!selectedEscoltaId.value) {
    toast.add({
      severity: 'warn',
      summary: t('common.warning', 'Atención'),
      detail: t('servicios.selectEscortPrompt'),
      life: 3000
    })
    return
  }

  if (!props.servicio?.id_servicio || !groupStore.selectedGroup?.id) return

  isGenerating.value = true

  try {
    const res = await generarDocumentoEscoltaFirmarApi({
      id_grupo: groupStore.selectedGroup.id,
      id_servicio: props.servicio.id_servicio,
      id_escolta: selectedEscoltaId.value
    })

    if (res.done && res.data?.url) {
      const urlDescarga = obtenerUrlImagen(res.data.url)
      const nombreArchivo = res.data.url.split('/').pop() || `conductor_${props.servicio.id_servicio}_${selectedEscoltaId.value}.pdf`

      try {
        const response = await fetch(urlDescarga)
        if (!response.ok) throw new Error('Error en descarga')
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = nombreArchivo
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      } catch {
        const link = document.createElement('a')
        link.href = urlDescarga
        link.download = nombreArchivo
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      toast.add({
        severity: 'success',
        summary: t('common.success'),
        detail: res.message || t('servicios.escortDocumentSuccess'),
        life: 3000
      })
      handleClose()
    } else {
      toast.add({
        severity: 'error',
        summary: t('common.error'),
        detail: res.message || t('servicios.escortDocumentError'),
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error al generar documento escolta:', error)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: error?.message || t('servicios.escortDocumentError'),
      life: 4000
    })
  } finally {
    isGenerating.value = false
  }
}

const handleClose = () => {
  if (isGenerating.value) return
  emit('update:isOpen', false)
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    @confirm="handleGenerarDocumento"
    :title="t('servicios.modalTitleEscortDocumentSign')"
    :confirm-text="t('servicios.btnGenerateDocument')"
    size="md"
    :show-footer="!isLoadingEscoltas"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-500/20">
        <HugeiconsIcon :icon="Download01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-4 relative p-1">
      <!-- Loading Overlay -->
      <Transition name="fade">
        <div v-if="isGenerating" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/70 dark:bg-[#13161C]/70 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">
              {{ t('servicios.generatingEscortDocument') }}
            </span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Resumen Servicio -->
      <div class="bg-slate-50 dark:bg-[#0F1115] border border-slate-200/80 dark:border-white/5 rounded-2xl p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center text-[#5da6fc] border border-blue-500/20 shrink-0">
              <HugeiconsIcon :icon="ServiceIcon" :size="18" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-slate-800 dark:text-white truncate">
                Servicio: <span class="font-mono text-[#3b82f6] dark:text-[#5da6fc]">{{ servicio?.id_servicio }}</span>
              </p>
              <p class="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {{ t('servicios.modalSubtitleEscortDocumentSign') }}
              </p>
            </div>
          </div>
          <span v-if="servicio?.estado" class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 shrink-0">
            {{ servicio.estado }}
          </span>
        </div>
      </div>

      <!-- Buscador de Escolta si hay más de 3 -->
      <div v-if="listaEscoltas.length > 3" class="relative">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('servicios.filterSearchEscort')"
          class="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#13161C] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6] transition-all"
        />
        <HugeiconsIcon :icon="Search01Icon" :size="14" class="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
      </div>

      <!-- Skeleton de Carga -->
      <div v-if="isLoadingEscoltas" class="space-y-2 animate-pulse">
        <div v-for="i in 3" :key="i" class="h-14 bg-slate-200/60 dark:bg-white/[0.04] rounded-xl"></div>
      </div>

      <!-- Listado de Escoltas para Seleccionar -->
      <div v-else-if="filteredEscoltas.length > 0" class="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
        <div
          v-for="esc in filteredEscoltas"
          :key="esc.id_escolta"
          @click="selectedEscoltaId = esc.id_escolta"
          class="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none"
          :class="selectedEscoltaId === esc.id_escolta
            ? 'bg-blue-50/70 dark:bg-blue-500/10 border-[#3b82f6]/50 shadow-sm'
            : 'bg-white dark:bg-[#13161C] border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              :class="selectedEscoltaId === esc.id_escolta
                ? 'bg-[#3b82f6] text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'"
            >
              <HugeiconsIcon :icon="User02Icon" :size="16" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-slate-800 dark:text-white truncate">
                {{ esc.nombre }}
              </p>
              <div class="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                <span v-if="esc.cedula">CC: {{ esc.cedula }}</span>
                <span v-if="esc.celular">Tel: {{ esc.celular }}</span>
              </div>
            </div>
          </div>

          <!-- Radio Indicator -->
          <div
            class="w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 ml-2"
            :class="selectedEscoltaId === esc.id_escolta
              ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
              : 'border-slate-300 dark:border-white/20 bg-transparent'"
          >
            <HugeiconsIcon v-if="selectedEscoltaId === esc.id_escolta" :icon="Tick01Icon" :size="10" :stroke-width="3" />
          </div>
        </div>
      </div>

      <!-- Estado Vacío -->
      <div v-else class="flex flex-col items-center justify-center py-6 px-4 text-center rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
        <HugeiconsIcon :icon="Alert01Icon" :size="24" class="text-amber-500 mb-2 opacity-80" />
        <p class="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {{ t('servicios.noEscortsForService') }}
        </p>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.4);
  border-radius: 10px;
}
</style>
