import type { DirectiveBinding, ObjectDirective } from 'vue'
import { sanitizeHTML } from '../utils/sanitize'

export const vSanitize: ObjectDirective<HTMLElement, string> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string>) {
    el.innerHTML = sanitizeHTML(binding.value)
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string>) {
    if (binding.value !== binding.oldValue) {
      el.innerHTML = sanitizeHTML(binding.value)
    }
  }
}
