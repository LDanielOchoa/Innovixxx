<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { loadModuleMessages } from '../../../i18n'
import { useToast } from 'primevue/usetoast'
import AppModal from '../../../components/ui/AppModal.vue'
import { solventarAlertaApi } from '../services/servicios.api'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Alert01Icon,
  Clock01Icon,
  MapsIcon,
  ArrowLeft02Icon,
  Loading02Icon,
  EyeIcon,
  ViewOffIcon,
  Tick02Icon
} from '@hugeicons/core-free-icons'

import { useThemeStore } from '../../../stores/theme.store'

loadModuleMessages('dashboard')
loadModuleMessages('servicios')
const { t, locale } = useI18n()
const toast = useToast()
const themeStore = useThemeStore()

const MAP_KEY = 'AIzaSyDIUxzochI7PvqdE8pNL6b5jy77NOnO1Ko'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    alerta: any | null
    hardwareList?: Array<{ id?: string | number; nombre?: string; serial?: string; id_hardware?: string; hardware?: string; familia?: string }>
  }>(),
  {
    isOpen: false,
    alerta: null,
    hardwareList: () => []
  }
)

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'close'): void
  (e: 'solventada', token: string): void
}>()

// Estado interno
const comentarioSolucion = ref<string>('')
const errorComentario = ref<string>('')
const selectedVisibilidad = ref<boolean>(true)
const isSolventando = ref<boolean>(false)
const modalActiveView = ref<'list' | 'map'>('list')
const mapZoom = ref<number>(16)
const isMapImageLoading = ref<boolean>(true)

// Limpiar y resetear estado cuando se abre para una nueva alerta
watch(
  () => [props.isOpen, props.alerta],
  ([newIsOpen, newAlerta]) => {
    if (newIsOpen && newAlerta) {
      comentarioSolucion.value = ''
      errorComentario.value = ''
      selectedVisibilidad.value = true
      modalActiveView.value = 'list'
      mapZoom.value = 16
      isMapImageLoading.value = true
    }
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:isOpen', false)
  emit('close')
}

// Obtener nombre del tipo de alerta según idioma
const obtenerNombreAlerta = computed(() => {
  if (!props.alerta) return ''
  if (props.alerta.tipo_alerta) return props.alerta.tipo_alerta

  const tipo = Number(props.alerta.tipo)
  const esIngles = locale.value?.startsWith('en')

  if (esIngles) {
    switch (tipo) {
      case 1: return 'Overspeed'
      case 2: return 'SOS Emergency'
      case 3: return 'Route Deviation'
      case 4: return 'Lock Open'
      case 5: return 'Lock Closed'
      case 6: return 'Route Return'
      default: return `Alert type ${tipo || '---'}`
    }
  }

  switch (tipo) {
    case 1: return 'Exceso de velocidad'
    case 2: return 'SOS / Emergencia'
    case 3: return 'Alejamiento de ruta'
    case 4: return 'Candado abierto'
    case 5: return 'Candado cerrado'
    case 6: return 'Retorno Ruta'
    default: return `Alerta tipo ${tipo || '---'}`
  }
})

// Obtener nombre del hardware asociado
const obtenerNombreHardware = computed(() => {
  if (!props.alerta) return '---'
  if (props.alerta.hardware) return props.alerta.hardware

  const idHw = String(props.alerta.id_hardware || props.alerta.serial || '').trim()
  if (!idHw) {
    if (props.alerta.id_servicio) return `Servicio: ${props.alerta.id_servicio}`
    return '---'
  }

  if (props.hardwareList && props.hardwareList.length > 0) {
    const encontrado = props.hardwareList.find(
      h => String(h.id) === idHw || String(h.id_hardware) === idHw || String(h.serial) === idHw
    )
    if (encontrado?.nombre) {
      return `${encontrado.nombre} (${idHw})`
    }
  }

  return idHw
})

// Coordenadas compatibles con todas las vistas (WS tracking, servicio global, etc.)
const coordenadas = computed(() => {
  if (!props.alerta) return null
  const rawLat = props.alerta.lat ?? props.alerta.latitud ?? props.alerta.latitude
  const rawLng = props.alerta.lon ?? props.alerta.longitud ?? props.alerta.lng ?? props.alerta.longitude
  if (rawLat === undefined || rawLng === undefined || rawLat === null || rawLng === null) return null

  const lat = parseFloat(String(rawLat))
  const lng = parseFloat(String(rawLng))
  if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
    return { lat, lng }
  }
  return null
})

// URLs de mapa estático y externo
const staticMapUrl = computed(() => {
  if (!coordenadas.value) return ''
  const { lat, lng } = coordenadas.value
  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${mapZoom.value}&size=700x360&scale=2&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${MAP_KEY}`

  if (themeStore.isDark) {
    const darkStyles = [
      'element:geometry|color:0x242f3e',
      'element:labels.text.stroke|color:0x242f3e',
      'element:labels.text.fill|color:0x746855',
      'feature:administrative.locality|element:labels.text.fill|color:0xd59563',
      'feature:poi|element:labels.text.fill|color:0xd59563',
      'feature:poi.park|element:geometry|color:0x263c3f',
      'feature:poi.park|element:labels.text.fill|color:0x6b9a76',
      'feature:road|element:geometry|color:0x38414e',
      'feature:road|element:geometry.stroke|color:0x212a37',
      'feature:road|element:labels.text.fill|color:0x9ca5b3',
      'feature:road.highway|element:geometry|color:0x746855',
      'feature:road.highway|element:geometry.stroke|color:0x1f2835',
      'feature:road.highway|element:labels.text.fill|color:0xf3d19c',
      'feature:transit|element:geometry|color:0x2f3948',
      'feature:transit.station|element:labels.text.fill|color:0xd59563',
      'feature:water|element:geometry|color:0x17263c',
      'feature:water|element:labels.text.fill|color:0x515c6d',
      'feature:water|element:labels.text.stroke|color:0x17263c'
    ].map(s => `style=${encodeURIComponent(s)}`).join('&')

    url += `&${darkStyles}`
  }

  return url
})

const googleMapsExternalUrl = computed(() => {
  if (!coordenadas.value) return '#'
  return `https://www.google.com/maps/search/?api=1&query=${coordenadas.value.lat},${coordenadas.value.lng}`
})

const zoomIn = () => {
  if (mapZoom.value < 20) {
    isMapImageLoading.value = true
    mapZoom.value++
  }
}

const zoomOut = () => {
  if (mapZoom.value > 10) {
    isMapImageLoading.value = true
    mapZoom.value--
  }
}

const openMapView = () => {
  mapZoom.value = 16
  isMapImageLoading.value = true
  modalActiveView.value = 'map'
}

const backToList = () => {
  modalActiveView.value = 'list'
}

const modalTitle = computed(() => {
  if (modalActiveView.value === 'map' && props.alerta) {
    return t('dashboard.solveAlarm.mapTitle', { type: obtenerNombreAlerta.value }, `Ubicación de Alarma: ${obtenerNombreAlerta.value}`)
  }
  return t('dashboard.solveAlarm.title', 'Solventar Alerta de Seguridad')
})

// Acción de Solventar Alerta
const handleSolventar = async () => {
  if (!props.alerta?.token || isSolventando.value) return

  const comentarioLimpio = comentarioSolucion.value.trim()
  if (!comentarioLimpio) {
    errorComentario.value = t('dashboard.solveAlarm.commentRequired', 'El comentario es obligatorio para solventar la alarma.')
    toast.add({
      severity: 'warn',
      summary: t('dashboard.solveAlarm.commentRequiredSummary', 'Comentario requerido'),
      detail: t('dashboard.solveAlarm.commentRequiredToast', 'Por favor, ingrese un comentario o justificación.'),
      life: 3500
    })
    return
  }

  isSolventando.value = true
  errorComentario.value = ''
  const token = props.alerta.token
  const visible = selectedVisibilidad.value

  try {
    const res = await solventarAlertaApi({
      token,
      comentario: comentarioLimpio,
      visible
    })

    if (res?.done !== false) {
      toast.add({
        severity: 'success',
        summary: t('common.success', 'Éxito'),
        detail: t('dashboard.solveAlarm.successToast', 'Alarma solventada correctamente'),
        life: 3000
      })
      emit('solventada', token)
      handleClose()
    } else {
      toast.add({
        severity: 'error',
        summary: t('common.error', 'Error'),
        detail: res?.msg || res?.message || t('dashboard.solveAlarm.errorToast', 'No se pudo solventar la alarma'),
        life: 4000
      })
    }
  } catch (err: any) {
    console.error('Error al solventar alerta:', err)
    toast.add({
      severity: 'error',
      summary: t('common.error', 'Error'),
      detail: err?.message || t('dashboard.solveAlarm.networkErrorToast', 'Error de conexión al solventar la alerta'),
      life: 4000
    })
  } finally {
    isSolventando.value = false
  }
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    :title="modalTitle"
    cancel-text="Cerrar"
    :show-footer="false"
    :size="modalActiveView === 'map' ? 'xl' : 'lg'"
  >
    <template #icon>
      <div v-if="modalActiveView === 'map'" class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
        <HugeiconsIcon :icon="MapsIcon" :size="18" />
      </div>
      <div v-else class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
        <HugeiconsIcon :icon="Alert01Icon" :size="18" />
      </div>
    </template>

    <!-- Transición suave entre Vistas (Detalle <-> Mapa) -->
    <Transition name="modal-view-morph" mode="out-in">
      <!-- Vista de Mapa -->
      <div v-if="modalActiveView === 'map'" key="map-view" class="space-y-3.5">
        <!-- Barra superior del Mapa -->
        <div class="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <button
            @click="backToList"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <HugeiconsIcon :icon="ArrowLeft02Icon" :size="14" />
            <span>{{ t('dashboard.solveAlarm.back', 'Volver') }}</span>
          </button>

          <div v-if="alerta" class="flex items-center gap-2.5 text-xs">
            <span class="font-bold text-slate-800 dark:text-slate-100">{{ obtenerNombreHardware }}</span>
            <a
              :href="googleMapsExternalUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-all flex items-center gap-1"
            >
              <HugeiconsIcon :icon="MapsIcon" :size="13" />
              <span>{{ t('dashboard.solveAlarm.openInMaps', 'Abrir en Maps') }}</span>
            </a>
          </div>
        </div>

        <!-- Contenedor del Mapa Estático -->
        <div class="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-[#13161C] flex items-center justify-center">
          <div v-if="isMapImageLoading" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-100/90 dark:bg-[#13161C]/90 backdrop-blur-sm">
            <HugeiconsIcon :icon="Loading02Icon" :size="28" class="text-[#3b82f6] animate-spin" />
            <span class="text-xs font-medium text-slate-400">{{ t('dashboard.solveAlarm.loadingMap', 'Cargando mapa...') }}</span>
          </div>

          <img
            v-if="staticMapUrl"
            :src="staticMapUrl"
            :alt="`Mapa de ${obtenerNombreAlerta}`"
            class="w-full h-full object-cover transition-opacity duration-300"
            :class="{ 'opacity-0': isMapImageLoading, 'opacity-100': !isMapImageLoading }"
            @load="isMapImageLoading = false"
            @error="isMapImageLoading = false"
          />

          <!-- Controles de Zoom -->
          <div class="absolute bottom-3 right-3 z-20 flex flex-col gap-1 bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-md">
            <button
              @click="zoomIn"
              :disabled="mapZoom >= 20"
              class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
              title="Acercar (+)"
            >
              +
            </button>
            <div class="h-px w-full bg-slate-200 dark:bg-white/10"></div>
            <button
              @click="zoomOut"
              :disabled="mapZoom <= 10"
              class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
              title="Alejar (-)"
            >
              −
            </button>
          </div>
        </div>

        <!-- Campo de Comentario -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <span>{{ t('dashboard.solveAlarm.comment', 'Comentario') }}</span>
            <span class="text-rose-500 font-bold">*</span>
          </label>
          <textarea
            v-model="comentarioSolucion"
            rows="2"
            maxlength="500"
            :placeholder="t('dashboard.solveAlarm.commentPlaceholder', 'Escriba el motivo o comentario de la resolución...')"
            @input="errorComentario = ''"
            class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.03] border text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all resize-none font-medium leading-relaxed"
            :class="errorComentario ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-200 dark:border-white/10 focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30'"
          ></textarea>
          <p v-if="errorComentario" class="text-[11px] font-medium text-rose-500 flex items-center gap-1">
            <HugeiconsIcon :icon="Alert01Icon" :size="12" />
            {{ errorComentario }}
          </p>
        </div>

        <!-- Barra de acción inferior -->
        <div class="flex items-center justify-between gap-3 pt-1">
          <div class="flex items-center gap-1 bg-slate-100/70 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
            <button
              type="button"
              @click="selectedVisibilidad = true"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              :class="selectedVisibilidad === true
                ? 'bg-white dark:bg-[#1E222B] text-[#3b82f6] shadow-sm border border-slate-200/50 dark:border-white/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
            >
              <HugeiconsIcon :icon="EyeIcon" :size="13" />
              <span>{{ t('dashboard.solveAlarm.visible', 'Visible') }}</span>
            </button>
            <button
              type="button"
              @click="selectedVisibilidad = false"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              :class="selectedVisibilidad === false
                ? 'bg-white dark:bg-[#1E222B] text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200/50 dark:border-white/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
            >
              <HugeiconsIcon :icon="ViewOffIcon" :size="13" />
              <span>{{ t('dashboard.solveAlarm.hidden', 'No Visible') }}</span>
            </button>
          </div>

          <button
            @click="handleSolventar"
            :disabled="isSolventando || !comentarioSolucion.trim()"
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-blue-500/20"
          >
            <HugeiconsIcon :icon="isSolventando ? Loading02Icon : Tick02Icon" :size="15" :class="{ 'animate-spin': isSolventando }" />
            <span>{{ isSolventando ? t('dashboard.solveAlarm.solvingBtn', 'Solventando...') : t('dashboard.solveAlarm.solveBtn', 'Solventar Alarma') }}</span>
          </button>
        </div>
      </div>

      <!-- Vista Principal: Detalle Simple de la Alerta -->
      <div v-else key="details-view" class="space-y-4">
        <!-- Resumen de la Alerta -->
        <div
          v-if="alerta"
          class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              {{ obtenerNombreAlerta }}
            </span>
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {{ obtenerNombreHardware }}
            </span>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <span class="text-[11px] text-slate-400 font-medium tabular-nums flex items-center gap-1">
              <HugeiconsIcon :icon="Clock01Icon" :size="12" />
              {{ alerta.fecha_hora || '---' }}
            </span>
            <button
              v-if="coordenadas"
              @click="openMapView"
              class="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <HugeiconsIcon :icon="MapsIcon" :size="13" />
              <span>{{ t('dashboard.solveAlarm.viewMap', 'Ver mapa') }}</span>
            </button>
          </div>
        </div>

        <!-- Campo de Comentario Directo -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <span>{{ t('dashboard.solveAlarm.comment', 'Comentario') }}</span>
            <span class="text-rose-500 font-bold">*</span>
          </label>
          <textarea
            v-model="comentarioSolucion"
            rows="3"
            maxlength="500"
            :placeholder="t('dashboard.solveAlarm.commentPlaceholder', 'Escriba el motivo o comentario de la resolución...')"
            @input="errorComentario = ''"
            class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.03] border text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all resize-none font-medium leading-relaxed"
            :class="errorComentario ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-200 dark:border-white/10 focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30'"
          ></textarea>
          <p v-if="errorComentario" class="text-[11px] font-medium text-rose-500 flex items-center gap-1">
            <HugeiconsIcon :icon="Alert01Icon" :size="12" />
            {{ errorComentario }}
          </p>
        </div>

        <!-- Barra de Acción Inferior -->
        <div class="flex items-center justify-between gap-3 pt-2">
          <!-- Selector de Visibilidad Minimalista -->
          <div class="flex items-center gap-1 bg-slate-100/70 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
            <button
              type="button"
              @click="selectedVisibilidad = true"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              :class="selectedVisibilidad === true
                ? 'bg-white dark:bg-[#1E222B] text-[#3b82f6] shadow-sm border border-slate-200/50 dark:border-white/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
            >
              <HugeiconsIcon :icon="EyeIcon" :size="13" />
              <span>{{ t('dashboard.solveAlarm.visible', 'Visible') }}</span>
            </button>
            <button
              type="button"
              @click="selectedVisibilidad = false"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              :class="selectedVisibilidad === false
                ? 'bg-white dark:bg-[#1E222B] text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200/50 dark:border-white/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
            >
              <HugeiconsIcon :icon="ViewOffIcon" :size="13" />
              <span>{{ t('dashboard.solveAlarm.hidden', 'No Visible') }}</span>
            </button>
          </div>

          <!-- Botón Solventar Alarma -->
          <button
            @click="handleSolventar"
            :disabled="isSolventando || !comentarioSolucion.trim()"
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-blue-500/20 ml-auto"
          >
            <HugeiconsIcon :icon="isSolventando ? Loading02Icon : Tick02Icon" :size="15" :class="{ 'animate-spin': isSolventando }" />
            <span>{{ isSolventando ? t('dashboard.solveAlarm.solvingBtn', 'Solventando...') : t('dashboard.solveAlarm.solveBtn', 'Solventar Alarma') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </AppModal>
</template>

<style scoped>
.modal-view-morph-enter-active,
.modal-view-morph-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-view-morph-enter-from,
.modal-view-morph-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
