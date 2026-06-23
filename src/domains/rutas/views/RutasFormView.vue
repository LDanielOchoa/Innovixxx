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
      class="absolute top-0 bottom-0 left-0 z-30 flex flex-col transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
      :class="[
        isSidebarFullScreen ? 'w-full' : 'w-[320px] md:w-[350px] lg:w-[380px]',
        isAddingParadas && isFormHiddenDuringMap ? '!-translate-x-full !opacity-0 !pointer-events-none' : '!translate-x-0 !opacity-100'
      ]"
    >
      
      <!-- Docked panel consistent with Sidebar.vue -->
      <div class="flex-1 flex flex-col bg-white dark:bg-[#13161C] border-r border-slate-200/70 dark:border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)] overflow-hidden animate-none">
        
        <div class="relative px-5 py-5 border-b border-slate-200/60 dark:border-white/5 shrink-0">
          <div class="relative flex items-center gap-3">
            <!-- Botón Volver Plano -->
            <button @click="router.push('/rutas')"
              class="w-9 h-9 rounded-[12px] flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200 shrink-0">
              <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" :stroke-width="2.2" />
            </button>

            <!-- Ícono plano -->
            <div class="w-9 h-9 rounded-[12px] bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20 shrink-0">
              <HugeiconsIcon :icon="Route01Icon" :size="18" :stroke-width="2" />
            </div>

            <div class="flex-1 min-w-0">
              <h1 class="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight leading-tight">{{ isEditMode ? $t('rutas.modalEditTitle') : $t('rutas.modalCreateTitle') }}</h1>
              <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                Detalles de la ruta
              </p>
            </div>

            <!-- Collapse Sidebar Button -->
            <button
              v-if="isAddingParadas && !isFormHiddenDuringMap"
              @click="isFormHiddenDuringMap = true"
              class="w-8 h-8 rounded-[12px] flex items-center justify-center bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-all duration-200 active:scale-[0.97] shrink-0 shadow-sm"
              title="Ocultar panel"
            >
              <HugeiconsIcon :icon="ArrowLeft01Icon" :size="14" :stroke-width="2.5" class="rotate-180" />
            </button>
          </div>
        </div>
      
        <!-- Body scrolling container -->
        <div class="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar space-y-5">
          <!-- Alertas y Mensajes -->
          <Transition name="message-fade">
            <div v-if="modalMessage && !isSubmitting"
                 class="flex items-center gap-3 py-3 px-4 rounded-[12px] text-xs font-bold tracking-tight uppercase border animate-none"
                 :class="{
                   'text-red-500 bg-red-500/5 border-red-500/10': modalMessage.type === 'error',
                   'text-amber-500 bg-amber-500/5 border-amber-500/10': modalMessage.type === 'warning',
                   'text-[#3b82f6] bg-[#3b82f6]/5 border-[#3b82f6]/10': modalMessage.type === 'success'
                 }">
                 <HugeiconsIcon :icon="modalMessage.type === 'error' || modalMessage.type === 'warning' ? Shield01Icon : Tick01Icon" :size="16" />
                 {{ modalMessage.text }}
            </div>
          </Transition>

          <form @submit.prevent="saveRuta" class="space-y-5 relative">
            <Transition name="loader-fade">
              <div v-if="isSubmitting" class="absolute -inset-4 z-50 flex items-center justify-center bg-white/60 dark:bg-[#0C0E13]/80 backdrop-blur-md rounded-2xl overflow-hidden animate-none">
                <div class="flex flex-col items-center gap-4 p-8">
                  <div class="relative flex items-center justify-center">
                    <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
                    <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
                  </div>
                  <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">{{ isEditMode ? 'Actualizando' : 'Creando' }} Ruta</p>
                </div>
              </div>
            </Transition>

            <!-- Sección: Información Básica -->
            <div class="p-4 bg-slate-50/50 dark:bg-[#1E222B]/20 border border-slate-200/50 dark:border-white/[0.03] rounded-2xl space-y-4 shadow-sm">
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">Información Básica</span>
              
              <div>
                <AppInput 
                  v-model="formData.nombre"
                  :label="$t('rutas.formName')"
                  :placeholder="$t('rutas.formNamePlaceholder')"
                  :icon="Route01Icon"
                  required
                />
                <span v-if="getError('nombre')" class="text-xs text-red-500 font-bold ml-1.5 mt-1 block">{{ getError('nombre') }}</span>
              </div>
              
              <div>
                <AppInput 
                  v-model="formData.descripcion"
                  type="textarea"
                  :label="$t('rutas.formDesc')"
                  :placeholder="$t('rutas.formDescPlaceholder')"
                  :rows="3"
                  required
                />
                <span v-if="getError('descripcion')" class="text-xs text-red-500 font-bold ml-1.5 mt-1 block">{{ getError('descripcion') }}</span>
              </div>
            </div>

            <!-- Sección: Estilo Visual -->
            <div class="p-4 bg-slate-50/50 dark:bg-[#1E222B]/20 border border-slate-200/50 dark:border-white/[0.03] rounded-2xl space-y-3 shadow-sm">
              <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{{ $t('rutas.formColor') }}</label>
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  v-for="color in predefinedColors"
                  :key="color"
                  type="button"
                  :disabled="isSubmitting"
                  @click="formData.color = color; showCustomColorPicker = false"
                  class="w-6 h-6 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
                  :style="{ backgroundColor: color }"
                  :title="color"
                >
                  <HugeiconsIcon
                    v-if="formData.color.toLowerCase() === color.toLowerCase() && !showCustomColorPicker"
                    :icon="Tick01Icon"
                    :size="10"
                    class="text-white"
                  />
                </button>

                <!-- "Otros" (Custom Color Picker Button) -->
                <button
                  type="button"
                  :disabled="isSubmitting"
                  @click="selectOtros"
                  class="h-6 px-2.5 rounded-full border text-[11px] font-bold transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none flex items-center gap-1.5"
                  :class="[
                    showCustomColorPicker
                      ? 'bg-gradient-to-b from-[#3b82f6] to-[#2563eb] border-[#2563eb] text-white shadow-sm'
                      : 'bg-white dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A]'
                  ]"
                >
                  <span>Otros</span>
                  <span 
                    v-if="showCustomColorPicker" 
                    class="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0" 
                    :style="{ backgroundColor: formData.color }"
                  ></span>
                </button>

                <!-- Color Input (visible only when showCustomColorPicker is true) -->
                <div v-if="showCustomColorPicker" class="flex items-center gap-2 ml-auto">
                  <input
                    ref="colorInputRef"
                    type="color"
                    v-model="formData.color"
                    :disabled="isSubmitting"
                    class="w-8 h-6 rounded border-none bg-transparent cursor-pointer p-0 shrink-0"
                  />
                  <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase select-none font-mono">
                    {{ formData.color }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Sección: Paradas -->
            <div class="p-4 bg-slate-50/50 dark:bg-[#1E222B]/20 border border-slate-200/50 dark:border-white/[0.03] rounded-2xl space-y-4 shadow-sm">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ $t('rutas.strategicStops') }}</span>
                </div>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      :class="paradasTemporales.length > 0 ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5'">
                  {{ paradasTemporales.length > 0 ? `${paradasTemporales.length} paradas` : 'Requerido' }}
                </span>
              </div>

              <!-- Vista previa -->
              <div v-if="paradasTemporales.length > 0" class="flex items-center gap-1.5 flex-wrap">
                <div v-for="(_, i) in paradasTemporales" :key="i"
                     class="w-7 h-7 rounded-[8px] bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                  {{ i + 1 }}
                </div>
                <div class="w-7 h-7 rounded-[8px] border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center">
                  <HugeiconsIcon :icon="Add01Icon" :size="12" class="text-slate-400" />
                </div>
              </div>

              <button 
                type="button" 
                @click="startAddingParadas" 
                class="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all duration-200 active:scale-[0.97] border"
                :class="paradasTemporales.length > 0
                  ? 'bg-gradient-to-r from-[#3b82f6]/10 to-transparent dark:from-[#3b82f6]/15 text-[#3b82f6] dark:text-[#5da6fc] border-[#3b82f6]/20 dark:border-[#3b82f6]/30 hover:bg-[#3b82f6]/5'
                  : 'bg-[#3b82f6] hover:bg-[#2563eb] text-white border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.15)]'"
              >
                <HugeiconsIcon :icon="Location01Icon" :size="15" />
                {{ paradasTemporales.length > 0 ? $t('rutas.btnModifyStops') : 'Trazar paradas en el mapa' }}
              </button>

              <span v-if="getError('paradas')" class="text-xs text-red-500 font-bold block text-center mt-1">{{ getError('paradas') }}</span>

              <p v-if="paradasTemporales.length === 0" class="text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Mínimo 2 paradas · Haz clic en el mapa para añadirlas
              </p>
            </div>
          </form>
        </div>

        <!-- Sticky Footer for primary action buttons -->
        <div class="px-5 py-4 border-t border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#11141A] shrink-0 flex items-center gap-3">
          <button 
            type="button"
            @click="router.push('/rutas')"
            class="flex-1 px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200 uppercase tracking-wide"
          >
            Cancelar
          </button>
          <AppButton 
            variant="primary" 
            @click="saveRuta" 
            :loading="isSubmitting" 
            class="flex-[2] !rounded-xl !py-3 !text-[12px] font-bold uppercase tracking-wide"
          >
            <span>{{ isEditMode ? $t('rutas.btnUpdate') : $t('rutas.btnSave') }}</span>
          </AppButton>
        </div>
      </div>
    </div>
 
    <!-- Toggle Sidebar Button (Floating on left when hidden) -->
    <Transition name="fade-slide-left">
      <button 
        v-if="isAddingParadas && isFormHiddenDuringMap"
        @click="isFormHiddenDuringMap = false"
        class="absolute left-6 top-6 z-40 w-10 h-10 rounded-[14px] bg-white dark:bg-[#13161C] border border-slate-200/80 dark:border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.97] transition-all duration-200 group animate-none"
        title="Mostrar Detalles de Ruta"
      >
        <HugeiconsIcon :icon="ArrowLeft01Icon" :size="18" :stroke-width="2.2" class="rotate-180 group-hover:translate-x-0.5 transition-transform duration-300" />
      </button>
    </Transition>
 
    <!-- Barra de Búsqueda de Lugares (Solo visible al editar/trazar) -->
    <Transition name="fade-slide-down">
      <div v-show="isAddingParadas" class="absolute top-6 left-1/2 -translate-x-1/2 z-40 w-[320px] sm:w-[400px]">
        <div class="relative flex items-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.4)] transition-all duration-300">
          <HugeiconsIcon :icon="Search01Icon" :size="18" :stroke-width="1.8" class="absolute left-4 text-slate-400 dark:text-slate-500" />
          <input 
            id="map-search-input"
            type="text" 
            placeholder="Buscar lugar, dirección..."
            class="w-full bg-transparent border-none py-3 pl-11 pr-4 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0"
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
        <div class="w-10 h-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-[#3b82f6]/20">
          <HugeiconsIcon :icon="Location01Icon" :size="20" :stroke-width="2" />
        </div>
      </template>
      <div class="space-y-6">
        <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider leading-relaxed">{{ $t('rutas.stopTypeDescription') }}</p>
 
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
          <button
            v-for="tipo in tiposParada"
            :key="tipo.id_tipo"
            @click="selectedTipoParada = tipo.id_tipo"
            class="flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-300 group/btn active:scale-[0.97] relative"
            :class="selectedTipoParada === tipo.id_tipo
              ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/15 border-[#3b82f6] dark:border-[#5da6fc] shadow-[inset_0_1px_2px_rgba(59,130,246,0.1),0_4px_12px_rgba(59,130,246,0.1)]'
              : 'bg-slate-50/50 dark:bg-[#0F1115] border-slate-200/60 dark:border-white/5 hover:bg-white dark:hover:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/10 shadow-sm'"
          >
            <!-- Icon Badge -->
            <div 
              class="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-[#1C202A] border border-slate-200/80 dark:border-white/10 shadow-sm transition-colors duration-300 shrink-0 overflow-hidden"
            >
              <img 
                :src="getTipoImage(tipo.nombre)" 
                class="w-6 h-6 object-contain"
                alt="icono parada"
              />
            </div>

            <!-- Text label -->
            <span 
              class="text-xs font-black uppercase tracking-wider transition-colors duration-300 flex-1 text-left"
              :class="selectedTipoParada === tipo.id_tipo 
                ? 'text-[#3b82f6] dark:text-[#5da6fc]' 
                : 'text-slate-700 dark:text-slate-300 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white'"
            >
              {{ tipo.nombre }}
            </span>

            <!-- Checkmark Indicator -->
            <div 
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shadow-sm shrink-0"
              :class="selectedTipoParada === tipo.id_tipo 
                ? 'border-[#3b82f6] bg-[#3b82f6]' 
                : 'border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20'"
            >
              <HugeiconsIcon v-if="selectedTipoParada === tipo.id_tipo" :icon="Tick01Icon" :size="10" class="text-white" />
            </div>
          </button>
        </div>
      </div>
      <template #footer>
        <div class="flex flex-col sm:flex-row gap-3 w-full">
          <button type="button" @click="isTipoModalOpen = false; selectedTipoParada = null" class="flex-1 px-6 py-3 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] transition-all active:scale-[0.98] uppercase tracking-tight shadow-sm">
            {{ $t('rutas.btnCancel') }}
          </button>
          <button 
            type="button" 
            @click="confirmParada" 
            :disabled="!selectedTipoParada" 
            class="flex-[2] px-6 py-3 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] border border-[#2563eb] rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-tight shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] disabled:shadow-none"
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
        <div class="w-10 h-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-[#3b82f6]/20">
          <HugeiconsIcon :icon="Location01Icon" :size="20" :stroke-width="2" />
        </div>
      </template>
      <div class="space-y-6">
        <p class="text-[13px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{{ $t('rutas.stopNumber', { index: editingParadaIndex !== null ? editingParadaIndex + 1 : '' }) }}</p>
 
        <div class="space-y-3">
          <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('rutas.selectNewType') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              v-for="tipo in tiposParada"
              :key="tipo.id_tipo"
              @click="editingTipoParada = tipo.id_tipo"
              class="flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-300 group/btn active:scale-[0.97] relative"
              :class="editingTipoParada === tipo.id_tipo
                ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/15 border-[#3b82f6] dark:border-[#5da6fc] shadow-[inset_0_1px_2px_rgba(59,130,246,0.1),0_4px_12px_rgba(59,130,246,0.1)]'
                : 'bg-slate-50/50 dark:bg-[#0F1115] border-slate-200/60 dark:border-white/5 hover:bg-white dark:hover:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/10 shadow-sm'"
            >
              <!-- Icon Badge -->
              <div 
                class="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-[#1C202A] border border-slate-200/80 dark:border-white/10 shadow-sm transition-colors duration-300 shrink-0 overflow-hidden"
              >
                <img 
                  :src="getTipoImage(tipo.nombre)" 
                  class="w-6 h-6 object-contain"
                  alt="icono parada"
                />
              </div>

              <!-- Text label -->
              <span 
                class="text-xs font-black uppercase tracking-wider transition-colors duration-300 flex-1 text-left"
                :class="editingTipoParada === tipo.id_tipo 
                  ? 'text-[#3b82f6] dark:text-[#5da6fc]' 
                  : 'text-slate-700 dark:text-slate-300 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white'"
              >
                {{ tipo.nombre }}
              </span>

              <!-- Checkmark Indicator -->
              <div 
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shadow-sm shrink-0"
                :class="editingTipoParada === tipo.id_tipo 
                  ? 'border-[#3b82f6] bg-[#3b82f6]' 
                  : 'border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20'"
              >
                <HugeiconsIcon v-if="editingTipoParada === tipo.id_tipo" :icon="Tick01Icon" :size="10" class="text-white" />
              </div>
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex flex-col gap-3.5 w-full">
          <button type="button" @click="deleteEditingParada" class="w-full flex items-center justify-center gap-2.5 px-6 py-3 bg-red-500/5 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-600 rounded-xl text-[13px] font-bold text-red-500 hover:shadow-[0_4px_12px_rgba(239,68,68,0.2)] dark:hover:shadow-[0_4px_12px_rgba(239,68,68,0.1)] transition-all duration-300 uppercase tracking-tight active:scale-[0.98]">
            <HugeiconsIcon :icon="Delete01Icon" :size="16" />
            {{ $t('rutas.btnDelete') }}
          </button>
          <div class="flex gap-3 w-full">
            <button type="button" @click="isEditParadaModalOpen = false; editingTipoParada = null" class="flex-1 px-6 py-3 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] transition-all active:scale-[0.98] uppercase tracking-tight shadow-sm">
              {{ $t('rutas.btnCancel') }}
            </button>
            <button 
              type="button" 
              @click="saveEditingParada" 
              :disabled="!editingTipoParada" 
              class="flex-1 px-6 py-3 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] border border-[#2563eb] rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-tight shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] disabled:shadow-none"
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
  Route01Icon,
  Add01Icon,
  Delete01Icon,
  Shield01Icon,
  Tick01Icon,
  Search01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons'

import rutaBalanza from '../../../assets/ruta_balanza.png'
import rutaFin from '../../../assets/ruta_fin.png'
import rutaGasolinera from '../../../assets/ruta_gasolinera.png'
import rutaInicio from '../../../assets/ruta_inicio.png'
import rutaParqueadero from '../../../assets/ruta_parqueadero.png'
import rutaPuntoControl from '../../../assets/ruta_punto_control.png'
import rutaPuntoNormal from '../../../assets/ruta_punto_normal.png'

import { createRutaApi, updateRutaApi, fetchTiposParadaApi, fetchRutaDetallesApi } from '../services/rutas.api'
import type { TipoParada, ParadaPayload, RutaUpdatePayload } from '../types/ruta'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createRutaSchema, updateRutaSchema } from '../../../schemas/rutas.schema'
import { useToast } from 'primevue/usetoast'

// ── Composables de rutas ─────────────────────────────────────
import { useGoogleMaps }      from '../../../composables/useGoogleMaps'
import { useMapSetup }         from '../../../composables/useMapSetup'
import { useParadasManager }  from '../composables/useParadasManager'
import { useRouteDrawer }     from '../composables/useRouteDrawer'

import AppModal         from '../../../components/ui/AppModal.vue'
import AppButton        from '../../../components/ui/AppButton.vue'
import AppInput         from '../../../components/ui/AppInput.vue'
import ParadasListPanel from '../../../components/rutas/ParadasListPanel.vue'

const { t }      = useI18n()
const route      = useRoute()
const router     = useRouter()
const toast      = useToast()

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
const isGpsRoute    = computed(() => route.query.gps === 'true')

const activeSchema = computed(() => isEditMode.value ? updateRutaSchema : createRutaSchema)
const { validate, getFirstError, resetErrors } = useFormValidator(activeSchema as any)
const { getError, clearErrors } = useFormError('rutas-form')

// ── Color Selection ───────────────────────────────────────────
const predefinedColors = [
  '#60a5fa', // Azul Claro
  '#ef4444', // Rojo
  '#22c55e', // Verde
  '#f59e0b', // Amarillo
  '#8b5cf6', // Violeta
  '#ec4899', // Rosa
  '#14b8a6', // Teal
  '#f97316', // Naranja
  '#6366f1', // Indigo
  '#84cc16'  // Lime
]
const showCustomColorPicker = ref(false)
const colorInputRef = ref<HTMLInputElement | null>(null)

const selectOtros = () => {
  showCustomColorPicker.value = true
  setTimeout(() => {
    colorInputRef.value?.click()
  }, 50)
}

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

// ── Iconos y colores para tipos de parada ───────────────────
const getTipoIconData = (nombre: string) => {
  const norm = nombre.toLowerCase().trim()
  if (norm.includes('inicio') || norm.includes('start')) {
    return { icon: Location01Icon, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/5 dark:border-emerald-500/10' }
  }
  if (norm.includes('fin') || norm.includes('end')) {
    return { icon: Location01Icon, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/5 dark:border-rose-500/10' }
  }
  if (norm.includes('gasolinera') || norm.includes('gasolineria') || norm.includes('fuel')) {
    return { icon: Location01Icon, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/5 dark:border-amber-500/10' }
  }
  if (norm.includes('parqueadero') || norm.includes('parking')) {
    return { icon: Location01Icon, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20 dark:bg-cyan-500/5 dark:border-cyan-500/10' }
  }
  if (norm.includes('balanza') || norm.includes('escala') || norm.includes('weight')) {
    return { icon: Location01Icon, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20 dark:bg-violet-500/5 dark:border-violet-500/10' }
  }
  if (norm.includes('control') || norm.includes('checkpoint')) {
    return { icon: Shield01Icon, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20 dark:bg-orange-500/5 dark:border-orange-500/10' }
  }
  return { icon: Location01Icon, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/5 dark:border-blue-500/10' }
}

const getTipoImage = (nombre: string) => {
  const norm = nombre.toLowerCase().trim()
  if (norm.includes('inicio') || norm.includes('start')) return rutaInicio
  if (norm.includes('fin') || norm.includes('end')) return rutaFin
  if (norm.includes('gasolinera') || norm.includes('gasolineria') || norm.includes('fuel')) return rutaGasolinera
  if (norm.includes('parqueadero') || norm.includes('parking')) return rutaParqueadero
  if (norm.includes('balanza') || norm.includes('escala') || norm.includes('weight')) return rutaBalanza
  if (norm.includes('control') || norm.includes('checkpoint')) return rutaPuntoControl
  return rutaPuntoNormal
}

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

  // Si los datos de edición ya cargaron antes que el mapa, dibujar ahora
  if (paradasTemporales.value.length > 0) {
    redrawMarkers()
    if (paradasTemporales.value.length >= 2) {
      drawFullRoute(paradasTemporales.value, routeColor.value, isGpsRoute.value)
    }
  }
}

// ── Carga de datos en modo edición ────────────────────────────
const loadRouteData = async (id_ruta: string) => {
  if (!selectedGroup.value?.id) return
  isSubmitting.value = true
  try {
    const detalle = await fetchRutaDetallesApi(selectedGroup.value.id, id_ruta)
    if (!detalle) return

    isEditMode.value    = true
    editingRutaId.value = id_ruta
    formData.value = {
      nombre:      detalle.nombre,
      descripcion: detalle.descripcion,
      color:       detalle.color || '#60a5fa'
    }

    if (detalle.color) {
      const colLower = detalle.color.toLowerCase()
      if (!predefinedColors.some(c => c.toLowerCase() === colLower)) {
        showCustomColorPicker.value = true
      }
    }

    if (detalle.paradas) {
      paradasTemporales.value = detalle.paradas.map(p => ({
        lat:  parseFloat(p.lat),
        lon:  parseFloat(p.lon),
        tipo: p.id_tipo_parada
      }))
    }

    // Solo dibujar si el mapa ya está listo; si no, handleMapInit lo hará
    if (map.value && paradasTemporales.value.length > 0) {
      redrawMarkers()
      if (paradasTemporales.value.length >= 2) {
        drawFullRoute(paradasTemporales.value, routeColor.value, isGpsRoute.value)
      }
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

  redrawMarkers() // clearMarkers() ya es llamado internamente por redrawMarkers

  if (paradasTemporales.value.length >= 2) {
    recalculateFromIndex(0, paradasTemporales.value, routeColor.value, isGpsRoute.value)
  }
}

const finishAddingParadas = () => {
  isAddingParadas.value = false
}

const saveRuta = async () => {
  if (isSubmitting.value) return

  clearErrors()
  modalMessage.value = null

  const idGrupo = selectedGroup.value?.id?.trim() || ''
  
  const payload = isEditMode.value && editingRutaId.value
    ? {
        id_grupo:    idGrupo,
        id_ruta:     editingRutaId.value,
        nombre:      formData.value.nombre,
        descripcion: formData.value.descripcion || '',
        color:       formData.value.color,
        paradas:     paradasTemporales.value
      }
    : {
        id_grupo:    idGrupo,
        nombre:      formData.value.nombre,
        descripcion: formData.value.descripcion || '',
        color:       formData.value.color,
        paradas:     paradasTemporales.value
      }

  if (!validate(payload, 'rutas-form')) {
    const firstErr = getFirstError()
    if (firstErr) {
      showModalMessage(firstErr, 'warning')
    }
    return
  }

  isSubmitting.value = true

  try {
    const data = isEditMode.value && editingRutaId.value
      ? await updateRutaApi(payload)
      : await createRutaApi(payload as any)

    if (data.done) {
      toast.add({
        severity: 'success',
        summary: isEditMode.value ? t('rutas.alertSuccessUpdate') : t('rutas.alertSuccessCreate'),
        detail: data.message || (isEditMode.value ? 'La ruta ha sido actualizada con éxito.' : 'La ruta ha sido creada con éxito.'),
        life: 4000
      })
      clearMarkers()
      clearAllRoutes()
      paradasTemporales.value = []
      setTimeout(() => { router.push('/rutas') }, 1500)
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: data.message || (isEditMode.value ? t('rutas.alertErrorUpdate') : t('rutas.alertErrorCreate')),
        life: 4000
      })
    }
  } catch (error) {
    console.error('Error saving ruta:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: isEditMode.value ? t('rutas.alertNetErrorUpdate') : t('rutas.alertNetErrorCreate'),
      life: 4000
    })
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
  recalculateFromIndex(insertionIndex, paradasTemporales.value, routeColor.value, isGpsRoute.value)

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
    if (parada && next) highlightSegment(parada, next, isGpsRoute.value)
  }
}

const onParadaDelete = (index: number) => {
  deleteParada(index)
  recalculateFromIndex(index, paradasTemporales.value, routeColor.value, isGpsRoute.value)

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
  recalculateFromIndex(editingParadaIndex.value, paradasTemporales.value, routeColor.value, isGpsRoute.value)
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

watch(routeColor, (newColor) => {
  if (map.value && paradasTemporales.value.length >= 2) {
    drawFullRoute(paradasTemporales.value, newColor, isGpsRoute.value)
  }
})

const verificarRutaGps = async () => {
  if (route.query.gps !== 'true') return

  const crudo = sessionStorage.getItem('temp_gps_positions')
  if (!crudo) return

  try {
    const posiciones: any[] = JSON.parse(crudo)
    if (!Array.isArray(posiciones) || posiciones.length === 0) return

    // Cargar tipos de parada si aún no están disponibles
    if (tiposParada.value.length === 0) {
      try { tiposParada.value = await fetchTiposParadaApi() }
      catch (e) { console.error('Error al obtener tipos de parada:', e) }
    }

    const tipoInicio = tiposParada.value.find(t => t.nombre.toLowerCase().includes('inicio'))?.id_tipo ?? 6
    const tipoFin = tiposParada.value.find(t => t.nombre.toLowerCase().includes('fin'))?.id_tipo ?? 7
    const tipoIntermedio = tiposParada.value.find(t => {
      const n = t.nombre.toLowerCase()
      return n.includes('apoyo') || n.includes('normal') || n.includes('control') || n.includes('paso') || n.includes('punto')
    })?.id_tipo ?? tiposParada.value.find(t => t.id_tipo !== tipoInicio && t.id_tipo !== tipoFin)?.id_tipo ?? 8

    const primera = posiciones[0]
    const ultima  = posiciones[posiciones.length - 1]

    const nuevasParadas = []
    nuevasParadas.push({ lat: parseFloat(primera.lat), lon: parseFloat(primera.lon), tipo: tipoInicio })

    // Mapear todos los puntos intermedios reales del GPS
    if (posiciones.length > 2) {
      for (let i = 1; i < posiciones.length - 1; i++) {
        const pos = posiciones[i]
        nuevasParadas.push({ lat: parseFloat(pos.lat), lon: parseFloat(pos.lon), tipo: tipoIntermedio })
      }
    }

    if (posiciones.length > 1) {
      nuevasParadas.push({ lat: parseFloat(ultima.lat), lon: parseFloat(ultima.lon), tipo: tipoFin })
    }

    paradasTemporales.value = nuevasParadas

    if (map.value) {
      redrawMarkers()
      if (paradasTemporales.value.length >= 2) {
        drawFullRoute(paradasTemporales.value, routeColor.value, isGpsRoute.value)
      }
      // Encuadrar el mapa con el trayecto completo del GPS
      const limites = new (window as any).google.maps.LatLngBounds()
      posiciones.forEach((p: any) => limites.extend({ lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
      map.value.fitBounds(limites)
    }

    sessionStorage.removeItem('temp_gps_positions')
  } catch (e) {
    console.error('Error al procesar posiciones de GPS:', e)
  }
}

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(() => {
  startDarkModeObserver()

  loadGoogleMaps()
    .then((apiMaps) => {
      handleMapInit(apiMaps)
      verificarRutaGps()
    })
    .catch(err => {
      console.error('[RutasFormView] Error cargando Google Maps:', err)
      isLoadingMap.value = false
    })

})

onUnmounted(() => {
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
.rutas-theme-sync {
  font-family: 'Inter', sans-serif;
}
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


