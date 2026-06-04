import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as i,b as l,d as u}from"./api-yYhXsohp.js";import{r as f}from"./admin-guard-D2w6DInN.js";await f();let a="pending",m=[];function d(e){const o=document.getElementById("merchant-list");if(!e||e.length===0){o.innerHTML='<tr><td colspan="7" class="text-center" style="padding: 40px; color: #64748b;">내역이 없습니다.</td></tr>';return}o.innerHTML=e.map(t=>{const n=t.applied_at?u(t.applied_at):"-",r=t.status||a;return`
          <tr id="row-${t.id}">
            <td style="font-weight:700; font-size:0.95rem; color: #1e293b;">${t.name||"이름 없음"}</td>
            <td style="font-size:0.88rem; color:#475569;">${t.category||"-"}</td>
            <td style="font-weight:600; color: #334155; font-size:0.88rem;">${t.owner_name||"-"}</td>
            <td style="font-size:0.88rem; color:#475569;">${t.phone||"-"}</td>
            <td style="color: #64748b; font-size: 0.85rem; max-width: 250px;">
              ${t.address||"-"}
              ${r==="rejected"&&t.rejection_reason?`
                <div style="margin-top:8px; padding:8px; background:#fff1f2; border-radius:4px; color:#e11d48; font-size:0.75rem;">
                  <strong>반려 사유:</strong> ${t.rejection_reason}
                </div>
              `:""}
            </td>
            <td style="font-size:0.85rem; color:#64748b;">${n}</td>
            <td>
              <div class="action-btns">
                <button class="btn btn-neutral btn-sm" onclick="window.showMerchantDetails(${t.id})">상세보기</button>
                ${a==="pending"?`
                  <button class="btn btn-neutral-outline btn-sm" onclick="window.updateMerchantStatus(${t.id}, 'approved')">승인</button>
                `:`
                  <span class="status-badge status-${r}">
                    ${r==="approved"?"승인완료":"반려됨"}
                  </span>
                `}
              </div>
            </td>
          </tr>
        `}).join("")}window.showMerchantDetails=e=>{window.location.href=`detail-merchant.html?id=${e}`};window.updateMerchantStatus=async(e,o)=>{const t=Number(e),n=o==="approved"?"승인":"반려";let r="";if(o==="rejected"){if(r=prompt("반려 사유를 입력해주세요:","서류 미비 (사업자등록증 확인 불가)"),!r)return}else if(!confirm(`가맹점을 ${n} 처리하시겠습니까?`))return;try{await i.patch(`/admin/merchants/${t}/status`,{status:o,reason:r}),l(`${n} 처리가 완료되었습니다.`,"success"),p()}catch(s){l(`처리 실패: ${s.message}`,"error")}};function c(e=!1){const o=document.querySelector(".coupon-tabs-container"),t=o.querySelector(".coupon-tab-pill.active"),n=o.querySelector(".coupon-tab-indicator");t&&n&&(e&&n.style.setProperty("transition","none","important"),n.style.left=`${t.offsetLeft}px`,n.style.width=`${t.offsetWidth}px`,e&&(n.offsetHeight,n.style.removeProperty("transition")))}async function p(){try{const[e,o,t]=await Promise.all([i.get("/admin/merchants?status=pending"),i.get("/admin/merchants?status=approved"),i.get("/admin/merchants?status=rejected")]),n=e.data||[],r=o.data||[],s=t.data||[];m=[...n,...r,...s],document.getElementById("count-pending").textContent=n.length,document.getElementById("count-approved").textContent=r.length,document.getElementById("count-rejected").textContent=s.length,a==="pending"?d(n):a==="approved"?d(r):a==="rejected"&&d(s),c()}catch(e){console.error("API load failed",e),l("가맹점 목록을 불러오지 못했습니다.","error")}}document.querySelectorAll(".coupon-tab-pill").forEach(e=>{e.onclick=()=>{document.querySelectorAll(".coupon-tab-pill").forEach(o=>o.classList.remove("active")),e.classList.add("active"),a=e.dataset.status,c(),p()}});p().then(()=>{c(!0),window.addEventListener("resize",()=>c(!0))});
