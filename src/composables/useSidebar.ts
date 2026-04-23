import { ref } from 'vue'

export const isMobileSidebarOpen = ref(false)

export const toggleMobileSidebar = () => {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value
}

export const closeMobileSidebar = () => {
  isMobileSidebarOpen.value = false
}
