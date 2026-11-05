import"./mock-backend-a_Dp-F9x.js";/* empty css             */import{s,a as c,d,f as n}from"./api-BGCgjaV1.js";import{r as u}from"./admin-guard-H1fWcU3T.js";await u();const m=new URLSearchParams(window.location.search),a=parseInt(m.get("id"));a?f():(s("올바르지 않은 접근입니다.","error"),setTimeout(()=>{window.location.href="issuers.html"},1500));async function f(){try{const t=await c.get(`/admin/issuers/${a}`);if(t.success&&t.data){const e=t.data;document.getElementById("profile-name").textContent=e.name,document.getElementById("profile-username").textContent=e.username,document.getElementById("profile-regdate").textContent=d(e.created_at),y(e.products||[]),g()}else s("해당 발행처를 찾을 수 없습니다.","error"),setTimeout(()=>{window.location.href="issuers.html"},1500)}catch(t){s("상세 데이터 로딩 실패: "+t.message,"error")}}function y(t){const e=document.getElementById("product-detail-list");if(!t||t.length===0){e.innerHTML='<tr><td colspan="3" class="text-center" style="padding: 30px; color: #64748b;">등록된 상품이 없습니다.</td></tr>';return}e.innerHTML=t.map(o=>`
        <tr>
          <td style="font-weight: 500; color: #1e293b;">${p(o.product_name)}</td>
          <td style="color: #334155; font-weight: 500;">${n(o.price)}</td>
          <td style="font-weight: 600; color: #0f172a;">${o.coupon_face_value?n(o.coupon_face_value):"-"}</td>
        </tr>
      `).join("")}async function g(){try{const t=await c.get("/admin/issuers");if(t.success){const o=(t.data.allocations||[]).filter(r=>r.issuer_id===a);h(o)}}catch(t){console.error(t)}}function p(t){if(!t)return"";const e={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(t).replace(/[&<>"']/g,function(o){return e[o]})}function h(t){const e=document.getElementById("allocation-history-list"),o=(t||[]).filter(r=>Number(r.issued_count||0)>0);if(o.length===0){e.innerHTML='<tr><td colspan="3" class="text-center" style="padding: 40px; color: #64748b;">발행된 쿠폰 내역이 없습니다.</td></tr>';return}e.innerHTML=o.map(r=>{const i=Number(r.issued_count||0),l=Number(r.face_value||0)*i;return`
          <tr>
            <td style="color: #0f172a; font-weight: 700;">${n(r.face_value)}</td>
            <td style="color: var(--text-primary); font-weight: 600;">${i.toLocaleString()}장</td>
            <td style="color: #0f172a; font-weight: 700;">${n(l)}</td>
          </tr>
        `}).join("")}
