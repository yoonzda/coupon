const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'frontend', 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html') && f !== 'login.html');

const oldLogo = '<div class="logo">옹진 관광 <span>ADMIN</span></div>';
const newLogo = `<div class="logo" style="flex-direction: column; align-items: flex-start; padding: 20px 24px; gap: 4px;">
        <div style="font-size: 1.15rem;">옹진 관광 쿠폰</div>
        <div style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">관리자 페이지</div>
      </div>`;

for (const file of files) {
  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace logo
  content = content.replace(oldLogo, newLogo);

  // 2. Remove opacity style
  content = content.replace(/<style>body\s*\{\s*opacity:\s*0;\s*transition:\s*opacity\s*0\.3s\s*ease;\s*\}<\/style>/, '');
  // Also catch variations if any
  content = content.replace('<style>body { opacity: 0; transition: opacity 0.3s ease; }</style>', '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
