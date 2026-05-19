const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Remove hardcoded language switcher and logout
  content = content.replace(/<div style="padding: 24px; border-top: 1px solid rgba\(255,255,255,0\.1\);">[\s\S]*?<\/button>\s*<\/div>/g, '');

  // Remove emojis
  content = content.replace(/🏝️\s*/g, '');
  content = content.replace(/옹진관광/g, '옹진 관광'); // Spacing
  content = content.replace(/⚠️\s*/g, '');
  content = content.replace(/✅\s*/g, '');
  content = content.replace(/❌\s*/g, '');
  content = content.replace(/🚀\s*/g, '');
  content = content.replace(/💰\s*/g, '');
  content = content.replace(/📈\s*/g, '');
  content = content.replace(/📊\s*/g, '');
  content = content.replace(/👥\s*/g, '');
  content = content.replace(/🛑\s*/g, '');
  content = content.replace(/🔔\s*/g, '');
  content = content.replace(/⚙️\s*/g, '');
  content = content.replace(/🛡️\s*/g, '');

  fs.writeFileSync(path.join(dir, file), content);
}
console.log('Fixed admin HTML files.');
