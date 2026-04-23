# Sistema de Diseño Premium (Glassmorphic 3D)

Esta guía documenta los estándares visuales, clases de Tailwind CSS y patrones de comportamiento establecidos en el rediseño del módulo de autenticación (`Login.vue`). Úsala para replicar esta misma estética en nuevos componentes y mantener consistencia en toda la aplicación.

---

## 1. Filosofía General
El diseño abandona la estética "Sci-Fi dura/Terminal" en favor de una apariencia **Premium, Limpia y Táctil (Authkit/Vercel style)**:
- **Glassmorphism:** Uso intensivo de fondos semi-transparentes con desenfoque de fondo (`backdrop-blur`).
- **Feedback Físico (3D):** Botones que parecen físicos; se hunden al presionarlos.
- **Micro-interacciones:** Escalamientos suaves, transiciones fluidas y sombras internas/externas dinámicas.
- **Tipografía Limpia:** Evitar fuentes *monospace* como `Share Tech Mono` para textos regulares; usar Sans Serif modernos (Inter) con `tracking-tight` para títulos y `tracking-wide` para subtítulos.

---

## 2. Paleta de Colores

### Modo Claro (Light Mode)
* **Fondo Base (App):** `bg-[#F1F4F8]` o gradientes sutiles blancos.
* **Superficies (Tarjetas/Glass):** `bg-white/70` o `bg-slate-50`.
* **Bordes:** `border-slate-200` o `border-slate-200/80` (muy sutil).
* **Texto Primario:** `text-slate-800`.
* **Texto Secundario:** `text-slate-500`.
* **Color de Acento (Azul):** `text-[#3b82f6]` (o `#60a5fa`).

### Modo Oscuro (Dark Mode)
* **Fondo Base (App):** `bg-[#0d1116]` o `bg-[#0F1115]`.
* **Superficies (Tarjetas/Glass):** `bg-[#0F1115]/80` o `bg-[#1A1D24]/80`.
* **Bordes:** `border-white/5` (fundamental para el efecto premium sin ser agresivo) o `border-[#2A313A]`.
* **Texto Primario:** `text-white`.
* **Texto Secundario:** `text-slate-400` o `text-slate-300`.
* **Color de Acento (Azul):** `text-[#5da6fc]`.

---

## 3. Patrones de Diseño & Clases Reutilizables

### A. Superficies Glassmorphic (Tarjetas y Paneles)
Para contenedores principales (Modales, Sidebars, Tarjetas de Login):
```html
<div class="bg-white/70 dark:bg-[#0F1115]/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/5 shadow-[10px_0_40px_rgba(0,0,0,0.02)] dark:shadow-[10px_0_40px_rgba(0,0,0,0.2)] rounded-2xl">
  <!-- Contenido -->
</div>
```

### B. Inputs (Campos de Texto Premium)
Los inputs deben sentirse profundos ("recessed") cuando están inactivos, y brillar suavemente al hacer focus.
```html
<div class="relative flex items-center group/input bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-1 focus-within:ring-[#3b82f6] dark:focus-within:ring-[#5da6fc] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
  
  <!-- Ícono opcional -->
  <div class="pl-4 text-slate-400 dark:text-slate-500 group-focus-within/input:text-[#3b82f6] dark:group-focus-within/input:text-[#5da6fc] transition-colors">
    <HugeiconsIcon :icon="User02Icon" :size="20" />
  </div>

  <input
    type="text"
    class="w-full bg-transparent border-none px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-0"
  />
</div>
```

### C. Botones Principales (Efecto 3D Físico)
El botón más importante de una vista (Login, Guardar, Confirmar). Da una sensación de interruptor mecánico.
```html
<button class="w-full relative group flex justify-center items-center rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] px-6 py-3.5 text-sm font-bold text-white transition-all duration-200 border border-[#2563eb] dark:border-[#1d4ed8]
  /* Sombras para dar grosor 3D */
  shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)]
  /* Efecto al Presionar (Hunde el botón) */
  active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)]">
  Texto del Botón
</button>
```

### D. Botones Secundarios (Escalado Suave)
Para botones del sidebar, cierres de modal o toggles, donde un efecto 3D masivo es mucho, usamos `active:scale-[0.98]`.
```html
<button class="bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#2A313A] shadow-sm transition-all duration-300 active:scale-[0.98] active:translate-y-[1px]">
  Cancelar
</button>
```

### E. Animaciones Flotantes (Logos e Ilustraciones)
Si tienes un ícono central o logotipo, dale "vida" con una animación de flotación constante:
```html
<div class="animate-[float_6s_ease-in-out_infinite]">
  <!-- Logo o Imagen Aquí -->
</div>
```
*(Nota: Asegúrate de tener el keyframe `float` definido en tu `index.css` si lo usas globalmente).*

---

## 4. Iconografía

**¡IMPORTANTE!** Se ha migrado **toda la aplicación** a **HugeIcons** (`@hugeicons/vue`).
* **NO usar:** `@tabler/icons-vue`.
* **NO usar:** `<i class="hgi..."></i>` desde CDNs.

### Forma Correcta de Uso:
1. Importar el componente contenedor y los íconos exactos desde el paquete nativo:
```javascript
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  User02Icon,
  Shield02Icon,
  Cancel01Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons'
```

2. Renderizar usando el componente de Vue:
```html
<HugeiconsIcon :icon="User02Icon" :size="20" :stroke-width="1.8" class="text-slate-500" />
```

---

## Resumen de Reglas de Oro
1. **Nunca bordes sólidos fuertes en Dark Mode:** Usa `border-white/5` o `border-white/10`.
2. **Interactividad:** Todo lo que sea "clickeable" debe moverse o escalarse al hacer `active:` y cambiar de estado en `hover:`.
3. **Profundidad:** Usa `shadow-[inset_...]` para campos que reciben información (inputs) y `shadow-lg` o el efecto `0_4px_0` para botones que envían información.
4. **Despedida del Sci-Fi:** Quita fuentes como `Share Tech Mono`. Usa fuentes san-serif legibles con diferentes opacidades (`text-slate-500`, `text-slate-400`) para generar jerarquía.
