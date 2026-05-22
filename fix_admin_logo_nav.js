const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'frontend', 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html') && f !== 'login.html');

const oldLogo1 = `<div class="logo" style="flex-direction: column; align-items: flex-start; padding: 20px 24px; gap: 4px;">
        <div style="font-size: 1.15rem;">옹진 관광 쿠폰</div>
        <div style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">관리자 페이지</div>
      </div>`;
const newLogo = `<div class="logo" style="flex-direction: column; align-items: flex-start; padding: 20px 24px; gap: 4px;">
        <div style="font-size: 1.15rem; font-weight: 400;">관리자 페이지</div>
        <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 400;">옹진 관광 쿠폰</div>
      </div>`;

for (const file of files) {
  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace logo
  content = content.replace(oldLogo1, newLogo);

  // 2. Add managers.html to nav if not exists
  if (!content.includes('managers.html')) {
    const navInsert = `<a href="/admin/managers.html" data-i18n="nav_managers">관리자 계정 관리</a>\n      </nav>`;
    content = content.replace('</nav>', navInsert);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
