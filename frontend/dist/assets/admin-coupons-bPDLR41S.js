import"./mock-backend-Cm1IoOFL.js";/* empty css             */import{f as T,a as w,s as m}from"./api-CKTZsajb.js";import{r as D}from"./admin-guard-B2I11LFN.js";await D();let C=[],b=[],I=[],r=1;const E=10;function _(n){if(!n)return"-";const t=new Date(n);if(isNaN(t.getTime()))return"-";const s=t.getFullYear(),e=String(t.getMonth()+1).padStart(2,"0"),a=String(t.getDate()).padStart(2,"0"),l=String(t.getHours()).padStart(2,"0"),u=String(t.getMinutes()).padStart(2,"0");return`${s}.${e}.${a} ${l}:${u}`}function S(n){const t=String(n.code_hash||"").replace(/[^a-zA-Z0-9]/g,"").toUpperCase();if(t.length>=8)return`${t.slice(0,4)}-${t.slice(4,8)}`;const s=String(n.id||0).padStart(8,"0");return`${s.slice(0,4)}-${s.slice(4,8)}`}async function A(){try{const n=await w.get("/admin/issuers");n.success&&n.data&&n.data.issuers&&(C=n.data.issuers,P(C,b))}catch(n){console.error("발행처 목록 로드 실패",n)}}async function h(n=!1){const t=document.getElementById("coupon-status-list");try{const s=await w.get("/admin/coupons/status-list");s.success&&s.data?(b=s.data,P(C,b),window.filterCoupons(n)):(t.innerHTML='<tr><td colspan="7" class="text-center" style="padding: 40px; color: #64748b;">발행된 쿠폰 내역이 없습니다.</td></tr>',document.getElementById("coupon-pagination").style.display="none")}catch(s){console.error("쿠폰 유통 내역 로드 실패",s),t.innerHTML='<tr><td colspan="7" class="text-center" style="padding: 40px; color: #ef4444;">유통 내역 데이터를 불러오지 못했습니다.</td></tr>',document.getElementById("coupon-pagination").style.display="none"}}function H(n){const t=document.getElementById("coupon-status-list"),s=document.getElementById("coupon-pagination");if(!n||n.length===0){t.innerHTML='<tr><td colspan="7" class="text-center" style="padding: 40px; color: #64748b;">조건에 맞는 쿠폰 내역이 없습니다.</td></tr>',s.style.display="none";return}const e=n.length,a=Math.max(1,Math.ceil(e/E));r>a&&(r=a),r<1&&(r=1);const l=(r-1)*E,u=Math.min(l+E,e),i=n.slice(l,u);t.innerHTML=i.map(o=>{const f=S(o);let p="";o.status==="used"?p='<span class="status-text status-used">사용 완료</span>':o.tourist_phone&&o.tourist_phone!=="- (미등록 대기)"?p='<span class="status-text status-registered">등록 완료</span>':p='<span class="status-text status-unregistered">미등록</span>';let d='<span style="color: #94a3b8; font-weight: 500;">-</span>';if(o.tourist_phone&&o.tourist_phone!=="- (미등록 대기)"){const g=o.tourist_phone.replace(/[^0-9]/g,"");g.length>=4?d=`<span style="font-weight: 600; color: var(--text-primary); white-space: nowrap;">${g.substring(g.length-4)}</span>`:d=`<span style="font-weight: 600; color: var(--text-primary); white-space: nowrap;">${c(o.tourist_phone)}</span>`}const M=o.issuer_name?c(o.issuer_name):'<span style="color: #94a3b8;">키오스크 / 기타</span>',y=`${o.issued_at?`<div style="font-size: 0.84rem; color: #64748b; margin-bottom: 3px; font-variant-numeric: tabular-nums;">${_(o.issued_at)}</div>`:""}<div><strong style="color: var(--text-primary);">${M}</strong></div>`;let v='<span style="color: #94a3b8;">-</span>';if(o.status==="used"){const g=o.used_merchant_name?c(o.used_merchant_name):'<span style="color: #94a3b8;">알 수 없음</span>';v=`${o.used_at?`<div style="font-size: 0.84rem; color: #64748b; margin-bottom: 3px; font-variant-numeric: tabular-nums;">${_(o.used_at)}</div>`:""}<div><strong style="color: var(--text-primary);">${g}</strong></div>`}return`
          <tr>
            <td style="font-family: 'Inter', monospace; font-size: 0.86rem; font-weight: 600; color: #475569; letter-spacing: 0.3px; white-space: nowrap;">${f}</td>
            <td>${p}</td>
            <td style="font-weight: 700; color: var(--text-primary); white-space: nowrap;">${T(o.face_value)}</td>
            <td>${d}</td>
            <td>${y}</td>
            <td>${v}</td>
            <td>
              <button type="button" class="btn-manage-row" onclick="window.openCouponManageModal(${o.id})">관리</button>
            </td>
          </tr>
        `}).join(""),R(e,a,l+1,u)}function R(n,t,s,e){const a=document.getElementById("coupon-pagination"),l=document.getElementById("pagination-info"),u=document.getElementById("pagination-controls");a.style.display="flex",l.textContent=`총 ${n.toLocaleString()}건 중 ${s}-${e}건 표시`;const i=5;let o=Math.max(1,r-Math.floor(i/2)),f=Math.min(t,o+i-1);f-o+1<i&&(o=Math.max(1,f-i+1));let p=`
        <button type="button" class="page-btn" onclick="window.goToCouponPage(${r-1})" ${r<=1?"disabled":""}>이전</button>
      `;for(let d=o;d<=f;d++)p+=`
          <button type="button" class="page-btn ${d===r?"active":""}" onclick="window.goToCouponPage(${d})">${d}</button>
        `;p+=`
        <button type="button" class="page-btn" onclick="window.goToCouponPage(${r+1})" ${r>=t?"disabled":""}>다음</button>
      `,u.innerHTML=p}window.goToCouponPage=function(n){r=n,H(I)};function P(n,t){const s=document.getElementById("filter-issuer"),e=s.value,a=new Set;n&&n.length>0&&n.forEach(i=>{const o=i.name||i.issuerName;o&&a.add(o)}),t&&t.length>0&&t.forEach(i=>{i.issuer_name&&a.add(i.issuer_name)});const l=Array.from(a).sort();let u='<option value="all">전체 발행처</option>';l.forEach(i=>{u+=`<option value="${c(i)}">${c(i)}</option>`}),t&&t.some(i=>!i.issuer_name)&&(u+='<option value="none">키오스크 / 기타</option>'),s.innerHTML=u,Array.from(s.options).some(i=>i.value===e)&&(s.value=e)}window.filterCoupons=function(n=!1){const t=document.getElementById("filter-status").value,s=document.getElementById("filter-issuer").value;let e=b;t!=="all"&&(t==="stage1"?e=e.filter(a=>(!a.tourist_phone||a.tourist_phone==="- (미등록 대기)")&&a.status!=="used"):t==="stage2"?e=e.filter(a=>a.tourist_phone&&a.tourist_phone!=="- (미등록 대기)"&&a.status!=="used"):t==="stage3"?e=e.filter(a=>a.status==="used"):e=e.filter(a=>a.status===t)),s!=="all"&&(s==="none"?e=e.filter(a=>!a.issuer_name):e=e.filter(a=>a.issuer_name===s)),I=e,n||(r=1),H(I)};window.formatPhoneInput=function(n){const t=n.value.replace(/\D/g,"").slice(0,11);t.length<=3?n.value=t:t.length<=7?n.value=`${t.slice(0,3)}-${t.slice(3)}`:n.value=`${t.slice(0,3)}-${t.slice(3,7)}-${t.slice(7)}`};function k(n){if(!n)return"-";const t=new Date(n);if(isNaN(t.getTime()))return"-";const s=t.getFullYear(),e=String(t.getMonth()+1).padStart(2,"0"),a=String(t.getDate()).padStart(2,"0");return`${s}.${e}.${a}`}function F(n,t){if(!n)return"-";const s=new Date(n);if(isNaN(s.getTime()))return"-";let e=t?new Date(t):null;return(!e||isNaN(e.getTime()))&&(e=new Date(s),e.setFullYear(e.getFullYear()+1)),`${k(s)} ~ ${k(e)}`}window.openCouponManageModal=function(n){const t=b.find(N=>Number(N.id)===Number(n));if(!t)return;const s=S(t),e=t.status==="used",a=!e&&t.tourist_phone&&t.tourist_phone!=="- (미등록 대기)";let l='<span class="status-text status-unregistered">미등록</span>';e?l='<span class="status-text status-used">사용 완료</span>':a&&(l='<span class="status-text status-registered">등록 완료</span>');const u=e?`<button type="button" class="btn-bottom-action" id="btn-cancel-use" onclick="window.submitCancelCouponUse(${t.id}, '${s}')">사용 취소</button>`:`<button type="button" class="btn-bottom-action" id="btn-mark-used" onclick="window.submitMarkCouponUsed(${t.id}, '${s}')">사용 완료</button>`,i=`<button type="button" class="btn-bottom-action" id="btn-revoke-coupon" onclick="window.submitRevokeCoupon(${t.id}, '${s}')">발급 취소</button>`;let o="-";!e&&!a?o=`<button type="button" class="phone-reg-trigger" onclick="window.showPhoneInlineEditor(${t.id})">번호 등록</button>`:t.tourist_phone&&t.tourist_phone!=="- (미등록 대기)"&&(o=c(t.tourist_phone));const f=t.issuer_name?c(t.issuer_name):"키오스크 / 기타",p=t.issuer_phone?c(t.issuer_phone):"-",d=t.issuer_address?c(t.issuer_address):"-",M=_(t.issued_at),x=F(t.issued_at,t.expires_at),y=e&&t.used_merchant_name&&t.used_merchant_name!=="-"?c(t.used_merchant_name):"-",v=e&&t.used_merchant_phone?c(t.used_merchant_phone):"-",g=e&&t.used_merchant_address?c(t.used_merchant_address):"-",$=e?_(t.used_at):"-";let B=`
        <div class="detail-row">
          <span class="detail-label">사용처</span>
          <span class="detail-value">${y}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">결제일시</span>
          <span class="detail-value">${$}</span>
        </div>
      `;e&&(B=`
          <div class="detail-row">
            <span class="detail-label">사용처</span>
            <span class="detail-value">${y}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">사용처 연락처</span>
            <span class="detail-value">${v}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">사용처 위치</span>
            <span class="detail-value">${g}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">결제일시</span>
            <span class="detail-value">${$}</span>
          </div>
        `);const L=document.getElementById("coupon-modal-body");L.innerHTML=`
        <div class="detail-row">
          <span class="detail-label">쿠폰 번호</span>
          <span class="detail-value" style="font-family: 'Inter', monospace; letter-spacing: 0.3px;">${s}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">상태</span>
          <span class="detail-value">${l}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">쿠폰 금액</span>
          <span class="detail-value">${T(t.face_value)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">유효기간</span>
          <span class="detail-value">${x}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">소유자 번호</span>
          <span class="detail-value" id="owner-row-value">${o}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">발행처</span>
          <span class="detail-value">${f}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">발행처 연락처</span>
          <span class="detail-value">${p}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">발행처 위치</span>
          <span class="detail-value">${d}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">구매일시</span>
          <span class="detail-value">${M}</span>
        </div>
        ${B}
        <div class="modal-bottom-actions">
          ${u}
          ${i}
        </div>
      `,document.getElementById("coupon-manage-modal").classList.add("open")};window.closeCouponManageModal=function(){document.getElementById("coupon-manage-modal").classList.remove("open")};window.submitMarkCouponUsed=async function(n,t){if(!confirm(`[${t}] 쿠폰을 사용 완료 상태로 변경하시겠습니까?`))return;const s=document.getElementById("btn-mark-used");try{s&&(s.disabled=!0);const e=await w.post(`/admin/coupons/${n}/mark-used`,{});e.success&&(m(e.message||"쿠폰이 사용 완료 처리되었습니다.","success"),window.closeCouponManageModal(),await h(!0))}catch(e){m(e.message||"사용 완료 처리에 실패했습니다.","error")}finally{s&&(s.disabled=!1)}};window.showPhoneInlineEditor=function(n){const t=document.getElementById("owner-row-value");if(!t)return;t.innerHTML=`
        <div class="phone-inline-group">
          <input type="tel" id="manual-phone-input" placeholder="010-0000-0000" maxlength="13"
                 oninput="window.formatPhoneInput(this)"
                 onkeydown="if(event.key==='Enter'){event.preventDefault();window.submitManualPhoneRegister(${n});}else if(event.key==='Escape'){window.cancelPhoneInlineEditor(${n});}" />
          <button type="button" class="btn-inline-text" id="btn-manual-reg" onclick="window.submitManualPhoneRegister(${n})">등록</button>
        </div>
      `;const s=document.getElementById("manual-phone-input");s&&s.focus()};window.cancelPhoneInlineEditor=function(n){const t=document.getElementById("owner-row-value");t&&(t.innerHTML=`<button type="button" class="phone-reg-trigger" onclick="window.showPhoneInlineEditor(${n})">번호 등록</button>`)};window.submitManualPhoneRegister=async function(n){const t=document.getElementById("manual-phone-input"),s=document.getElementById("btn-manual-reg"),e=(t?t.value:"").trim(),a=e.replace(/\D/g,"");if(!/^01[0-9]{8,9}$/.test(a)){m("올바른 휴대폰 번호(010-0000-0000)를 입력해 주세요.","error"),t&&t.focus();return}try{s&&(s.disabled=!0);const l=await w.post(`/admin/coupons/${n}/register-phone`,{phone:e});l.success&&(m(l.message||"소유자 번호가 등록되었습니다.","success"),window.closeCouponManageModal(),await h(!0))}catch(l){m(l.message||"번호 등록 처리에 실패했습니다.","error")}finally{s&&(s.disabled=!1)}};window.submitRevokeCoupon=async function(n,t){if(!confirm(`[${t}] 쿠폰 발급을 취소하시겠습니까?
취소 시 해당 쿠폰은 폐기되며 금액은 잔여 예산으로 환원됩니다.`))return;const s=document.getElementById("btn-revoke-coupon");try{s&&(s.disabled=!0);const e=await w.post(`/admin/coupons/${n}/revoke`,{});e.success&&(m(e.message||"쿠폰 발급이 취소되었습니다.","success"),window.closeCouponManageModal(),await h(!0))}catch(e){m(e.message||"쿠폰 발급 취소에 실패했습니다.","error")}finally{s&&(s.disabled=!1)}};window.submitCancelCouponUse=async function(n,t){if(!confirm(`[${t}] 쿠폰의 가맹점 사용 내역을 취소하시겠습니까?
취소 시 쿠폰이 다시 '등록 완료' 상태로 복구됩니다.`))return;const s=document.getElementById("btn-cancel-use");try{s&&(s.disabled=!0);const e=await w.post(`/admin/coupons/${n}/cancel-use`,{});e.success&&(m(e.message||"쿠폰 사용이 취소되어 복구되었습니다.","success"),window.closeCouponManageModal(),await h(!0))}catch(e){m(e.message||"쿠폰 사용 취소에 실패했습니다.","error")}finally{s&&(s.disabled=!1)}};function c(n){const t={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(n||"").replace(/[&<>"']/g,function(s){return t[s]})}A();h();
