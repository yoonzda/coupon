// =====================================================
// shared/js/mock-backend.js
// GitHub Pages 등 정적 호스팅 환경 전용 가상 백엔드 엔진
// (로컬 localhost 및 실제 백엔드 서버 환경에서는 개입하지 않음)
// =====================================================

import { INITIAL_MOCK_DB } from './mock-data.js';

const STORAGE_KEY = 'ongjin_mock_db_v1';

export function isStaticDemoEnv() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host.endsWith('github.io') ||
    host.endsWith('vercel.app') ||
    host.endsWith('netlify.app') ||
    host.endsWith('pages.dev') ||
    window.location.search.includes('demo=1')
  );
}

export function getBasePrefix() {
  if (typeof window === 'undefined') return '';
  const p = window.location.pathname;
  if (p.startsWith('/coupon/frontend/')) {
    return '/coupon/frontend';
  }
  if (p.startsWith('/frontend/')) {
    return '/frontend';
  }
  if (p === '/coupon' || p.startsWith('/coupon/')) {
    return '/coupon';
  }
  return '';
}

export function resolvePortalPath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return targetPath;
  const prefix = getBasePrefix();
  if (!prefix) return targetPath;
  if (targetPath.startsWith(prefix + '/')) return targetPath;
  if (/^\/(admin|issuer|merchant|tourist)(\/|$)/.test(targetPath)) {
    return prefix + targetPath;
  }
  return targetPath;
}

function getDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.issuers) && Array.isArray(parsed.coupons)) {
        return parsed;
      }
    }
  } catch (_) {}
  const cloned = JSON.parse(JSON.stringify(INITIAL_MOCK_DB));
  saveDb(cloned);
  return cloned;
}

function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (_) {}
}

function fmtPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw;
}

function randomHex(len = 16) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function encodeQrPayload(obj) {
  try {
    const json = JSON.stringify(obj);
    const b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `MOCKQR_${b64}`;
  } catch (_) {
    return `MOCKQR_1`;
  }
}

function decodeQrPayload(token) {
  if (!token || typeof token !== 'string') return null;
  if (!token.startsWith('MOCKQR_')) return null;
  try {
    let b64 = token.slice(7).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

function getRuleFaceValue(rules, price) {
  const p = Number(price || 0);
  if (!Array.isArray(rules) || rules.length === 0) return Math.min(10000, Math.max(2000, Math.floor(p * 0.5)));
  const sorted = [...rules].sort((a, b) => Number(a.id) - Number(b.id));
  for (const r of sorted) {
    const min = Number(r.min_amount ?? r.min_price ?? 0);
    const max = r.max_amount ?? r.max_price;
    if (p >= min && (max === null || max === undefined || p < Number(max))) {
      return Number(r.face_value);
    }
  }
  return Number(sorted[sorted.length - 1].face_value || 2000);
}

export async function handleMockApiRequest(method, rawPath, bodyObj = null) {
  const m = String(method || 'GET').toUpperCase();
  const fullPath = rawPath.startsWith('/api') ? rawPath.slice(4) : rawPath;
  const [pathname, queryString] = fullPath.split('?');
  const query = new URLSearchParams(queryString || '');
  const db = getDb();

  // ── 1. 관리자 인증 ──
  if (pathname === '/admin/auth/login' && m === 'POST') {
    const username = bodyObj?.username || 'admin';
    const found = db.managers.find(a => a.username === username) || db.managers[0] || {
      id: 1,
      username: 'admin',
      name: '누리아이',
      role: 'super'
    };
    return {
      status: 200,
      data: {
        success: true,
        token: `mock_admin_token_${found.id}`,
        admin: found
      }
    };
  }

  if (pathname === '/admin/auth/me' && m === 'GET') {
    const cached = (() => {
      try { return JSON.parse(localStorage.getItem('ongjin_admin_info')); } catch { return null; }
    })();
    const admin = cached && cached.username ? cached : (db.managers[0] || { id: 1, username: 'admin', name: '누리아이', role: 'super' });
    return { status: 200, data: { success: true, admin } };
  }

  // ── 2. 관리자 대시보드 & 예산 ──
  if (pathname === '/admin/stats/summary' && m === 'GET') {
    const totalBudgetSetting = db.settings.find(s => s.setting_key === 'total_budget');
    const totalBudget = totalBudgetSetting ? Number(totalBudgetSetting.setting_value) : 2000000;
    const executedBudget = db.coupons
      .filter(c => c.status === 'used')
      .reduce((sum, c) => sum + Number(c.face_value || 0), 0);
    const reservedBudget = db.coupons
      .filter(c => c.status !== 'used' && c.status !== 'expired')
      .reduce((sum, c) => sum + Number(c.face_value || 0), 0);
    const availableBudget = Math.max(0, totalBudget - (executedBudget + reservedBudget));
    const totalIssuedCoupons = db.coupons.length;
    const totalUsedCoupons = db.coupons.filter(c => c.status === 'used').length;

    return {
      status: 200,
      data: {
        success: true,
        totalBudget,
        executedBudget,
        reservedBudget,
        availableBudget,
        monthlyAmount: executedBudget,
        totalMerchants: db.merchants.filter(x => x.status === 'approved').length,
        pendingMerchants: db.merchants.filter(x => x.status === 'pending').length,
        totalUsers: db.users.length,
        fdsOpenCount: 0,
        totalIssuedCoupons,
        totalUsedCoupons
      }
    };
  }

  if (pathname === '/admin/budget' && m === 'GET') {
    const totalBudgetSetting = db.settings.find(s => s.setting_key === 'total_budget');
    const totalBudget = totalBudgetSetting ? Number(totalBudgetSetting.setting_value) : 2000000;
    const usedBudget = db.coupons
      .filter(c => c.status === 'used')
      .reduce((sum, c) => sum + Number(c.face_value || 0), 0);
    const reservedBudget = db.coupons
      .filter(c => c.status !== 'used' && c.status !== 'expired')
      .reduce((sum, c) => sum + Number(c.face_value || 0), 0);
    const remainingBudget = Math.max(0, totalBudget - (usedBudget + reservedBudget));

    return {
      status: 200,
      data: {
        success: true,
        data: { totalBudget, usedBudget, reservedBudget, remainingBudget }
      }
    };
  }

  if (pathname === '/admin/budget' && m === 'POST') {
    const newTotal = Number(bodyObj?.totalBudget || 0);
    const setting = db.settings.find(s => s.setting_key === 'total_budget');
    if (setting) setting.setting_value = String(newTotal);
    else db.settings.push({ setting_key: 'total_budget', setting_value: String(newTotal) });
    saveDb(db);
    return { status: 200, data: { success: true, message: '예산이 성공적으로 저장되었습니다.' } };
  }

  if (pathname === '/admin/issuance-rules' && m === 'GET') {
    return { status: 200, data: { success: true, data: db.rules } };
  }

  if (pathname === '/admin/issuance-rules' && m === 'PUT') {
    if (Array.isArray(bodyObj?.rules)) {
      db.rules = bodyObj.rules.map((r, i) => ({
        id: r.id || i + 1,
        step_no: i + 1,
        min_amount: Number(r.min_amount ?? r.minAmount ?? 0),
        max_amount: r.max_amount !== undefined ? r.max_amount : (r.maxAmount ?? null),
        face_value: Number(r.face_value ?? r.faceValue ?? 2000)
      }));
      saveDb(db);
    }
    return { status: 200, data: { success: true, message: '쿠폰 지급 규정이 수정되었습니다.' } };
  }

  // ── 3. 관리자 쿠폰 관리 ──
  if (pathname === '/admin/coupons/status-list' && m === 'GET') {
    return { status: 200, data: { success: true, data: db.coupons } };
  }

  const regPhoneMatch = pathname.match(/^\/admin\/coupons\/(\d+)\/register-phone$/);
  if (regPhoneMatch && m === 'POST') {
    const cid = Number(regPhoneMatch[1]);
    const coupon = db.coupons.find(c => Number(c.id) === cid);
    if (!coupon) return { status: 404, data: { success: false, message: '해당 쿠폰을 찾을 수 없습니다.' } };
    const formatted = fmtPhone(bodyObj?.phone || '');
    coupon.tourist_phone = formatted;
    let user = db.users.find(u => u.provider_id === formatted || u.nickname === formatted);
    if (!user) {
      user = {
        id: (db.users.reduce((mx, u) => Math.max(mx, Number(u.id || 0)), 0) || 0) + 1,
        social_provider: 'phone',
        provider_id: formatted,
        nickname: formatted,
        email: null,
        coupon_balance: Number(coupon.face_value || 0),
        role: 'tourist',
        created_at: new Date().toISOString()
      };
      db.users.push(user);
    } else {
      user.coupon_balance = Number(user.coupon_balance || 0) + Number(coupon.face_value || 0);
    }
    coupon.issued_to = user.id;
    saveDb(db);
    return { status: 200, data: { success: true, message: `${formatted} 번호로 쿠폰이 등록되었습니다.`, data: { phone: formatted } } };
  }

  const markUsedMatch = pathname.match(/^\/admin\/coupons\/(\d+)\/mark-used$/);
  if (markUsedMatch && m === 'POST') {
    const cid = Number(markUsedMatch[1]);
    const coupon = db.coupons.find(c => Number(c.id) === cid);
    if (!coupon) return { status: 404, data: { success: false, message: '해당 쿠폰을 찾을 수 없습니다.' } };
    coupon.status = 'used';
    coupon.used_at = new Date().toISOString();
    if (!coupon.used_merchant_name || coupon.used_merchant_name === '-') {
      coupon.used_merchant_name = '관리자 수동 처리';
    }
    saveDb(db);
    return { status: 200, data: { success: true, message: '쿠폰이 사용 완료 상태로 변경되었습니다.' } };
  }

  const cancelUseMatch = pathname.match(/^\/admin\/coupons\/(\d+)\/cancel-use$/);
  if (cancelUseMatch && m === 'POST') {
    const cid = Number(cancelUseMatch[1]);
    const coupon = db.coupons.find(c => Number(c.id) === cid);
    if (!coupon) return { status: 404, data: { success: false, message: '해당 쿠폰을 찾을 수 없습니다.' } };
    coupon.status = 'available';
    coupon.used_at = null;
    coupon.used_merchant_name = '-';
    coupon.used_merchant_phone = null;
    coupon.used_merchant_address = null;
    saveDb(db);
    return { status: 200, data: { success: true, message: '쿠폰 사용이 취소되어 다시 사용 가능한 상태로 복구되었습니다.' } };
  }

  const revokeMatch = pathname.match(/^\/admin\/coupons\/(\d+)\/revoke$/);
  if (revokeMatch && m === 'POST') {
    const cid = Number(revokeMatch[1]);
    const idx = db.coupons.findIndex(c => Number(c.id) === cid);
    if (idx === -1) return { status: 404, data: { success: false, message: '해당 쿠폰을 찾을 수 없습니다.' } };
    const [removed] = db.coupons.splice(idx, 1);
    saveDb(db);
    return {
      status: 200,
      data: {
        success: true,
        message: `쿠폰 발급이 취소되었으며 ${Number(removed.face_value || 0).toLocaleString()}원이 잔여 예산으로 환원되었습니다.`
      }
    };
  }

  // ── 4. 발행처 관리 (Admin) ──
  if (pathname === '/admin/issuers' && m === 'GET') {
    const issuers = db.issuers.map(iss => {
      const prods = db.issuerProducts
        .filter(p => Number(p.issuer_id) === Number(iss.id))
        .map(p => ({
          id: p.id,
          productName: p.product_name,
          price: Number(p.price),
          offSeasonPrice: p.off_season_price ? Number(p.off_season_price) : null
        }));
      const allocs = db.allocations
        .filter(a => Number(a.issuer_id) === Number(iss.id))
        .map(a => {
          const issuedCnt = db.coupons.filter(c => c.issuer_name === iss.name && Number(c.face_value) === Number(a.face_value)).length;
          return {
            id: a.id,
            faceValue: Number(a.face_value),
            totalCount: Number(a.total_count),
            issuedCount: issuedCnt,
            remainingCount: Math.max(0, Number(a.total_count) - issuedCnt)
          };
        });
      return {
        ...iss,
        products: prods,
        allocations: allocs
      };
    });
    return { status: 200, data: { success: true, data: { issuers } } };
  }

  if (pathname === '/admin/issuers' && m === 'POST') {
    const newId = (db.issuers.reduce((mx, i) => Math.max(mx, Number(i.id || 0)), 0) || 0) + 1;
    const prods = Array.isArray(bodyObj?.products) ? bodyObj.products : [];
    const firstProd = prods[0] || {};
    const newIssuer = {
      id: newId,
      name: bodyObj?.name || '신규 발행처',
      username: bodyObj?.username || bodyObj?.name || `issuer${newId}`,
      phone: bodyObj?.phone || '',
      address: bodyObj?.address || '',
      product_name: firstProd.productName || '',
      product_price: Number(firstProd.price || 0)
    };
    db.issuers.push(newIssuer);
    prods.forEach((p, idx) => {
      db.issuerProducts.push({
        id: Date.now() + idx,
        issuer_id: newId,
        product_name: p.productName,
        price: Number(p.price || 0),
        off_season_price: p.offSeasonPrice ? Number(p.offSeasonPrice) : null,
        display_order: idx + 1
      });
    });
    saveDb(db);
    return { status: 200, data: { success: true, message: '발행처가 등록되었습니다.' } };
  }

  const issuerIdMatch = pathname.match(/^\/admin\/issuers\/(\d+)$/);
  if (issuerIdMatch && m === 'PUT') {
    const iid = Number(issuerIdMatch[1]);
    const iss = db.issuers.find(i => Number(i.id) === iid);
    if (iss) {
      if (bodyObj?.name) iss.name = bodyObj.name;
      if (bodyObj?.username) iss.username = bodyObj.username;
      if (bodyObj?.phone !== undefined) iss.phone = bodyObj.phone;
      if (bodyObj?.address !== undefined) iss.address = bodyObj.address;
      if (Array.isArray(bodyObj?.products)) {
        db.issuerProducts = db.issuerProducts.filter(p => Number(p.issuer_id) !== iid);
        bodyObj.products.forEach((p, idx) => {
          db.issuerProducts.push({
            id: Date.now() + idx,
            issuer_id: iid,
            product_name: p.productName,
            price: Number(p.price || 0),
            off_season_price: p.offSeasonPrice ? Number(p.offSeasonPrice) : null,
            display_order: idx + 1
          });
        });
      }
      saveDb(db);
    }
    return { status: 200, data: { success: true, message: '발행처 정보가 수정되었습니다.' } };
  }

  if (issuerIdMatch && m === 'DELETE') {
    const iid = Number(issuerIdMatch[1]);
    db.issuers = db.issuers.filter(i => Number(i.id) !== iid);
    db.issuerProducts = db.issuerProducts.filter(p => Number(p.issuer_id) !== iid);
    saveDb(db);
    return { status: 200, data: { success: true, message: '발행처가 삭제되었습니다.' } };
  }

  // ── 5. 가맹점 관리 (Admin & Public Map) ──
  if (pathname === '/admin/merchants' && m === 'GET') {
    const status = query.get('status') || 'approved';
    const filtered = db.merchants.filter(x => x.status === status);
    return { status: 200, data: { success: true, data: filtered } };
  }

  const merchantDetailMatch = pathname.match(/^\/admin\/merchants\/(\d+)$/);
  if (merchantDetailMatch && m === 'GET') {
    const mid = Number(merchantDetailMatch[1]);
    const found = db.merchants.find(x => Number(x.id) === mid);
    if (!found) return { status: 404, data: { success: false, message: '가맹점을 찾을 수 없습니다.' } };
    return { status: 200, data: { success: true, data: found } };
  }

  if (merchantDetailMatch && m === 'DELETE') {
    const mid = Number(merchantDetailMatch[1]);
    db.merchants = db.merchants.filter(x => Number(x.id) !== mid);
    saveDb(db);
    return { status: 200, data: { success: true, message: '가맹점이 삭제되었습니다.' } };
  }

  const merchantStatusMatch = pathname.match(/^\/admin\/merchants\/(\d+)\/status$/);
  if (merchantStatusMatch && m === 'PATCH') {
    const mid = Number(merchantStatusMatch[1]);
    const found = db.merchants.find(x => Number(x.id) === mid);
    if (found && bodyObj?.status) {
      found.status = bodyObj.status;
      if (bodyObj.reason) found.rejection_reason = bodyObj.reason;
      saveDb(db);
    }
    return { status: 200, data: { success: true, message: '상태가 변경되었습니다.' } };
  }

  if (pathname === '/merchant/map' && m === 'GET') {
    const approved = db.merchants.filter(x => x.status === 'approved');
    return { status: 200, data: { success: true, data: approved } };
  }

  if (pathname === '/auth/merchants/public-list' && m === 'GET') {
    const approved = db.merchants.filter(x => x.status === 'approved');
    return { status: 200, data: { success: true, data: approved } };
  }

  // ── 6. 정산 / 통계 / FDS / 회원 / 관리자 계정 ──
  if (pathname === '/admin/settlements/periods' && m === 'GET') {
    return { status: 200, data: { success: true, data: ['2026-11', '2026-10'] } };
  }

  if (pathname === '/admin/settlements' && m === 'GET') {
    return { status: 200, data: { success: true, data: db.settlements || [] } };
  }

  if (pathname === '/admin/stats/reports' && m === 'GET') {
    const totalIssued = db.coupons.length;
    const totalUsed = db.coupons.filter(c => c.status === 'used').length;
    const totalSettled = db.coupons.filter(c => c.status === 'used').reduce((s, c) => s + Number(c.face_value || 0), 0);
    const activeMerchants = db.merchants.filter(x => x.status === 'approved').length;
    return {
      status: 200,
      data: {
        success: true,
        data: {
          kpis: { totalIssued, totalUsed, totalSettled, activeMerchants },
          monthlyTrend: [
            { month: '2026-09', issued_count: 8, used_count: 3 },
            { month: '2026-10', issued_count: 12, used_count: 5 },
            { month: '2026-11', issued_count: totalIssued, used_count: totalUsed }
          ],
          regionDistribution: [
            { name: '자월면', value: 6 },
            { name: '덕적면', value: 5 },
            { name: '영흥면', value: 4 }
          ],
          topMerchants: db.merchants.slice(0, 5).map(mItem => ({
            name: mItem.name,
            address: mItem.address,
            tx_count: 2,
            total_amount: 10000
          }))
        }
      }
    };
  }

  if (pathname === '/admin/fds' && m === 'GET') {
    return { status: 200, data: { success: true, data: [] } };
  }

  if (pathname === '/admin/users' && m === 'GET') {
    const list = db.users.map(u => {
      const userCoupons = db.coupons.filter(c => Number(c.issued_to) === Number(u.id));
      return {
        ...u,
        phone: u.provider_id || u.nickname,
        total_coupons: userCoupons.length,
        used_coupons: userCoupons.filter(c => c.status === 'used').length
      };
    });
    return { status: 200, data: { success: true, data: list } };
  }

  const userDetailMatch = pathname.match(/^\/admin\/users\/(\d+)$/);
  if (userDetailMatch && m === 'GET') {
    const uid = Number(userDetailMatch[1]);
    const user = db.users.find(u => Number(u.id) === uid);
    if (!user) return { status: 404, data: { success: false, message: '회원을 찾을 수 없습니다.' } };
    const coupons = db.coupons.filter(c => Number(c.issued_to) === uid);
    return { status: 200, data: { success: true, data: { user: { ...user, phone: user.provider_id || user.nickname }, coupons } } };
  }

  if (pathname === '/admin/managers' && m === 'GET') {
    return { status: 200, data: { success: true, data: db.managers } };
  }

  // ── 7. 발행처 포털 (Issuer Portal) ──
  if ((pathname === '/auth/issuer/public-list' || pathname === '/auth/issuer/list') && m === 'GET') {
    return { status: 200, data: { success: true, data: db.issuers } };
  }

  if (pathname === '/auth/issuer/me' && m === 'GET') {
    const issuerInfo = (() => {
      try { return JSON.parse(localStorage.getItem('ongjin_issuer_info')); } catch { return null; }
    })() || db.issuers[0];
    return { status: 200, data: { success: true, issuer: issuerInfo } };
  }

  if (pathname === '/auth/issuer/login' && m === 'POST') {
    const ident = String(bodyObj?.username || bodyObj?.name || '').trim();
    const found = db.issuers.find(i => i.username === ident || i.name === ident || String(i.id) === ident) || db.issuers[0];
    return {
      status: 200,
      data: {
        success: true,
        token: `mock_issuer_token_${found.id}`,
        issuer: found
      }
    };
  }

  if (pathname === '/auth/issuer/inventory' && m === 'GET') {
    const issuerInfo = (() => {
      try { return JSON.parse(localStorage.getItem('ongjin_issuer_info')); } catch { return null; }
    })() || db.issuers[0];
    const prods = db.issuerProducts
      .filter(p => Number(p.issuer_id) === Number(issuerInfo.id))
      .map(p => ({
        ...p,
        coupon_face_value: getRuleFaceValue(db.rules, p.price),
        allocation_id: 1
      }));
    return {
      status: 200,
      data: {
        success: true,
        products: prods,
        rules: db.rules,
        allocations: db.allocations.filter(a => Number(a.issuer_id) === Number(issuerInfo.id))
      }
    };
  }

  if (pathname === '/auth/issuer/allocations' && m === 'GET') {
    const issuerInfo = (() => {
      try { return JSON.parse(localStorage.getItem('ongjin_issuer_info')); } catch { return null; }
    })() || db.issuers[0];
    const myCoupons = db.coupons.filter(c => c.issuer_name === issuerInfo.name);
    const totalIssuedCount = myCoupons.length;
    const totalIssuedAmount = myCoupons.reduce((s, c) => s + Number(c.face_value || 0), 0);
    return {
      status: 200,
      data: {
        success: true,
        data: db.allocations.filter(a => Number(a.issuer_id) === Number(issuerInfo.id)),
        summary: {
          todayCount: totalIssuedCount,
          totalIssuedCount,
          totalIssuedAmount
        }
      }
    };
  }

  if (pathname === '/auth/issuer/history' && m === 'GET') {
    const issuerInfo = (() => {
      try { return JSON.parse(localStorage.getItem('ongjin_issuer_info')); } catch { return null; }
    })() || db.issuers[0];
    const myCoupons = db.coupons
      .filter(c => c.issuer_name === issuerInfo.name)
      .map(c => ({
        id: c.id,
        face_value: c.face_value,
        status: c.status,
        issued_at: c.issued_at,
        used_at: c.used_at,
        tourist_phone: c.tourist_phone && c.tourist_phone !== '- (미등록 대기)' ? c.tourist_phone : null,
        used_merchant_name: c.used_merchant_name && c.used_merchant_name !== '-' ? c.used_merchant_name : null
      }));
    return { status: 200, data: { success: true, data: myCoupons } };
  }

  if (pathname === '/auth/issuer/issue' && m === 'POST') {
    const issuerInfo = (() => {
      try { return JSON.parse(localStorage.getItem('ongjin_issuer_info')); } catch { return null; }
    })() || db.issuers[0];
    const items = Array.isArray(bodyObj?.items) ? bodyObj.items : [];
    const distType = bodyObj?.distributionType || 'bundle';
    const deliveryMethod = bodyObj?.deliveryMethod || 'qr';
    const phones = Array.isArray(bodyObj?.phones) ? bodyObj.phones : [];
    const basePrefix = getBasePrefix();

    const bundleSessionId = `ks_${Date.now()}_${randomHex(4)}`;
    const createdCoupons = [];
    let totalAmount = 0;
    let totalProductPrice = 0;

    let phoneIdx = 0;
    for (const it of items) {
      const cnt = Number(it.count || 1);
      const fv = Number(it.faceValue || 2000);
      const pp = Number(it.productPrice || fv * 2);
      for (let i = 0; i < cnt; i++) {
        const sid = distType === 'individual' ? `ks_${Date.now()}_${randomHex(4)}_${i}` : bundleSessionId;
        const newId = (db.coupons.reduce((mx, c) => Math.max(mx, Number(c.id || 0)), 0) || 0) + 1;
        const hash = randomHex(16);
        const serialCode = `${hash.slice(0, 4).toUpperCase()}-${hash.slice(4, 8).toUpperCase()}`;
        const assignedPhone = (deliveryMethod === 'kakao' || deliveryMethod === 'sms')
          ? fmtPhone(distType === 'individual' ? (phones[phoneIdx] || phones[0]) : phones[0])
          : null;
        phoneIdx++;

        const tokenStr = encodeQrPayload({
          in: issuerInfo.name,
          fv,
          cnt: 1,
          sid
        });

        const newCoupon = {
          id: newId,
          code_hash: hash,
          coupon_type: deliveryMethod === 'paper' ? 'paper' : 'digital',
          face_value: fv,
          status: 'available',
          issued_to: assignedPhone ? 999 : null,
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
          used_at: null,
          kiosk_session_id: sid,
          tourist_phone: assignedPhone || '- (미등록 대기)',
          issuer_name: issuerInfo.name,
          issuer_phone: issuerInfo.phone,
          issuer_address: issuerInfo.address,
          used_merchant_name: '-'
        };
        db.coupons.unshift(newCoupon);

        createdCoupons.push({
          couponId: newId,
          faceValue: fv,
          serialCode,
          kioskSessionId: sid,
          qrUrl: `${basePrefix}/tourist/landing.html?token=${encodeURIComponent(tokenStr)}&kioskSessionId=${encodeURIComponent(sid)}`
        });

        totalAmount += fv;
        totalProductPrice += pp;
      }
    }

    saveDb(db);

    const bundleToken = encodeQrPayload({
      in: issuerInfo.name,
      fv: totalAmount,
      cnt: createdCoupons.length,
      items: createdCoupons.map(c => c.faceValue),
      sid: bundleSessionId
    });

    return {
      status: 200,
      data: {
        success: true,
        message: '쿠폰이 정상 발행되었습니다.',
        data: {
          allocationId: 1,
          token: bundleToken,
          kioskSessionId: bundleSessionId,
          distributionType: distType,
          deliveryMethod,
          count: createdCoupons.length,
          totalAmount,
          totalProductPrice,
          qrUrl: `${basePrefix}/tourist/landing.html?token=${encodeURIComponent(bundleToken)}&kioskSessionId=${encodeURIComponent(bundleSessionId)}`,
          coupons: createdCoupons
        }
      }
    };
  }

  // ── 8. 관광객 포털 (Tourist OTP, QR 수령, 내 쿠폰함) ──
  if (pathname === '/auth/tourist/otp/send' && m === 'POST') {
    return {
      status: 200,
      data: {
        success: true,
        message: '인증번호가 발송되었습니다.',
        devOtp: '123456'
      }
    };
  }

  if (pathname === '/auth/tourist/otp/verify' && m === 'POST') {
    const formattedPhone = fmtPhone(bodyObj?.phone || '010-1234-5678');
    let user = db.users.find(u => u.provider_id === formattedPhone || u.nickname === formattedPhone);
    if (!user) {
      user = {
        id: (db.users.reduce((mx, u) => Math.max(mx, Number(u.id || 0)), 0) || 0) + 1,
        social_provider: 'phone',
        provider_id: formattedPhone,
        nickname: formattedPhone,
        email: null,
        coupon_balance: 0,
        role: 'tourist',
        created_at: new Date().toISOString()
      };
      db.users.push(user);
      saveDb(db);
    }
    localStorage.setItem('ongjin_mock_current_user_id', String(user.id));
    localStorage.setItem('ongjin_user_phone', formattedPhone);
    return {
      status: 200,
      data: {
        success: true,
        token: `mock_tourist_token_${user.id}`,
        refresh: `mock_tourist_refresh_${user.id}`,
        user
      }
    };
  }

  if (pathname === '/auth/me' && m === 'GET') {
    const uid = Number(localStorage.getItem('ongjin_mock_current_user_id') || 1);
    const user = db.users.find(u => Number(u.id) === uid) || db.users[0] || {
      id: 1,
      nickname: localStorage.getItem('ongjin_user_phone') || '010-1234-5678',
      provider_id: localStorage.getItem('ongjin_user_phone') || '010-1234-5678',
      role: 'tourist'
    };
    const myAvail = db.coupons.filter(c => Number(c.issued_to) === Number(user.id) && c.status === 'available');
    const balance = myAvail.reduce((s, c) => s + Number(c.face_value || 0), 0);
    return {
      status: 200,
      data: {
        success: true,
        user: {
          ...user,
          phone: user.provider_id || user.nickname,
          coupon_balance: balance
        }
      }
    };
  }

  if (pathname === '/coupon/issue-by-qr' && m === 'POST') {
    const uid = Number(localStorage.getItem('ongjin_mock_current_user_id') || 1);
    const userPhone = localStorage.getItem('ongjin_user_phone') || '010-1234-5678';
    const token = bodyObj?.token || bodyObj?.allocationId;
    const kioskSessionId = bodyObj?.kioskSessionId;

    // 1) 같은 브라우저에서 발급된 세션 쿠폰이 있으면 귀속
    const sessionMatches = kioskSessionId
      ? db.coupons.filter(c => c.kiosk_session_id === kioskSessionId && c.status === 'available' && !c.issued_to)
      : [];

    if (sessionMatches.length > 0) {
      let sum = 0;
      sessionMatches.forEach(c => {
        c.issued_to = uid;
        c.tourist_phone = userPhone;
        sum += Number(c.face_value || 0);
      });
      saveDb(db);
      return {
        status: 200,
        data: {
          success: true,
          message: `${sum.toLocaleString()}원 쿠폰(${sessionMatches.length}장)이 지갑으로 성공적으로 발급되었습니다.`,
          count: sessionMatches.length,
          totalAmount: sum
        }
      };
    }

    // 2) 다른 기기(스마트폰)에서 QR 스캔해 진입한 경우: 토큰 내 메타데이터를 해석해 지갑에 즉시 생성
    const decoded = decodeQrPayload(token);
    const issuerName = decoded?.in || '자월달빛천문대';
    const faceValues = Array.isArray(decoded?.items) && decoded.items.length > 0
      ? decoded.items
      : [Number(decoded?.fv || 5000)];

    let sum = 0;
    faceValues.forEach((fv, idx) => {
      const newId = (db.coupons.reduce((mx, c) => Math.max(mx, Number(c.id || 0)), 0) || 0) + 1 + idx;
      db.coupons.unshift({
        id: newId,
        code_hash: randomHex(16),
        coupon_type: 'digital',
        face_value: Number(fv),
        status: 'available',
        issued_to: uid,
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        used_at: null,
        kiosk_session_id: kioskSessionId || decoded?.sid || `ks_${Date.now()}`,
        tourist_phone: userPhone,
        issuer_name: issuerName,
        issuer_phone: '032-899-3300',
        issuer_address: '인천광역시 옹진군',
        used_merchant_name: '-'
      });
      sum += Number(fv);
    });
    saveDb(db);

    return {
      status: 200,
      data: {
        success: true,
        message: `${sum.toLocaleString()}원 쿠폰(${faceValues.length}장)이 지갑으로 성공적으로 발급되었습니다.`,
        count: faceValues.length,
        totalAmount: sum
      }
    };
  }

  if (pathname === '/coupon/kiosk-poll' && m === 'GET') {
    const sid = query.get('kioskSessionId');
    const sidsRaw = query.get('kioskSessionIds');
    if (sidsRaw) {
      const sids = sidsRaw.split(',').map(s => s.trim()).filter(Boolean);
      const sessions = {};
      let registeredCount = 0;
      for (const s of sids) {
        const matched = db.coupons.filter(c => c.kiosk_session_id === s);
        const reg = matched.find(c => c.issued_to !== null || c.status === 'used');
        sessions[s] = {
          isIssued: !!reg,
          isRegistered: !!reg,
          phone: reg ? reg.tourist_phone : null
        };
        if (reg) registeredCount++;
      }
      return {
        status: 200,
        data: {
          success: true,
          sessions,
          registeredCount,
          totalCount: sids.length,
          allRegistered: registeredCount === sids.length && sids.length > 0
        }
      };
    }

    const matched = db.coupons.filter(c => c.kiosk_session_id === sid);
    const reg = matched.find(c => c.issued_to !== null || c.status === 'used');
    return {
      status: 200,
      data: {
        success: true,
        isIssued: !!reg,
        isRegistered: !!reg,
        registeredCount: reg ? matched.length : 0,
        totalCount: matched.length,
        phone: reg ? reg.tourist_phone : null
      }
    };
  }

  if ((pathname === '/coupon/my' || pathname === '/coupon/my-coupons') && m === 'GET') {
    const uid = Number(localStorage.getItem('ongjin_mock_current_user_id') || 1);
    const userPhone = localStorage.getItem('ongjin_user_phone');
    const myCoupons = db.coupons.filter(
      c => c.status === 'available' && (Number(c.issued_to) === uid || (userPhone && c.tourist_phone === userPhone))
    );
    return { status: 200, data: { success: true, data: myCoupons } };
  }

  const useQrMatch = pathname.match(/^\/coupon\/(\d+)\/use-qr$/);
  if (useQrMatch && m === 'POST') {
    const cid = Number(useQrMatch[1]);
    return {
      status: 200,
      data: {
        success: true,
        qrToken: `ONGJIN_PAY_${cid}_${Date.now()}`
      }
    };
  }

  const couponStatusMatch = pathname.match(/^\/coupon\/(\d+)\/status$/);
  if (couponStatusMatch && m === 'GET') {
    const cid = Number(couponStatusMatch[1]);
    const coupon = db.coupons.find(c => Number(c.id) === cid);
    return {
      status: 200,
      data: {
        success: true,
        status: coupon ? coupon.status : 'available'
      }
    };
  }

  if (pathname === '/coupon/use-request' && m === 'POST') {
    const mid = Number(bodyObj?.merchantId);
    const couponIds = Array.isArray(bodyObj?.couponIds) ? bodyObj.couponIds.map(Number) : [];
    const merchant = db.merchants.find(x => Number(x.id) === mid) || db.merchants[0];
    const selected = db.coupons.filter(c => couponIds.includes(Number(c.id)));
    const totalAmount = selected.reduce((s, c) => s + Number(c.face_value || 0), 0);
    const reqId = Date.now();
    if (!Array.isArray(db.useRequests)) db.useRequests = [];
    db.useRequests.push({
      id: reqId,
      merchant_id: merchant.id,
      merchant_name: merchant.name,
      coupon_ids: couponIds,
      coupon_count: selected.length || 1,
      total_amount: totalAmount || 5000,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    saveDb(db);
    return {
      status: 200,
      data: {
        success: true,
        data: {
          requestId: reqId,
          merchantName: merchant.name,
          couponCount: selected.length || 1,
          totalAmount: totalAmount || 5000
        }
      }
    };
  }

  const useReqDetailMatch = pathname.match(/^\/coupon\/use-request\/(\d+)$/);
  if (useReqDetailMatch && m === 'GET') {
    const rid = Number(useReqDetailMatch[1]);
    const reqItem = (db.useRequests || []).find(r => Number(r.id) === rid);
    return {
      status: 200,
      data: {
        success: true,
        data: reqItem || { id: rid, status: 'pending', total_amount: 5000, coupon_count: 1, merchant_name: '옹진 가맹점' }
      }
    };
  }

  const useReqCancelMatch = pathname.match(/^\/coupon\/use-request\/(\d+)\/cancel$/);
  if (useReqCancelMatch && m === 'POST') {
    const rid = Number(useReqCancelMatch[1]);
    const reqItem = (db.useRequests || []).find(r => Number(r.id) === rid);
    if (reqItem) {
      reqItem.status = 'cancelled';
      saveDb(db);
    }
    return { status: 200, data: { success: true } };
  }

  // ── 9. 가맹점 포털 (Merchant Login & Info) ──
  if (pathname === '/auth/merchant/login' && m === 'POST') {
    const ident = String(bodyObj?.username || '').trim();
    const found = db.merchants.find(x => x.username === ident || x.name === ident || String(x.id) === ident) || db.merchants[0];
    return {
      status: 200,
      data: {
        success: true,
        token: `mock_merchant_token_${found.id}`,
        refresh: `mock_merchant_refresh_${found.id}`,
        merchant: found
      }
    };
  }

  if (pathname === '/merchant/my-info' && m === 'GET') {
    return { status: 200, data: { success: true, data: db.merchants[0] } };
  }

  if (pathname === '/merchant/use-requests' && m === 'GET') {
    return { status: 200, data: { success: true, data: [] } };
  }

  // 기본 성공 폴백
  return { status: 200, data: { success: true, data: [] } };
}

// 정적 호스팅 환경(GitHub Pages 등)일 때 전역 fetch 및 링크 자동 보정 설치
if (typeof window !== 'undefined' && isStaticDemoEnv()) {
  const isLoginPage = window.location.pathname.includes('/login');
  // 1) 관리자/발행처 기본 데모 토큰 자동 세팅 (로그인 없이 바로 내부 페이지 접근 시에도 막히지 않도록 지원)
  if (!isLoginPage && !localStorage.getItem('ongjin_admin_token')) {
    localStorage.setItem('ongjin_admin_token', 'mock_admin_token_1');
    localStorage.setItem('ongjin_admin_info', JSON.stringify({ id: 1, username: 'admin', name: '누리아이', role: 'super' }));
  }
  if (!isLoginPage && !localStorage.getItem('ongjin_issuer_token')) {
    const db = getDb();
    const firstIssuer = db.issuers[0] || { id: 1, name: '자월달빛천문대', username: '자월달빛천문대' };
    localStorage.setItem('ongjin_issuer_token', 'mock_issuer_token_1');
    localStorage.setItem('ongjin_issuer_info', JSON.stringify(firstIssuer));
  }

  // 2) 전역 fetch 인터셉터 (/api/... 요청을 가상 백엔드로 처리)
  const origFetch = window.fetch.bind(window);
  window.fetch = async function(input, init = {}) {
    const urlStr = typeof input === 'string' ? input : (input?.url || '');
    const apiIdx = urlStr.indexOf('/api/');
    if (apiIdx !== -1 && (urlStr.startsWith('/api/') || urlStr.startsWith(window.location.origin))) {
      const apiPath = urlStr.slice(apiIdx);
      const method = init?.method || (typeof input !== 'string' && input?.method) || 'GET';
      let bodyObj = null;
      if (init?.body && typeof init.body === 'string') {
        try { bodyObj = JSON.parse(init.body); } catch (_) {}
      }
      const mockRes = await handleMockApiRequest(method, apiPath, bodyObj);
      return new Response(JSON.stringify(mockRes.data), {
        status: mockRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return origFetch(input, init);
  };

  // 3) GitHub Pages 서브경로(/coupon/) 링크 클릭 자동 보정
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const rawHref = a.getAttribute('href');
    if (rawHref && /^\/(admin|issuer|merchant|tourist)(\/|$)/.test(rawHref)) {
      const resolved = resolvePortalPath(rawHref);
      if (resolved !== rawHref) {
        a.setAttribute('href', resolved);
      }
    }
  }, true);
}
