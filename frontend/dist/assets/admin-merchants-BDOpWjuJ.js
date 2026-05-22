import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{s as l,a as g,b}from"./api-CJmOwHvj.js";import{r as w}from"./admin-guard-BQDM6Pi8.js";await w();const i="admin_mock_merchants_v2";let r="pending";const p=[{id:101,business_name:"백령도 사곶 냉면",category:"음식점",contact:"010-1234-5678",address:"인천광역시 옹진군 백령면 사곶로 123",applied_at:new Date(Date.now()-864e5).toISOString(),status:"pending"},{id:102,business_name:"연안부두 회센터",category:"음식점",contact:"010-9876-5432",address:"인천광역시 중구 연안부두로 45",applied_at:new Date(Date.now()-1728e5).toISOString(),status:"pending"},{id:103,business_name:"덕적도 솔숲 민박",category:"숙박업",contact:"010-5555-4444",address:"인천광역시 옹진군 덕적면 솔밭길 89",applied_at:new Date(Date.now()-2592e5).toISOString(),status:"pending"},{id:104,business_name:"대청도 모래사막 카페",category:"관광·레저",contact:"010-1111-2222",address:"인천광역시 옹진군 대청면 대청북로 200",applied_at:new Date(Date.now()-36e5).toISOString(),status:"pending"},{id:105,business_name:"연평도 꽃게 전문점",category:"음식점",contact:"010-3333-7777",address:"인천광역시 옹진군 연평면 연평로 55",applied_at:new Date(Date.now()-72e5).toISOString(),status:"pending"},{id:106,business_name:"영흥도 캠핑장",category:"숙박업",contact:"010-8888-9999",address:"인천광역시 옹진군 영흥면 영흥남로 321",applied_at:new Date(Date.now()-144e5).toISOString(),status:"pending"}];function m(){const e=localStorage.getItem(i);return e?JSON.parse(e):(localStorage.setItem(i,JSON.stringify(p)),p)}window.resetData=()=>{confirm("데이터를 초기화하시겠습니까?")&&(localStorage.removeItem(i),location.reload())};function u(e){const n=document.getElementById("merchant-list");if(!e||e.length===0){n.innerHTML='<tr><td colspan="5" class="text-center" style="padding: 40px; color: #64748b;">내역이 없습니다.</td></tr>';return}n.innerHTML=e.map(t=>{const o=t.applied_at?b(t.applied_at):"-",a=t.status||r;return`
          <tr id="row-${t.id}">
            <td>
              <div style="font-weight:700; font-size:1rem; color: #1e293b;">${t.business_name||t.name||"이름 없음"}</div>
              <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">${t.category||"-"}</div>
            </td>
            <td>${t.contact||t.phone||"-"}</td>
            <td style="color: #64748b; font-size: 0.85rem; max-width: 250px;">
              ${t.address||"-"}
              ${a==="rejected"&&t.rejection_reason?`
                <div style="margin-top:8px; padding:8px; background:#fff1f2; border-radius:4px; color:#e11d48; font-size:0.75rem;">
                  <strong>반려 사유:</strong> ${t.rejection_reason}
                </div>
              `:""}
            </td>
            <td>${o}</td>
            <td>
              <div class="action-btns">
                ${r==="pending"?`
                  <button class="btn btn-neutral btn-sm" onclick="window.updateMerchantStatus(${t.id}, 'approved')">승인</button>
                  <button class="btn btn-neutral-outline btn-sm" onclick="window.updateMerchantStatus(${t.id}, 'rejected')">반려</button>
                `:`
                  <span class="status-badge status-${a}">
                    ${a==="approved"?"승인완료":"반려됨"}
                  </span>
                `}
              </div>
            </td>
          </tr>
        `}).join("")}window.updateMerchantStatus=async(e,n)=>{const t=Number(e),o=n==="approved"?"승인":"반려";let a="";if(n==="rejected"){if(a=prompt("반려 사유를 입력해주세요:","서류 미비 (사업자등록증 확인 불가)"),!a)return}else if(!confirm(`가맹점을 ${o} 처리하시겠습니까?`))return;try{if(t>=100){const s=m(),c=s.findIndex(f=>f.id===t);c>-1&&(s[c].status=n,n==="rejected"&&(s[c].rejection_reason=a),localStorage.setItem(i,JSON.stringify(s)),l(`${o} 처리가 완료되었습니다.`,"success"),d());return}await g.patch(`/admin/merchants/${t}/status`,{status:n,reason:a}),l(`${o} 처리가 완료되었습니다.`,"success"),d()}catch(s){l(`처리 실패: ${s.message}`,"error")}};async function d(){const e=m();document.getElementById("count-pending").textContent=e.filter(t=>t.status==="pending").length,document.getElementById("count-approved").textContent=e.filter(t=>t.status==="approved").length,document.getElementById("count-rejected").textContent=e.filter(t=>t.status==="rejected").length;const n=e.filter(t=>t.status===r);u(n);try{const t=await g.get(`/admin/merchants?status=${r}`);t.data&&u([...n,...t.data])}catch{console.warn("API load skipped")}}document.querySelectorAll(".tab").forEach(e=>{e.onclick=()=>{document.querySelectorAll(".tab").forEach(n=>n.classList.remove("active")),e.classList.add("active"),r=e.dataset.status,d()}});d();
