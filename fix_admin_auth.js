const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'frontend', 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html') && f !== 'login.html');

const headInjection = `
  <script>
    if (!localStorage.getItem('ongjin_admin_token')) {
      window.location.replace('/admin/login.html');
    }
  </script>
  <style>body { opacity: 0; transition: opacity 0.3s ease; }</style>
`;

for (const file of files) {
  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove existing injection if any to avoid duplicates
  content = content.replace(/<script>\s*if\s*\(!localStorage\.getItem\('ongjin_admin_token'\)\)[\s\S]*?<\/style>/, '');

  // Inject before </head>
  content = content.replace('</head>', `${headInjection}</head>`);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
