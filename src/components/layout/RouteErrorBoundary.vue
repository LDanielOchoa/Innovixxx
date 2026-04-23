<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  moduleName?: string
  resetKey?: string
}>(), {
  moduleName: ''
})

const hasError = ref(false)
const { t } = useI18n()

watch(() => props.resetKey, () => {
  hasError.value = false
})

onErrorCaptured((error) => {
  hasError.value = true
  console.error(`[RouteErrorBoundary] ${props.moduleName}:`, error)
  return false
})
</script>

<template>
  <slot v-if="!hasError" />

  <section v-else class="relative flex-1 min-h-full overflow-hidden bg-[#111418]">
    <div class="relative z-10 flex min-h-full items-center justify-center px-6 py-12">
      <div class="max-w-2xl text-center">
        <p class="mb-2 text-4xl font-bold leading-none tracking-tight text-[#b9dcff]">
          {{ t('errors.boundaryLabel') }}
        </p>
        <h1 class="mb-4 text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
          {{ t('errors.boundaryTitle') }}
        </h1>
        <p class="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
          {{ t('errors.boundarySubtitle', { module: props.moduleName || t('errors.moduleDefault') }) }}
        </p>

        <button
          class="inline-flex items-center rounded-full border border-[#5da6fc] bg-[#5da6fc] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#2f7fdc] hover:shadow-[0_0_0_4px_rgba(93,166,252,0.22)]"
          @click="hasError = false"
        >
          {{ t('errors.boundaryRetry') }}
        </button>
      </div>
    </div>
  </section>
</template>

