<script setup lang="ts">
import { onMounted } from 'vue'
import Dashboard from '../components/dashboard/Dashboard.vue'

onMounted(() => {
  document.documentElement.classList.add('dark')
})
</script>

<template>
  <!-- Removidos los paddings (p-4 md:p-6 lg:p-8) para que el monitor abarque el 100% de la pantalla hasta los bordes superior e inferior -->
  <div class="flex-1 flex flex-col w-full h-full bg-[#16191D] overflow-hidden">
    <Dashboard class="flex-1" />
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

.font-mono {
  font-family: 'Share Tech Mono', monospace;
}

:global(body) {
  background-color: #1E2228 !important;
  color: #E8ECEF !important;
}

/* Custom Scrollbar */
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

@keyframes fadeSlideRight {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-fade-slide-right {
  animation: fadeSlideRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-slide-up {
  animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

@keyframes radar-ping {
  0% { transform: scale(0.8); opacity: 0.8; border-color: rgba(93, 166, 252, 0.8); }
  100% { transform: scale(2); opacity: 0; border-color: rgba(93, 166, 252, 0); }
}
</style>


