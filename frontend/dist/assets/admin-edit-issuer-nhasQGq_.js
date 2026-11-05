import"./mock-backend-a_Dp-F9x.js";/* empty css             */import{s as n,a as w}from"./api-BGCgjaV1.js";import{r as v}from"./admin-guard-H1fWcU3T.js";await v();const y=new URLSearchParams(window.location.search),g=y.get("id");g||(n("잘못된 접근입니다.","error"),setTimeout(()=>{location.href="issuers.html"},1e3));const l=document.getElementById("product-list-container");window.addProductRow=function(e="",r="",t=null){const o=l.querySelectorAll(".product-item").length,d="prod-item-"+Date.now()+"-"+Math.random().toString(36).substr(2,4),c=document.createElement("div");c.className="product-item",c.id=d;const a=t!==""&&t!==null&&t!==void 0&&Number(t)>0;c.dataset.hasOffSeason=a?"true":"false";const s=r!==""&&r!==null&&r!==void 0?Number(r).toLocaleString("ko-KR"):"",u=a?Number(t).toLocaleString("ko-KR"):"";c.innerHTML=`
        <div class="product-grid-row" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <div class="prod-label-row">
              <label>상품명</label>
            </div>
            <input type="text" class="prod-name-input" placeholder="예: 투영관" required value="${S(e)}" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <div class="prod-label-row">
              <label>쿠폰 금액</label>
            </div>
            <div class="input-group">
              <input type="text" class="prod-price-input" placeholder="0" required autocomplete="off" value="${s}" />
              <span class="input-unit">원</span>
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <div class="prod-label-row">
              <label class="off-season-check-label">
                <input type="checkbox" class="prod-off-check" ${a?"checked":""} onchange="window.setProductSeasonMode('${d}', this.checked)" />
                <span>비수기 금액</span>
              </label>
              <span class="prod-del-slot">
                ${o>0?`<button type="button" class="btn-prod-del" onclick="window.removeProductRow('${d}')">삭제</button>`:""}
              </span>
            </div>
            <div class="input-group">
              <input type="text" class="prod-off-price-input" placeholder="${a?"0":"없음"}" ${a?"":"disabled"} autocomplete="off" value="${u}" />
              <span class="input-unit">원</span>
            </div>
          </div>
        </div>
      `,l.appendChild(c),c.querySelectorAll(".prod-price-input, .prod-off-price-input").forEach(m=>{m.addEventListener("input",p=>{const i=p.target.value.replace(/[^0-9]/g,"");p.target.value=i?Number(i).toLocaleString("ko-KR"):""})})};window.setProductSeasonMode=function(e,r){const t=document.getElementById(e);if(!t)return;t.dataset.hasOffSeason=r?"true":"false";const o=t.querySelector(".prod-off-price-input");o&&(r?(o.disabled=!1,o.placeholder="0",o.focus()):(o.disabled=!0,o.value="",o.placeholder="없음"))};window.removeProductRow=function(e){if(l.querySelectorAll(".product-item").length<=1){n("최소 1개 이상의 상품이 필요합니다.","error");return}const t=document.getElementById(e);t&&t.remove(),b()};function b(){l.querySelectorAll(".product-item").forEach((r,t)=>{if(t===0){const o=r.querySelector(".btn-prod-del");o&&o.remove()}})}function S(e){if(!e)return"";const r={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(e).replace(/[&<>"']/g,function(t){return r[t]})}async function E(){try{const e=await w.get(`/admin/issuers/${g}`);if(e.success&&e.data){document.getElementById("issuer-name").value=e.data.name||"",document.getElementById("issuer-phone").value=e.data.phone||"",document.getElementById("issuer-address").value=e.data.address||"",l.innerHTML="";const r=e.data.products||[];r.length>0?r.forEach(t=>{window.addProductRow(t.product_name,t.price,t.off_season_price)}):e.data.product_name?window.addProductRow(e.data.product_name,e.data.product_price,null):window.addProductRow()}else n("발행처 정보를 찾을 수 없습니다.","error")}catch(e){n("발행처 정보 로드 실패: "+e.message,"error")}}window.updateIssuer=async function(e){e.preventDefault();const r=document.getElementById("issuer-name").value.trim(),t=document.getElementById("issuer-phone").value.trim(),o=document.getElementById("issuer-address").value.trim(),d=document.getElementById("issuer-password").value;if(!r){n("기관명을 입력해주세요.","error");return}const c=l.querySelectorAll(".product-item"),a=[];for(const s of c){const u=s.querySelector(".prod-name-input").value.trim(),m=s.querySelector(".prod-price-input").value.replace(/[^0-9]/g,""),p=s.dataset.hasOffSeason==="true",i=s.querySelector(".prod-off-price-input").value.replace(/[^0-9]/g,"");if(!u||!m){n("모든 상품명과 쿠폰 금액을 입력해주세요.","error");return}if(p&&!i){n("비수기 금액을 입력해주세요.","error");return}const f=Number(m),h=p&&i?Number(i):null;if(isNaN(f)||f<0){n("올바른 금액을 입력해주세요.","error");return}a.push({productName:u,price:f,offSeasonPrice:h})}if(a.length===0){n("최소 1개 이상의 상품을 등록해주세요.","error");return}try{const s={name:r,username:r,phone:t,address:o,products:a};d&&(s.password=d);const u=await w.put(`/admin/issuers/${g}`,s);n(u.message||"발행처 정보가 수정되었습니다.","success"),setTimeout(()=>{location.href="issuers.html"},1e3)}catch(s){n(s.message||"수정에 실패했습니다.","error")}};E();
