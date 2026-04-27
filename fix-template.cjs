const fs = require('fs');

let content = fs.readFileSync('src/domains/rutas/views/RutasFormView.vue', 'utf8');

// The sidebar div structure in the template:
// Line 41: <div  (sidebar container)
// Line 68: <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">  (scrollable content)
// Line 176: </form>  (closes the form)
// Line 177: </div>  (closes the flex-1 div)
// Missing: </div>  (should close the sidebar container div)
// Line 178: <!-- Panel de Paradas -->

// Find the broken spot and fix it
const brokenPattern = '</form>\n      </div>\n  <!-- Panel de Paradas';
const fixedPattern = '</form>\n      </div>\n    </div>\n    <!-- Panel de Paradas';

if (content.includes(brokenPattern)) {
  content = content.replace(brokenPattern, fixedPattern);
  fs.writeFileSync('src/domains/rutas/views/RutasFormView.vue', content);
  console.log('Fixed: added missing closing </div> for sidebar');
} else {
  // Try to find alternate pattern
  const idx = content.indexOf('</div>\n  <!-- Panel de Paradas');
  if (idx !== -1) {
    content = content.substring(0, idx) + '</div>\n    </div>\n    <!-- Panel de Paradas' + content.substring(idx + '</div>\n  <!-- Panel de Paradas'.length);
    fs.writeFileSync('src/domains/rutas/views/RutasFormView.vue', content);
    console.log('Fixed via alternate pattern');
  } else {
    console.log('Pattern not found. Searching...');
    // Show context around line 177-178
    const lines = content.split('\n');
    for (let i = 174; i < 182; i++) {
      console.log(`Line ${i+1}: ${JSON.stringify(lines[i])}`);
    }
  }
}
