import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as d,s as i,b as p}from"./api-cr5AAT4V.js";import{r as u}from"./admin-guard-_dmZlLiC.js";await u();let s="pending";function c(e){const n=document.getElementById("merchant-list");if(!e||e.length===0){n.innerHTML='<tr><td colspan="5" class="text-center" style="padding: 40px; color: #64748b;">내역이 없습니다.</td></tr>';return}n.innerHTML=e.map(t=>{const a=t.applied_at?p(t.applied_at):"-",r=t.status||s;return`
          <tr id="row-${t.id}">
            <td>
              <div style="font-weight:700; font-size:1rem; color: #1e293b;">${t.name||"이름 없음"}</div>
              <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">${t.category||"-"}</div>
            </td>
            <td>${t.phone||"-"}</td>
            <td style="color: #64748b; font-size: 0.85rem; max-width: 250px;">
              ${t.address||"-"}
              ${r==="rejected"&&t.rejection_reason?`
                <div style="margin-top:8px; padding:8px; background:#fff1f2; border-radius:4px; color:#e11d48; font-size:0.75rem;">
                  <strong>반려 사유:</strong> ${t.rejection_reason}
                </div>
              `:""}
            </td>
            <td>${a}</td>
            <td>
              <div class="action-btns">
                ${s==="pending"?`
                  <button class="btn btn-neutral btn-sm" onclick="window.updateMerchantStatus(${t.id}, 'approved')">승인</button>
                  <button class="btn btn-neutral-outline btn-sm" onclick="window.updateMerchantStatus(${t.id}, 'rejected')">반려</button>
                `:`
                  <span class="status-badge status-${r}">
                    ${r==="approved"?"승인완료":"반려됨"}
                  </span>
                `}
              </div>
            </td>
          </tr>
        `}).join("")}window.updateMerchantStatus=async(e,n)=>{const t=Number(e),a=n==="approved"?"승인":"반려";let r="";if(n==="rejected"){if(r=prompt("반려 사유를 입력해주세요:","서류 미비 (사업자등록증 확인 불가)"),!r)return}else if(!confirm(`가맹점을 ${a} 처리하시겠습니까?`))return;try{await d.patch(`/admin/merchants/${t}/status`,{status:n,reason:r}),i(`${a} 처리가 완료되었습니다.`,"success"),l()}catch(o){i(`처리 실패: ${o.message}`,"error")}};async function l(){try{const[e,n,t]=await Promise.all([d.get("/admin/merchants?status=pending"),d.get("/admin/merchants?status=approved"),d.get("/admin/merchants?status=rejected")]),a=e.data||[],r=n.data||[],o=t.data||[];document.getElementById("count-pending").textContent=a.length,document.getElementById("count-approved").textContent=r.length,document.getElementById("count-rejected").textContent=o.length,s==="pending"?c(a):s==="approved"?c(r):s==="rejected"&&c(o)}catch(e){console.error("API load failed",e),i("가맹점 목록을 불러오지 못했습니다.","error")}}document.querySelectorAll(".tab").forEach(e=>{e.onclick=()=>{document.querySelectorAll(".tab").forEach(n=>n.classList.remove("active")),e.classList.add("active"),s=e.dataset.status,l()}});l();
