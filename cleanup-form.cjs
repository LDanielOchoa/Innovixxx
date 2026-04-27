const fs = require('fs');

let content = fs.readFileSync('src/domains/rutas/views/RutasFormView.vue', 'utf8');

const target1Start = content.indexOf('const isFetchingRoutes = ref(true)');
const target1End = content.indexOf('// Modal and Form State');

if (target1Start !== -1 && target1End !== -1) {
  content = content.substring(0, target1Start) + content.substring(target1End);
}

// remove unused imports
content = content.replace(/import AppTableCard[\s\S]*?import Column from 'primevue\/column'/m, '');
content = content.replace(/AppSearch from '.*?'/, '');

// Fix imports
content = content.replace(/fetchRutasApi,\s*/g, '');
content = content.replace(/setRutaEstadoApi\s*/g, '');
content = content.replace(/,\s*setRutaEstadoApi/g, '');
content = content.replace(/RefreshIcon,\n\s*ArrowExpand01Icon,\n\s*ArrowShrink01Icon,\n\s*Search01Icon,\n\s*Edit02Icon,\n\s*Delete01Icon,\n\s*Shield01Icon,\n\s*Sorting05Icon,\n\s*ArrowDown01Icon,\n\s*ArrowUp01Icon,\n\s*Tick01Icon,\n\s*Settings02Icon,\n\s*FilterIcon/, 'Tick01Icon,\n  ArrowLeft01Icon,\n  Shield01Icon');

fs.writeFileSync('src/domains/rutas/views/RutasFormView.vue', content);
console.log('Cleanup script executed');
