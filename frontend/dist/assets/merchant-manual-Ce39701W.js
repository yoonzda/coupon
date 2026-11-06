import"./mock-backend-Cm1IoOFL.js";/* empty css             */import{r as f,a as c,s as i,f as w}from"./api-CKTZsajb.js";if(!f("/merchant/login.html"))throw new Error("not authenticated");const p=localStorage.getItem("ongjin_font_scale")||"normal";document.documentElement.style.fontSize=p==="large"?"22px":"16px";document.documentElement.setAttribute("data-font-scale",p);const d=document.getElementById("pending-list"),r=document.getElementById("processed-list"),u=document.getElementById("pending-count-num"),l=document.getElementById("pending-amount-num");function m(e){if(!e)return"";const t=new Date(e);return isNaN(t.getTime())?"":t.toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function x(e){const t=e.reduce((n,s)=>n+Number(s.total_amount||0),0);if(u&&(u.textContent=e.length.toLocaleString("ko-KR")),l&&(l.textContent=t.toLocaleString("ko-KR")),!e||e.length===0){d.innerHTML=`
          <div class="empty-state">
            <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <span class="empty-text">현재 대기 중인 사용 요청이 없습니다.</span>
          </div>
        `;return}d.innerHTML=e.map(n=>`
        <div class="tx-item-row pending-row" data-id="${n.id}">
          <div class="pending-top-line">
            <div class="tx-info-group">
              <span class="tx-badge">대기중</span>
              <div>
                <div class="tx-title">${n.user_phone||"관광객 손님"} (${n.coupon_count}장)</div>
                <div class="tx-sub">${m(n.requested_at)}</div>
              </div>
            </div>
            <div class="tx-val-wrap">
              <span class="tx-val-num">${Number(n.total_amount||0).toLocaleString("ko-KR")}</span>
              <span class="unit-text">원</span>
            </div>
          </div>
          <div class="pending-actions">
            <button type="button" class="btn-approve" onclick="window.approveReq(${n.id})">승인 (${w(n.total_amount)})</button>
            <button type="button" class="btn-reject" onclick="window.rejectReq(${n.id})">거절</button>
          </div>
        </div>
      `).join("")}function y(e){if(!e||e.length===0){r.innerHTML=`
          <div class="empty-state">
            <span class="empty-text">최근 처리된 요청 내역이 없습니다.</span>
          </div>
        `;return}r.innerHTML=e.map(t=>{const n=t.status==="approved",s=t.status==="rejected",o=n?"":s?"rejected":"cancelled",v=n?"승인완료":s?"거절됨":"취소됨",g=n?"#059669":"#64748b";return`
          <div class="tx-item-row">
            <div class="tx-info-group">
              <span class="tx-badge ${o}">${v}</span>
              <div>
                <div class="tx-title">${t.user_phone||"관광객 손님"} (${t.coupon_count}장)</div>
                <div class="tx-sub">${m(t.processed_at||t.requested_at)}</div>
              </div>
            </div>
            <div class="tx-val-wrap">
              <span class="tx-val-num" style="color: ${g};">${Number(t.total_amount||0).toLocaleString("ko-KR")}</span>
              <span class="unit-text">원</span>
            </div>
          </div>
        `}).join("")}async function a(){try{const e=await c.get("/merchant/use-requests?includeProcessed=1");if(e&&e.success){const t=Array.isArray(e.data)?e.data:[],n=t.filter(o=>o.status==="pending"),s=t.filter(o=>o.status!=="pending");x(n),y(s)}}catch{}}window.approveReq=async function(e){try{const t=await c.post(`/merchant/use-requests/${e}/approve`);t.success&&(i(t.message||"쿠폰 사용이 승인되었습니다.","success"),await a())}catch(t){i(t.message||"승인 처리에 실패했습니다.","error"),await a()}};window.rejectReq=async function(e){try{(await c.post(`/merchant/use-requests/${e}/reject`)).success&&(i("쿠폰 사용 요청을 거절했습니다.","info"),await a())}catch(t){i(t.message||"거절 처리에 실패했습니다.","error"),await a()}};a();setInterval(a,2e3);
