const fs = require('fs');
const path = require('path');
const dir = 'c:/nuri/Ongjin_coupon/frontend/admin';

fs.readdirSync(dir).filter(f => f.endsWith('.html')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');

  // Fix Powershell corruption if any exists from before checkout
  // It replaced "관리자 계정 관리" with "관리자 계정 관?/a>"
  content = content.replace(/관리자 계정 관\?\/?a>/g, '관리자 계정 관리</a>');

  // 1. font-weight 400 -> 500
  content = content.replace(
    '<div style="font-size: 1.15rem; font-weight: 400;">옹진 관광 쿠폰</div>',
    '<div style="font-size: 1.15rem; font-weight: 500;">옹진 관광 쿠폰</div>'
  );

  // 2. Hide manager nav link
  content = content.replace(
    '<a href="/admin/managers.html" data-i18n="nav_managers">관리자 계정 관리</a>',
    '<a href="/admin/managers.html" data-i18n="nav_managers" class="nav-manager" style="display: none;">관리자 계정 관리</a>'
  );
  
  // Also replace if it has active class
  content = content.replace(
    '<a href="/admin/managers.html" class="active" data-i18n="nav_managers">관리자 계정 관리</a>',
    '<a href="/admin/managers.html" class="active nav-manager" data-i18n="nav_managers" style="display: none;">관리자 계정 관리</a>'
  );

  // Wait, if it was already replaced by Powershell and corrupted, we need to fix it:
  // Let's just do a brute-force replace for the corrupted anchor
  content = content.replace(
    /<a href="\/admin\/managers\.html"[^>]*>관리자 계정 관[\s\S]*?<\/a>/,
    '<a href="/admin/managers.html" data-i18n="nav_managers" class="nav-manager" style="display: none;">관리자 계정 관리</a>'
  );

  fs.writeFileSync(p, content, 'utf8');
  console.log('Fixed', f);
});
