import"./mock-backend-a_Dp-F9x.js";/* empty css             */import{a as c,s as y,d as m}from"./api-BGCgjaV1.js";import{r as L}from"./admin-guard-H1fWcU3T.js";await L();let d="pending",C=[],l=[];function M(){const t=document.getElementById("merchant-table-header");d==="rejected"?t.innerHTML=`
          <th style="width: 25%; text-align: center;">상점명</th>
          <th style="width: 45%; text-align: center;">반려 사유</th>
          <th style="width: 15%; text-align: center;">신청일</th>
          <th style="width: 15%; text-align: center;">관리</th>
        `:d==="suspended"?t.innerHTML=`
          <th style="width: 25%; text-align: center;">상점명</th>
          <th style="width: 45%; text-align: center;">중지 사유</th>
          <th style="width: 15%; text-align: center;">처리일</th>
          <th style="width: 15%; text-align: center;">관리</th>
        `:t.innerHTML=`
          <th style="width: 15%; text-align: center;">상점명</th>
          <th style="width: 12%; text-align: center;">카테고리</th>
          <th style="width: 13%; text-align: center;">대표자 성명</th>
          <th style="width: 15%; text-align: center;">연락처</th>
          <th style="width: 20%; text-align: center;">주소</th>
          <th style="width: 12%; text-align: center;">신청일</th>
          <th style="width: 13%; text-align: center;">관리</th>
        `}function a(t,e){if(!t)return"-";if(!e||!e.trim())return t;const r=e.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),n=new RegExp(`(${r})`,"gi");return t.replace(n,'<mark class="search-highlight">$1</mark>')}function v(t,e=""){const o=document.getElementById("approved-merchant-list");if(!t||t.length===0){o.innerHTML='<tr><td colspan="6" class="text-center" style="padding: 40px; color: #64748b;">승인 완료된 가맹점이 없습니다.</td></tr>';return}o.innerHTML=t.map(r=>`
          <tr id="row-${r.id}">
            <td style="font-weight:700; color: var(--text-primary);">${a(r.name,e)}</td>
            <td style="color: var(--text-secondary);">${a(r.category,e)}</td>
            <td style="font-weight:600; color: var(--text-secondary);">${a(r.owner_name,e)}</td>
            <td style="color: var(--text-secondary);">${a(r.phone,e)}</td>
            <td style="color: var(--text-secondary); max-width: 250px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${a(r.address,e)}</td>
            <td>
              <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                <button class="btn-table-edit" onclick="window.showMerchantDetails(${r.id})">상세보기</button>
              </div>
            </td>
          </tr>
        `).join("")}function f(t,e=""){M();const o=document.getElementById("merchant-list"),r=d==="pending"?7:4;if(!t||t.length===0){o.innerHTML=`<tr><td colspan="${r}" class="text-center" style="padding: 40px; color: #64748b;">내역이 없습니다.</td></tr>`;return}o.innerHTML=t.map(n=>{const s=n.applied_at?m(n.applied_at):"-";if(d==="rejected"){const i=(n.rejection_reason||"사유 없음").replace(/\[사유\]/g,"").trim();return`
            <tr id="row-${n.id}">
              <td style="font-weight:700; color: var(--text-primary);">${a(n.name,e)}</td>
              <td style="text-align: center;">
                <span style="font-size: 0.88rem; color: #ef4444; font-weight: 500;">
                  ${a(i,e)}
                </span>
              </td>
              <td style="color: var(--text-muted);">${s}</td>
              <td>
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                  <button class="btn-table-edit" onclick="window.showMerchantDetails(${n.id})">상세보기</button>
                </div>
              </td>
            </tr>
          `}if(d==="suspended"){const i=(n.rejection_reason||n.reason||"관리자 정지").replace(/\[사유\]/g,"").trim(),b=n.updated_at?m(n.updated_at):s;return`
            <tr id="row-${n.id}">
              <td style="font-weight:700; color: var(--text-primary);">${a(n.name,e)}</td>
              <td style="text-align: center;">
                <span style="font-size: 0.88rem; color: #f59e0b; font-weight: 500;">
                  ${a(i,e)}
                </span>
              </td>
              <td style="color: var(--text-muted);">${b}</td>
              <td>
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                  <button class="btn-table-edit" onclick="window.showMerchantDetails(${n.id})">상세보기</button>
                  <button class="btn-table-edit" style="background-color: #dcfce7; color: #15803d; border-color: #bbf7d0;" onclick="window.updateMerchantStatus(${n.id}, 'approved')">정지 해제</button>
                </div>
              </td>
            </tr>
          `}return`
          <tr id="row-${n.id}">
            <td style="font-weight:700; color: var(--text-primary);">${a(n.name,e)}</td>
            <td style="color: var(--text-secondary);">${a(n.category,e)}</td>
            <td style="font-weight:600; color: var(--text-secondary);">${a(n.owner_name,e)}</td>
            <td style="color: var(--text-secondary);">${a(n.phone,e)}</td>
            <td style="color: var(--text-secondary); max-width: 250px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${a(n.address,e)}</td>
            <td style="color: var(--text-muted);">${s}</td>
            <td>
              <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                <button class="btn-table-edit" onclick="window.showMerchantDetails(${n.id})">상세보기</button>
              </div>
            </td>
          </tr>
        `}).join("")}window.showMerchantDetails=t=>{window.location.href=`detail-merchant.html?id=${t}`};window.updateMerchantStatus=async(t,e)=>{const o=Number(t),r=e==="approved"?"승인 (정지 해제)":"반려";let n="";if(e==="rejected"){if(n=prompt("반려 사유를 입력해주세요:","서류 미비 (사업자등록증 확인 불가)"),!n)return}else if(!confirm(`가맹점을 ${r} 처리하시겠습니까?`))return;try{await c.patch(`/admin/merchants/${o}/status`,{status:e,reason:n}),y(`${r} 처리가 완료되었습니다.`,"success"),x()}catch(s){y(`처리 실패: ${s.message}`,"error")}};function w(t=!1){const e=document.querySelector(".coupon-tabs-container"),o=e.querySelector(".coupon-tab-pill.active"),r=e.querySelector(".coupon-tab-indicator");o&&r&&(t&&r.style.setProperty("transition","none","important"),r.style.left=`${o.offsetLeft}px`,r.style.width=`${o.offsetWidth}px`,t&&(r.offsetHeight,r.style.removeProperty("transition")))}let p=[],u=[],g=[];async function x(){try{const[t,e,o,r]=await Promise.all([c.get("/admin/merchants?status=pending"),c.get("/admin/merchants?status=approved"),c.get("/admin/merchants?status=rejected"),c.get("/admin/merchants?status=suspended")]);p=t.data||[],l=e.data||[],u=o.data||[],g=r.data||[],C=[...p,...l,...u,...g],document.getElementById("count-pending").textContent=p.length,document.getElementById("count-approved").textContent=l.length,document.getElementById("count-rejected").textContent=u.length,document.getElementById("count-suspended").textContent=g.length;const n=document.getElementById("approved-search").value.toLowerCase().trim(),s=l.filter(i=>h(i,n));v(s,n),$(n),w()}catch(t){console.error("API load failed",t),y("가맹점 목록을 불러오지 못했습니다.","error")}}function h(t,e){if(!e)return!0;const o=(t.rejection_reason||t.reason||"").replace(/\[사유\]/g,"").toLowerCase();return t.name&&t.name.toLowerCase().includes(e)||t.owner_name&&t.owner_name.toLowerCase().includes(e)||t.phone&&t.phone.toLowerCase().includes(e)||t.address&&t.address.toLowerCase().includes(e)||t.category&&t.category.toLowerCase().includes(e)||o.includes(e)}function $(t=""){if(d==="pending"){const e=p.filter(o=>h(o,t));f(e,t)}else if(d==="rejected"){const e=u.filter(o=>h(o,t));f(e,t)}else if(d==="suspended"){const e=g.filter(o=>h(o,t));f(e,t)}}document.getElementById("approved-search").addEventListener("input",t=>{const e=t.target.value.toLowerCase().trim(),o=l.filter(r=>h(r,e));v(o,e),$(e)});document.querySelectorAll(".coupon-tab-pill").forEach(t=>{t.onclick=()=>{document.querySelectorAll(".coupon-tab-pill").forEach(e=>e.classList.remove("active")),t.classList.add("active"),d=t.dataset.status,w(),x()}});x().then(()=>{w(!0),window.addEventListener("resize",()=>w(!0))});
