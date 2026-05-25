const u="ongjin_admin_token",p="ongjin_admin_info",v="/admin/login.html";(function(){localStorage.getItem("ongjin_sidebar_collapsed")==="true"?document.documentElement.classList.add("sidebar-collapsed"):document.documentElement.classList.remove("sidebar-collapsed")})();function k(){return localStorage.getItem(u)}function b(){try{return JSON.parse(localStorage.getItem(p))||{}}catch{return{}}}function M(){localStorage.removeItem(u),localStorage.removeItem(p),localStorage.removeItem("ongjin_token"),window.location.replace(v)}async function S(){const t=k();if(!t)return window.location.replace(v),!1;const o=b();f(o),w();try{const s=await fetch("/api/admin/auth/me",{headers:{Authorization:`Bearer ${t}`}});if(!s.ok)return localStorage.removeItem(u),localStorage.removeItem(p),window.location.replace(v),!1;const{admin:i}=await s.json();if(i.role!=="super"&&window.location.pathname==="/admin/managers.html")return alert("접근 권한이 없습니다."),window.location.replace("/admin/index.html"),!1;localStorage.setItem("ongjin_token",t),localStorage.setItem(p,JSON.stringify(i));const a=JSON.stringify(o),r=JSON.stringify(i);return a!==r&&(f(i),w()),!0}catch{return!0}}function f(t){const o=document.querySelector(".admin-sidebar");if(!o)return;let s=window.location.pathname;const i=s.match(/\/admin\/(register|detail|edit|allocate)-([a-zA-Z0-9_-]+)\.html/);if(i){const e=i[2];let n=e;e==="settlement"?n="settlement":e.endsWith("s")?n=e:n=e+"s",s=`/admin/${n}.html`}const a={dashboard:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>',coupon:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>',issuer:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>',merchant:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.5a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75h-3.5A.75.75 0 006 14v3.25c0 .414.336.75.75.75z" /></svg>',settlement:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-16.5 3h16.5M3.75 15h16.5M5.25 18.75h9M3.75 12h16.5" /></svg>',statistics:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>',fds:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>',users:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>',manager:'<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>'},r=t&&t.role==="super"?`
        <a href="/admin/managers.html" class="nav-manager">
          ${a.manager}
          <span>관리자 계정 관리</span>
        </a>
  `:"";o.innerHTML=`
      <div class="logo">
        <button class="nav-toggle-btn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div class="logo-text-group">
          <div class="logo-text">옹진 관광 쿠폰</div>
          <div class="logo-badge">ADMIN</div>
        </div>
      </div>
      <nav class="admin-nav" style="display: flex; flex-direction: column; padding: 16px 0; gap: 4px; flex: 1;">
        <a href="/admin/index.html">
          ${a.dashboard}
          <span>대시보드</span>
        </a>
        <a href="/admin/coupons.html">
          ${a.coupon}
          <span>쿠폰 관리</span>
        </a>
        <a href="/admin/issuers.html">
          ${a.issuer}
          <span>발행처 관리</span>
        </a>
        <a href="/admin/merchants.html">
          ${a.merchant}
          <span>가맹점 관리</span>
        </a>
        <a href="/admin/settlement.html">
          ${a.settlement}
          <span>정산 관리</span>
        </a>
        <a href="/admin/statistics.html">
          ${a.statistics}
          <span>통계 및 보고서</span>
        </a>
        <a href="/admin/fds.html">
          ${a.fds}
          <span>FDS 모니터링</span>
        </a>
        <a href="/admin/users.html">
          ${a.users}
          <span>회원 계정 관리</span>
        </a>
        ${r}
      </nav>
  `;const d=o.querySelectorAll(".admin-nav a");d.forEach(e=>{(e.getAttribute("href")===s||s==="/admin/"&&e.getAttribute("href")==="/admin/index.html")&&e.classList.add("active")});const l=o.querySelector(".admin-nav a.active"),m=o.querySelector(".admin-nav");if(l&&m){const e=document.createElement("div");e.className="admin-nav-indicator",m.appendChild(e);const n=sessionStorage.getItem("ongjin_prev_nav_top"),c=sessionStorage.getItem("ongjin_prev_nav_height");sessionStorage.removeItem("ongjin_prev_nav_top"),sessionStorage.removeItem("ongjin_prev_nav_height"),n!==null&&c!==null?(e.style.top=`${n}px`,e.style.height=`${c}px`,e.style.opacity="1",e.style.setProperty("transition","none","important"),e.offsetHeight,e.style.removeProperty("transition"),e.style.top=`${l.offsetTop}px`,e.style.height=`${l.offsetHeight}px`):(e.style.top=`${l.offsetTop}px`,e.style.height=`${l.offsetHeight}px`,e.style.opacity="1",e.style.setProperty("transition","none","important"),e.offsetHeight,e.style.removeProperty("transition"))}d.forEach(e=>{e.addEventListener("click",n=>{if(n.button!==0||n.ctrlKey||n.metaKey||n.shiftKey||n.altKey)return;const c=o.querySelector(".admin-nav a.active");c&&(sessionStorage.setItem("ongjin_prev_nav_top",c.offsetTop),sessionStorage.setItem("ongjin_prev_nav_height",c.offsetHeight));const g=o.querySelector(".admin-nav-indicator");g&&(g.style.top=`${e.offsetTop}px`,g.style.height=`${e.offsetHeight}px`)})});const x=t.role==="super"?"최고 관리자":"일반 운영자",y=t.name||t.username||"관리자",h=document.createElement("div");h.id="admin-sidebar-footer",h.innerHTML=`
    <div style="
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,0.08);
      margin-top: auto;
      transition: padding 0.3s ease, display 0.3s ease;
    ">
      <div class="footer-info-row" style="display: flex; align-items: center; margin-bottom: 16px; transition: all 0.3s;">
        <!-- 평소 보일 텍스트 정보 -->
        <div class="footer-text" style="min-width: 0; display: flex; flex-direction: column; gap: 4px;">
          <div style="color: #fff; font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${y} (${t.username||"admin"})
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="color: #94a3b8; font-size: 0.8rem; font-weight: 600;">${x}</div>
          </div>
        </div>
      </div>
      <button
        id="btn-admin-logout"
        style="
          width: 100%; padding: 10px;
          background: transparent;
          color: #94a3b8;
          border: 1px solid #334155;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
          font-family: inherit;
        "
        onmouseover="this.style.background='#1e293b'; this.style.color='#fff';"
        onmouseout="this.style.background='transparent'; this.style.color='#94a3b8';"
      >
        <span>로그아웃</span>
        <!-- 접혔을 때 보일 로그아웃 SVG -->
        <svg class="logout-icon" style="display: none; width: 18px; height: 18px; color: inherit;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
      </button>
    </div>
  `,o.appendChild(h),document.getElementById("btn-admin-logout").addEventListener("click",()=>{confirm("로그아웃 하시겠습니까?")&&M()})}function w(){const t=document.querySelector(".admin-sidebar"),o=document.querySelector(".admin-content");if(!t||!o)return;const s=t.querySelector(".logo .nav-toggle-btn");if(!s)return;const i=s.cloneNode(!0);s.parentNode.replaceChild(i,s),localStorage.getItem("ongjin_sidebar_collapsed")==="true"?(document.documentElement.classList.add("sidebar-collapsed"),r(!0)):(document.documentElement.classList.remove("sidebar-collapsed"),r(!1)),setTimeout(()=>{t.classList.add("ready"),o.classList.add("ready")},50),i.addEventListener("click",()=>{!document.documentElement.classList.contains("sidebar-collapsed")?(document.documentElement.classList.add("sidebar-collapsed"),r(!0),localStorage.setItem("ongjin_sidebar_collapsed","true")):(document.documentElement.classList.remove("sidebar-collapsed"),r(!1),localStorage.setItem("ongjin_sidebar_collapsed","false"))});function r(d){const l=`
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    `,m=`
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    `;i.innerHTML=d?l:m}}export{k as g,S as r};
