import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{s,a as f}from"./api-Ba6NtGBQ.js";import{r as v}from"./admin-guard-xv3IhYox.js";await v();function y(o,e){const t=document.getElementById(o),r=document.getElementById(e);!t||!r||r.addEventListener("click",()=>{t.type==="password"?(t.type="text",r.innerHTML=`<svg class="eye-icon" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>`):(t.type="password",r.innerHTML=`<svg class="eye-icon" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>`)})}y("issuer-password","pw-toggle-1");y("issuer-password-confirm","pw-toggle-2");const a=document.getElementById("product-list-container");window.addProductRow=function(o="",e=""){const t=a.querySelectorAll(".product-item").length,r="prod-item-"+Date.now()+"-"+Math.random().toString(36).substr(2,4),n=document.createElement("div");n.className="product-item",n.id=r,n.style.marginBottom="20px";const u=e!==""&&e!==null&&e!==void 0?Number(e).toLocaleString("ko-KR"):"";t>0&&(n.style.marginTop="20px",n.style.paddingTop="18px",n.style.borderTop="1px dashed #cbd5e1"),n.innerHTML=`
        <div class="product-grid-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group" style="margin-bottom: 0;">
            <div style="display: flex; align-items: center; margin-bottom: 3px; min-height: 20px;">
              <label style="margin-bottom: 0;">상품명</label>
            </div>
            <input type="text" class="prod-name-input" placeholder="예: 입장권" required value="${h(o)}" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; min-height: 20px;">
              <label style="margin-bottom: 0;">금액</label>
              ${t>0?`<button type="button" onclick="window.removeProductRow('${r}')" style="background: none; border: none; color: #be123c; font-size: 0.82rem; font-weight: 600; cursor: pointer; padding: 0 2px;">삭제</button>`:""}
            </div>
            <div class="input-group">
              <input type="text" class="prod-price-input" placeholder="0" required autocomplete="off" value="${u}" />
              <span class="input-unit">원</span>
            </div>
          </div>
        </div>
      `,a.appendChild(n),n.querySelector(".prod-price-input").addEventListener("input",d=>{const c=d.target.value.replace(/[^0-9]/g,"");d.target.value=c?Number(c).toLocaleString("ko-KR"):""})};window.removeProductRow=function(o){if(a.querySelectorAll(".product-item").length<=1){s("최소 1개 이상의 상품이 필요합니다.","error");return}const t=document.getElementById(o);t&&t.remove(),w()};function w(){a.querySelectorAll(".product-item").forEach((e,t)=>{if(t===0){e.style.marginTop="0",e.style.paddingTop="0",e.style.borderTop="none";const r=e.querySelector('button[onclick*="removeProductRow"]');r&&r.remove()}})}function h(o){if(!o)return"";const e={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(o).replace(/[&<>"']/g,function(t){return e[t]})}window.addProductRow();window.createIssuer=async function(o){o.preventDefault();const e=document.getElementById("issuer-name").value.trim(),t=document.getElementById("issuer-username").value.trim(),r=document.getElementById("issuer-phone").value.trim(),n=document.getElementById("issuer-address").value.trim(),u=document.getElementById("issuer-password").value,l=document.getElementById("issuer-password-confirm").value;if(!e||!t||!u||!l){s("모든 기관 및 계정 정보를 입력해주세요.","error");return}if(u!==l){s("비밀번호가 일치하지 않습니다. 다시 확인해주세요.","error");return}const d=a.querySelectorAll(".product-item"),c=[];for(const i of d){const m=i.querySelector(".prod-name-input").value.trim(),g=i.querySelector(".prod-price-input").value.replace(/[^0-9]/g,"");if(!m||!g){s("모든 상품명과 금액을 입력해주세요.","error");return}const p=Number(g);if(isNaN(p)||p<0){s("올바른 상품 금액을 입력해주세요.","error");return}c.push({productName:m,price:p})}if(c.length===0){s("최소 1개 이상의 상품을 등록해주세요.","error");return}try{const i=await f.post("/admin/issuers",{name:e,username:t,phone:r,address:n,password:u,products:c});i.success?(s("발행처가 성공적으로 등록되었습니다.","success"),setTimeout(()=>{location.href="issuers.html"},1e3)):s(i.message||"발행처 등록에 실패했습니다.","error")}catch(i){console.error("발행처 등록 에러:",i),s("서버 통신 오류가 발생했습니다.","error")}};
