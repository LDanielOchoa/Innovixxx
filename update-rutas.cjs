const fs = require('fs');

let content = fs.readFileSync('src/domains/rutas/views/RutasFormView.vue', 'utf8');

const formStartMatch = content.match(/<form.*?class="space-y-5 relative p-1">/);
const formEndMatch = content.match(/<\/form>/);

if (formStartMatch && formEndMatch) {
  const formHtml = content.substring(formStartMatch.index, formEndMatch.index + formEndMatch[0].length);
  
  const sidebarStart = content.indexOf('<!-- Cabecera del Sidebar -->');
  const sidebarEnd = content.indexOf('<!-- Panel de Paradas: Modo Edición (Floating Side Panel) -->');
  
  const newSidebarContent = `
      <div class="p-8 border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="router.push('/rutas')" class="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-[#3b82f6] transition-all shadow-sm">
            <HugeiconsIcon :icon="ArrowLeft01Icon" :size="20" />
          </button>
          <div>
            <h1 class="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{{ isEditMode ? $t('rutas.modalEditTitle') : $t('rutas.modalCreateTitle') }}</h1>
            <p class="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Detalles de la ruta</p>
          </div>
        </div>
        <AppButton 
          variant="primary" 
          @click="saveRuta"
          :loading="isSubmitting"
        >
          <span>{{ isEditMode ? $t('rutas.btnUpdate') : $t('rutas.btnSave') }}</span>
        </AppButton>
      </div>
      
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        ${formHtml}
      </div>
  `;
  
  content = content.substring(0, sidebarStart) + newSidebarContent + content.substring(sidebarEnd);
  
  const modalStart = content.indexOf('<AppModal\n      v-model:isOpen="isModalOpen"');
  if (modalStart !== -1) {
    const modalEnd = content.indexOf('</AppModal>', modalStart);
    if (modalEnd !== -1) {
       content = content.substring(0, modalStart) + content.substring(modalEnd + '</AppModal>'.length);
    }
  }
  
  // Also we need to import ArrowLeft01Icon
  if (!content.includes('ArrowLeft01Icon')) {
    content = content.replace(/ArrowExpand01Icon,/g, 'ArrowLeft01Icon,\n  ArrowExpand01Icon,');
  }
  
  fs.writeFileSync('src/domains/rutas/views/RutasFormView.vue', content);
  console.log('Sidebar replaced with form successfully');
} else {
  console.log('Could not find form html');
}
