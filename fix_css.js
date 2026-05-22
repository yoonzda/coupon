const fs = require('fs');
const path = require('path');
const dir = 'c:/nuri/Ongjin_coupon/frontend/admin';

// 1. Get the good CSS from index.html (the common layout parts)
const indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const commonCssMatch = indexHtml.match(/<style>([\s\S]*?)<\/style>/);
let commonCss = commonCssMatch ? commonCssMatch[1] : '';

// 2. Fix the overflow issue in ALL html files
fs.readdirSync(dir).filter(f => f.endsWith('.html')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');

  // Replace .admin-nav CSS to include overflow-y
  // Find where .admin-nav is defined and add overflow-y: auto;
  if (content.includes('.admin-nav { padding: 16px 0; flex: 1; }')) {
    content = content.replace('.admin-nav { padding: 16px 0; flex: 1; }', '.admin-nav { padding: 16px 0; flex: 1; overflow-y: auto; overflow-x: hidden; }');
  } else if (content.includes('.admin-nav { display: flex; flex-direction: column; }')) {
    content = content.replace('.admin-nav { display: flex; flex-direction: column; }', '.admin-nav { display: flex; flex-direction: column; flex: 1; overflow-y: auto; overflow-x: hidden; }');
  } else if (content.match(/\.admin-nav\s*\{\s*padding:\s*16px 0;\s*flex:\s*1;\s*\}/)) {
    content = content.replace(/\.admin-nav\s*\{\s*padding:\s*16px 0;\s*flex:\s*1;\s*\}/g, '.admin-nav { padding: 16px 0; flex: 1; overflow-y: auto; overflow-x: hidden; }');
  } else {
    // Just inject it globally
    content = content.replace('</style>', '  .admin-nav { overflow-y: auto; overflow-x: hidden; }\n  </style>');
  }

  // Hide the scrollbar for webkit to make it look clean (optional but good UI)
  content = content.replace('</style>', '  .admin-nav::-webkit-scrollbar { width: 6px; }\n  .admin-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }\n  </style>');

  fs.writeFileSync(p, content, 'utf8');
  console.log('Fixed CSS in', f);
});

// 3. Completely replace the <style> block of managers.html with index.html's base + managers.html specific
const managersPath = path.join(dir, 'managers.html');
let managersHtml = fs.readFileSync(managersPath, 'utf8');

const managersSpecificCss = `
    /* 데이터 테이블 */
    .admin-card {
      background: #fff;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .admin-table th, .admin-table td {
      padding: 16px 24px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .admin-table th {
      background: #f8fafc;
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.85rem;
    }
    .admin-table tr:hover { background: #f8fafc; }
    
    .btn-export {
      padding: 10px 16px;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-export:hover { background: #f1f5f9; }
    .controls { display: flex; gap: 12px; }
`;

// Extract everything from index.html's CSS up to "/* 통계 카드 */" which is where specific CSS starts
let baseCss = commonCss.split('/* 통계 카드 */')[0];
baseCss = baseCss.replace('.admin-nav { padding: 16px 0; flex: 1; }', '.admin-nav { padding: 16px 0; flex: 1; overflow-y: auto; overflow-x: hidden; }');

managersHtml = managersHtml.replace(/<style>[\s\S]*?<\/style>/, '<style>\n' + baseCss + managersSpecificCss + '\n  .admin-nav::-webkit-scrollbar { width: 6px; }\n  .admin-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }\n</style>');

// Fix the body padding in managers.html if needed (app-shell has min-height: 100vh instead of 100vh)
managersHtml = managersHtml.replace(/<div class="app-shell">/, '<div class="app-shell" style="min-height: 100vh;">');

fs.writeFileSync(managersPath, managersHtml, 'utf8');
console.log('managers.html fully restyled');
