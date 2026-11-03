(function(){if(window.__ONGJIN_ADMIN_TRACKER_LOADED__)return;window.__ONGJIN_ADMIN_TRACKER_LOADED__=!0;const e="ongjin_admin_token",a="/api/admin/logs/activity";function t(){return localStorage.getItem(e)}const s=Date.now();let n=!1,i=!1,l=!document.hidden;function m(){return(document.title||"").replace(/\s*\|\s*옹진.*$/i,"").trim()||window.location.pathname}function c(o){const g=t();if(!g)return;const f=JSON.stringify({token:g,pageUrl:window.location.pathname,pageTitle:m(),durationSeconds:Math.max(0,o||0)});if(navigator.sendBeacon)try{const p=new Blob([f],{type:"application/json; charset=UTF-8"});if(navigator.sendBeacon(a,p))return}catch{}try{fetch(a,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${g}`},body:f,keepalive:!0}).catch(()=>{})}catch{}}function h(){n||t()&&(n=!0,c(0))}function d(){if(i||!t())return;i=!0;const o=Math.round((Date.now()-s)/1e3);o>=1&&c(o)}function r(){t()&&(setTimeout(h,300),document.addEventListener("visibilitychange",()=>{document.hidden?(d(),l=!1):(i=!1,l=!0)}),window.addEventListener("pagehide",d),window.addEventListener("beforeunload",d),setInterval(()=>{if(l&&!document.hidden){const o=Math.round((Date.now()-s)/1e3);o>=30&&c(o)}},6e4))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",r):r()})();const w="ongjin_admin_token",u="ongjin_admin_info",v="/admin/login.html";(function(){localStorage.getItem("ongjin_sidebar_collapsed")==="true"?document.documentElement.classList.add("sidebar-collapsed"):document.documentElement.classList.remove("sidebar-collapsed")})();function x(){return localStorage.getItem(w)}function b(){try{return JSON.parse(localStorage.getItem(u))||{}}catch{return{}}}async function A(){const e=x();if(e)try{await fetch("/api/admin/auth/logout",{method:"POST",headers:{Authorization:`Bearer ${e}`}})}catch{}localStorage.removeItem(w),localStorage.removeItem(u),window.location.replace(v)}async function S(){const e=x();if(!e)return window.location.replace(v),!1;const a=b();k(a),M();try{const t=await fetch("/api/admin/auth/me",{headers:{Authorization:`Bearer ${e}`}});if(!t.ok)return localStorage.removeItem(w),localStorage.removeItem(u),window.location.replace(v),!1;const{admin:s}=await t.json();if(s.role!=="super"&&window.location.pathname==="/admin/managers.html")return alert("접근 권한이 없습니다."),window.location.replace("/admin/index.html"),!1;localStorage.setItem(u,JSON.stringify(s));const n=JSON.stringify(a),i=JSON.stringify(s);return n!==i&&(k(s),M()),!0}catch{return!0}}function k(e){const a=document.querySelector(".admin-sidebar");if(!a)return;let t=window.location.pathname;const s=t.match(/\/admin\/(register|detail|edit|allocate)-([a-zA-Z0-9_-]+)\.html/);if(s){const r=s[2];let o=r;r==="settlement"?o="settlement":r.endsWith("s")?o=r:o=r+"s",t=`/admin/${o}.html`}const n={dashboard:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>',coupon:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>',issuer:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>',merchant:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.5a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75h-3.5A.75.75 0 006 14v3.25c0 .414.336.75.75.75z" /></svg>',settlement:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-16.5 3h16.5M3.75 15h16.5M5.25 18.75h9M3.75 12h16.5" /></svg>',statistics:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>',visitor:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.999-3.199a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>',fds:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>',users:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>',sms:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.974-.94 5.95 5.95 0 00.548-2.613C3.593 15.986 3 14.08 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>',manager:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>',audit:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>'},i=e&&e.role==="super"?`
        <a href="/admin/managers.html" class="nav-manager">
          ${n.manager}
          <span>관리자 계정 관리</span>
        </a>
        <a href="/admin/managers.html?tab=audit" class="nav-audit">
          ${n.audit}
          <span>업무 감사 로그</span>
        </a>
  `:"";a.innerHTML=`
      <div class="logo">
        <button class="nav-toggle-btn" title="사이드바 메뉴 토글">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div class="logo-text-group" style="display: flex; align-items: center; gap: 8px;">
          <img src="/assets/images/ongjin-coupon-logo.png" alt="옹진관광쿠폰" class="admin-sidebar-logo-img" style="height: 34px; width: auto; max-width: 125px; object-fit: contain; flex-shrink: 0;" />
          <div class="logo-badge" style="background: #374151; color: #9CA3AF; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 3px;">ADMIN</div>
        </div>
      </div>
      <nav class="admin-nav">
        <a href="/admin/index.html">
          ${n.dashboard}
          <span>대시보드</span>
        </a>
        <a href="/admin/coupons.html">
          ${n.coupon}
          <span>쿠폰 관리</span>
        </a>
        <a href="/admin/issuers.html">
          ${n.issuer}
          <span>발행처 관리</span>
        </a>
        <a href="/admin/merchants.html">
          ${n.merchant}
          <span>가맹점 관리</span>
        </a>
        <a href="/admin/settlement.html">
          ${n.settlement}
          <span>정산 관리</span>
        </a>
        <a href="/admin/statistics.html">
          ${n.statistics}
          <span>통계 및 보고서</span>
        </a>
        <a href="/admin/visitor-stats.html">
          ${n.visitor}
          <span>접속자 통계</span>
        </a>
        <a href="/admin/fds.html">
          ${n.fds}
          <span>FDS 모니터링</span>
        </a>
        <a href="/admin/sms.html">
          ${n.sms}
          <span>SMS 연동 관리</span>
        </a>
        <a href="/admin/users.html">
          ${n.users}
          <span>회원 계정 관리</span>
        </a>
        ${i}
      </nav>
  `;const l=t==="/admin/managers.html"&&window.location.search.includes("tab=audit");a.querySelectorAll(".admin-nav a").forEach(r=>{const o=r.getAttribute("href");l?o.includes("tab=audit")&&r.classList.add("active"):(o===t||t==="/admin/"&&o==="/admin/index.html")&&(o.includes("tab=audit")||r.classList.add("active"))});const c=e.role==="super"?"최고 관리자":"일반 운영자",h=e.name||e.username||"관리자",d=document.createElement("div");d.id="admin-sidebar-footer",d.innerHTML=`
    <div class="admin-sidebar-footer-inner" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div class="admin-footer-info-row" style="overflow:hidden;">
        <div class="admin-footer-text">
          <div class="admin-footer-name" style="font-size:13px; font-weight:600; color:#F3F4F6; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
            ${h}
          </div>
          <div class="admin-footer-role-row">
            <span class="admin-footer-role-label" style="font-size:11px; color:#9CA3AF;">${c}</span>
          </div>
        </div>
      </div>
      <button type="button" id="btn-admin-logout" class="admin-logout-btn" title="시스템 로그아웃">
        <span>로그아웃</span>
        <svg class="admin-logout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px; height:16px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
      </button>
    </div>
  `,a.appendChild(d),document.getElementById("btn-admin-logout").addEventListener("click",()=>{confirm("로그아웃 하시겠습니까?")&&A()})}function M(){const e=document.querySelector(".admin-sidebar"),a=document.querySelector(".admin-content");if(!e||!a)return;const t=e.querySelector(".logo .nav-toggle-btn");if(!t)return;const s=t.cloneNode(!0);t.parentNode.replaceChild(s,t),localStorage.getItem("ongjin_sidebar_collapsed")==="true"?(document.documentElement.classList.add("sidebar-collapsed"),i(!0)):(document.documentElement.classList.remove("sidebar-collapsed"),i(!1)),setTimeout(()=>{e.classList.add("ready"),a.classList.add("ready")},50),s.addEventListener("click",()=>{!document.documentElement.classList.contains("sidebar-collapsed")?(document.documentElement.classList.add("sidebar-collapsed"),i(!0),localStorage.setItem("ongjin_sidebar_collapsed","true")):(document.documentElement.classList.remove("sidebar-collapsed"),i(!1),localStorage.setItem("ongjin_sidebar_collapsed","false"))});function i(l){const m=`
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    `,c=`
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    `;s.innerHTML=l?m:c}}export{x as g,S as r};
