// =====================================================
// shared/js/admin-guard.js — 관리자 페이지 인증 가드
// 모든 admin 페이지 상단에서 import 하여 사용
// =====================================================

import { resolvePortalPath } from './mock-backend.js';

const ADMIN_TOKEN_KEY = 'ongjin_admin_token';
const ADMIN_INFO_KEY = 'ongjin_admin_info';
const LOGIN_PAGE = '/admin/login.html';

// -----------------------------------------------------
// [동기 초기화] 화면 깜빡임(늘어났다 줄어드는 현상) 방지
// -----------------------------------------------------
(function initSidebarStateEarly() {
  const isCollapsed = localStorage.getItem('ongjin_sidebar_collapsed') === 'true';
  if (isCollapsed) {
    document.documentElement.classList.add('sidebar-collapsed');
  } else {
    document.documentElement.classList.remove('sidebar-collapsed');
  }
})();

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
  sessionStorage.removeItem('ongjin_sidebar_cache');
  sessionStorage.removeItem('ongjin_sidebar_admin_key');
  sessionStorage.removeItem('ongjin_prev_nav_top');
  sessionStorage.removeItem('ongjin_prev_nav_height');
  sessionStorage.removeItem('ongjin_last_nav_top');
  sessionStorage.removeItem('ongjin_last_nav_height');
  window.location.replace(resolvePortalPath(LOGIN_PAGE));
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
    window.location.replace(resolvePortalPath(LOGIN_PAGE));
    return false;
  }

  // 1. [동기식 렌더링] 로컬 스토리지 캐시 정보를 사용하여 즉시 렌더링 (사이드바 비어있어 발생하는 깜빡임 방지)
  const cachedAdmin = getAdminInfo();
  renderAdminSidebar(cachedAdmin);
  initSidebarToggle();

  try {
    // 2. 백그라운드에서 토큰 검증 수행
    const res = await fetch('/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // 토큰 만료 또는 무효
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_INFO_KEY);
      window.location.replace(resolvePortalPath(LOGIN_PAGE));
      return false;
    }

    const { admin } = await res.json();

    // 일반 운영자는 관리자 계정 관리 페이지 접근 차단
    if (admin.role !== 'super' && window.location.pathname.endsWith('/admin/managers.html')) {
      alert('접근 권한이 없습니다.');
      window.location.replace(resolvePortalPath('/admin/index.html'));
      return false;
    }

    // api.js도 같은 토큰 사용하도록 동기화
    localStorage.setItem('ongjin_token', token);
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin));

    // 표시되는 핵심 관리자 정보(username, name, role)가 다를 때만 재렌더링 수행 (불필요한 DOM 재생성 및 깜빡임 방지)
    const prevKey = `${cachedAdmin.username || ''}:${cachedAdmin.role || ''}:${cachedAdmin.name || ''}`;
    const newKey = `${admin.username || ''}:${admin.role || ''}:${admin.name || ''}`;
    if (prevKey !== newKey) {
      const sb = document.querySelector('.admin-sidebar');
      if (sb) delete sb.dataset.prehydrated;
      renderAdminSidebar(admin);
      initSidebarToggle();
    }
    return true;
  } catch {
    // 네트워크 오류 시 오프라인 통과
    return true;
  }
}

/**
 * 사이드바 스냅샷을 세션 스토리지에 저장 (페이지 이동 시 첫 페인트 깜빡임 완벽 제거용)
 */
function saveSidebarCache(sidebar, adminKey, indicatorTop, indicatorHeight, activeHref) {
  try {
    const clone = sidebar.cloneNode(true);
    clone.classList.remove('ready');
    clone.querySelectorAll('[data-bound-click], [data-bound-toggle]').forEach(el => {
      el.removeAttribute('data-bound-click');
      el.removeAttribute('data-bound-toggle');
    });
    if (activeHref) {
      clone.querySelectorAll('.admin-nav a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === activeHref);
      });
    }
    const ind = clone.querySelector('.admin-nav-indicator');
    if (ind && indicatorTop !== undefined && indicatorHeight !== undefined) {
      ind.classList.remove('animating');
      ind.style.transform = `translate3d(0, ${indicatorTop}px, 0)`;
      ind.style.height = `${indicatorHeight}px`;
      ind.style.opacity = '1';
    }
    sessionStorage.setItem('ongjin_sidebar_cache', clone.innerHTML);
    sessionStorage.setItem('ongjin_sidebar_admin_key', adminKey);
  } catch {
    // ignore storage errors
  }
}

/**
 * 사이드바 렌더링 및 하단 관리자 정보 삽입
 */
function renderAdminSidebar(admin) {
  const sidebar = document.querySelector('.admin-sidebar');
  if (!sidebar) return;

  let currentPath = window.location.pathname.replace(/^(\/coupon)?(\/frontend)?(?=\/)/, '');

  // 동적 서브페이지 자동 부모 매핑 규칙 (예: register-xxx, detail-xxx, edit-xxx, allocate-xxx)
  // 예: /admin/detail-merchant.html -> /admin/merchants.html
  const subpageMatch = currentPath.match(/\/admin\/(register|detail|edit|allocate)-([a-zA-Z0-9_-]+)\.html/);
  if (subpageMatch) {
    const model = subpageMatch[2];
    let parentPage = model;

    if (model === 'settlement') {
      parentPage = 'settlement'; // 정산은 단수형 파일명 유지
    } else if (model === 'budget' || model === 'rules') {
      parentPage = 'budget';     // 예산도 단수형 파일명 유지
    } else if (model === 'coupon') {
      parentPage = 'issuers';    // 쿠폰 배정(allocate-coupon.html)은 발행처 관리(issuers.html) 하위
    } else if (model.endsWith('s')) {
      parentPage = model;        // 이미 s로 끝나는 명칭 유지
    } else {
      parentPage = model + 's';  // user -> users, merchant -> merchants, coupon -> coupons, manager -> managers 등 복수화
    }
    currentPath = `/admin/${parentPage}.html`;
  }

  const adminKey = `${admin?.username || 'admin'}:${admin?.role || ''}:${admin?.name || ''}`;
  const isPrehydrated =
    sidebar.dataset.prehydrated === 'true' &&
    sessionStorage.getItem('ongjin_sidebar_admin_key') === adminKey &&
    !!sidebar.querySelector('.admin-nav') &&
    !!sidebar.querySelector('.admin-nav-indicator');

  if (!isPrehydrated) {
    // 메뉴별 SVG 아이콘 정의
    const ICONS = {
      dashboard: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>`,
      budget: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
      coupon: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>`,
      issuer: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>`,
      merchant: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.5a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75h-3.5A.75.75 0 006 14v3.25c0 .414.336.75.75.75z" /></svg>`,
      settlement: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-16.5 3h16.5M3.75 15h16.5M5.25 18.75h9M3.75 12h16.5" /></svg>`,
      statistics: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>`,
      fds: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>`,
      users: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>`,
      manager: `<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`
    };

    // 최고 관리자(super)일 때만 관리자 계정 관리 메뉴가 보이도록 함
    const managerMenu = admin && admin.role === 'super' ? `
          <a href="${resolvePortalPath('/admin/managers.html')}" class="nav-manager">
            ${ICONS.manager}
            <span>관리자 계정 관리</span>
          </a>
    ` : '';

    const isCollapsed = localStorage.getItem('ongjin_sidebar_collapsed') === 'true';
    const toggleIconSvg = isCollapsed
      ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>`;

    const roleLabel = admin.role === 'super' ? '최고 관리자' : '일반 운영자';
    const adminName = admin.name || admin.username || '관리자';

    // 공통 사이드바 HTML 구조 생성
    sidebar.innerHTML = `
        <div class="logo">
          <button class="nav-toggle-btn">
            ${toggleIconSvg}
          </button>
          <div class="logo-text-group">
            <div class="logo-text">옹진 관광 쿠폰</div>
            <div class="logo-badge">ADMIN</div>
          </div>
        </div>
        <nav class="admin-nav">
          <a href="${resolvePortalPath('/admin/index.html')}">
            ${ICONS.dashboard}
            <span>대시보드</span>
          </a>
          <a href="${resolvePortalPath('/admin/budget.html')}">
            ${ICONS.budget}
            <span>예산 관리</span>
          </a>
          <a href="${resolvePortalPath('/admin/coupons.html')}">
            ${ICONS.coupon}
            <span>쿠폰 관리</span>
          </a>
          <a href="${resolvePortalPath('/admin/issuers.html')}">
            ${ICONS.issuer}
            <span>발행처 관리</span>
          </a>
          <a href="${resolvePortalPath('/admin/merchants.html')}">
            ${ICONS.merchant}
            <span>가맹점 관리</span>
          </a>
          <a href="${resolvePortalPath('/admin/settlement.html')}">
            ${ICONS.settlement}
            <span>정산 관리</span>
          </a>
          <a href="${resolvePortalPath('/admin/statistics.html')}">
            ${ICONS.statistics}
            <span>통계 및 보고서</span>
          </a>
          <a href="${resolvePortalPath('/admin/fds.html')}">
            ${ICONS.fds}
            <span>FDS 모니터링</span>
          </a>
          <a href="${resolvePortalPath('/admin/users.html')}">
            ${ICONS.users}
            <span>회원 계정 관리</span>
          </a>
          ${managerMenu}
          <div class="admin-nav-indicator"></div>
        </nav>
        <div id="admin-sidebar-footer">
          <div class="admin-sidebar-footer-inner">
            <div class="admin-footer-info-row">
              <div class="admin-footer-text">
                <div class="admin-footer-name">
                  ${adminName} (${admin.username || 'admin'})
                </div>
                <div class="admin-footer-role-row">
                  <div class="admin-footer-role-label">${roleLabel}</div>
                </div>
              </div>
            </div>
            <button id="btn-admin-logout" class="admin-logout-btn">
              <span>로그아웃</span>
              <svg class="admin-logout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
    `;
  }

  // 현재 활성화된 탭 하이라이트 (active 클래스 부여)
  const navLinks = sidebar.querySelectorAll('.admin-nav a');
  navLinks.forEach(link => {
    const rawHref = link.getAttribute('href') || '';
    const resolvedHref = resolvePortalPath(rawHref);
    if (resolvedHref !== rawHref) link.setAttribute('href', resolvedHref);
    const normalizedHref = rawHref.replace(/^(\/coupon)?(\/frontend)?(?=\/)/, '');
    const isTarget = normalizedHref === currentPath || (currentPath === '/admin/' && normalizedHref === '/admin/index.html');
    link.classList.toggle('active', isTarget);
  });

  // ── 활성 메뉴 표시기(Indicator) 슬라이딩 애니메이션 효과 ──
  const activeLink = sidebar.querySelector('.admin-nav a.active');
  const indicator = sidebar.querySelector('.admin-nav-indicator');
  if (activeLink && indicator) {
    const targetTop = activeLink.offsetTop;
    const targetHeight = activeLink.offsetHeight;

    // 세션 스토리지에서 이전 활성화된 위치 정보를 복구 (클릭 이벤트 누락 시에도 직전 메뉴 위치로 자동 폴백)
    const prevTopRaw = sessionStorage.getItem('ongjin_prev_nav_top') ?? sessionStorage.getItem('ongjin_last_nav_top');
    const prevHeightRaw = sessionStorage.getItem('ongjin_prev_nav_height') ?? sessionStorage.getItem('ongjin_last_nav_height');
    sessionStorage.removeItem('ongjin_prev_nav_top');
    sessionStorage.removeItem('ongjin_prev_nav_height');

    const prevTop = prevTopRaw !== null ? Number(prevTopRaw) : null;
    const prevHeight = prevHeightRaw !== null ? Number(prevHeightRaw) : null;

    if (prevTop !== null && prevHeight !== null && !isNaN(prevTop) && prevTop !== targetTop) {
      // 1. 첫 페인트 프레임에서는 이전 메뉴 위치에 고정 배치
      indicator.classList.remove('animating');
      indicator.style.transform = `translate3d(0, ${prevTop}px, 0)`;
      indicator.style.height = `${prevHeight}px`;
      indicator.style.opacity = '1';

      // 2. 첫 페인트가 화면에 반영된 직후 다음 프레임에서 GPU 가속으로 부드럽게 목표 위치로 슬라이딩
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          indicator.classList.add('animating');
          indicator.style.transform = `translate3d(0, ${targetTop}px, 0)`;
          indicator.style.height = `${targetHeight}px`;
        });
      });
    } else {
      // 이전 위치 정보가 없거나 동일 메뉴일 때는 즉시 현재 위치에 배치
      indicator.classList.remove('animating');
      indicator.style.transform = `translate3d(0, ${targetTop}px, 0)`;
      indicator.style.height = `${targetHeight}px`;
      indicator.style.opacity = '1';
    }

    // 현재 페이지의 목표 위치를 다음 페이지 이동 시의 출발 기준점 및 캐시로 저장
    sessionStorage.setItem('ongjin_last_nav_top', String(targetTop));
    sessionStorage.setItem('ongjin_last_nav_height', String(targetHeight));
    saveSidebarCache(sidebar, adminKey, targetTop, targetHeight, activeLink.getAttribute('href'));
  }

  // 메뉴 클릭 시 현재 위치 및 출발 스냅샷을 세션 스토리지에 저장 (DOM 프로퍼티로 중복 바인딩 방지)
  navLinks.forEach(link => {
    if (link._boundClick) return;
    link._boundClick = true;
    link.addEventListener('click', (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      const currentActive = sidebar.querySelector('.admin-nav a.active');
      if (currentActive && currentActive !== link) {
        const startTop = currentActive.offsetTop;
        const startHeight = currentActive.offsetHeight;
        sessionStorage.setItem('ongjin_prev_nav_top', String(startTop));
        sessionStorage.setItem('ongjin_prev_nav_height', String(startHeight));
        saveSidebarCache(sidebar, adminKey, startTop, startHeight, link.getAttribute('href'));
      } else {
        sessionStorage.removeItem('ongjin_prev_nav_top');
        sessionStorage.removeItem('ongjin_prev_nav_height');
      }
    });
  });

  const logoutBtn = document.getElementById('btn-admin-logout');
  if (logoutBtn && !logoutBtn._boundClick) {
    logoutBtn._boundClick = true;
    logoutBtn.addEventListener('click', () => {
      if (confirm('로그아웃 하시겠습니까?')) adminLogout();
    });
  }
}

/**
 * 사이드바 열고 접기 기능 초기화 (미니 사이드바 및 네비콘 대응)
 */
function initSidebarToggle() {
  const sidebar = document.querySelector('.admin-sidebar');
  const content = document.querySelector('.admin-content');
  if (!sidebar || !content) return;

  const toggleBtn = sidebar.querySelector('.logo .nav-toggle-btn');
  if (!toggleBtn) return;

  // 로컬 스토리지 상태 반영
  const isCollapsed = localStorage.getItem('ongjin_sidebar_collapsed') === 'true';
  if (isCollapsed) {
    document.documentElement.classList.add('sidebar-collapsed');
  } else {
    document.documentElement.classList.remove('sidebar-collapsed');
  }

  // 트랜지션 활성화를 위해 ready 클래스를 비동기적으로 추가 (초기 로드 시 애니메이션 방지)
  setTimeout(() => {
    sidebar.classList.add('ready');
    content.classList.add('ready');
  }, 50);

  if (!toggleBtn._boundToggle) {
    toggleBtn._boundToggle = true;
    toggleBtn.addEventListener('click', () => {
      const willCollapse = !document.documentElement.classList.contains('sidebar-collapsed');
      if (willCollapse) {
        document.documentElement.classList.add('sidebar-collapsed');
        updateToggleIcon(true);
        localStorage.setItem('ongjin_sidebar_collapsed', 'true');
      } else {
        document.documentElement.classList.remove('sidebar-collapsed');
        updateToggleIcon(false);
        localStorage.setItem('ongjin_sidebar_collapsed', 'false');
      }
      const admin = getAdminInfo();
      const adminKey = `${admin?.username || 'admin'}:${admin?.role || ''}:${admin?.name || ''}`;
      const activeLink = sidebar.querySelector('.admin-nav a.active');
      if (activeLink) {
        saveSidebarCache(sidebar, adminKey, activeLink.offsetTop, activeLink.offsetHeight, activeLink.getAttribute('href'));
      }
    });
  }

  function updateToggleIcon(collapsed) {
    const hamburgerSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
    const chevronLeftSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>`;
    toggleBtn.innerHTML = collapsed ? hamburgerSvg : chevronLeftSvg;
  }
}
