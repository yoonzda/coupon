import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{s as n,a as y}from"./api-BxOpvEgq.js";import{r as h}from"./admin-guard-CkaXWeUD.js";await h();function v(o,r){const e=document.getElementById(o),t=document.getElementById(r);!e||!t||t.addEventListener("click",()=>{e.type==="password"?(e.type="text",t.innerHTML=`<svg class="eye-icon" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>`):(e.type="password",t.innerHTML=`<svg class="eye-icon" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>`)})}v("issuer-password","pw-toggle-1");v("issuer-password-confirm","pw-toggle-2");const p=document.getElementById("product-list-container");window.addProductRow=function(o="",r="",e=null){const t=p.querySelectorAll(".product-item").length,i="prod-item-"+Date.now()+"-"+Math.random().toString(36).substr(2,4),c=document.createElement("div");c.className="product-item",c.id=i;const a=e!==""&&e!==null&&e!==void 0&&Number(e)>0;c.dataset.hasOffSeason=a?"true":"false";const l=r!==""&&r!==null&&r!==void 0?Number(r).toLocaleString("ko-KR"):"",s=a?Number(e).toLocaleString("ko-KR"):"";c.innerHTML=`
        <div class="product-grid-row" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <div class="prod-label-row">
              <label>상품명</label>
            </div>
            <input type="text" class="prod-name-input" placeholder="예: 투영관" required value="${E(o)}" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <div class="prod-label-row">
              <label>쿠폰 금액</label>
            </div>
            <div class="input-group">
              <input type="text" class="prod-price-input" placeholder="0" required autocomplete="off" value="${l}" />
              <span class="input-unit">원</span>
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <div class="prod-label-row">
              <label class="off-season-check-label">
                <input type="checkbox" class="prod-off-check" ${a?"checked":""} onchange="window.setProductSeasonMode('${i}', this.checked)" />
                <span>비수기 금액</span>
              </label>
              <span class="prod-del-slot">
                ${t>0?`<button type="button" class="btn-prod-del" onclick="window.removeProductRow('${i}')">삭제</button>`:""}
              </span>
            </div>
            <div class="input-group">
              <input type="text" class="prod-off-price-input" placeholder="${a?"0":"없음"}" ${a?"":"disabled"} autocomplete="off" value="${s}" />
              <span class="input-unit">원</span>
            </div>
          </div>
        </div>
      `,p.appendChild(c),c.querySelectorAll(".prod-price-input, .prod-off-price-input").forEach(m=>{m.addEventListener("input",u=>{const d=u.target.value.replace(/[^0-9]/g,"");u.target.value=d?Number(d).toLocaleString("ko-KR"):""})})};window.setProductSeasonMode=function(o,r){const e=document.getElementById(o);if(!e)return;e.dataset.hasOffSeason=r?"true":"false";const t=e.querySelector(".prod-off-price-input");t&&(r?(t.disabled=!1,t.placeholder="0",t.focus()):(t.disabled=!0,t.value="",t.placeholder="없음"))};window.removeProductRow=function(o){if(p.querySelectorAll(".product-item").length<=1){n("최소 1개 이상의 상품이 필요합니다.","error");return}const e=document.getElementById(o);e&&e.remove(),b()};function b(){p.querySelectorAll(".product-item").forEach((r,e)=>{if(e===0){const t=r.querySelector(".btn-prod-del");t&&t.remove()}})}function E(o){if(!o)return"";const r={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(o).replace(/[&<>"']/g,function(e){return r[e]})}window.addProductRow();window.createIssuer=async function(o){o.preventDefault();const r=document.getElementById("issuer-name").value.trim(),e=document.getElementById("issuer-phone").value.trim(),t=document.getElementById("issuer-address").value.trim(),i=document.getElementById("issuer-password").value,c=document.getElementById("issuer-password-confirm").value;if(!r||!i||!c){n("기관명과 비밀번호를 입력해주세요.","error");return}if(i!==c){n("비밀번호가 일치하지 않습니다. 다시 확인해주세요.","error");return}const a=p.querySelectorAll(".product-item"),l=[];for(const s of a){const m=s.querySelector(".prod-name-input").value.trim(),u=s.querySelector(".prod-price-input").value.replace(/[^0-9]/g,""),d=s.dataset.hasOffSeason==="true",f=s.querySelector(".prod-off-price-input").value.replace(/[^0-9]/g,"");if(!m||!u){n("모든 상품명과 쿠폰 금액을 입력해주세요.","error");return}if(d&&!f){n("비수기 금액을 입력해주세요.","error");return}const g=Number(u),w=d&&f?Number(f):null;if(isNaN(g)||g<0){n("올바른 금액을 입력해주세요.","error");return}l.push({productName:m,price:g,offSeasonPrice:w})}if(l.length===0){n("최소 1개 이상의 상품을 등록해주세요.","error");return}try{const s=await y.post("/admin/issuers",{name:r,username:r,phone:e,address:t,password:i,products:l});s.success?(n("발행처가 성공적으로 등록되었습니다.","success"),setTimeout(()=>{location.href="issuers.html"},1e3)):n(s.message||"발행처 등록에 실패했습니다.","error")}catch(s){console.error("발행처 등록 에러:",s),n(s.message||"서버 통신 오류가 발생했습니다.","error")}};
