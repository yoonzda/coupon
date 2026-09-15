import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as r,s as o,f as u}from"./api-BrJ7NzZM.js";import{r as f}from"./admin-guard-xv3IhYox.js";await f();let i=[],d=[];async function c(){try{const s=await r.get("/admin/issuers");if(s.success){const{issuers:e,allocations:t}=s.data;i=e||[],d=t||[],window.filterIssuers()}}catch(s){o("데이터 조회에 실패했습니다: "+s.message,"error")}}window.deleteIssuer=async function(s,e){if(confirm(`${e} 발행처 계정을 정말 삭제하시겠습니까?`))try{const t=await r.delete(`/admin/issuers/${s}`);o(t.message||"발행처가 삭제되었습니다.","success"),setTimeout(()=>{c()},1e3)}catch(t){o(t.message||"삭제에 실패했습니다.","error")}};window.filterIssuers=function(){const s=document.getElementById("filter-alloc").checked;let e=[];i.forEach(t=>{const a=d.filter(n=>n.issuer_id===t.id);a.length===0?e.push({issuerId:t.id,issuerName:t.name,faceValue:null,issuedCount:null,totalCount:null,remaining:null,isUnallocated:!0}):a.forEach(n=>{e.push({issuerId:t.id,issuerName:t.name,faceValue:n.face_value,issuedCount:n.issued_count,totalCount:n.total_count,remaining:n.total_count-n.issued_count,isUnallocated:!1})})}),s&&(e=e.filter(t=>t.isUnallocated||t.remaining!==null&&t.remaining<=t.totalCount*.5)),m(e)};function m(s){const e=document.getElementById("issuer-list");if(!s||s.length===0){document.getElementById("filter-alloc")?.checked?e.innerHTML='<tr><td colspan="6" class="text-center" style="padding: 30px; color:#64748b;">조건에 맞는 발행처가 없습니다.</td></tr>':e.innerHTML='<tr><td colspan="6" class="text-center" style="padding: 30px; color:#64748b;">등록된 발행처가 없습니다.</td></tr>';return}e.innerHTML=s.map(t=>{const a=`
          <div style="display: flex; gap: 6px; justify-content: center;">
            <a href="edit-issuer.html?id=${t.issuerId}" class="btn-table-edit">수정</a>
            <button class="btn-table-delete" onclick="window.deleteIssuer(${t.issuerId}, '${l(t.issuerName)}')">삭제</button>
          </div>
        `,n=`
          <a href="detail-issuer.html?id=${t.issuerId}" class="btn-table-edit">보기</a>
        `;return t.isUnallocated?`
            <tr>
              <td>${l(t.issuerName)}</td>
              <td style="color:#94a3b8;">-</td>
              <td style="color:#94a3b8;">-</td>
              <td style="color:#94a3b8;">-</td>
              <td>${n}</td>
              <td>${a}</td>
            </tr>
          `:`
            <tr>
              <td>${l(t.issuerName)}</td>
              <td style="color:#0f172a;">${u(t.faceValue)}</td>
              <td>${t.issuedCount.toLocaleString()}장</td>
              <td style="color: ${t.remaining===0?"#ef4444":"#10b981"};">
                ${t.remaining.toLocaleString()}장
              </td>
              <td>${n}</td>
              <td>${a}</td>
            </tr>
          `}).join("")}function l(s){const e={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(s).replace(/[&<>"']/g,function(t){return e[t]})}c();
