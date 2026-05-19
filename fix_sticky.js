const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Change position: sticky to position: fixed
  content = content.replace(/position:\s*sticky;\s*top:\s*0;/g, 'position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;');
  
  // Add margin-left: 240px to .admin-content inside the media query
  // We match `.admin-content {` and add margin-left
  // We need to be careful not to add it multiple times if we run the script twice
  if (!content.includes('margin-left: 240px')) {
    content = content.replace(/\.admin-content\s*\{/g, '.admin-content { margin-left: 240px; ');
  }

  // Remove overflow-x: hidden from body just in case it interferes with anything else
  content = content.replace(/overflow-x:\s*hidden;/g, '');

  fs.writeFileSync(path.join(dir, file), content);
}
console.log('Fixed sticky sidebar issue.');
