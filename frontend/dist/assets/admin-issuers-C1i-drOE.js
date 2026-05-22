import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as l,s as u,b as c,f as g}from"./api-CJmOwHvj.js";import{r as m}from"./admin-guard-BQDM6Pi8.js";await m();let f=[];async function p(){try{const t=await l.get("/admin/issuers");if(t.success){const{issuers:s,allocations:n}=t.data;f=s,$(s),h(n,s)}}catch(t){u("데이터 조회에 실패했습니다: "+t.message,"error")}}function $(t){const s=document.getElementById("issuer-list");if(!t||t.length===0){s.innerHTML='<tr><td colspan="4" class="text-center" style="padding: 30px; color:#64748b;">등록된 발행처가 없습니다.</td></tr>';return}s.innerHTML=t.map(n=>`
        <tr>
          <td><strong>${n.id}</strong></td>
          <td style="font-weight: 700; color: #1e293b;">${a(n.name)}</td>
          <td><code>${a(n.username)}</code></td>
          <td>${c(n.created_at)}</td>
        </tr>
      `).join("")}function h(t,s){const n=document.getElementById("allocation-list");if(!t||t.length===0){n.innerHTML='<tr><td colspan="8" class="text-center" style="padding: 30px; color:#64748b;">배정된 쿠폰 내역이 없습니다.</td></tr>';return}const d={};s.forEach(e=>{d[e.id]=e.name}),n.innerHTML=t.map(e=>{const i=d[e.issuer_id]||`미확인 발행처 (ID: ${e.issuer_id})`,r=e.total_count-e.issued_count;let o="";return r<=0?o='<span class="badge badge-warning">소진 완료</span>':o='<span class="badge badge-success">발행 중</span>',`
          <tr>
            <td><strong>#${e.id}</strong></td>
            <td style="font-weight: 700;">${a(i)}</td>
            <td style="color:#0f172a; font-weight:700;">${g(e.face_value)}</td>
            <td>${e.total_count.toLocaleString()}장</td>
            <td>${e.issued_count.toLocaleString()}장</td>
            <td style="color: ${r===0?"#ef4444":"#10b981"}; font-weight: 700;">
              ${r.toLocaleString()}장
            </td>
            <td>${o}</td>
            <td>${c(e.created_at)}</td>
          </tr>
        `}).join("")}function a(t){const s={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(t).replace(/[&<>"']/g,function(n){return s[n]})}p();
