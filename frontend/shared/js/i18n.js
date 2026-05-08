// =====================================================
// shared/js/i18n.js — 다국어(i18n) 처리 모듈
// =====================================================

const translations = {
  ko: {
    // 공통
    "lang_ko": "한국어",
    "lang_en": "English",
    "lang_zh": "中文",
    "logout": "로그아웃",

    // 관리자 메뉴
    "nav_dashboard": "대시보드",
    "nav_merchant": "가맹점 관리",
    "nav_settlement": "정산 관리",
    "nav_fds": "FDS 모니터링",
    "nav_statistics": "통계 및 보고서",
    "nav_coupons": "쿠폰 및 발행처 관리",

    // 관리자 대시보드 메인
    "admin_title": "플랫폼 현황 요약",
    "admin_desc": "실시간 쿠폰 발행 및 결제 데이터를 확인합니다.",
    "stat_total_amount": "금월 누적 결제액",
    "stat_users": "활성 사용자",
    "stat_merchants": "승인 가맹점",
    "stat_fds": "FDS 미해결 알림",
    
    // FDS 최근 내역
    "fds_recent_title": "⚠️ 최근 이상거래 의심 내역 (FDS)",
    "btn_view_all": "전체보기",
    "th_date": "탐지 일시",
    "th_merchant": "가맹점",
    "th_user": "사용자",
    "th_rule": "탐지 규칙",
    "th_status": "상태",
    "fds_empty": "탐지된 내역이 없습니다.",
    "status_resolved": "해결",
    "status_unresolved": "미해결"
  },
  en: {
    "lang_ko": "한국어",
    "lang_en": "English",
    "lang_zh": "中文",
    "logout": "Logout",

    "nav_dashboard": "Dashboard",
    "nav_merchant": "Merchants",
    "nav_settlement": "Settlements",
    "nav_fds": "FDS Monitor",
    "nav_statistics": "Statistics",
    "nav_coupons": "Coupon & Issuer Mgt",

    "admin_title": "Platform Overview",
    "admin_desc": "Monitor real-time coupon issuance and payment data.",
    "stat_total_amount": "Monthly Payments",
    "stat_users": "Active Users",
    "stat_merchants": "Approved Merchants",
    "stat_fds": "Pending FDS Alerts",
    
    "fds_recent_title": "⚠️ Recent Suspicious Transactions (FDS)",
    "btn_view_all": "View All",
    "th_date": "Detected At",
    "th_merchant": "Merchant",
    "th_user": "User",
    "th_rule": "Rule",
    "th_status": "Status",
    "fds_empty": "No detections found.",
    "status_resolved": "Resolved",
    "status_unresolved": "Pending"
  },
  zh: {
    "lang_ko": "한국어",
    "lang_en": "English",
    "lang_zh": "中文",
    "logout": "登出",

    "nav_dashboard": "仪表板",
    "nav_merchant": "商户管理",
    "nav_settlement": "结算管理",
    "nav_fds": "FDS 监控",
    "nav_statistics": "统计和报告",
    "nav_coupons": "优惠券及发行管理",

    "admin_title": "平台概况",
    "admin_desc": "监控实时优惠券发行和支付数据。",
    "stat_total_amount": "本月累计支付额",
    "stat_users": "活跃用户",
    "stat_merchants": "已批商户",
    "stat_fds": "未决 FDS 警报",

    "fds_recent_title": "⚠️ 最近可疑交易 (FDS)",
    "btn_view_all": "查看全部",
    "th_date": "检测时间",
    "th_merchant": "商户",
    "th_user": "用户",
    "th_rule": "检测规则",
    "th_status": "状态",
    "fds_empty": "没有检测到记录。",
    "status_resolved": "已解决",
    "status_unresolved": "未解决"
  }
};

// 현재 설정된 언어 (기본값: 한국어)
let currentLang = localStorage.getItem('ongjin_lang') || 'ko';

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('ongjin_lang', lang);
    applyTranslations();
  }
}

export function t(key) {
  return translations[currentLang][key] || key;
}

export function applyTranslations() {
  // DOM의 모든 data-i18n 속성을 찾아 번역 적용
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang][key]) {
      // placeholder 번역 처리
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
        el.setAttribute('placeholder', translations[currentLang][key]);
      } else {
        el.textContent = translations[currentLang][key];
      }
    }
  });
}

// ── 공통 언어 선택기 (UI) 바인딩 ─────────────────────
export function bindLanguageSwitcher(selectorId = 'lang-switcher') {
  const selectEl = document.getElementById(selectorId);
  if (!selectEl) return;
  
  // 현재 언어로 선택 설정
  selectEl.value = currentLang;
  
  // 변경 이벤트
  selectEl.addEventListener('change', (e) => {
    setLang(e.target.value);
    
    // JS 렌더링 영역(예: 테이블 안의 데이터 등)은 페이지 새로고침이 제일 깔끔하게 처리됨
    // 혹은 특정 함수(loadDashboard 등)를 다시 호출해도 됨.
    // 여기서는 가장 보편적인 방법인 새로고침 사용.
    window.location.reload(); 
  });
}

// 스크립트가 로드될 때 즉시 번역 적용
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
});
