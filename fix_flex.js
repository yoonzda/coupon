const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Change .app-shell flex-direction: row !important; to display: block !important;
  content = content.replace(/flex-direction:\s*row\s*!important;/g, 'display: block !important;');

  fs.writeFileSync(path.join(dir, file), content);
}
console.log('Fixed WebKit flex gap issue.');
