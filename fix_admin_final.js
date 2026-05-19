const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Fix logo
  content = content.replace(/<div class="logo">[\s\uFE0F]*(옹진 관광\s*<span>ADMIN<\/span>)<\/div>/g, '<div class="logo">$1</div>');
  
  // Fix nav links
  content = content.replace(/(<a href="[^"]*"[^>]*>)[\s\uFE0F]+([^<]+<\/a>)/g, '$1$2');

  // Ensure requireAdminAuth
  if (!content.includes('requireAdminAuth')) {
    content = content.replace(/<script type="module">/, `<script type="module">\n    import { requireAdminAuth } from '../shared/js/admin-guard.js';\n    await requireAdminAuth();\n`);
  }

  // Remove language switcher logic
  content = content.replace(/bindLanguageSwitcher\([^)]*\);/g, '');

  fs.writeFileSync(path.join(dir, file), content);
}
console.log('Fixed auth and spacing issues.');
