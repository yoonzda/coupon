const fs = require('fs');
const path = require('path');

// 1. Update admin-guard.js
const guardPath = path.join(__dirname, 'frontend', 'shared', 'js', 'admin-guard.js');
let guardContent = fs.readFileSync(guardPath, 'utf8');

const oldFooterStart = '<div style="display: flex; align-items: center; margin-bottom: 16px;">';
const oldFooterEnd = '</div>\n      </div>\n      <button';
const guardStartIndex = guardContent.indexOf(oldFooterStart);
const guardEndIndex = guardContent.indexOf(oldFooterEnd) + '</div>\n      </div>'.length;

const newFooterBlock = `<div style="display: flex; align-items: center; margin-bottom: 16px;">
        <div style="min-width: 0; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="color: #fff; font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              \${adminName}
            </div>
            <div class="admin-role-info" style="position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: rgba(255,255,255,0.15); border-radius: 50%; color: #cbd5e1; font-size: 0.7rem; font-weight: bold;">
              i
              <div class="admin-role-tooltip" style="
                position: absolute; left: 24px; top: 50%; transform: translateY(-50%);
                background: #1e293b; border: 1px solid #334155; border-radius: 0;
                padding: 16px; width: 280px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                visibility: hidden; opacity: 0; transition: all 0.2s; z-index: 200;
                display: flex; flex-direction: column; gap: 10px; cursor: default;
              ">
                <div style="color: #cbd5e1; font-size: 0.75rem; line-height: 1.5; margin-bottom: 4px; text-align: left; font-weight: normal; white-space: normal;">
                  <div style="margin-bottom: 8px;"><strong style="color: #fff; font-size: 0.8rem;">[최고 관리자]</strong><br>모든 메뉴 접근 및 관리자 계정 생성/수정 가능</div>
                  <div><strong style="color: #fff; font-size: 0.8rem;">[일반 운영자]</strong><br>가맹점 관리, 쿠폰 발급, 통계 조회만 가능<br>(계정 관리 불가)</div>
                </div>
                <a href="/admin/managers.html" style="background: #38bdf8; color: #0f172a; text-decoration: none; font-size: 0.8rem; font-weight: 700; padding: 8px 12px; border-radius: 0; width: 100%; text-align: center; display: block; transition: background 0.2s;" onmouseover="this.style.background='#7dd3fc'" onmouseout="this.style.background='#38bdf8'">자세히 보기</a>
                <div style="position: absolute; left: -6px; top: 50%; transform: translateY(-50%); border-width: 6px 6px 6px 0; border-style: solid; border-color: transparent #334155 transparent transparent;"></div>
                <div style="position: absolute; left: -5px; top: 50%; transform: translateY(-50%); border-width: 5px 5px 5px 0; border-style: solid; border-color: transparent #1e293b transparent transparent;"></div>
              </div>
            </div>
          </div>
          <div style="color: #64748b; font-size: 0.72rem;">\${roleLabel}</div>
        </div>
      </div>`;

guardContent = guardContent.substring(0, guardStartIndex) + newFooterBlock + guardContent.substring(guardEndIndex);

// Update hover CSS in admin-guard.js
guardContent = guardContent.replace(
  'transform: translateX(-50%) translateY(-4px) !important;',
  'transform: translateY(-50%) translateX(4px) !important;'
);

fs.writeFileSync(guardPath, guardContent, 'utf8');


// 2. Update managers.html
const managersPath = path.join(__dirname, 'frontend', 'admin', 'managers.html');
let managersContent = fs.readFileSync(managersPath, 'utf8');

// Fix active menu
managersContent = managersContent.replace(
  '<a href="/admin/statistics.html" class="active" data-i18n="nav_statistics">통계 및 보고서</a>',
  '<a href="/admin/statistics.html" data-i18n="nav_statistics">통계 및 보고서</a>'
);
managersContent = managersContent.replace(
  '<a href="/admin/managers.html" data-i18n="nav_managers">관리자 계정 관리</a>',
  '<a href="/admin/managers.html" class="active" data-i18n="nav_managers">관리자 계정 관리</a>'
);

// Fix table style: remove card-header title, center align, remove border radius
const oldMainStart = '<main class="admin-content">';
const oldMainEnd = '</main>';
const mainStartIndex = managersContent.indexOf(oldMainStart);
const mainEndIndex = managersContent.indexOf(oldMainEnd) + oldMainEnd.length;

const newMainContent = `<main class="admin-content">
      <header class="dashboard-header">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 900; margin: 0 0 8px 0;">관리자 계정 관리</h1>
          <p style="color: var(--text-secondary); margin: 0;">관리자 계정을 추가하거나 권한을 설정할 수 있습니다.</p>
        </div>
        <div class="controls">
          <button class="btn-export" style="background: var(--primary); border-radius: 0;">
            + 새 관리자 등록
          </button>
        </div>
      </header>

      <div class="admin-card" style="border-radius: 0;">
        <table class="admin-table" style="text-align: center;">
          <thead>
            <tr>
              <th style="text-align: center;">이름</th>
              <th style="text-align: center;">아이디</th>
              <th style="text-align: center;">권한</th>
              <th style="text-align: center;">상태</th>
              <th style="text-align: center;">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>최고 관리자</td>
              <td><strong>admin</strong></td>
              <td><span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 0; font-size: 0.8rem; font-weight: bold;">최고 관리자</span></td>
              <td><span style="color: #10b981; font-weight: 600;">활성</span></td>
              <td><button style="border: 1px solid var(--border); padding: 4px 12px; background: #fff; cursor: pointer; border-radius: 0; font-size: 0.8rem;">수정</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>`;

managersContent = managersContent.substring(0, mainStartIndex) + newMainContent + managersContent.substring(mainEndIndex);

fs.writeFileSync(managersPath, managersContent, 'utf8');

console.log('Updated guard and managers');
