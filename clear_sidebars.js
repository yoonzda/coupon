const fs = require('fs');
const path = require('path');
const dir = 'c:/nuri/Ongjin_coupon/frontend/admin';

// 1. First, we get the common sidebar HTML to put into admin-guard.js
const sidebarHtml = `
      <div class="logo" style="flex-direction: column; align-items: flex-start; padding: 20px 24px; gap: 4px;">
        <div style="font-size: 1.15rem; font-weight: 500;">웅진 관광 쿠폰</div>
        <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 400;">관리자 페이지</div>
      </div>
      <nav class="admin-nav">
        <a href="/admin/index.html" data-i18n="nav_dashboard">대시보드</a>
        <a href="/admin/merchants.html" data-i18n="nav_merchant">가맹점 관리</a>
        <a href="/admin/settlement.html" data-i18n="nav_settlement">정산 관리</a>
        <a href="/admin/fds.html" data-i18n="nav_fds">FDS 모니터링</a>
        <a href="/admin/coupons.html" data-i18n="nav_coupons">쿠폰 및 발행처 관리</a>
        <a href="/admin/statistics.html" data-i18n="nav_statistics">통계 및 보고서</a>
        <a href="/admin/managers.html" class="nav-manager" data-i18n="nav_managers" style="display: none;">관리자 계정 관리</a>
      </nav>
`;

// 2. Clear out the contents of <aside class="admin-sidebar"> from all HTML files
fs.readdirSync(dir).filter(f => f.endsWith('.html')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');

  // Replace everything inside <aside class="admin-sidebar"> ... </aside> with nothing
  content = content.replace(/<aside class="admin-sidebar">[\s\S]*?<\/aside>/, '<aside class="admin-sidebar"></aside>');

  fs.writeFileSync(p, content, 'utf8');
});

console.log("Cleared sidebar HTML from all files.");
