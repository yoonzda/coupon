import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as m,s as l,f as u}from"./api-Ba6NtGBQ.js";import{r as f}from"./admin-guard-xv3IhYox.js";await f();let p=[];async function v(){try{const a=await m.get("/admin/issuers");if(a.success){const{issuers:r,allocations:s}=a.data,n=s||[];p=(r||[]).map(e=>{const c=n.filter(t=>t.issuer_id===e.id),o=e.products||[];let d=[];return c.length>0&&(d=[...new Set(c.map(t=>t.face_value).filter(Boolean))]),d.length===0&&o.length>0&&(d=[...new Set(o.map(t=>t.coupon_face_value).filter(Boolean))]),{issuerId:e.id,issuerName:e.name,username:e.username,phone:e.phone,address:e.address,products:o,couponValues:d}}),g(p)}}catch(a){l("데이터 조회에 실패했습니다: "+a.message,"error")}}window.deleteIssuer=async function(a,r){if(confirm(`'${r}' 발행처 계정을 정말 삭제하시겠습니까?`))try{const s=await m.delete(`/admin/issuers/${a}`);l(s.message||"발행처가 삭제되었습니다.","success"),setTimeout(()=>{v()},600)}catch(s){l(s.message||"삭제에 실패했습니다.","error")}};function g(a){const r=document.getElementById("issuer-grid");if(!a||a.length===0){r.innerHTML=`
          <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #fff; border: 1px dashed #cbd5e1; border-radius: 10px; color: #64748b; font-size: 0.95rem;">
            등록된 발행처가 없습니다.
          </div>
        `;return}r.innerHTML=a.map(s=>{let n="";return s.products&&s.products.length>0?n=`
            <div class="issuer-product-list">
              ${s.products.map(e=>{const c=e.price!==void 0&&e.price!==null?u(e.price):"-";return`
                  <div class="issuer-product-row">
                    <span class="issuer-product-name">${i(e.product_name)}</span>
                    <span class="issuer-product-val">${c}</span>
                  </div>
                `}).join("")}
            </div>
          `:s.couponValues&&s.couponValues.length>0?n=`
            <div class="issuer-product-list">
              <div class="issuer-product-row">
                <span class="issuer-product-name">배정 쿠폰</span>
                <span class="issuer-product-val">${s.couponValues.map(e=>u(e)).join(", ")}</span>
              </div>
            </div>
          `:n='<div style="font-size: 0.95rem; color: #94a3b8; padding: 4px 0;">등록된 상품이 없습니다.</div>',`
          <div class="issuer-card">
            <div class="issuer-card-top">
              <h3 class="issuer-card-title">${i(s.issuerName)}</h3>
              <div class="issuer-card-actions">
                <button class="btn-card-del" onclick="window.deleteIssuer(${s.issuerId}, '${i(s.issuerName)}')">삭제</button>
                <a href="edit-issuer.html?id=${s.issuerId}" class="btn-card-edit">수정</a>
              </div>
            </div>

            <div class="issuer-meta-grid">
              <div class="issuer-meta-item">
                <span class="meta-label">아이디</span>
                <span class="meta-val">${i(s.username||"-")}</span>
              </div>
              <div class="issuer-meta-item">
                <span class="meta-label">전화번호</span>
                <span class="meta-val">${i(s.phone||"연락처 미등록")}</span>
              </div>
              <div class="issuer-meta-item">
                <span class="meta-label">위치</span>
                <span class="meta-val">${i(s.address||"위치 미등록")}</span>
              </div>
            </div>

            <div class="issuer-card-divider"></div>

            ${n}
          </div>
        `}).join("")}function i(a){const r={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(a).replace(/[&<>"']/g,function(s){return r[s]})}v();
