<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import RouteErrorBoundary from './RouteErrorBoundary.vue'
import { useRoute } from 'vue-router'
import { useVehiculosServicioPanel } from '../../composables/useVehiculosServicioPanel'

const route = useRoute()
const { isPanelOpen } = useVehiculosServicioPanel()
</script>

<template>
  <div
    class="bg-white dark:bg-[#13161C] font-sans text-slate-700 dark:text-slate-300 h-screen flex overflow-hidden relative selection:bg-[#60a5fa]/30 dark:selection:bg-[#5da6fc]/30 selection:text-white"
  >
    <!-- Grid de Fondo Tecnológico HUD -->
    <div
      class="absolute inset-0 z-0 opacity-10 dark:opacity-20 pointer-events-none"
      style="
        background-image: linear-gradient(rgba(93, 166, 252, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(93, 166, 252, 0.1) 1px, transparent 1px);
        background-size: 40px 40px;
      "
    ></div>

    <!-- Destellos ambientales sci-fi -->
    <div
      class="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#5da6fc]/10 rounded-full blur-[120px] animate-[pulse_4s_ease-in-out_infinite] pointer-events-none z-0"
    ></div>
    <div
      class="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-[#A5C9FF]/5 rounded-full blur-[100px] pointer-events-none z-0"
    ></div>

    <div class="flex w-full h-full z-10 relative">
      <!-- Sidebar — se oculta cuando el panel de vehículos servicio está abierto -->
      <Sidebar v-show="!isPanelOpen" />

      <!-- Panel de Contenido Principal -->
      <div class="flex-1 flex flex-col h-full overflow-hidden relative z-10 bg-white dark:bg-[#13161C]">
        <!-- Header — también se oculta -->
        <Header v-show="!isPanelOpen" />

        <!-- Zona de contenido: solo esto cambia entre páginas -->
        <main class="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <router-view v-slot="{ Component }">
            <RouteErrorBoundary
              v-if="Component"
              :module-name="String(route.name || 'Módulo')"
              :reset-key="route.path"
            >
              <Transition name="page">
                <div :key="route.path" class="w-full min-h-full flex flex-col bg-white dark:bg-[#13161C]">
                  <component :is="Component" />
                </div>
              </Transition>
            </RouteErrorBoundary>
            <section
              v-else
              class="flex-1 flex items-center justify-center px-6 py-12 text-center"
            >
              <div class="max-w-md rounded-xl border border-slate-200 dark:border-[#2A313A] bg-white dark:bg-[#1E2228] p-6">
                <h2 class="text-base font-semibold text-slate-800 dark:text-white mb-2">Vista no disponible</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">La ruta seleccionada no tiene contenido asignado.</p>
              </div>
            </section>
          </router-view>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
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

.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
  will-change: opacity, transform;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>


