import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css                   */import{r as B,d as g,a as p,c as d}from"./api-DIUxAG8e.js";import"./tracker-D60jFAt5.js";const E=localStorage.getItem("ongjin_merchant_token");if(!E||!B("/merchant/login.html"))throw g(),window.location.replace("/merchant/login.html"),new Error("not authenticated");const u=localStorage.getItem("ongjin_merchant_user")||localStorage.getItem("ongjin_user");let y=!1;if(u)try{const t=JSON.parse(u);y=t.role==="merchant_staff"||t.isStaff===!0}catch{}if(y){const t=document.querySelector(".subpage-header .btn-back");t&&t.setAttribute("href","/merchant/scan.html");const n=document.querySelector('nav.tabbar a[href*="index.html"]');n&&(n.style.display="none");const a=document.querySelector('nav.tabbar a[href*="manage-store.html"]');a&&(a.style.display="none");const o=document.querySelector(".subpage-header .title");o&&(o.innerHTML='거래 내역 <span style="font-size:12px; background:#EFF6FF; color:#2563EB; padding:2px 8px; border-radius:12px; font-weight:600; margin-left:6px; vertical-align:middle;">직원 모드</span>')}let s=null;async function f(){try{const n=(await p.get("/merchant/transactions")).data||[];I(n)}catch(t){d(t.message||"거래 내역을 불러오지 못했습니다.","error"),document.getElementById("tx-list-container").innerHTML=`
          <div class="empty-state-box">내역을 불러오는 중 오류가 발생했습니다.</div>
        `}}function I(t){const n=t.filter(e=>!e.is_cancelled),a=n.reduce((e,c)=>e+(Number(c.amount)||0),0);document.getElementById("sum-total-amount").textContent=`₩ ${a.toLocaleString()}`,document.getElementById("sum-total-count").textContent=`${n.length}건`,document.getElementById("list-count-badge").textContent=`총 ${t.length}건 (승인 ${n.length}건)`;const o=document.getElementById("tx-list-container");if(t.length===0){o.innerHTML=`
          <div class="empty-state-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom:8px; opacity:0.4;">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>승인된 쿠폰 결제 내역이 없습니다.</div>
          </div>
        `;return}const r=new Date;o.innerHTML=t.map(e=>{const c=e.coupon_type==="paper",h=c?"지류 종이쿠폰":"디지털 모바일쿠폰",x=c?"paper":"digital",l=new Date(e.scanned_at),i=l.toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}),b=l.getFullYear()===r.getFullYear()&&l.getMonth()===r.getMonth()&&l.getDate()===r.getDate();if(e.is_cancelled){const w=e.cancelled_at?new Date(e.cancelled_at).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"}):"";return`
            <div class="tx-item-card cancelled">
              <div class="tx-left-col">
                <span class="tx-type-tag" style="background:#fee2e2; color:#b91c1c;">결제 취소 완료</span>
                <span class="tx-date-text">${i}</span>
                <span style="font-size:11px; color:#ef4444; margin-top:2px;">사유: ${e.cancel_reason||"단순 취소"} (${w})</span>
              </div>
              <div class="tx-right-col">
                <span class="tx-amount-text" style="text-decoration:line-through; color:#94a3b8;">+${(Number(e.amount)||0).toLocaleString()}원</span>
                <span class="tx-status-label" style="color:#ef4444; font-weight:700;">취소됨</span>
              </div>
            </div>
          `}const v=b?`
          <button type="button" class="btn-cancel-tx" onclick="window.openCancelModal(${e.id}, ${e.amount}, '${i}')">
            결제 취소
          </button>
        `:"";return`
          <div class="tx-item-card">
            <div class="tx-left-col">
              <span class="tx-type-tag ${x}">${h}</span>
              <span class="tx-date-text">${i}</span>
            </div>
            <div class="tx-right-col">
              <span class="tx-amount-text">+${(Number(e.amount)||0).toLocaleString()}원</span>
              <span class="tx-status-label">${e.is_offline?"오프라인 승인":"정상 승인"}</span>
              ${v}
            </div>
          </div>
        `}).join("")}window.openCancelModal=function(t,n,a){s=t,document.getElementById("cancel-modal-amount").textContent=`₩ ${(Number(n)||0).toLocaleString()}`,document.getElementById("cancel-modal-date").textContent=a,document.getElementById("modal-cancel-confirm").classList.add("active")};function m(){s=null,document.getElementById("modal-cancel-confirm").classList.remove("active")}document.getElementById("btn-cancel-modal-close").onclick=m;document.getElementById("modal-cancel-confirm").onclick=t=>{t.target===t.currentTarget&&m()};document.getElementById("btn-cancel-modal-confirm").onclick=async()=>{if(!s)return;const t=document.getElementById("btn-cancel-modal-confirm"),n=document.getElementById("cancel-reason-select").value;t.disabled=!0,t.textContent="취소 처리 중...";try{const a=await p.post(`/merchant/transactions/${s}/cancel`,{reason:n});d(a.message||"결제가 취소되었습니다.","success"),m(),await f()}catch(a){d(a.message||"취소 처리에 실패했습니다.","error")}finally{t.disabled=!1,t.textContent="결제 취소 승인"}};document.getElementById("btn-merchant-logout").onclick=()=>{confirm("가맹점 매니저에서 로그아웃하시겠습니까?")&&(g(),window.location.replace("/merchant/login.html"))};f();
