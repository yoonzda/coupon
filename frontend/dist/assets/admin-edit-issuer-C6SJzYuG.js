import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{s,a as g}from"./api-Ba6NtGBQ.js";import{r as y}from"./admin-guard-xv3IhYox.js";await y();const v=new URLSearchParams(window.location.search),p=v.get("id");p||(s("잘못된 접근입니다.","error"),setTimeout(()=>{location.href="issuers.html"},1e3));const u=document.getElementById("product-list-container");window.addProductRow=function(e="",t=""){const r=u.querySelectorAll(".product-item").length,a="prod-item-"+Date.now()+"-"+Math.random().toString(36).substr(2,4),o=document.createElement("div");o.className="product-item",o.id=a;const d=t!==""&&t!==null&&t!==void 0?Number(t).toLocaleString("ko-KR"):"";r===0?o.innerHTML=`
          <div class="form-group">
            <label>상품명</label>
            <input type="text" class="prod-name-input" required value="${f(e)}" />
          </div>
          <div class="form-group">
            <label>금액</label>
            <div class="input-group">
              <input type="text" class="prod-price-input" required autocomplete="off" value="${d}" />
              <span class="input-unit">원</span>
            </div>
          </div>
        `:(o.style.marginTop="24px",o.style.paddingTop="18px",o.style.borderTop="1px dashed #cbd5e1",o.innerHTML=`
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="margin-bottom: 0;">상품명</label>
              <button type="button" onclick="window.removeProductRow('${a}')" style="background: none; border: none; color: #be123c; font-size: 0.82rem; font-weight: 600; cursor: pointer; padding: 2px 4px;">삭제</button>
            </div>
            <input type="text" class="prod-name-input" required value="${f(e)}" />
          </div>
          <div class="form-group">
            <label>금액</label>
            <div class="input-group">
              <input type="text" class="prod-price-input" required autocomplete="off" value="${d}" />
              <span class="input-unit">원</span>
            </div>
          </div>
        `),u.appendChild(o),o.querySelector(".prod-price-input").addEventListener("input",n=>{const i=n.target.value.replace(/[^0-9]/g,"");n.target.value=i?Number(i).toLocaleString("ko-KR"):""})};window.removeProductRow=function(e){if(u.querySelectorAll(".product-item").length<=1){s("최소 1개 이상의 상품이 필요합니다.","error");return}const r=document.getElementById(e);r&&r.remove(),w()};function w(){u.querySelectorAll(".product-item").forEach((t,r)=>{if(r===0){t.style.marginTop="0",t.style.paddingTop="0",t.style.borderTop="none";const a=t.querySelector('button[onclick*="removeProductRow"]');a&&a.remove()}})}function f(e){if(!e)return"";const t={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(e).replace(/[&<>"']/g,function(r){return t[r]})}async function b(){try{const e=await g.get(`/admin/issuers/${p}`);if(e.success&&e.data){document.getElementById("issuer-name").value=e.data.name||"",document.getElementById("issuer-username").value=e.data.username||"",document.getElementById("issuer-phone").value=e.data.phone||"",document.getElementById("issuer-address").value=e.data.address||"",u.innerHTML="";const t=e.data.products||[];t.length>0?t.forEach(r=>{window.addProductRow(r.product_name,r.price)}):e.data.product_name?window.addProductRow(e.data.product_name,e.data.product_price):window.addProductRow()}else s("발행처 정보를 찾을 수 없습니다.","error")}catch(e){s("발행처 정보 로드 실패: "+e.message,"error")}}window.updateIssuer=async function(e){e.preventDefault();const t=document.getElementById("issuer-name").value.trim(),r=document.getElementById("issuer-phone").value.trim(),a=document.getElementById("issuer-address").value.trim(),o=document.getElementById("issuer-password").value;if(!t){s("기관명을 입력해주세요.","error");return}const d=u.querySelectorAll(".product-item"),c=[];for(const n of d){const i=n.querySelector(".prod-name-input").value.trim(),m=n.querySelector(".prod-price-input").value.replace(/[^0-9]/g,"");if(!i||!m){s("모든 상품명과 금액을 입력해주세요.","error");return}const l=Number(m);if(isNaN(l)||l<0){s("올바른 상품 금액을 입력해주세요.","error");return}c.push({productName:i,price:l})}if(c.length===0){s("최소 1개 이상의 상품을 등록해주세요.","error");return}try{const n={name:t,phone:r,address:a,products:c};o&&(n.password=o);const i=await g.put(`/admin/issuers/${p}`,n);s(i.message||"발행처 정보가 수정되었습니다.","success"),setTimeout(()=>{location.href="issuers.html"},1e3)}catch(n){s(n.message||"수정에 실패했습니다.","error")}};b();
