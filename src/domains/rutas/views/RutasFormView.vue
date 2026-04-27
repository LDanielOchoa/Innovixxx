<template>
  <div class="rutas-theme-sync h-full relative w-full bg-[#F1F4F8] dark:bg-[#0d1116] overflow-hidden">
    
    <!-- Mapa Backdrop (Se mantiene debajo de todo) -->
    <div class="absolute inset-0 z-0">
      <div id="google-map-container" class="absolute inset-0 z-0 bg-[#F1F4F8] dark:bg-[#0d1116]"></div>
      
      <!-- Overlay de Carga Mapa -->
      <div 
        v-if="isLoadingMap" 
        class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#F1F4F8] dark:bg-[#0d1116] gap-4 transition-opacity duration-500"
        :class="{ 'opacity-0 pointer-events-none': !isLoadingMap }"
      >
        <div class="w-16 h-16 rounded-2xl bg-white/80 dark:bg-[#1A1D24]/80 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] shadow-lg animate-[float_3s_ease-in-out_infinite]">
          <HugeiconsIcon :icon="Location01Icon" :size="32" :stroke-width="1.5" />
        </div>
        <p class="text-[11px] font-black text-slate-500 dark:text-[#5da6fc] uppercase tracking-[0.2em] animate-pulse">{{ $t('rutas.initializingMap') }}</p>
      </div>

      <!-- Overlay Tutorial: Modo Agregar Paradas -->
      <Transition name="tutorial-fade">
        <div v-if="isAddingParadas && paradasTemporales.length === 0" class="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <!-- Pulsing center hint -->
          <div class="flex flex-col items-center gap-4 pointer-events-none">
            <div class="relative">
              <div class="w-20 h-20 rounded-full border-2 border-[#3b82f6]/30 dark:border-[#5da6fc]/30 animate-ping absolute inset-0"></div>
              <div class="w-20 h-20 rounded-full bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 backdrop-blur-md border border-[#3b82f6]/20 dark:border-[#5da6fc]/20 flex items-center justify-center relative">
                <HugeiconsIcon :icon="Location01Icon" :size="32" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              </div>
            </div>
            <div class="bg-white/90 dark:bg-[#0F1115]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 shadow-xl text-center max-w-[260px]">
              <p class="text-[13px] font-black text-slate-800 dark:text-white tracking-tight">Haz clic en el mapa</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Cada punto que selecciones se convertirá en una parada de la ruta</p>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Sidebar de Rutas (Master List) -->
    <div 
      class="absolute top-0 bottom-0 left-0 flex flex-col border-r border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-[#0F1115]/80 backdrop-blur-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-30 shadow-[10px_0_40px_rgba(0,0,0,0.02)] dark:shadow-[10px_0_40px_rgba(0,0,0,0.2)]"
      :class="[
        isSidebarFullScreen ? 'w-full' : 'w-full md:w-[35rem]',
        isAddingParadas ? 'md:-translate-x-full md:opacity-0 md:pointer-events-none -translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
      ]"
    >
      
      <div class="p-8 border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="router.push('/rutas')" class="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-[#3b82f6] transition-all shadow-sm">
            <HugeiconsIcon :icon="ArrowLeft01Icon" :size="20" />
          </button>
          <div>
            <h1 class="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{{ isEditMode ? $t('rutas.modalEditTitle') : $t('rutas.modalCreateTitle') }}</h1>
            <p class="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Detalles de la ruta</p>
          </div>
        </div>
        <AppButton 
          variant="primary" 
          @click="saveRuta"
          :loading="isSubmitting"
        >
          <span>{{ isEditMode ? $t('rutas.btnUpdate') : $t('rutas.btnSave') }}</span>
        </AppButton>
      </div>
      
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <form @submit.prevent="saveRuta" class="space-y-5 relative p-1">
        <Transition name="loader-fade">
          <div v-if="isSubmitting" class="absolute -inset-4 z-50 flex items-center justify-center bg-white/60 dark:bg-[#0F1115]/60 backdrop-blur-md rounded-2xl overflow-hidden">
            <div class="flex flex-col items-center gap-4 p-8">
              <div class="relative flex items-center justify-center">
                <div class="w-16 h-16 border-[4px] border-[#3b82f6]/10 border-t-[#3b82f6] rounded-full animate-spin"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <HugeiconsIcon :icon="Route01Icon" :size="24" class="text-[#3b82f6] animate-pulse" />
                </div>
              </div>
              <p class="text-[11px] font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase animate-pulse">{{ isEditMode ? 'Actualizando' : 'Creando' }} Ruta</p>
            </div>
          </div>
        </Transition>

        <Transition name="message-fade">
          <div v-if="modalMessage && !isSubmitting"
               class="flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-bold tracking-tight uppercase border"
               :class="{
                 'text-red-500 bg-red-500/5 border-red-500/10': modalMessage.type === 'error',
                 'text-amber-500 bg-amber-500/5 border-amber-500/10': modalMessage.type === 'warning',
                 'text-[#3b82f6] bg-[#3b82f6]/5 border-[#3b82f6]/10': modalMessage.type === 'success'
               }">
               <HugeiconsIcon :icon="modalMessage.type === 'error' || modalMessage.type === 'warning' ? Shield01Icon : Tick01Icon" :size="16" />
               {{ modalMessage.text }}
          </div>
        </Transition>

        <AppFormInput 
          v-model="formData.nombre"
          :label="$t('rutas.formName')"
          :placeholder="$t('rutas.formNamePlaceholder')"
          :icon="Route01Icon"
        />
        
        <div class="space-y-2 w-full">
          <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">{{ $t('rutas.formDesc') }}</label>
          <div class="relative group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] overflow-hidden focus-within:border-[#3b82f6]/40 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
            <textarea id="descripcion" v-model="formData.descripcion" required rows="3" :placeholder="$t('rutas.formDescPlaceholder')" class="w-full bg-transparent border-none px-4 py-3.5 text-[13px] font-bold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-0 resize-none"></textarea>
          </div>
        </div>

        <div class="space-y-3 p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
          <label class="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] ml-1">{{ $t('rutas.formColor') }}</label>
          <div class="flex items-center gap-4">
            <div ref="pickrContainer" class="pickr-container"></div>
            <div class="relative flex-1 group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-xl overflow-hidden focus-within:border-[#3b82f6]/40 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
              <input
                type="text"
                v-model="formData.color"
                maxlength="7"
                :placeholder="$t('rutas.formColorPlaceholder')"
                class="w-full bg-transparent border-none px-4 py-2.5 text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase focus:outline-none focus:ring-0"
              />
            </div>
            <div
              class="w-10 h-10 rounded-xl border-2 border-white dark:border-white/10 shadow-lg"
              :style="{ backgroundColor: formData.color }"
            />
          </div>
        </div>

        <!-- Step 2: Stops Section -->
        <div class="rounded-2xl border-2 transition-all duration-300 overflow-hidden"
             :class="paradasTemporales.length > 0 ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]'">
          <!-- Header of stops section -->
          <div class="flex items-center justify-between px-4 py-3 border-b" :class="paradasTemporales.length > 0 ? 'border-emerald-100 dark:border-emerald-500/10' : 'border-slate-100 dark:border-white/5'">
            <div class="flex items-center gap-2">
              <HugeiconsIcon :icon="Location01Icon" :size="16" :class="paradasTemporales.length > 0 ? 'text-emerald-500' : 'text-slate-400'" />
              <span class="text-[11px] font-black uppercase tracking-wider" :class="paradasTemporales.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">{{ $t('rutas.strategicStops') }}</span>
            </div>
            <span v-if="paradasTemporales.length > 0" class="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-white">
              {{ paradasTemporales.length }} {{ paradasTemporales.length === 1 ? 'parada' : 'paradas' }}
            </span>
            <span v-else class="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">Requerido</span>
          </div>

          <!-- Content -->
          <div class="p-4">
            <!-- Preview of stops if any -->
            <div v-if="paradasTemporales.length > 0" class="flex items-center gap-1.5 mb-3 flex-wrap">
              <div v-for="(_, i) in paradasTemporales" :key="i"
                   class="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-[9px] font-black text-white shadow-sm">
                {{ i + 1 }}
              </div>
              <div class="w-6 h-6 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center">
                <HugeiconsIcon :icon="Add01Icon" :size="10" class="text-slate-400" />
              </div>
            </div>

            <button 
              type="button" 
              @click="startAddingParadas" 
              class="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-black text-[12px] uppercase tracking-wide transition-all duration-200 active:scale-[0.98] border"
              :class="paradasTemporales.length > 0
                ? 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                : 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] text-white border-[#2563eb] shadow-[0_4px_0_#2563eb,0_8px_15px_rgba(59,130,246,0.2)] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb]'"
            >
              <HugeiconsIcon :icon="Location01Icon" :size="18" />
              {{ paradasTemporales.length > 0 ? $t('rutas.btnModifyStops') : 'Trazar paradas en el mapa →' }}
            </button>

            <p v-if="paradasTemporales.length === 0" class="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2.5 font-medium">
              Mínimo 2 paradas · Haz clic en el mapa para añadirlas
            </p>
          </div>
        </div>
      </form>
      </div>
    </div>
    <!-- Panel de Paradas: Modo Edición (Floating Side Panel) -->
    <Transition name="panel-float">
      <ParadasListPanel
        v-if="isAddingParadas"
        :paradas="paradasTemporales"
        :tipos-parada="tiposParada"
        :selected-index="selectedParadaIndex"
        @select="onParadaSelect"
        @delete="onParadaDelete"
        @save="finishAddingParadas"
        @clear="clearParadasTemporales"
        @close="finishAddingParadas"
      />
    </Transition>

    

    <AppModal
      v-model:isOpen="isTipoModalOpen"
      :title="$t('rutas.modalStopTypeTitle')"
      @cancel="isTipoModalOpen = false; selectedTipoParada = null"
    >
      <template #icon>
        <HugeiconsIcon :icon="Location01Icon" :size="20" class="text-slate-400" />
      </template>
      <div class="space-y-6">
        <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{{ $t('rutas.stopTypeDescription') }}</p>
        <div v-if="currentParadaCoords" class="p-4 bg-slate-100 dark:bg-[#0F1115] rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
          <p class="text-[10px] font-black text-[#3b82f6] dark:text-[#5da6fc] text-center uppercase tracking-[0.1em]">
            LAT: {{ currentParadaCoords.lat.toFixed(6) }} <span class="mx-2 opacity-30">|</span> LON: {{ currentParadaCoords.lon.toFixed(6) }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            v-for="tipo in tiposParada"
            :key="tipo.id_tipo"
            @click="selectedTipoParada = tipo.id_tipo"
            class="flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group shadow-sm active:scale-[0.98]"
            :class="selectedTipoParada === tipo.id_tipo
              ? 'bg-[#3b82f6]/10 border-[#3b82f6]/50 text-[#3b82f6] shadow-[inset_0_2px_4px_rgba(59,130,246,0.1)]'
              : 'bg-white dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#3b82f6]/30 dark:hover:border-[#5da6fc]/30'"
          >
            <span class="text-xs font-black uppercase tracking-wide">{{ tipo.nombre }}</span>
            <div 
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
              :class="selectedTipoParada === tipo.id_tipo ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-slate-300 dark:border-white/20'"
            >
              <HugeiconsIcon v-if="selectedTipoParada === tipo.id_tipo" :icon="Tick01Icon" :size="12" class="text-white" />
            </div>
          </button>
        </div>
      </div>
      <template #footer>
        <div class="flex flex-col sm:flex-row gap-3 w-full">
          <button type="button" @click="isTipoModalOpen = false; selectedTipoParada = null" class="flex-1 px-6 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all uppercase tracking-tight">
            {{ $t('rutas.btnCancel') }}
          </button>
          <button 
            type="button" 
            @click="confirmParada" 
            :disabled="!selectedTipoParada" 
            class="flex-[2] px-6 py-3 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white rounded-xl text-sm font-black transition-all shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none uppercase tracking-tight"
          >
            {{ $t('rutas.btnAddStops') }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal de Edición de Parada -->
    <AppModal
      v-model:isOpen="isEditParadaModalOpen"
      :title="$t('rutas.modalEditStopTitle')"
      @cancel="isEditParadaModalOpen = false; editingTipoParada = null"
    >
      <template #icon>
        <HugeiconsIcon :icon="Location01Icon" :size="20" class="text-slate-400" />
      </template>
      <div class="space-y-6">
        <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">{{ $t('rutas.stopNumber', { index: editingParadaIndex !== null ? editingParadaIndex + 1 : '' }) }}</p>
        <div v-if="editingParadaIndex !== null" class="p-4 bg-slate-100 dark:bg-[#0F1115] rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
          <p class="text-[10px] font-black text-[#3b82f6] dark:text-[#5da6fc] text-center uppercase tracking-[0.1em]">
            LAT: {{ paradasTemporales[editingParadaIndex]?.lat.toFixed(6) }} <span class="mx-2 opacity-30">|</span> LON: {{ paradasTemporales[editingParadaIndex]?.lon.toFixed(6) }}
          </p>
        </div>

        <p class="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] ml-1">{{ $t('rutas.selectNewType') }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <button
            v-for="tipo in tiposParada"
            :key="tipo.id_tipo"
            @click="editingTipoParada = tipo.id_tipo"
            class="flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group shadow-sm active:scale-[0.98]"
            :class="editingTipoParada === tipo.id_tipo
              ? 'bg-[#3b82f6]/10 border-[#3b82f6]/50 text-[#3b82f6] shadow-[inset_0_2px_4px_rgba(59,130,246,0.1)]'
              : 'bg-white dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#3b82f6]/30 dark:hover:border-[#5da6fc]/30'"
          >
            <span class="text-xs font-black uppercase tracking-wide">{{ tipo.nombre }}</span>
            <div 
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
              :class="editingTipoParada === tipo.id_tipo ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-slate-300 dark:border-white/20'"
            >
              <HugeiconsIcon v-if="editingTipoParada === tipo.id_tipo" :icon="Tick01Icon" :size="12" class="text-white" />
            </div>
          </button>
        </div>
      </div>
      <template #footer>
        <div class="flex flex-col gap-4 w-full">
          <button type="button" @click="deleteEditingParada" class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-black text-red-500 transition-all uppercase tracking-tight active:scale-[0.98]">
            <HugeiconsIcon :icon="Delete01Icon" :size="18" />
            {{ $t('rutas.btnDelete') }}
          </button>
          <div class="flex gap-3 w-full">
            <button type="button" @click="isEditParadaModalOpen = false; editingTipoParada = null" class="flex-1 px-6 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all uppercase tracking-tight">
              {{ $t('rutas.btnCancel') }}
            </button>
            <button 
              type="button" 
              @click="saveEditingParada" 
              :disabled="!editingTipoParada" 
              class="flex-1 px-6 py-3 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white rounded-xl text-sm font-black transition-all shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none uppercase tracking-tight"
            >
              {{ $t('rutas.btnSaveChanges') }}
            </button>
          </div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, watch, computed, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Location01Icon,
  Route01Icon,
  Add01Icon,
  ArrowLeft01Icon,
  Delete01Icon,
  Shield01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons'

import { createRutaApi, updateRutaApi, fetchTiposParadaApi, fetchRutaDetallesApi } from '../services/rutas.api'
import type { TipoParada, ParadaPayload, RutaUpdatePayload } from '../types/ruta'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import AppModal from '../../../components/ui/AppModal.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'
import ParadasListPanel from '../../../components/rutas/ParadasListPanel.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const MAP_KEY = 'AIzaSyDIUxzochI7PvqdE8pNL6b5jy77NOnO1Ko'

const isLoadingMap = ref(true)
const map = shallowRef<any>(null)
const activeTheme = ref('tactical')
const isSidebarFullScreen = ref(false)
const isDarkMapMode = ref(document.documentElement.classList.contains('dark'))
const htmlClassObserver = ref<MutationObserver | null>(null)

// State for Routes
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

// Form State
const isSubmitting = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)
const formData = ref({ nombre: '', descripcion: '', color: '#60a5fa' })

// Estado para edición
const isEditMode = ref(false)
const editingRutaId = ref<string | null>(null)

// Pickr Color Picker
const pickrContainer = ref<HTMLElement | null>(null)
let pickrInstance: any = null

// Paradas State
const isAddingParadas = ref(false)
const paradasTemporales = ref<ParadaPayload[]>([])
const tiposParada = ref<TipoParada[]>([])
const isTipoModalOpen = ref(false)
const currentParadaCoords = ref<{lat: number, lon: number, insertionIndex?: number} | null>(null)
const selectedTipoParada = ref<number | null>(null)
const paradasMarkers = ref<any[]>([])
const paradasInfoWindows = ref<any[]>([]) // Array para InfoWindows de los marcadores
const selectedParadaIndex = ref<number | null>(null) // Índice de parada seleccionada para edición

// Modal de edición de parada existente
const isEditParadaModalOpen = ref(false)
const editingParadaIndex = ref<number | null>(null)
const editingTipoParada = ref<number | null>(null)

// Routing Services
const directionsService = shallowRef<any>(null)
const directionsRenderers = shallowRef<any[]>([]) // Array para soportar rutas largas (chunking)
const highlightedSegmentRenderer = shallowRef<any>(null) // Renderer para segmento resaltado

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const initPickr = async () => {
  await nextTick()
  if (!pickrContainer.value || !(window as any).Pickr) return

  // Destruir instancia anterior si existe
  if (pickrInstance) {
    pickrInstance.destroyAndRemove()
    pickrInstance = null
  }

  pickrInstance = (window as any).Pickr.create({
    el: pickrContainer.value,
    theme: 'nano',
    default: formData.value.color,
    swatches: [
      '#60a5fa', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ],
    components: {
      preview: true,
      opacity: false,
      hue: true,
      interaction: {
        hex: true,
        rgba: false,
        hsla: false,
        hsva: false,
        cmyk: false,
        input: true,
        clear: false,
        save: false
      }
    }
  })

  pickrInstance.on('change', (color: any) => {
    formData.value.color = color.toHEXA().toString()
  })
}

const loadRouteData = async (id_ruta: string) => {
  if (!selectedGroup.value?.id) return
  
  isSubmitting.value = true
  try {
    const detalle = await fetchRutaDetallesApi(selectedGroup.value.id, id_ruta)
    if (detalle) {
      isEditMode.value = true
      editingRutaId.value = id_ruta
      formData.value = {
        nombre: detalle.nombre,
        descripcion: detalle.descripcion,
        color: detalle.color || '#60a5fa'
      }
      
      if (detalle.paradas) {
        paradasTemporales.value = detalle.paradas.map(p => ({
          lat: parseFloat(p.lat),
          lon: parseFloat(p.lon),
          tipo: p.id_tipo_parada
        }))
      }
      
      // Inicializar marcadores en el mapa si hay paradas
      clearParadasMarkers()
      if (paradasTemporales.value.length > 0 && map.value) {
        paradasTemporales.value.forEach((p, idx) => {
          const tipoNombre = tiposParada.value.find(t => t.id_tipo === p.tipo)?.nombre || 'Parada'
          addParadaToMap(p.lat, p.lon, tipoNombre, idx)
        })
        if (paradasTemporales.value.length >= 2) {
          recalculateRouteFromIndex(0)
        }
      }
      
      initPickr()
    }
  } catch (error) {
    console.error('Error cargando detalles para edición:', error)
    showModalMessage(t('rutas.alertNetErrorUpdate'), 'error')
  } finally {
    isSubmitting.value = false
  }
}

const startAddingParadas = async () => {
  if (tiposParada.value.length === 0) {
    try {
      tiposParada.value = await fetchTiposParadaApi()
    } catch (e) {
      console.error("Error fetching tipos parada", e)
    }
  }
  isAddingParadas.value = true

  // Asegurar que el mapa esté limpio antes de redibujar
  clearParadasMarkers()

  // Redibujar marcadores existentes de paradasTemporales
  paradasTemporales.value.forEach((p, idx) => {
    const tipoNombre = tiposParada.value.find(t => t.id_tipo === p.tipo)?.nombre || 'Parada'
    addParadaToMap(p.lat, p.lon, tipoNombre, idx)
  });

  // Dibujar la polilínea inicial si hay paradas
  if (paradasTemporales.value.length >= 2) {
    recalculateRouteFromIndex(0)
  }
}

const finishAddingParadas = () => {
  isAddingParadas.value = false
  initPickr()
}

const saveRuta = async () => {
  if (isSubmitting.value) return
  const idGrupo = selectedGroup.value?.id?.trim() || ''
  if (!idGrupo) {
    showModalMessage(t('rutas.alertSelectGroup'), 'warning')
    return
  }
  if (idGrupo.length !== 8) {
    showModalMessage(t('rutas.alertInvalidGroup'), 'warning')
    return
  }
  
  isSubmitting.value = true
  modalMessage.value = null

  try {
    let data
    
    if (isEditMode.value && editingRutaId.value) {
      // Modo edición
      const updatePayload: RutaUpdatePayload = {
        id_grupo: idGrupo,
        id_ruta: editingRutaId.value,
        nombre: formData.value.nombre,
        descripcion: formData.value.descripcion,
        color: formData.value.color,
        paradas: paradasTemporales.value
      }
      data = await updateRutaApi(updatePayload)
    } else {
      // Modo creación
      data = await createRutaApi({
        id_grupo: idGrupo,
        nombre: formData.value.nombre,
        descripcion: formData.value.descripcion,
        color: formData.value.color,
        paradas: paradasTemporales.value.length > 0 ? paradasTemporales.value : undefined
      })
    }
    
    if (data.done) {
      showModalMessage(isEditMode.value ? t('rutas.alertSuccessUpdate') : t('rutas.alertSuccessCreate'), 'success')
      clearParadasMarkers()
      paradasTemporales.value = []
      if (pickrInstance) {
        pickrInstance.destroyAndRemove()
        pickrInstance = null
      }
      setTimeout(() => { 
        router.push('/rutas')
      }, 1500)
    } else {
      showModalMessage(data.message || (isEditMode.value ? t('rutas.alertErrorUpdate') : t('rutas.alertErrorCreate')), 'error')
    }
  } catch (error) {
    console.error('Error saving ruta:', error)
    showModalMessage(isEditMode.value ? t('rutas.alertNetErrorUpdate') : t('rutas.alertNetErrorCreate'), 'error')
  } finally {
    isSubmitting.value = false
  }
}

const clearParadasMarkers = () => {
  // Cerrar y limpiar todos los InfoWindows
  paradasInfoWindows.value.forEach(infoWindow => {
    if (infoWindow) {
      try { infoWindow.close() } catch (e) { /* ignorar */ }
    }
  })
  paradasInfoWindows.value = []
  
  // Quitar todos los marcadores del mapa
  const markersToClean = [...paradasMarkers.value]
  paradasMarkers.value = []
  
  markersToClean.forEach(marker => {
    if (marker) {
      try {
        marker.setVisible(false)
        ;(window as any).google.maps.event.clearInstanceListeners(marker)
        marker.setMap(null)
      } catch (e) { /* ignorar */ }
    }
  })
  
  // Limpiar todos los renderers de rutas
  const renderersToClean = [...directionsRenderers.value]
  directionsRenderers.value = []
  
  renderersToClean.forEach(renderer => {
    if (renderer) {
      try { renderer.setMap(null) } catch (e) { /* ignorar */ }
    }
  })
  
  // Limpiar segmento resaltado
  if (highlightedSegmentRenderer.value) {
    try { highlightedSegmentRenderer.value.setMap(null) } catch (e) { /* ignorar */ }
    highlightedSegmentRenderer.value = null
  }
  
  // Forzar refresh del mapa
  if (map.value) {
    const currentCenter = map.value.getCenter()
    map.value.setCenter(currentCenter)
  }
}

// Cargar datos cuando cambia el grupo o al montar
watch(() => selectedGroup.value?.id, (newId) => {
  if (newId && route.params.id) {
    loadRouteData(route.params.id as string)
  }
}, { immediate: true })


// Theme definitions with dynamic dark/light variants
const themes = [
  {
    id: 'tactical',
    name: 'Tactical (Standard)',
    getStyle: (isDark: boolean) => {
      const land = isDark ? '#0f172a' : '#e2e8f0'
      const water = isDark ? '#020617' : '#cbd5e1'
      const road = isDark ? '#1e293b' : '#f1f5f9'
      const highway = isDark ? '#334155' : '#ffffff'
      const text = '#64748b'
      const accent = isDark ? '#3b82f6' : '#2563eb'

      return [
        { elementType: 'geometry', stylers: [{ color: land }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: land }, { weight: 2 }] },
        { elementType: 'labels.text.fill', stylers: [{ color: text }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: accent }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: isDark ? '#020617' : '#d1d5db' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: road }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: highway }] },
        { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: accent }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: water }] }
      ]
    }
  }
]

// Helper to get current style for a theme
const getMapStyle = (themeId: string, isDark: boolean = true) => {
  const theme = themes.find(t => t.id === themeId)
  return theme ? theme.getStyle(isDark) : []
}

const initializeMap = (googleMapsApi: any) => {
  const container = document.getElementById('google-map-container')
  if (!container) return

  isLoadingMap.value = false

  map.value = new googleMapsApi.Map(container, {
    center: { lat: 4.6097, lng: -74.0817 }, // Bogota
    zoom: 12,
    styles: getMapStyle(activeTheme.value, isDarkMapMode.value),
    disableDefaultUI: true, // HUD limpio
    zoomControl: true,
  })

  directionsService.value = new googleMapsApi.DirectionsService()

  map.value.addListener('click', (e: any) => {
    if (isAddingParadas.value) {
      const clickLat = e.latLng.lat()
      const clickLon = e.latLng.lng()
      
      let insertionIndex: number
      
      if (selectedParadaIndex.value !== null && selectedParadaIndex.value !== undefined) {
        // Hay un punto seleccionado: siempre insertar DESPUÉS de él
        insertionIndex = selectedParadaIndex.value + 1
        // Deseleccionar después de insertar
        selectedParadaIndex.value = null
      } else {
        // No hay punto seleccionado: usar algoritmo inteligente global
        insertionIndex = calculateInsertionIndex(clickLat, clickLon)
      }
      
      currentParadaCoords.value = {
        lat: clickLat,
        lon: clickLon,
        insertionIndex: insertionIndex
      }
      selectedTipoParada.value = null
      isTipoModalOpen.value = true
    }
  })
}

// Algoritmo de inserción inteligente: encuentra el mejor lugar para insertar
const calculateInsertionIndex = (lat: number, lon: number): number => {
  // Si no hay paradas, insertar al inicio
  if (paradasTemporales.value.length === 0) return 0
  
  const firstParada = paradasTemporales.value[0]
  if (!firstParada) return 0
  
  // Si solo hay una parada, verificar cuál está más cerca
  if (paradasTemporales.value.length === 1) {
    const distToFirst = calculateDistance(lat, lon, firstParada.lat, firstParada.lon)
    // Si está cerca del inicio, insertar después
    return distToFirst < 0.5 ? 1 : 0
  }
  
  // Calcular distancia a cada segmento de la ruta
  let minDistance = Infinity
  let bestIndex = paradasTemporales.value.length // Por defecto, al final
  
  for (let i = 0; i < paradasTemporales.value.length - 1; i++) {
    const p1 = paradasTemporales.value[i]
    const p2 = paradasTemporales.value[i + 1]
    if (!p1 || !p2) continue
    
    const dist = distanceToSegment(lat, lon, p1.lat, p1.lon, p2.lat, p2.lon)
    
    if (dist < minDistance) {
      minDistance = dist
      bestIndex = i + 1 // Insertar entre p1 y p2
    }
  }
  
  // También considerar insertar al principio o al final
  const lastParada = paradasTemporales.value[paradasTemporales.value.length - 1]
  if (!lastParada) return bestIndex
  
  const distToFirst = calculateDistance(lat, lon, firstParada.lat, firstParada.lon)
  const distToLast = calculateDistance(lat, lon, lastParada.lat, lastParada.lon)
  
  // Si está más cerca del primer punto que de cualquier segmento, insertar al principio
  if (distToFirst < minDistance * 1.5) {
    return 0
  }
  
  // Si está más cerca del último punto, insertar al final
  if (distToLast < minDistance * 1.5) {
    return paradasTemporales.value.length
  }
  
  return bestIndex
}

// Calcular distancia euclidiana entre dos puntos (coordenadas aproximadas)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLat = lat2 - lat1
  const dLon = lon2 - lon1
  return Math.sqrt(dLat * dLat + dLon * dLon)
}

// Calcular distancia perpendicular de un punto a un segmento de línea
const distanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) {
    param = dot / lenSq
  }

  let xx, yy

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = px - xx
  const dy = py - yy

  return Math.sqrt(dx * dx + dy * dy)
}

const addParadaToMap = (lat: number, lon: number, tipoNombre: string, index?: number) => {
  if (!map.value || !(window as any).google) return

  const markerIndex = index !== undefined ? index : paradasMarkers.value.length
  const routeColor = formData.value.color || '#60a5fa'

  const marker = new (window as any).google.maps.Marker({
    position: { lat, lng: lon },
    map: map.value,
    title: tipoNombre,
    zIndex: 100 + markerIndex,
    icon: {
      path: "M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z",
      fillColor: routeColor,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 1.2,
      anchor: new (window as any).google.maps.Point(12, 36),
      labelOrigin: new (window as any).google.maps.Point(12, 12)
    },
    label: {
      text: (markerIndex + 1).toString(),
      color: 'white',
      fontSize: '11px',
      fontWeight: 'bold',
      fontFamily: "'Inter', sans-serif"
    },
    animation: (window as any).google.maps.Animation.DROP
  })
  
  const infoWindow = new (window as any).google.maps.InfoWindow({
    content: `<div style="color: #0d1116; font-family: 'Share Tech Mono', monospace; font-size: 12px; font-weight: bold; padding: 2px 4px; text-transform: uppercase;">${tipoNombre}</div>`
  })

  // Guardar referencia al InfoWindow para poder limpiarlo luego
  paradasInfoWindows.value.push(infoWindow)

  marker.addListener("mouseover", () => {
    infoWindow.open({
      anchor: marker,
      map: map.value,
    })
  })
  
  marker.addListener("mouseout", () => {
    infoWindow.close()
  })
  
  // Click en marcador para editar (solo en modo edición)
  marker.addListener("click", () => {
    if (isAddingParadas.value && markerIndex < paradasTemporales.value.length) {
      editingParadaIndex.value = markerIndex
      editingTipoParada.value = paradasTemporales.value[markerIndex]?.tipo || null
      isEditParadaModalOpen.value = true
    }
  })

  paradasMarkers.value.push(marker)
}

const confirmParada = () => {
  if (currentParadaCoords.value && selectedTipoParada.value) {
    const newParada: ParadaPayload = {
      lat: currentParadaCoords.value.lat,
      lon: currentParadaCoords.value.lon,
      tipo: selectedTipoParada.value
    }
    
    // Obtener el índice de inserción calculado (o al final si no existe)
    const insertionIndex = currentParadaCoords.value.insertionIndex !== undefined 
      ? currentParadaCoords.value.insertionIndex 
      : paradasTemporales.value.length
    
    // Insertar en la posición correcta
    paradasTemporales.value.splice(insertionIndex, 0, newParada)
    
    // Limpiar y redibujar todo para mantener consistencia
    clearParadasMarkers()
    
    // Redibujar marcadores con sus índices actualizados
    paradasTemporales.value.forEach((p, idx) => {
      const tipoNombre = tiposParada.value.find(t => t.id_tipo === p.tipo)?.nombre || t('rutas.stopFallback')
      addParadaToMap(p.lat, p.lon, tipoNombre, idx)
    })
    
    // Recalcular ruta desde el índice insertado (optimización parcial)
    // Usar insertionIndex calculado anteriormente, o default al último
    const recalcIndex = insertionIndex !== undefined ? insertionIndex : paradasTemporales.value.length - 1
    recalculateRouteFromIndex(recalcIndex)
    
    isTipoModalOpen.value = false
    currentParadaCoords.value = null
    selectedTipoParada.value = null
  }
}

// Recalcular chunks afectados desde un índice (optimización para edición)
const recalculateRouteFromIndex = (startParadaIndex: number) => {
  const CHUNK_SIZE = 24
  const totalPoints = paradasTemporales.value.length
  
  if (totalPoints < 2) {
    // Limpiar todo si no hay suficientes puntos
    directionsRenderers.value.forEach(r => r.setMap(null))
    directionsRenderers.value = []
    return
  }
  
  // Calcular qué chunk contiene el índice de inicio
  const startChunkIndex = Math.floor(startParadaIndex / CHUNK_SIZE)
  const totalChunks = Math.ceil((totalPoints - 1) / CHUNK_SIZE)
  
  // Limpiar solo los chunks afectados (desde startChunkIndex en adelante)
  const renderersToKeep = directionsRenderers.value.slice(0, startChunkIndex)
  const renderersToRemove = directionsRenderers.value.slice(startChunkIndex)
  
  renderersToRemove.forEach(r => {
    if (r) r.setMap(null)
  })
  
  directionsRenderers.value = renderersToKeep
  
  // Recalcular chunks desde startChunkIndex
  for (let chunkIdx = startChunkIndex; chunkIdx < totalChunks; chunkIdx++) {
    const startIdx = chunkIdx * CHUNK_SIZE
    const endIdx = Math.min(startIdx + CHUNK_SIZE + 1, totalPoints)
    const chunk = paradasTemporales.value.slice(startIdx, endIdx)
    
    if (chunk.length >= 2) {
      const origin = chunk[0]
      const destination = chunk[chunk.length - 1]
      if (!origin || !destination) continue
      
      const waypoints = chunk.length > 2 
        ? chunk.slice(1, -1).map(p => ({ location: { lat: p.lat, lng: p.lon }, stopover: true }))
        : []
      
      const routeColor = formData.value.color || '#60a5fa'
      const renderer = new (window as any).google.maps.DirectionsRenderer({
        map: map.value,
        suppressMarkers: true,
        preserveViewport: chunkIdx > 0,
        polylineOptions: { strokeColor: routeColor, strokeOpacity: 0.9, strokeWeight: 4 }
      })
      directionsRenderers.value.push(renderer)
      
      directionsService.value.route({
        origin: { lat: origin.lat, lng: origin.lon },
        destination: { lat: destination.lat, lng: destination.lon },
        waypoints,
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
      }, (response: any, status: string) => {
        if (status === 'OK') renderer.setDirections(response)
      })
    }
  }
}

// Handlers para el panel de paradas
const onParadaSelect = (index: number | null) => {
  selectedParadaIndex.value = index
  
  // Limpiar segmento resaltado anterior
  if (highlightedSegmentRenderer.value) {
    try { highlightedSegmentRenderer.value.setMap(null) } catch (e) { /* ignorar */ }
    highlightedSegmentRenderer.value = null
  }
  
  if (index !== null) {
    const parada = paradasTemporales.value[index]
    if (parada && map.value) {
      map.value.setCenter({ lat: parada.lat, lng: parada.lon })
      map.value.setZoom(15)
    }
    
    // Resaltar el segmento desde este punto al siguiente
    highlightSegmentFromPoint(index)
  }
}

// Resaltar el segmento de ruta desde un punto específico hasta el siguiente
const highlightSegmentFromPoint = (pointIndex: number) => {
  if (!directionsService.value || !map.value || !(window as any).google) return
  if (pointIndex >= paradasTemporales.value.length - 1) return // Es el último punto, no hay segmento siguiente
  
  const origin = paradasTemporales.value[pointIndex]
  const destination = paradasTemporales.value[pointIndex + 1]
  
  if (!origin || !destination) return
  
  // Limpiar renderer anterior si existe
  if (highlightedSegmentRenderer.value) {
    try { highlightedSegmentRenderer.value.setMap(null) } catch (e) { /* ignorar */ }
  }
  
  // Crear nuevo renderer para el segmento resaltado
  highlightedSegmentRenderer.value = new (window as any).google.maps.DirectionsRenderer({
    map: map.value,
    suppressMarkers: true,
    preserveViewport: true, // No cambiar el viewport
    polylineOptions: {
      strokeColor: '#fbbf24', // Amarillo ámbar
      strokeOpacity: 1.0,
      strokeWeight: 6, // Más grueso que la ruta normal
      zIndex: 100 // Encima de la ruta normal
    }
  })
  
  // Calcular ruta para este segmento específico
  directionsService.value.route({
    origin: { lat: origin.lat, lng: origin.lon },
    destination: { lat: destination.lat, lng: destination.lon },
    travelMode: (window as any).google.maps.TravelMode.DRIVING
  }, (response: any, status: string) => {
    if (status === 'OK' && highlightedSegmentRenderer.value) {
      highlightedSegmentRenderer.value.setDirections(response)
    }
  })
}

const onParadaDelete = (index: number) => {
  // Remover del array
  paradasTemporales.value.splice(index, 1)
  
  // Limpiar y redibujar todo
  clearParadasMarkers()
  
  // Redibujar marcadores con sus índices
  paradasTemporales.value.forEach((p, idx) => {
    const tipo = tiposParada.value.find(t => t.id_tipo === p.tipo)
    addParadaToMap(p.lat, p.lon, tipo?.nombre || t('rutas.stopFallback'), idx)
  })
  
  // Recalcular ruta desde el índice eliminado (optimización parcial)
  recalculateRouteFromIndex(index)
  
  // Ajustar índice seleccionado si es necesario
  if (selectedParadaIndex.value === index) {
    selectedParadaIndex.value = null
  } else if (selectedParadaIndex.value !== null && selectedParadaIndex.value > index) {
    selectedParadaIndex.value--
  }
}

const clearParadasTemporales = () => {
  paradasTemporales.value = []
  clearParadasMarkers()
  directionsRenderers.value.forEach(r => r.setMap(null))
  directionsRenderers.value = []
  selectedParadaIndex.value = null
}

// Guardar cambios de parada editada
const saveEditingParada = () => {
  if (editingParadaIndex.value === null || editingTipoParada.value === null) return
  
  // Verificar que la parada existe
  const parada = paradasTemporales.value[editingParadaIndex.value]
  if (!parada) return
  
  // Actualizar el tipo en el array
  parada.tipo = editingTipoParada.value
  
  // Limpiar y redibujar todo
  clearParadasMarkers()
  
  // Redibujar marcadores con sus índices
  paradasTemporales.value.forEach((p, idx) => {
    const tipo = tiposParada.value.find(t => t.id_tipo === p.tipo)
    addParadaToMap(p.lat, p.lon, tipo?.nombre || t('rutas.stopFallback'), idx)
  })
  
  // Recalcular ruta desde la parada editada (optimización parcial)
  recalculateRouteFromIndex(editingParadaIndex.value)
  
  // Cerrar modal
  isEditParadaModalOpen.value = false
  editingParadaIndex.value = null
  editingTipoParada.value = null
}

// Eliminar parada desde el modal de edición
const deleteEditingParada = () => {
  if (editingParadaIndex.value === null) return
  
  // Usar la función existente onParadaDelete
  onParadaDelete(editingParadaIndex.value)
  
  // Cerrar modal
  isEditParadaModalOpen.value = false
  editingParadaIndex.value = null
  editingTipoParada.value = null
}

// Flag para evitar cargar múltiples rutas simultáneamente
const isLoadingRouteDetails = ref(false)

// Mostrar detalles de ruta existente en el mapa
const showRouteDetails = async (id_ruta: string) => {
  if (isLoadingRouteDetails.value) return
  if (!selectedGroup.value?.id || !map.value) return
  
  isLoadingRouteDetails.value = true
  
  // Limpiar elementos anteriores del mapa
  clearParadasMarkers()
  
  // Pausa para asegurar que la limpieza visual se complete
  await new Promise(resolve => setTimeout(resolve, 100))
  
  try {
    const detalle = await fetchRutaDetallesApi(selectedGroup.value.id, id_ruta)
    if (!detalle || !detalle.paradas || detalle.paradas.length === 0) {
      isLoadingRouteDetails.value = false
      return
    }
    
    // Convertir paradas al formato interno
    const paradasParaDibujar: ParadaPayload[] = detalle.paradas.map(p => ({
      lat: parseFloat(p.lat),
      lon: parseFloat(p.lon),
      tipo: p.id_tipo_parada
    }))
    
    // Actualizar el color de la ruta en el estado global para que los marcadores lo usen
    const rutaColor = (detalle as any).color 
    formData.value.color = rutaColor

    // Dibujar marcadores para cada parada
    detalle.paradas.forEach((p) => {
      addParadaToMap(parseFloat(p.lat), parseFloat(p.lon), p.tipo_nombre)
    })
    
    // Dibujar la ruta completa en el mapa
    drawExistingRoute(paradasParaDibujar, rutaColor)
    
    // Centrar el mapa en la primera parada
    const firstParada = paradasParaDibujar[0]
    if (firstParada) {
      map.value.setCenter({ lat: firstParada.lat, lng: firstParada.lon })
      map.value.setZoom(13)
    }
    
  } catch (error) {
    console.error('Error al cargar detalles de ruta:', error)
  } finally {
    isLoadingRouteDetails.value = false
  }
}

// Dibujar ruta existente con chunking
const drawExistingRoute = (paradas: ParadaPayload[], routeColor: string = '#60a5fa') => {
  if (!directionsService.value || paradas.length < 2) return

  // Limpiar renderers anteriores
  directionsRenderers.value.forEach(renderer => renderer.setMap(null))
  directionsRenderers.value = []

  const MAX_WAYPOINTS = 23 // 23 waypoints + origen + destino = 25 puntos máximo
  const totalPoints = paradas.length
  const numChunks = Math.ceil((totalPoints - 1) / MAX_WAYPOINTS)

  for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
    const startIdx = chunkIndex * MAX_WAYPOINTS
    const endIdx = Math.min(startIdx + MAX_WAYPOINTS + 1, totalPoints)

    const chunk = paradas.slice(startIdx, endIdx)
    if (chunk.length < 2) continue

    const origin = chunk[0]
    const destination = chunk[chunk.length - 1]
    if (!origin || !destination) continue

    const waypoints = chunk.length > 2
      ? chunk.slice(1, -1).map(p => ({
          location: { lat: p.lat, lng: p.lon },
          stopover: true
        }))
      : []

    const renderer = new (window as any).google.maps.DirectionsRenderer({
      map: map.value,
      suppressMarkers: true,
      preserveViewport: chunkIndex > 0,
      polylineOptions: {
        strokeColor: routeColor,
        strokeOpacity: 0.9,
        strokeWeight: 4,
      }
    })
    
    directionsRenderers.value.push(renderer)
    
    directionsService.value.route({
      origin: { lat: origin.lat, lng: origin.lon },
      destination: { lat: destination.lat, lng: destination.lon },
      waypoints: waypoints,
      travelMode: (window as any).google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false // Mantiene el orden exacto de los waypoints
    }, (response: any, status: string) => {
      if (status === 'OK') {
        renderer.setDirections(response)
      } else if (waypoints.length > 0) {
        // Reintentar sin waypoints si falló
        directionsService.value.route({
          origin: { lat: origin.lat, lng: origin.lon },
          destination: { lat: destination.lat, lng: destination.lon },
          travelMode: (window as any).google.maps.TravelMode.DRIVING
        }, (retryResponse: any, retryStatus: string) => {
          if (retryStatus === 'OK') renderer.setDirections(retryResponse)
        })
      }
    })
  }
}

const setMapTheme = (themeId: string) => {
  activeTheme.value = themeId
  if (map.value) {
    map.value.setOptions({ styles: getMapStyle(themeId, isDarkMapMode.value) })
  }
}

watch(isDarkMapMode, (isDark) => {
  if (map.value) {
    map.value.setOptions({ styles: getMapStyle(activeTheme.value, isDark) })
  }
})

const loadGoogleMapsScript = () => {
  if ((window as any).google && (window as any).google.maps) {
    initializeMap((window as any).google.maps)
    return
  }
  
  const existingScript = document.getElementById('google-maps-script')
  if (existingScript) return

  const script = document.createElement('script')
  script.id = 'google-maps-script'
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAP_KEY}&libraries=places&language=es`
  script.async = true
  script.defer = true
  script.onload = () => {
    initializeMap((window as any).google.maps)
  }
  document.head.appendChild(script)
}

onMounted(() => {
  htmlClassObserver.value = new MutationObserver(() => {
    isDarkMapMode.value = document.documentElement.classList.contains('dark')
  })
  htmlClassObserver.value.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
  loadGoogleMapsScript()
  initPickr()
  
  if (route.params.id && selectedGroup.value?.id) {
    loadRouteData(route.params.id as string)
  }
})

onUnmounted(() => {
  htmlClassObserver.value?.disconnect()
  htmlClassObserver.value = null
  if (pickrInstance) {
    pickrInstance.destroyAndRemove()
  }
})
</script>

<style scoped>
/* Animaciones Premium */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Ocultar marca de agua de Google Maps "For development purposes only" */
#google-map-container :deep(.gm-style-cc),
#google-map-container :deep(.gmnoprint),
#google-map-container :deep(a[href^="https://maps.google.com/maps"]),
#google-map-container :deep(.gm-err-container) {
  display: none !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(93, 166, 252, 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(93, 166, 252, 0.4);
}

.loader-fade-enter-active, .loader-fade-leave-active, .message-fade-enter-active, .message-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.loader-fade-enter-from, .loader-fade-leave-to, .message-fade-enter-from, .message-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.tutorial-fade-enter-active { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.tutorial-fade-leave-active { transition: all 0.3s ease; }
.tutorial-fade-enter-from { opacity: 0; transform: translateY(-12px) scale(0.95); }
.tutorial-fade-leave-to { opacity: 0; transform: translateY(-8px); }

.panel-float-enter-active { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.panel-float-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.panel-float-enter-from { opacity: 0; transform: translateY(24px) scale(0.95); }
.panel-float-leave-to { opacity: 0; transform: translateY(16px) scale(0.97); }

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

<style>
.rutas-theme-sync,
.rutas-theme-sync * {
  transition-property: background-color, border-color, color, fill, stroke, box-shadow;
  transition-duration: 180ms;
  transition-timing-function: ease;
}

.rutas-theme-sync .animate-pulse,
.rutas-theme-sync .animate-pulse * {
  transition: none !important;
}
</style>


