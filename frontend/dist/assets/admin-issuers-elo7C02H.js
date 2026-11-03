import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as m,s as o,f as u}from"./api-BxOpvEgq.js";import{r as f}from"./admin-guard-xv3IhYox.js";await f();let p=[];async function v(){try{const e=await m.get("/admin/issuers");if(e.success){const{issuers:a,allocations:s}=e.data,t=s||[];p=(a||[]).map(r=>{const c=t.filter(i=>i.issuer_id===r.id),l=r.products||[];let d=[];return c.length>0&&(d=[...new Set(c.map(i=>i.face_value).filter(Boolean))]),d.length===0&&l.length>0&&(d=[...new Set(l.map(i=>i.coupon_face_value).filter(Boolean))]),{issuerId:r.id,issuerName:r.name,username:r.username,phone:r.phone,address:r.address,products:l,couponValues:d}}),g(p)}}catch(e){o("데이터 조회에 실패했습니다: "+e.message,"error")}}window.deleteIssuer=async function(e,a){if(confirm(`'${a}' 발행처 계정을 정말 삭제하시겠습니까?`))try{const s=await m.delete(`/admin/issuers/${e}`);o(s.message||"발행처가 삭제되었습니다.","success"),setTimeout(()=>{v()},600)}catch(s){o(s.message||"삭제에 실패했습니다.","error")}};window.copyToClipboard=async function(e,a){if(e)try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(e);else{const s=document.createElement("textarea");s.value=e,s.style.position="fixed",s.style.left="-9999px",document.body.appendChild(s),s.focus(),s.select(),document.execCommand("copy"),document.body.removeChild(s)}if(o(`아이디 '${e}'가 복사되었습니다.`,"success"),a){a.classList.add("copied");const s=a.innerHTML;a.innerHTML=`
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>복사됨</span>
          `,setTimeout(()=>{a.classList.remove("copied"),a.innerHTML=s},1500)}}catch{o("복사에 실패했습니다.","error")}};function g(e){const a=document.getElementById("issuer-grid");if(!e||e.length===0){a.innerHTML=`
          <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #fff; border: 1px dashed #cbd5e1; border-radius: 10px; color: #64748b; font-size: 0.95rem;">
            등록된 발행처가 없습니다.
          </div>
        `;return}a.innerHTML=e.map(s=>{let t="";return s.products&&s.products.length>0?t=`
            <div class="issuer-product-list">
              ${s.products.map(r=>{const c=r.price!==void 0&&r.price!==null?u(r.price):"-";return`
                  <div class="issuer-product-row">
                    <span class="issuer-product-name">${n(r.product_name)}</span>
                    <span class="issuer-product-val">${c}</span>
                  </div>
                `}).join("")}
            </div>
          `:s.couponValues&&s.couponValues.length>0?t=`
            <div class="issuer-product-list">
              <div class="issuer-product-row">
                <span class="issuer-product-name">배정 쿠폰</span>
                <span class="issuer-product-val">${s.couponValues.map(r=>u(r)).join(", ")}</span>
              </div>
            </div>
          `:t='<div style="font-size: 0.95rem; color: #94a3b8; padding: 4px 0;">등록된 상품이 없습니다.</div>',`
          <div class="issuer-card">
            <div class="issuer-card-top">
              <h3 class="issuer-card-title">${n(s.issuerName)}</h3>
              <div class="issuer-card-actions">
                <button class="btn-card-del" onclick="window.deleteIssuer(${s.issuerId}, '${n(s.issuerName)}')">삭제</button>
                <a href="edit-issuer.html?id=${s.issuerId}" class="btn-card-edit">수정</a>
              </div>
            </div>

            <div class="issuer-meta-grid">
              <div class="issuer-meta-item">
                <span class="meta-label">아이디</span>
                <span class="meta-val">
                  <span>${n(s.username||"-")}</span>
                  ${s.username?`
                    <button type="button" class="btn-copy-id" onclick="window.copyToClipboard('${n(s.username)}', this)" title="아이디 복사">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span>복사</span>
                    </button>
                  `:""}
                </span>
              </div>
              <div class="issuer-meta-item">
                <span class="meta-label">전화번호</span>
                <span class="meta-val">${n(s.phone||"연락처 미등록")}</span>
              </div>
              <div class="issuer-meta-item">
                <span class="meta-label">위치</span>
                <span class="meta-val">${n(s.address||"위치 미등록")}</span>
              </div>
            </div>

            <div class="issuer-card-divider"></div>

            ${t}
          </div>
        `}).join("")}function n(e){const a={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(e).replace(/[&<>"']/g,function(s){return a[s]})}v();
