import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{s as a,a as l,d as i,f as d}from"./api-BrJ7NzZM.js";import{r as u}from"./admin-guard-xv3IhYox.js";await u();const m=new URLSearchParams(window.location.search),n=parseInt(m.get("id"));if(!n)a("올바르지 않은 접근입니다.","error"),setTimeout(()=>{window.location.href="issuers.html"},1500);else{const t=document.getElementById("btn-allocate");t&&(t.onclick=()=>{window.location.href=`allocate-coupon.html?issuerId=${n}`}),f()}async function f(){try{const t=await l.get("/admin/issuers");if(t.success){const{issuers:r,allocations:e}=t.data,o=(r||[]).find(s=>s.id===n);if(!o){a("해당 발행처를 찾을 수 없습니다.","error"),setTimeout(()=>{window.location.href="issuers.html"},1500);return}document.getElementById("profile-name").textContent=o.name,document.getElementById("profile-username").textContent=o.username,document.getElementById("profile-regdate").textContent=i(o.created_at);const c=(e||[]).filter(s=>s.issuer_id===n);y(c)}}catch(t){a("상세 데이터 로딩 실패: "+t.message,"error")}}function y(t){const r=document.getElementById("allocation-history-list");if(!t||t.length===0){r.innerHTML='<tr><td colspan="5" class="text-center" style="padding: 40px; color: #64748b;">배정된 쿠폰 내역이 없습니다.</td></tr>';return}r.innerHTML=t.map(e=>{const o=e.total_count-e.issued_count;return`
          <tr>
            <td style="color: var(--text-secondary); font-size: 0.88rem;">${i(e.created_at)}</td>
            <td style="color: #0f172a; font-weight: 700;">${d(e.face_value)}</td>
            <td style="color: var(--text-primary);">${e.total_count.toLocaleString()}장</td>
            <td style="color: var(--text-primary);">${e.issued_count.toLocaleString()}장</td>
            <td style="color: ${o===0?"#ef4444":"#10b981"}; font-weight: 700;">
              ${o.toLocaleString()}장
            </td>
          </tr>
        `}).join("")}
