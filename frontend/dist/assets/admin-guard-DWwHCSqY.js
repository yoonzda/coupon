const a="ongjin_admin_token",n="ongjin_admin_info",i="/admin/login.html";function s(){return localStorage.getItem(a)}function c(){try{return JSON.parse(localStorage.getItem(n))||{}}catch{return{}}}function m(){localStorage.removeItem(a),localStorage.removeItem(n),localStorage.removeItem("ongjin_token"),window.location.replace(i)}async function g(){const e=s();if(!e)return window.location.replace(i),!1;try{const t=await fetch("/api/admin/auth/me",{headers:{Authorization:`Bearer ${e}`}});if(!t.ok)return localStorage.removeItem(a),localStorage.removeItem(n),window.location.replace(i),!1;const{admin:o}=await t.json();return localStorage.setItem("ongjin_token",e),localStorage.setItem(n,JSON.stringify(o)),d(o),!0}catch{const t=c();return d(t),!0}}function d(e){const t=document.getElementById("admin-sidebar-footer");t&&t.remove();const o=document.querySelector(".admin-sidebar");if(!o)return;const l=e.role==="super"?"최고 관리자":"운영자",r=document.createElement("div");r.id="admin-sidebar-footer",r.innerHTML=`
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
            ${e.name||e.username||"관리자"}
          </div>
          <div style="color: #64748b; font-size: 0.72rem;">${l}</div>
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
  `,o.appendChild(r),document.getElementById("btn-admin-logout").addEventListener("click",()=>{confirm("로그아웃 하시겠습니까?")&&m()})}export{g as r};
