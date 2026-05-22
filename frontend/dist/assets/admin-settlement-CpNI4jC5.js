import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as o,s as r,f as d}from"./api-CJmOwHvj.js";import{r as m}from"./admin-guard-BQDM6Pi8.js";await m();async function i(){const e=document.getElementById("filter-year").value.replace("년",""),l=document.getElementById("filter-month").value,s=`${e}-${l}`;try{const{data:n}=await o.get(`/admin/settlements?period=${s}`),a=document.getElementById("settlement-list");if(!n||n.length===0){a.innerHTML=`<tr><td colspan="5" style="padding: 60px; text-align: center; color: #64748b;">
            <div style="font-size: 2rem; margin-bottom: 8px;"></div>
            ${s} 정산 내역이 없습니다.
          </td></tr>`;return}a.innerHTML=n.map(t=>`
          <tr>
            <td><strong>${t.merchant_name}</strong></td>
            <td>${t.period}</td>
            <td>${d(t.total_amount)}</td>
            <td>
              <span class="badge ${t.status==="transferred"?"badge-success":"badge-warning"}">
                ${t.status==="pending"?"대기":t.status==="file_generated"?"파일생성됨":"지급완료"}
              </span>
            </td>
            <td>
              ${t.file_path?`<a href="${t.file_path}" class="btn btn-neutral-outline btn-xs" download>XML 다운로드</a>`:"-"}
            </td>
          </tr>
        `).join("")}catch(n){const a=document.getElementById("settlement-list");a.innerHTML=`<tr><td colspan="5" style="padding: 60px; text-align: center; color: #ef4444;">
          <div style="font-size: 2rem; margin-bottom: 8px;">️</div>
          <strong>정산 내역 조회 실패</strong><br>
          <small style="color: #94a3b8; margin-top: 8px; display:block;">${n.message}</small>
        </td></tr>`}}document.getElementById("btn-search").onclick=i;document.getElementById("btn-generate-file").onclick=async()=>{if(confirm("현재 기간의 가맹점 정산 파일을 일괄 생성하시겠습니까?"))try{const e=await o.post("/admin/settlements/generate");r(e.message,"success"),i()}catch(e){r(e.message,"error")}};
