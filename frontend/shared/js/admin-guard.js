// =====================================================
// shared/js/admin-guard.js — 관리자 페이지 인증 가드
// 모든 admin 페이지 상단에서 import 하여 사용
// =====================================================

const ADMIN_TOKEN_KEY = 'ongjin_admin_token';
const ADMIN_INFO_KEY = 'ongjin_admin_info';
const LOGIN_PAGE = '/admin/login.html';

/**
 * 관리자 토큰 반환
 */
export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

/**
 * 관리자 정보 반환
 */
export function getAdminInfo() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_INFO_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * 관리자 로그아웃
 */
export function adminLogout() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_INFO_KEY);
  localStorage.removeItem('ongjin_token'); // api.js 호환 토큰도 제거
  window.location.replace(LOGIN_PAGE);
}

/**
 * 관리자 인증 체크 및 헤더 렌더링
 * - 토큰 없으면 login.html로 리다이렉트
 * - 서버 검증 후 유효하지 않으면 login.html로 리다이렉트
 * - 유효하면 헤더에 관리자 정보 + 로그아웃 버튼 표시
 */
export async function requireAdminAuth() {
  const token = getAdminToken();

  if (!token) {
    window.location.replace(LOGIN_PAGE);
    return false;
  }

  try {
    const res = await fetch('/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // 토큰 만료 또는 무효
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_INFO_KEY);
      window.location.replace(LOGIN_PAGE);
      return false;
    }

    const { admin } = await res.json();

    // api.js도 같은 토큰 사용하도록 동기화
    localStorage.setItem('ongjin_token', token);
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin));

    // 사이드바 하단에 관리자 정보 + 로그아웃 버튼 렌더링
    renderAdminFooter(admin);
    return true;
  } catch {
    // 네트워크 오류 시 토큰만 있으면 일단 통과 (오프라인 대비)
    const info = getAdminInfo();
    renderAdminFooter(info);
    return true;
  }
}

/**
 * 사이드바 하단 관리자 정보 렌더링
 */
function renderAdminFooter(admin) {
  // 기존 footer가 있으면 교체
  const existing = document.getElementById('admin-sidebar-footer');
  if (existing) existing.remove();

  const sidebar = document.querySelector('.admin-sidebar');
  if (!sidebar) return;

  const roleLabel = admin.role === 'super' ? '최고 관리자' : '운영자';
  const footer = document.createElement('div');
  footer.id = 'admin-sidebar-footer';
  footer.innerHTML = `
    <div style="
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,0.08);
      margin-top: auto;
    ">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <div style="
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        ">👤</div>
        <div style="min-width: 0;">
          <div style="color: #fff; font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${admin.name || admin.username || '관리자'}
          </div>
          <div style="color: #64748b; font-size: 0.72rem;">${roleLabel}</div>
        </div>
      </div>
      <button
        id="btn-admin-logout"
        style="
          width: 100%; padding: 9px;
          background: rgba(239,68,68,0.12);
          color: #f87171;
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
          font-family: inherit;
        "
        onmouseover="this.style.background='rgba(239,68,68,0.25)'"
        onmouseout="this.style.background='rgba(239,68,68,0.12)'"
      >
        🚪 로그아웃
      </button>
    </div>
  `;
  sidebar.appendChild(footer);

  document.getElementById('btn-admin-logout').addEventListener('click', () => {
    if (confirm('로그아웃 하시겠습니까?')) adminLogout();
  });
}
