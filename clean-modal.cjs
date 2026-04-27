const fs = require('fs');

let content = fs.readFileSync('src/domains/rutas/views/RutasFormView.vue', 'utf8');

const modalStart = content.indexOf('<!-- Modales -->');
if (modalStart !== -1) {
  const modalEnd = content.indexOf('</AppModal>', modalStart);
  if (modalEnd !== -1) {
     content = content.substring(0, modalStart) + content.substring(modalEnd + '</AppModal>'.length);
     console.log('AppModal removed');
  }
}

content = content.replace(/if \(result\.done\) {/g, 'if (result.done) {\n      router.push(\'/rutas\');\n      return;');

fs.writeFileSync('src/domains/rutas/views/RutasFormView.vue', content);
