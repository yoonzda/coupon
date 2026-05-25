import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as m,s as u,f as h}from"./api-cr5AAT4V.js";import{r as $}from"./admin-guard-_dmZlLiC.js";await $();let f=[],y=[];async function p(){try{const e=await m.get("/admin/issuers");if(e.success){const{issuers:n,allocations:t}=e.data;f=n||[],y=t||[],x(f,y),filterAllocations()}}catch(e){u("데이터 조회에 실패했습니다: "+e.message,"error")}}function x(e,n){const t=document.getElementById("issuer-list");if(!e||e.length===0){t.innerHTML='<tr><td colspan="4" class="text-center" style="padding: 30px; color:#64748b;">등록된 발행처가 없습니다.</td></tr>';return}const r=n||[];t.innerHTML=e.map(s=>{const d=r.filter(i=>i.issuer_id===s.id);let c="";if(d.length===0)c='<span style="color: #94a3b8; font-weight: 500;">-</span>';else{const i=d.reduce((l,o)=>l+o.total_count,0),b=d.reduce((l,o)=>l+o.issued_count,0);if(i===0)c='<span style="color: #94a3b8; font-weight: 500;">-</span>';else{const l=Math.round(b/i*100);let o="background: #f1f5f9; color: #475569;";l>=90?o="background: #ffe4e6; color: #b91c1c;":l>0&&(o="background: #ccfbf1; color: #0f766e;"),c=`<span class="badge" style="${o}">${l}%</span>`}}const g=`
          <div style="display: flex; gap: 6px; justify-content: center;">
            <a href="edit-issuer.html?id=${s.id}" class="btn-table-edit">수정</a>
            <button class="btn-table-delete" onclick="window.deleteIssuer(${s.id}, '${a(s.name)}')">삭제</button>
          </div>
        `;return`
          <tr>
            <td style="color: var(--text-primary); font-size: 0.9rem;">${a(s.name)}</td>
            <td style="color: var(--text-secondary); font-size: 0.9rem;">${a(s.username)}</td>
            <td style="color: var(--text-secondary); font-size: 0.9rem;">${c}</td>
            <td>${g}</td>
          </tr>
        `}).join("")}window.deleteIssuer=async function(e,n){if(confirm(`${n} 발행처 계정을 정말 삭제하시겠습니까?`))try{const t=await m.delete(`/admin/issuers/${e}`);u(t.message||"발행처가 삭제되었습니다.","success"),setTimeout(()=>{p()},1e3)}catch(t){u(t.message||"삭제에 실패했습니다.","error")}};window.filterAllocations=function(){const e=document.getElementById("filter-alloc").checked;let n=[];f.forEach(t=>{const r=y.filter(s=>s.issuer_id===t.id);r.length===0?n.push({issuerId:t.id,issuerName:t.name,faceValue:null,issuedCount:null,totalCount:null,remaining:null,isUnallocated:!0}):r.forEach(s=>{n.push({issuerId:t.id,issuerName:t.name,faceValue:s.face_value,issuedCount:s.issued_count,totalCount:s.total_count,remaining:s.total_count-s.issued_count,isUnallocated:!1})})}),e&&(n=n.filter(t=>t.isUnallocated||t.remaining!==null&&t.remaining<=t.totalCount*.5)),I(n)};function I(e){const n=document.getElementById("allocation-list");if(!e||e.length===0){document.getElementById("filter-alloc")?.checked?n.innerHTML="":n.innerHTML='<tr><td colspan="6" class="text-center" style="padding: 30px; color:#64748b;">배정된 쿠폰 내역이 없습니다.</td></tr>';return}n.innerHTML=e.map(t=>t.isUnallocated?`
            <tr>
              <td>${a(t.issuerName)}</td>
              <td style="color:#94a3b8;">-</td>
              <td style="color:#94a3b8;">-</td>
              <td style="color:#94a3b8;">-</td>
              <td style="color:#94a3b8;">-</td>
              <td>
                <div style="display: flex; gap: 6px; justify-content: center;">
                  <a href="allocate-coupon.html?issuerId=${t.issuerId}" class="btn-table-edit">쿠폰 배정</a>
                </div>
              </td>
            </tr>
          `:`
            <tr>
              <td>${a(t.issuerName)}</td>
              <td style="color:#0f172a;">${h(t.faceValue)}</td>
              <td>${t.issuedCount.toLocaleString()}장</td>
              <td style="color: ${t.remaining===0?"#ef4444":"#10b981"};">
                ${t.remaining.toLocaleString()}장
              </td>
              <td>${t.totalCount.toLocaleString()}장</td>
              <td>
                <div style="display: flex; gap: 6px; justify-content: center;">
                  <a href="allocate-coupon.html?issuerId=${t.issuerId}" class="btn-table-edit">쿠폰 배정</a>
                </div>
              </td>
            </tr>
          `).join("")}function a(e){const n={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(e).replace(/[&<>"']/g,function(t){return n[t]})}p();
