<script setup lang="ts">
import { useThemeStore } from './stores/theme.store'
import { storeToRefs } from 'pinia'

// Initializes the singleton theme on app mount — applies .dark to <html>
// This is the single source of truth for the rest of the app
useThemeStore()
</script>

<template>
  <router-view />
</template>

<style>

html, body {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: inherit;
}

#app {
  height: 100%;
  width: 100%;
}
</style>


