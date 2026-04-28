<template>
  <div class="rutas-theme-sync h-full relative w-full overflow-hidden">
    
    <!-- Mapa Backdrop (Se mantiene debajo de todo) -->
    <div class="absolute inset-0 z-0">
      <div id="google-map-container-form" class="absolute inset-0 z-0 bg-[#F1F4F8] dark:bg-[#0d1116]"></div>
      
      <!-- Overlay de Carga Mapa -->
      <div 
        v-if="isLoadingMap" 
        class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 transition-opacity duration-500 pointer-events-none"
        :class="{ 'opacity-0': !isLoadingMap }"
      >
        <div class="w-16 h-16 rounded-2xl bg-white/80 dark:bg-[#1A1D24]/80 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] shadow-lg animate-[float_3s_ease-in-out_infinite]">
          <HugeiconsIcon :icon="Location01Icon" :size="32" :stroke-width="1.5" />
        </div>
        <p class="text-[11px] font-black text-slate-500 dark:text-[#5da6fc] uppercase tracking-[0.2em] animate-pulse">{{ $t('rutas.initializingMap') }}</p>
      </div>
    </div>

    <!-- Sidebar de Rutas (Master List) -->
    <div 
      class="absolute top-0 bottom-0 left-0 z-30 flex flex-col transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] animate-fade-in"
      :class="[
        isSidebarFullScreen ? 'w-full' : 'w-[340px] md:w-[380px] lg:w-[420px]',
        isAddingParadas && isFormHiddenDuringMap ? '!-translate-x-full !opacity-0 !pointer-events-none' : '!translate-x-0 !opacity-100'
      ]"
    >
      
      <!-- Glassmorphic panel -->
      <div class="flex-1 flex flex-col m-4 rounded-xl bg-white/95 dark:bg-[#0C0E13] backdrop-blur-3xl border border-slate-200 dark:border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">
        
        <div class="relative px-5 pt-6 pb-5 border-b border-slate-100 dark:border-white/[0.05] shrink-0 overflow-hidden">
        <div class="flex items-center gap-4">
          <button @click="router.push('/rutas')" class="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-[#3b82f6] transition-all shadow-sm">
            <HugeiconsIcon :icon="ArrowLeft01Icon" :size="20" />
          </button>
          <div class="flex-1">
            <h1 class="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{{ isEditMode ? $t('rutas.modalEditTitle') : $t('rutas.modalCreateTitle') }}</h1>
            <p class="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Detalles de la ruta</p>
          </div>
          <!-- Collapse Sidebar Button (visible only when mapping but sidebar is open) -->
          <button 
            v-if="isAddingParadas && !isFormHiddenDuringMap" 
            @click="isFormHiddenDuringMap = true" 
            class="w-10 h-10 rounded-xl bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 flex items-center justify-center hover:bg-[#3b82f6]/20 transition-all active:scale-95 shadow-sm ml-auto"
            title="Ocultar panel"
          >
            <HugeiconsIcon :icon="ArrowLeft01Icon" :size="20" class="rotate-180" />
          </button>
        </div>
        <AppButton 
          variant="primary" 
          @click="saveRuta"
          :loading="isSubmitting"
        >
          <span>{{ isEditMode ? $t('rutas.btnUpdate') : $t('rutas.btnSave') }}</span>
        </AppButton>
      </div>
      
        <div class="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        <form @submit.prevent="saveRuta" class="space-y-5 relative p-1">
        <Transition name="loader-fade">
          <div v-if="isSubmitting" class="absolute -inset-4 z-50 flex items-center justify-center bg-white/60 dark:bg-[#0C0E13]/80 backdrop-blur-md rounded-2xl overflow-hidden">
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

        <div class="space-y-2 w-full">
          <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">{{ $t('rutas.formColor') }}</label>
          <div class="w-full p-1.5 bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[18px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
            <div ref="pickrContainer" class="pickr-container w-full"></div>
          </div>
        </div>

        <!-- Step 2: Stops Section -->
        <div class="rounded-[20px] border transition-all duration-300 overflow-hidden"
             :class="paradasTemporales.length > 0 ? 'border-[#3b82f6]/30 bg-[#3b82f6]/[0.02] dark:bg-[#3b82f6]/5' : 'border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]'">
          <!-- Header of stops section -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b" :class="paradasTemporales.length > 0 ? 'border-[#3b82f6]/10 dark:border-[#3b82f6]/10' : 'border-slate-100 dark:border-white/5'">
            <div class="flex items-center gap-2">
              <HugeiconsIcon :icon="Location01Icon" :size="16" :class="paradasTemporales.length > 0 ? 'text-[#3b82f6]' : 'text-slate-400'" />
              <span class="text-[11px] font-black uppercase tracking-wider" :class="paradasTemporales.length > 0 ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'">{{ $t('rutas.strategicStops') }}</span>
            </div>
            <span v-if="paradasTemporales.length > 0" class="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#3b82f6] text-white">
              {{ paradasTemporales.length }} {{ paradasTemporales.length === 1 ? 'parada' : 'paradas' }}
            </span>
            <span v-else class="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/10">Requerido</span>
          </div>

          <!-- Content -->
          <div class="p-4">
            <!-- Preview of stops if any -->
            <div v-if="paradasTemporales.length > 0" class="flex items-center gap-1.5 mb-3 flex-wrap">
              <div v-for="(_, i) in paradasTemporales" :key="i"
                   class="w-6 h-6 rounded-lg bg-[#3b82f6] flex items-center justify-center text-[9px] font-black text-white shadow-sm">
                {{ i + 1 }}
              </div>
              <div class="w-6 h-6 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center">
                <HugeiconsIcon :icon="Add01Icon" :size="10" class="text-slate-400" />
              </div>
            </div>

            <button 
              type="button" 
              @click="startAddingParadas" 
              class="w-full flex items-center justify-center gap-3 py-3.5 rounded-[16px] font-black text-[13px] uppercase tracking-wide transition-all duration-200 active:scale-[0.98] border"
              :class="paradasTemporales.length > 0
                ? 'bg-[#3b82f6]/10 hover:bg-[#3b82f6]/15 text-[#3b82f6] dark:text-[#5da6fc] border-[#3b82f6]/20 dark:border-[#3b82f6]/30'
                : 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] text-white border-[#2563eb] shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb]'"
            >
              <HugeiconsIcon :icon="Location01Icon" :size="18" :class="{'animate-bounce': paradasTemporales.length === 0}" />
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
    </div>

    <!-- Toggle Sidebar Button (Floating on left when hidden) -->
    <Transition name="fade-slide-left">
      <button 
        v-if="isAddingParadas && isFormHiddenDuringMap"
        @click="isFormHiddenDuringMap = false"
        class="absolute left-6 top-6 z-40 w-12 h-12 rounded-[16px] bg-white/95 dark:bg-[#0C0E13] backdrop-blur-3xl border border-slate-200 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] hover:scale-105 hover:bg-slate-50 dark:hover:bg-[#151821] transition-all duration-300 group"
        title="Mostrar Detalles de Ruta"
      >
        <HugeiconsIcon :icon="ArrowLeft01Icon" :size="24" class="rotate-180 group-hover:translate-x-0.5 transition-transform duration-300" />
      </button>
    </Transition>

    <!-- Barra de Búsqueda de Lugares (Solo visible al editar/trazar) -->
    <Transition name="fade-slide-down">
      <div v-show="isAddingParadas" class="absolute top-6 left-1/2 -translate-x-1/2 z-40 w-[320px] sm:w-[400px]">
        <div class="relative flex items-center bg-white/95 dark:bg-[#0C0E13]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_12px_24px_-8px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden transition-all duration-300 focus-within:ring-2 focus-within:ring-[#3b82f6]/50">
          <HugeiconsIcon :icon="Search01Icon" :size="20" class="absolute left-4 text-[#3b82f6] dark:text-[#5da6fc]" />
          <input 
            id="map-search-input"
            type="text" 
            placeholder="Buscar lugar, ciudad, dirección..."
            class="w-full bg-transparent border-none py-3.5 pl-11 pr-4 text-[13px] font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    </Transition>

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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            v-for="tipo in tiposParada"
            :key="tipo.id_tipo"
            @click="selectedTipoParada = tipo.id_tipo"
            class="flex items-center justify-between p-4 rounded-[16px] border transition-all duration-300 group shadow-sm active:scale-[0.98] relative"
            :class="selectedTipoParada === tipo.id_tipo
              ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/10 border-[#3b82f6]/30 dark:border-[#3b82f6]/20 shadow-[inset_0_1px_3px_rgba(59,130,246,0.1)]'
              : 'bg-slate-50/80 dark:bg-[#0A0C10]/60 border-slate-200/60 dark:border-white/5 hover:bg-white dark:hover:bg-[#151821] hover:border-[#3b82f6]/20 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(59,130,246,0.1)] dark:hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]'"
          >
            <span class="text-xs font-black uppercase tracking-wide" :class="selectedTipoParada === tipo.id_tipo ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-300'">{{ tipo.nombre }}</span>
            <div 
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shadow-sm"
              :class="selectedTipoParada === tipo.id_tipo 
                ? 'border-[#3b82f6] bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] shadow-[0_2px_8px_rgba(59,130,246,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]' 
                : 'border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]'"
            >
              <HugeiconsIcon v-if="selectedTipoParada === tipo.id_tipo" :icon="Tick01Icon" :size="12" class="text-white" />
            </div>
          </button>
        </div>
      </div>
      <template #footer>
        <div class="flex flex-col sm:flex-row gap-3 w-full">
          <button type="button" @click="isTipoModalOpen = false; selectedTipoParada = null" class="flex-1 px-6 py-3.5 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-[14px] text-sm font-black text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/20 transition-all active:scale-[0.98] active:translate-y-[1px] shadow-[0_2px_0_rgba(0,0,0,0.04)] dark:shadow-[0_2px_0_rgba(255,255,255,0.02)] uppercase tracking-tight">
            {{ $t('rutas.btnCancel') }}
          </button>
          <button 
            type="button" 
            @click="confirmParada" 
            :disabled="!selectedTipoParada" 
            class="flex-[2] px-6 py-3.5 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white rounded-[14px] text-sm font-black transition-all shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none uppercase tracking-tight"
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

        <p class="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] ml-1">{{ $t('rutas.selectNewType') }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <button
            v-for="tipo in tiposParada"
            :key="tipo.id_tipo"
            @click="editingTipoParada = tipo.id_tipo"
            class="flex items-center justify-between p-4 rounded-[16px] border transition-all duration-300 group shadow-sm active:scale-[0.98] relative"
            :class="editingTipoParada === tipo.id_tipo
              ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/10 border-[#3b82f6]/30 dark:border-[#3b82f6]/20 shadow-[inset_0_1px_3px_rgba(59,130,246,0.1)]'
              : 'bg-slate-50/80 dark:bg-[#0A0C10]/60 border-slate-200/60 dark:border-white/5 hover:bg-white dark:hover:bg-[#151821] hover:border-[#3b82f6]/20 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(59,130,246,0.1)] dark:hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]'"
          >
            <span class="text-xs font-black uppercase tracking-wide" :class="editingTipoParada === tipo.id_tipo ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-300'">{{ tipo.nombre }}</span>
            <div 
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shadow-sm"
              :class="editingTipoParada === tipo.id_tipo 
                ? 'border-[#3b82f6] bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] shadow-[0_2px_8px_rgba(59,130,246,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]' 
                : 'border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]'"
            >
              <HugeiconsIcon v-if="editingTipoParada === tipo.id_tipo" :icon="Tick01Icon" :size="12" class="text-white" />
            </div>
          </button>
        </div>
      </div>
      <template #footer>
        <div class="flex flex-col gap-4 w-full">
          <button type="button" @click="deleteEditingParada" class="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-[14px] text-sm font-black text-red-500 transition-all uppercase tracking-tight active:scale-[0.98]">
            <HugeiconsIcon :icon="Delete01Icon" :size="18" />
            {{ $t('rutas.btnDelete') }}
          </button>
          <div class="flex gap-3 w-full">
            <button type="button" @click="isEditParadaModalOpen = false; editingTipoParada = null" class="flex-1 px-6 py-3.5 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-[14px] text-sm font-black text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/20 transition-all active:scale-[0.98] active:translate-y-[1px] shadow-[0_2px_0_rgba(0,0,0,0.04)] dark:shadow-[0_2px_0_rgba(255,255,255,0.02)] uppercase tracking-tight">
              {{ $t('rutas.btnCancel') }}
            </button>
            <button 
              type="button" 
              @click="saveEditingParada" 
              :disabled="!editingTipoParada" 
              class="flex-1 px-6 py-3.5 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white rounded-[14px] text-sm font-black transition-all shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none uppercase tracking-tight"
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
import { ref, computed, shallowRef, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  Location01Icon,
  PlusSignIcon,
  Drag04Icon,
  Delete01Icon,
  Shield01Icon,
  Tick01Icon,
  Search01Icon
} from '@hugeicons/core-free-icons'

import { createRutaApi, updateRutaApi, fetchTiposParadaApi, fetchRutaDetallesApi } from '../services/rutas.api'
import type { TipoParada, ParadaPayload, RutaUpdatePayload } from '../types/ruta'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

// ── Composables de rutas ─────────────────────────────────────
import { useGoogleMaps }      from '../composables/useGoogleMaps'
import { useMapSetup }        from '../composables/useMapSetup'
import { useParadasManager }  from '../composables/useParadasManager'
import { useRouteDrawer }     from '../composables/useRouteDrawer'

import AppModal         from '../../../components/ui/AppModal.vue'
import AppButton        from '../../../components/ui/AppButton.vue'
import AppFormInput     from '../../../components/ui/AppFormInput.vue'
import ParadasListPanel from '../../../components/rutas/ParadasListPanel.vue'

const { t }      = useI18n()
const route      = useRoute()
const router     = useRouter()

// ── Google Maps singleton ─────────────────────────────────────
const { loadGoogleMaps } = useGoogleMaps()

// ── Map Setup (mapa, temas, dark mode) ───────────────────────
const {
  map,
  isLoadingMap,
  activeTheme,
  initMap,
  initPlacesSearch,
  startDarkModeObserver,
  setMapTheme
} = useMapSetup('google-map-container-form')

const directionsService = shallowRef<any>(null)
const isSidebarFullScreen = ref(false)

// ── Auth / Grupo ─────────────────────────────────────────────
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

// ── Form State ───────────────────────────────────────────────
const isSubmitting  = ref(false)
const modalMessage  = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)
const formData      = ref({ nombre: '', descripcion: '', color: '#60a5fa' })
const isEditMode    = ref(false)
const editingRutaId = ref<string | null>(null)

// ── Pickr Color Picker ───────────────────────────────────────
const pickrContainer = ref<HTMLElement | null>(null)
let pickrInstance: any = null

// ── UI State de Paradas ───────────────────────────────────────
const isAddingParadas        = ref(false)
const isFormHiddenDuringMap  = ref(true)
const tiposParada            = ref<TipoParada[]>([])
const isTipoModalOpen        = ref(false)
const currentParadaCoords    = ref<{ lat: number, lon: number, insertionIndex?: number } | null>(null)
const selectedTipoParada     = ref<number | null>(null)
const selectedParadaIndex    = ref<number | null>(null)
const isEditParadaModalOpen  = ref(false)
const editingParadaIndex     = ref<number | null>(null)
const editingTipoParada      = ref<number | null>(null)
const isLoadingRouteDetails  = ref(false)

// ── Color computado (reactive para los composables) ───────────
const routeColor = computed(() => formData.value.color || '#60a5fa')

// ── Paradas Manager ───────────────────────────────────────────
const {
  paradasTemporales,
  calculateInsertionIndex,
  clearMarkers,
  redrawMarkers,
  insertParada,
  deleteParada,
  updateParadaTipo
} = useParadasManager(map, tiposParada, routeColor, (idx: number) => {
  if (isAddingParadas.value) {
    editingParadaIndex.value = idx
    editingTipoParada.value  = paradasTemporales.value[idx]?.tipo ?? null
    isEditParadaModalOpen.value = true
  }
})

// ── Route Drawer ──────────────────────────────────────────────
const {
  recalculateFromIndex,
  drawFullRoute,
  highlightSegment,
  clearHighlight,
  clearAll: clearAllRoutes
} = useRouteDrawer(map, directionsService)

// ── Helpers ───────────────────────────────────────────────────
const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

// ── Pickr ─────────────────────────────────────────────────────
const initPickr = async () => {
  await nextTick()
  if (!pickrContainer.value || !(window as any).Pickr) return

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
      preview: true, opacity: false, hue: true,
      interaction: { hex: true, rgba: false, hsla: false, hsva: false, cmyk: false, input: true, clear: false, save: false }
    }
  })

  pickrInstance
    .on('change',      (color: any) => { formData.value.color = color.toHEXA().toString() })
    .on('swatchselect', (color: any, instance: any) => {
      formData.value.color = color.toHEXA().toString()
      instance.applyColor()
      instance.hide()
    })
    .on('changestop',  (_source: string, instance: any) => { instance.applyColor() })
}

// ── Inicialización del mapa (callback) ────────────────────────
const handleMapInit = (googleMapsApi: any) => {
  directionsService.value = new googleMapsApi.DirectionsService()

  initMap(googleMapsApi, (lat: number, lng: number) => {
    if (!isAddingParadas.value) return

    const insertionIndex = selectedParadaIndex.value !== null
      ? selectedParadaIndex.value + 1
      : calculateInsertionIndex(lat, lng)

    selectedParadaIndex.value = null
    currentParadaCoords.value = { lat, lon: lng, insertionIndex }
    selectedTipoParada.value  = null
    isTipoModalOpen.value     = true
  })

  initPlacesSearch(googleMapsApi, 'map-search-input')
}

// ── Carga de datos en modo edición ────────────────────────────
const loadRouteData = async (id_ruta: string) => {
  if (!selectedGroup.value?.id) return
  isSubmitting.value = true
  try {
    const detalle = await fetchRutaDetallesApi(selectedGroup.value.id, id_ruta)
    if (detalle) {
      isEditMode.value    = true
      editingRutaId.value = id_ruta
      formData.value = {
        nombre:      detalle.nombre,
        descripcion: detalle.descripcion,
        color:       detalle.color || '#60a5fa'
      }

      if (detalle.paradas) {
        paradasTemporales.value = detalle.paradas.map(p => ({
          lat:  parseFloat(p.lat),
          lon:  parseFloat(p.lon),
          tipo: p.id_tipo_parada
        }))
      }

      clearMarkers()
      if (paradasTemporales.value.length > 0 && map.value) {
        redrawMarkers()
        if (paradasTemporales.value.length >= 2) {
          drawFullRoute(paradasTemporales.value, routeColor.value)
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

// ── Modo paradas ──────────────────────────────────────────────
const startAddingParadas = async () => {
  isAddingParadas.value       = true
  isFormHiddenDuringMap.value = true

  if (tiposParada.value.length === 0) {
    try   { tiposParada.value = await fetchTiposParadaApi() }
    catch (e) { console.error('Error fetching tipos parada', e) }
  }

  clearMarkers()
  redrawMarkers()

  if (paradasTemporales.value.length >= 2) {
    recalculateFromIndex(0, paradasTemporales.value, routeColor.value)
  }
}

const finishAddingParadas = () => {
  isAddingParadas.value = false
  initPickr()
}

// ── Guardar ruta ──────────────────────────────────────────────
const saveRuta = async () => {
  if (isSubmitting.value) return
  const idGrupo = selectedGroup.value?.id?.trim() || ''
  if (!idGrupo)           { showModalMessage(t('rutas.alertSelectGroup'),   'warning'); return }
  if (idGrupo.length !== 8) { showModalMessage(t('rutas.alertInvalidGroup'), 'warning'); return }

  isSubmitting.value    = true
  modalMessage.value    = null

  try {
    let data

    if (isEditMode.value && editingRutaId.value) {
      const updatePayload: RutaUpdatePayload = {
        id_grupo:    idGrupo,
        id_ruta:     editingRutaId.value,
        nombre:      formData.value.nombre,
        descripcion: formData.value.descripcion,
        color:       formData.value.color,
        paradas:     paradasTemporales.value
      }
      data = await updateRutaApi(updatePayload)
    } else {
      data = await createRutaApi({
        id_grupo:    idGrupo,
        nombre:      formData.value.nombre,
        descripcion: formData.value.descripcion,
        color:       formData.value.color,
        paradas:     paradasTemporales.value.length > 0 ? paradasTemporales.value : undefined
      })
    }

    if (data.done) {
      showModalMessage(
        isEditMode.value ? t('rutas.alertSuccessUpdate') : t('rutas.alertSuccessCreate'),
        'success'
      )
      clearMarkers()
      clearAllRoutes()
      paradasTemporales.value = []
      if (pickrInstance) { pickrInstance.destroyAndRemove(); pickrInstance = null }
      setTimeout(() => { router.push('/rutas') }, 1500)
    } else {
      showModalMessage(
        data.message || (isEditMode.value ? t('rutas.alertErrorUpdate') : t('rutas.alertErrorCreate')),
        'error'
      )
    }
  } catch (error) {
    console.error('Error saving ruta:', error)
    showModalMessage(
      isEditMode.value ? t('rutas.alertNetErrorUpdate') : t('rutas.alertNetErrorCreate'),
      'error'
    )
  } finally {
    isSubmitting.value = false
  }
}

// ── Handlers de paradas ───────────────────────────────────────
const confirmParada = () => {
  if (!currentParadaCoords.value || !selectedTipoParada.value) return

  const insertionIndex = currentParadaCoords.value.insertionIndex ?? paradasTemporales.value.length
  insertParada(
    currentParadaCoords.value.lat,
    currentParadaCoords.value.lon,
    selectedTipoParada.value,
    insertionIndex
  )
  recalculateFromIndex(insertionIndex, paradasTemporales.value, routeColor.value)

  isTipoModalOpen.value    = false
  currentParadaCoords.value = null
  selectedTipoParada.value  = null
}

const onParadaSelect = (index: number | null) => {
  selectedParadaIndex.value = index
  clearHighlight()

  if (index !== null) {
    const parada = paradasTemporales.value[index]
    if (parada && map.value) {
      map.value.setCenter({ lat: parada.lat, lng: parada.lon })
      map.value.setZoom(15)
    }
    const next = paradasTemporales.value[index + 1]
    if (parada && next) highlightSegment(parada, next)
  }
}

const onParadaDelete = (index: number) => {
  deleteParada(index)
  recalculateFromIndex(index, paradasTemporales.value, routeColor.value)

  if (selectedParadaIndex.value === index) {
    selectedParadaIndex.value = null
  } else if (selectedParadaIndex.value !== null && selectedParadaIndex.value > index) {
    selectedParadaIndex.value--
  }
}

const clearParadasTemporales = () => {
  paradasTemporales.value = []
  clearMarkers()
  clearAllRoutes()
  selectedParadaIndex.value = null
}

const saveEditingParada = () => {
  if (editingParadaIndex.value === null || editingTipoParada.value === null) return
  updateParadaTipo(editingParadaIndex.value, editingTipoParada.value)
  recalculateFromIndex(editingParadaIndex.value, paradasTemporales.value, routeColor.value)
  isEditParadaModalOpen.value = false
  editingParadaIndex.value    = null
  editingTipoParada.value     = null
}

const deleteEditingParada = () => {
  if (editingParadaIndex.value === null) return
  onParadaDelete(editingParadaIndex.value)
  isEditParadaModalOpen.value = false
  editingParadaIndex.value    = null
  editingTipoParada.value     = null
}

// ── Watchers ──────────────────────────────────────────────────
watch(() => selectedGroup.value?.id, (newId) => {
  if (newId && route.params.id) {
    loadRouteData(route.params.id as string)
  }
}, { immediate: true })

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(() => {
  startDarkModeObserver()

  loadGoogleMaps()
    .then(handleMapInit)
    .catch(err => {
      console.error('[RutasFormView] Error cargando Google Maps:', err)
      isLoadingMap.value = false
    })

  initPickr()

  if (route.params.id && selectedGroup.value?.id) {
    loadRouteData(route.params.id as string)
  }
})

onUnmounted(() => {
  if (pickrInstance) {
    pickrInstance.destroyAndRemove()
    pickrInstance = null
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
#google-map-container-form :deep(.gm-style-cc),
#google-map-container-form :deep(.gmnoprint),
#google-map-container-form :deep(a[href^="https://maps.google.com/maps"]),
#google-map-container-form :deep(.gm-err-container) {
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

.fade-slide-left-enter-active { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.fade-slide-left-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-left-enter-from { opacity: 0; transform: translateX(-24px) scale(0.95); }
.fade-slide-left-leave-to { opacity: 0; transform: translateX(-16px) scale(0.97); }

.fade-slide-down-enter-active { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.fade-slide-down-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-down-enter-from { opacity: 0; transform: translate(-50%, -24px) scale(0.95); }
.fade-slide-down-leave-to { opacity: 0; transform: translate(-50%, -16px) scale(0.97); }

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

/* ════════════════════════════════════════════════════════════
   Google Maps Places Autocomplete Dropdown - Glassmorphic 3D
   ════════════════════════════════════════════════════════════ */
.pac-container {
  background-color: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(226, 232, 240, 0.8) !important;
  border-radius: 16px !important;
  box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8) !important;
  margin-top: 8px !important;
  font-family: 'Inter', sans-serif !important;
  padding: 8px !important;
  z-index: 99999 !important;
}

html.dark .pac-container {
  background-color: rgba(12, 14, 19, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.05) !important;
}

.pac-item {
  padding: 10px 14px !important;
  border-top: none !important;
  border-radius: 10px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  color: #64748b !important;
  display: flex !important;
  align-items: center !important;
}

html.dark .pac-item {
  color: #94a3b8 !important;
}

.pac-item:hover, .pac-item.pac-item-selected {
  background-color: rgba(59, 130, 246, 0.1) !important;
}

.pac-item-query {
  font-size: 13px !important;
  font-weight: 900 !important;
  color: #1e293b !important;
  margin-right: 4px !important;
}

html.dark .pac-item-query {
  color: #f8fafc !important;
}

.pac-matched {
  color: #3b82f6 !important;
  font-weight: 900 !important;
}

.pac-icon {
  display: none !important; /* Hide default ugly icon */
}

/* Style the "Powered by Google" footer */
.pac-container:after {
  border-top: 1px solid rgba(0,0,0,0.05) !important;
  margin-top: 4px;
  padding-top: 4px;
  margin-bottom: 2px;
}

html.dark .pac-container:after {
  border-top: 1px solid rgba(255,255,255,0.05) !important;
  filter: invert(1) opacity(0.5); /* Makes the Google logo dark-mode friendly */
}

/* ════════════════════════════════════════════════════════════
   Pickr Color Picker - Custom Styling
   ════════════════════════════════════════════════════════════ */
.pickr-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pickr {
  width: 100% !important;
}

.pickr .pcr-button {
  width: 100% !important;
  height: 48px !important;
  border-radius: 14px !important;
  border: 2px solid rgba(255, 255, 255, 0.35) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  position: relative !important;
  overflow: visible !important;
}

html.dark .pickr .pcr-button {
  border: 2px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4) !important;
}

.pickr .pcr-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15) !important;
}

.pickr .pcr-button:active {
  transform: translateY(1px);
}

/* Override Pickr internal styles to match our theme */
.pcr-app {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2) !important;
  padding: 12px !important;
}

html.dark .pcr-app {
  background: rgba(15, 17, 23, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6) !important;
}

.pcr-app .pcr-interaction input {
  background: rgba(0, 0, 0, 0.05) !important;
  border-radius: 8px !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  color: #1e293b !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 700 !important;
}

html.dark .pcr-app .pcr-interaction input {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #f8fafc !important;
}
</style>


