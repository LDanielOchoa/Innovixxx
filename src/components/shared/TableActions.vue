<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Edit02Icon,
  Delete01Icon,
  MoreHorizontalIcon
} from '@hugeicons/core-free-icons'

interface ActionButton {
  icon?: any
  tooltip?: string
  variant?: 'default' | 'primary' | 'danger'
  onClick: () => void
  show?: boolean
}

interface Props {
  actions?: ActionButton[]
  showMore?: boolean
  onMore?: () => void
}

withDefaults(defineProps<Props>(), {
  showMore: true
})

const defaultActions: ActionButton[] = [
  {
    icon: Edit02Icon,
    tooltip: 'Editar',
    variant: 'primary',
    onClick: () => {},
    show: true
  },
  {
    icon: Delete01Icon,
    tooltip: 'Eliminar',
    variant: 'danger',
    onClick: () => {},
    show: true
  }
]
</script>

<template>
  <div class="flex items-center justify-end gap-1.5 py-1">
    <!-- Custom Actions -->
    <template v-if="actions && actions.length > 0">
      <button
        v-for="(action, index) in actions"
        :key="index"
        v-show="action.show !== false"
        @click="action.onClick"
        class="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
        :class="{
          'text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-[#3b82f6]/5 dark:hover:bg-[#3b82f6]/10': action.variant === 'primary' || action.variant === 'default',
          'text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-500/10': action.variant === 'danger'
        }"
        :title="action.tooltip"
      >
        <HugeiconsIcon v-if="action.icon" :icon="action.icon" :size="16" :stroke-width="1.8" />
      </button>
    </template>

    <!-- Default Actions -->
    <template v-else>
      <button
        v-for="(action, index) in defaultActions"
        :key="index"
        v-show="action.show"
        @click="action.onClick"
        class="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
        :class="{
          'text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-[#3b82f6]/5 dark:hover:bg-[#3b82f6]/10': action.variant === 'primary',
          'text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-500/10': action.variant === 'danger'
        }"
        :title="action.tooltip"
      >
        <HugeiconsIcon :icon="action.icon" :size="16" :stroke-width="1.8" />
      </button>
    </template>

    <!-- More Button -->
    <button
      v-if="showMore && onMore"
      @click="onMore"
      class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
    >
      <HugeiconsIcon :icon="MoreHorizontalIcon" :size="16" />
    </button>
  </div>
</template>
