<script setup lang="ts">
import DashboardBackground from './ui/DashboardBackground.vue'
import WidgetDevices from './widgets/WidgetDevices.vue'
import WidgetKilometers from './widgets/WidgetKilometers.vue'
import WidgetAlarms from './widgets/WidgetAlarms.vue'
import WidgetServices from './widgets/WidgetServices.vue'
import WidgetVehicles from './widgets/WidgetVehicles.vue'
</script>

<template>
  <div class="relative w-full h-full min-h-[600px] xl:min-h-[750px] bg-[#F1F4F8] dark:bg-[#13161C] overflow-hidden flex items-center justify-center font-sans transition-colors duration-500">
    
    <!-- Capa Visual Base y Holográfica -->
    <DashboardBackground />

    <!-- LEFT PANEL (WIDGETS) -->
    <div class="absolute left-6 top-6 bottom-6 w-[260px] lg:w-[280px] xl:w-[300px] z-30 flex flex-col gap-5 pointer-events-auto">
      <WidgetDevices />
      <WidgetKilometers />
      <WidgetAlarms class="flex-1 min-h-0" />
    </div>

    <!-- RIGHT PANEL (WIDGETS) -->
    <div class="absolute right-6 top-6 bottom-6 w-[260px] lg:w-[280px] xl:w-[300px] z-30 flex flex-col gap-5 pointer-events-auto">
      <WidgetServices />
      <WidgetVehicles class="flex-1 min-h-0" />
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.05);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(96, 165, 250, 0.35);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(93, 166, 252, 0.3);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(96, 165, 250, 0.6);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(93, 166, 252, 0.5);
}
</style>


