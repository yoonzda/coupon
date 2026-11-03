import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{s as a,a as c,d as i,f as s}from"./api-BxOpvEgq.js";import{r as l}from"./admin-guard-xv3IhYox.js";await l();const d=new URLSearchParams(window.location.search),r=parseInt(d.get("id"));if(!r)a("올바르지 않은 접근입니다.","error"),setTimeout(()=>{window.location.href="issuers.html"},1500);else{const t=document.getElementById("btn-allocate");t&&(t.onclick=()=>{window.location.href=`allocate-coupon.html?issuerId=${r}`}),u()}async function u(){try{const t=await c.get(`/admin/issuers/${r}`);if(t.success&&t.data){const o=t.data;document.getElementById("profile-name").textContent=o.name,document.getElementById("profile-username").textContent=o.username,document.getElementById("profile-regdate").textContent=i(o.created_at),m(o.products||[]),f()}else a("해당 발행처를 찾을 수 없습니다.","error"),setTimeout(()=>{window.location.href="issuers.html"},1500)}catch(t){a("상세 데이터 로딩 실패: "+t.message,"error")}}function m(t){const o=document.getElementById("product-detail-list");if(!t||t.length===0){o.innerHTML='<tr><td colspan="3" class="text-center" style="padding: 30px; color: #64748b;">등록된 상품이 없습니다.</td></tr>';return}o.innerHTML=t.map(e=>`
        <tr>
          <td style="font-weight: 500; color: #1e293b;">${y(e.product_name)}</td>
          <td style="color: #334155; font-weight: 500;">${s(e.price)}</td>
          <td style="font-weight: 600; color: #0f172a;">${e.coupon_face_value?s(e.coupon_face_value):"-"}</td>
        </tr>
      `).join("")}async function f(){try{const t=await c.get("/admin/issuers");if(t.success){const e=(t.data.allocations||[]).filter(n=>n.issuer_id===r);g(e)}}catch(t){console.error(t)}}function y(t){if(!t)return"";const o={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(t).replace(/[&<>"']/g,function(e){return o[e]})}function g(t){const o=document.getElementById("allocation-history-list");if(!t||t.length===0){o.innerHTML='<tr><td colspan="5" class="text-center" style="padding: 40px; color: #64748b;">배정된 쿠폰 내역이 없습니다.</td></tr>';return}o.innerHTML=t.map(e=>{const n=e.total_count-e.issued_count;return`
          <tr>
            <td style="color: var(--text-secondary); font-size: 0.88rem;">${i(e.created_at)}</td>
            <td style="color: #0f172a; font-weight: 700;">${s(e.face_value)}</td>
            <td style="color: var(--text-primary);">${e.total_count.toLocaleString()}장</td>
            <td style="color: var(--text-primary);">${e.issued_count.toLocaleString()}장</td>
            <td style="color: ${n===0?"#ef4444":"#10b981"}; font-weight: 700;">
              ${n.toLocaleString()}장
            </td>
          </tr>
        `}).join("")}
