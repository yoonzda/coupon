import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as m,c as a,f as w}from"./api-DIUxAG8e.js";import{r as $}from"./admin-guard-DxYVQPuN.js";import"./tracker-D60jFAt5.js";await $();let f=[],p=[];async function g(o=!1){try{const n=await m.get("/admin/issuers");if(n.success){const{issuers:e,allocations:t}=n.data;f=e||[],p=t||[],b(f,p),filterAllocations(),o&&a("발행처 데이터가 새로고침되었습니다.","success")}}catch(n){a("데이터 조회에 실패했습니다: "+n.message,"error")}}window.loadData=g;function b(o,n){const e=document.getElementById("issuer-list");if(!o||o.length===0){e.innerHTML='<tr><td colspan="4" class="text-center" style="padding: 30px; color:#64748b;">등록된 발행처가 없습니다.</td></tr>';return}const t=n||[];e.innerHTML=o.map(s=>{const l=t.filter(y=>y.issuer_id===s.id);let d="";if(l.length===0)d='<span style="color: #94a3b8; font-weight: 500;">-</span>';else{const y=l.reduce((r,u)=>r+u.total_count,0),I=l.reduce((r,u)=>r+u.issued_count,0);if(y===0)d='<span style="color: #94a3b8; font-weight: 500;">-</span>';else{const r=Math.round(I/y*100);let u="background: #f1f5f9; color: #475569;";r>=90?u="background: #ffe4e6; color: #b91c1c;":r>0&&(u="background: #ccfbf1; color: #0f766e;"),d=`<span class="badge" style="${u}">${r}%</span>`}}const c=`
          <div style="display: flex; gap: 6px; justify-content: center;">
            <a href="edit-issuer.html?id=${s.id}" class="btn-table-edit">수정</a>
            <button class="btn-table-delete" onclick="window.deleteIssuer(${s.id}, '${i(s.name)}')">삭제</button>
          </div>
        `;return`
          <tr>
            <td style="color: var(--text-primary); font-size: 0.9rem;">${i(s.name)}</td>
            <td style="color: var(--text-secondary); font-size: 0.9rem;">${i(s.username)}</td>
            <td style="color: var(--text-secondary); font-size: 0.9rem;">${d}</td>
            <td>${c}</td>
          </tr>
        `}).join("")}window.deleteIssuer=async function(o,n){const e=p.filter(t=>t.issuer_id===o);if(e.length>0){const t=e.reduce((d,c)=>d+(c.total_count||0),0),s=e.reduce((d,c)=>d+(c.issued_count||0),0),l=t-s;window.openDeleteIssuerModal(o,n,t,s,l);return}if(confirm(`'${n}' 발행처를 정말 삭제하시겠습니까?`))try{const t=await m.delete(`/admin/issuers/${o}`);a(t.message||"발행처가 삭제되었습니다.","success"),g()}catch(t){t.hasAllocations?window.openDeleteIssuerModal(o,n,t.totalCount,t.issuedCount,t.remainingCount):a(t.message||"삭제에 실패했습니다.","error")}};window.openDeleteIssuerModal=function(o,n,e,t,s){document.getElementById("del-issuer-id").value=o,document.getElementById("del-issuer-name").textContent=n,document.getElementById("del-issuer-summary").textContent=`(총 배정 ${e}장 / 발급 ${t}장 / 잔여 ${s}장)`;const l=document.getElementById("del-reassign-target"),d=f.filter(c=>c.id!==o);d.length===0?(l.innerHTML='<option value="">재배정 가능한 다른 발행처가 없습니다.</option>',document.getElementById("del-radio-reassign").disabled=!0,document.getElementById("del-radio-force").checked=!0,window.toggleDelOption()):(document.getElementById("del-radio-reassign").disabled=!1,document.getElementById("del-radio-reassign").checked=!0,l.innerHTML=d.map(c=>`<option value="${c.id}">${i(c.name)} (${c.username})</option>`).join(""),window.toggleDelOption()),document.getElementById("modal-delete-issuer").classList.add("active")};window.closeDeleteIssuerModal=function(){document.getElementById("modal-delete-issuer").classList.remove("active")};window.toggleDelOption=function(){const o=document.getElementById("del-radio-reassign").checked,n=document.getElementById("del-reassign-select-wrap");n&&(n.style.display=o?"block":"none")};window.executeDeleteIssuer=async function(){const o=document.getElementById("del-issuer-id").value,n=document.getElementById("del-radio-reassign").checked,e=document.getElementById("del-reassign-target").value;try{let t;if(n){if(!e){a("재배정할 대상 발행처를 선택해 주세요.","warning");return}t=await m.delete(`/admin/issuers/${o}`,{reassignIssuerId:e})}else t=await m.delete(`/admin/issuers/${o}`,{force:!0});a(t.message||"발행처가 삭제되었습니다.","success"),window.closeDeleteIssuerModal(),g()}catch(t){a(t.message||"삭제 처리에 실패했습니다.","error")}};window.filterAllocations=function(){const o=document.getElementById("filter-alloc").checked;let n=[];f.forEach(e=>{const t=p.filter(s=>s.issuer_id===e.id);t.length===0?n.push({allocationId:null,issuerId:e.id,issuerName:e.name,faceValue:null,issuedCount:null,totalCount:null,remaining:null,isUnallocated:!0}):t.forEach(s=>{n.push({allocationId:s.id,issuerId:e.id,issuerName:e.name,faceValue:s.face_value,issuedCount:s.issued_count||0,totalCount:s.total_count,remaining:Math.max(0,(s.total_count||0)-(s.issued_count||0)),isUnallocated:!1})})}),o&&(n=n.filter(e=>e.isUnallocated||e.remaining!==null&&e.remaining<=e.totalCount*.5)),h(n)};function h(o){const n=document.getElementById("allocation-list");if(!o||o.length===0){document.getElementById("filter-alloc")?.checked?n.innerHTML="":n.innerHTML='<tr><td colspan="6" class="text-center" style="padding: 30px; color:#64748b;">배정된 쿠폰 내역이 없습니다.</td></tr>';return}n.innerHTML=o.map(e=>e.isUnallocated?`
            <tr>
              <td><strong>${i(e.issuerName)}</strong></td>
              <td style="color:#94a3b8;">-</td>
              <td style="color:#94a3b8;">-</td>
              <td style="color:#94a3b8;">-</td>
              <td style="color:#94a3b8;">-</td>
              <td>
                <div style="display: flex; gap: 6px; justify-content: center;">
                  <a href="allocate-coupon.html?issuerId=${e.issuerId}" class="btn-table-edit">신규 배정</a>
                </div>
              </td>
            </tr>
          `:`
            <tr>
              <td><strong>${i(e.issuerName)}</strong></td>
              <td style="color:#0f172a; font-weight:700;">${w(e.faceValue)}</td>
              <td>${e.issuedCount.toLocaleString()}장</td>
              <td style="color: ${e.remaining<=0?"#ef4444":"#10b981"}; font-weight:700;">
                ${e.remaining.toLocaleString()}장
              </td>
              <td style="font-weight:700;">${e.totalCount.toLocaleString()}장</td>
              <td>
                <div style="display: flex; gap: 6px; justify-content: center;">
                  <button type="button" class="btn-table-edit" onclick="window.openEditAllocModal(${e.allocationId}, ${e.issuerId}, ${e.totalCount}, ${e.issuedCount})">재배정/수정</button>
                  <button type="button" class="btn-table-delete" onclick="window.revokeAllocation(${e.allocationId}, '${i(e.issuerName)}', ${e.faceValue}, ${e.issuedCount})">회수</button>
                </div>
              </td>
            </tr>
          `).join("")}window.openEditAllocModal=function(o,n,e,t){document.getElementById("edit-alloc-id").value=o,document.getElementById("edit-alloc-total").value=e,document.getElementById("edit-alloc-total").min=t,document.getElementById("edit-alloc-issued-hint").textContent=`현재 발급 수량: ${t}장 (최소 ${t}장 이상 설정 가능)`;const s=document.getElementById("edit-alloc-issuer");s.innerHTML=f.map(l=>`
        <option value="${l.id}" ${l.id===n?"selected":""}>
          ${i(l.name)} (${i(l.username)})
        </option>
      `).join(""),document.getElementById("modal-edit-alloc").classList.add("active")};window.closeEditAllocModal=function(){document.getElementById("modal-edit-alloc").classList.remove("active")};window.saveEditAlloc=async function(){const o=document.getElementById("edit-alloc-id").value,n=document.getElementById("edit-alloc-issuer").value,e=parseInt(document.getElementById("edit-alloc-total").value,10);if(isNaN(e)||e<1){a("올바른 총 배정 수량을 입력해 주세요.","warning");return}try{const t=await m.put(`/admin/issuers/allocations/${o}`,{targetIssuerId:n,totalCount:e});a(t.message||"쿠폰 배정이 성공적으로 수정되었습니다.","success"),window.closeEditAllocModal(),g()}catch(t){a(t.message||"배정 수정 실패","error")}};window.revokeAllocation=async function(o,n,e,t){const s=t>0?`'${n}'의 ${w(e)} 배정을 회수하시겠습니까?
(이미 발급된 ${t}장의 쿠폰 이력은 안전하게 보존되고 잔여분만 회수됩니다)`:`'${n}'의 ${w(e)} 배정을 회수(삭제)하시겠습니까?`;if(confirm(s))try{const l=await m.delete(`/admin/issuers/allocations/${o}`);a(l.message||"배정이 회수되었습니다.","success"),g()}catch(l){a(l.message||"회수 실패","error")}};function i(o){const n={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(o).replace(/[&<>"']/g,function(e){return n[e]})}g();
