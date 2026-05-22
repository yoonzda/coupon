const fs = require('fs');
const path = require('path');
const dir = 'c:/nuri/Ongjin_coupon/frontend/admin';

const newLogo = `      <div class="logo" style="flex-direction: column; align-items: flex-start; padding: 20px 24px; gap: 4px;">
        <div style="font-size: 1.15rem; font-weight: 500;">웅진 관광 쿠폰</div>
        <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 400;">관리자 페이지</div>
      </div>`;

fs.readdirSync(dir).filter(f => f.endsWith('.html')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');

  // Replace old logos
  content = content.replace(/<div class="logo">.*?<\/div>/s, newLogo);
  content = content.replace(/<div class="logo" style="[^"]*">[\s\S]*?<\/div>\s*<\/div>/, newLogo);

  // Add managers.html to nav if missing
  if (!content.includes('managers.html')) {
    content = content.replace('</nav>', '  <a href="/admin/managers.html" data-i18n="nav_managers" class="nav-manager" style="display: none;">관리자 계정 관리</a>\n      </nav>');
  } else {
    // Make sure managers nav link is hidden by default
    content = content.replace(/<a href="\/admin\/managers\.html"[^>]*>관리자 계정 관리<\/a>/g, '<a href="/admin/managers.html" data-i18n="nav_managers" class="nav-manager" style="display: none;">관리자 계정 관리</a>');
  }

  // Also fix "옹진 관광 쿠폰" -> "웅진 관광 쿠폰"
  content = content.replace(/옹진 관광 쿠폰/g, '웅진 관광 쿠폰');

  fs.writeFileSync(p, content, 'utf8');
});
