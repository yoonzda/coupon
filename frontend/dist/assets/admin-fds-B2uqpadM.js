import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as x,c as h,e as R}from"./api-DIUxAG8e.js";import{r as k}from"./admin-guard-DxYVQPuN.js";import"./tracker-D60jFAt5.js";await k();let s=[],u="all";function $(n){if(!n)return"rule-default";const e=n.trim();return e.includes("RULE-001")||e.includes("RAPID_REUSE")?"rule-RULE-001":e.includes("RULE-002")||e.includes("EXCESSIVE_AMOUNT")?"rule-RULE-002":e.includes("RULE-003")||e.includes("OFF_HOURS")?"rule-RULE-003":e.includes("RULE-004")||e.includes("RAPID_MERCHANT")?"rule-RULE-004":e.includes("RULE-005")||e.includes("IMPOSSIBLE_TRAVEL")?"rule-RULE-005":e.includes("RULE-006")||e.includes("PROXY_BULK_USE")?"rule-RULE-006":"rule-default"}function I(n){if(!n)return null;const e=n.trim();return e.includes("RULE-001")||e.includes("RAPID_REUSE")?"rule-card-RULE-001":e.includes("RULE-002")||e.includes("EXCESSIVE_AMOUNT")?"rule-card-RULE-002":e.includes("RULE-003")||e.includes("OFF_HOURS")?"rule-card-RULE-003":e.includes("RULE-004")||e.includes("RAPID_MERCHANT")?"rule-card-RULE-004":e.includes("RULE-005")||e.includes("IMPOSSIBLE_TRAVEL")?"rule-card-RULE-005":e.includes("RULE-006")||e.includes("PROXY_BULK_USE")?"rule-card-RULE-006":null}async function v(){const n=document.getElementById("fds-list");try{const{data:e}=await x.get("/admin/fds");s=Array.isArray(e)?e:[],U(),w()}catch(e){console.error("[FDS] 로드 실패:",e);const t=e.message?.includes("인증")||e.message?.includes("토큰");n.innerHTML=`
          <tr><td colspan="5" style="padding: 60px; text-align: center; color: #ef4444;">
            <div style="font-size: 2rem; margin-bottom: 8px;">${t?"🔒":"⚠️"}</div>
            <strong>${t?"로그인이 필요합니다":"FDS 데이터 로드 실패"}</strong><br>
            <small style="color: #94a3b8; margin-top: 8px; display: block;">${e.message}</small>
            ${t?'<a href="/admin/login.html" style="margin-top:16px; display:inline-block; padding: 8px 20px; background:#3b82f6; color:#fff; border-radius:8px; text-decoration:none;">로그인 페이지로</a>':""}
          </td></tr>`}}function U(){const n=s.length,e=s.filter(d=>!d.resolved).length,t=s.filter(d=>!!d.resolved).length;document.getElementById("kpi-total").textContent=`${n}건`,document.getElementById("kpi-unresolved").textContent=`${e}건`,document.getElementById("kpi-resolved").textContent=`${t}건`,document.getElementById("badge-all").textContent=n,document.getElementById("badge-unresolved").textContent=e,document.getElementById("badge-resolved").textContent=t}function i(n){return n?String(n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}function w(){const n=document.getElementById("fds-list");let e=s;if(u==="unresolved"?e=s.filter(t=>!t.resolved):u==="resolved"&&(e=s.filter(t=>!!t.resolved)),e.length===0){n.innerHTML=`
          <tr><td colspan="5" style="padding: 60px; text-align: center; color: #64748b;">
            <div style="font-size: 2rem; margin-bottom: 8px;">✨</div>
            ${u==="unresolved"?"미결 상태인 이상거래 알림이 없습니다. (모두 조치 완료)":"조회된 이상 거래 내역이 없습니다."}
          </td></tr>`;return}n.innerHTML=e.map(t=>`
          <tr>
            <td>
              <span class="rule-tag ${$(t.rule_id)}" onclick="window.openFdsGuideWithHighlight('${t.rule_id}')" title="클릭 시 이 규칙의 세부 정의와 대응 매뉴얼을 엽니다.">
                <span>🛡️</span> ${t.rule_id||"기타 룰"}
              </span><br>
              <small style="color:#64748b; font-size:0.8rem; margin-top:4px; display:inline-block;">${R(t.detected_at)}</small>
            </td>
            <td>
              <strong style="color:#0f172a; font-size:0.92rem;">${i(t.merchant_name||"미등록 가맹점")}</strong><br>
              <small style="color:#64748b;">이용자: ${i(t.user_nickname||"익명 관광객")} (ID: ${t.user_id||"-"})</small>
            </td>
            <td>
              <div style="font-weight:600; color:#1e293b; line-height:1.45;">${i(t.description||"-")}</div>
              ${t.coupon_id?`<small style="color:#94a3b8; font-size:0.75rem;">쿠폰 식별번호: #${t.coupon_id}</small>`:""}
              ${t.resolved&&t.resolution_note?`
                <div style="margin-top:6px; padding:6px 10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:0.8rem; color:#166534; line-height:1.4;">
                  <strong>📝 조치 메모:</strong> ${i(t.resolution_note)}
                  ${t.resolved_by_name?`<span style="color:#65a30d; margin-left:6px;">(처리자: ${i(t.resolved_by_name)})</span>`:""}
                </div>
              `:""}
            </td>
            <td style="text-align:center;">
              <span class="badge ${t.resolved?"badge-success":"badge-danger"}" style="font-size:0.8rem; padding:4px 10px;">
                ${t.resolved?"해결 완료":"미결 (대기)"}
              </span>
            </td>
            <td style="text-align:center; white-space:nowrap;">
              <div style="display:inline-flex; align-items:center; gap:6px;">
                <button type="button" class="btn btn-neutral-outline btn-xs" onclick="openFdsDetail(${t.id})" style="font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:4px; padding:5px 10px;" title="대상 목록 보기">
                  자세히 보기
                </button>
                ${t.resolved?'<span style="color:#10b981; font-weight:700; font-size:0.8rem; padding:4px 8px; background:#f0fdf4; border-radius:6px;">완료</span>':`<button type="button" class="btn btn-primary-outline btn-xs" onclick="openFdsDetail(${t.id}, true)" style="font-weight:700; border-radius:6px; padding:5px 10px; color:#0284c7; border-color:#0284c7;" title="확인 완료">확인 완료</button>`}
              </div>
            </td>
          </tr>
        `).join("")}const r=document.getElementById("modal-fds-detail"),E=document.getElementById("btn-close-detail");function g(){r&&(r.classList.remove("active"),document.body.style.overflow="")}E&&E.addEventListener("click",g);r&&r.addEventListener("click",n=>{n.target===r&&g()});window.closeDetailModal=g;function y(n){if(!n)return"-";const e=new Date(n);if(isNaN(e.getTime()))return n;const t=d=>String(d).padStart(2,"0");return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())} ${t(e.getHours())}:${t(e.getMinutes())}:${t(e.getSeconds())}`}window.openFdsDetail=async(n,e=!1)=>{const t=document.getElementById("fds-detail-body");if(t){t.innerHTML='<div style="text-align:center; padding:40px; color:#64748b;">데이터를 불러오는 중입니다...</div>',r.classList.add("active"),document.body.style.overflow="hidden";try{const d=await x.get(`/admin/fds/${n}/details`),{alert:o,transactions:a}=d.data;let m="";a&&a.length>0?m=a.map((l,_)=>{const b=l.coupon_type==="paper";return`
              <tr>
                <td style="text-align:center; color:#64748b; font-size:0.85rem; padding:10px;">${_+1}</td>
                <td style="font-size:0.85rem; color:#334155; padding:10px; white-space:nowrap;">${y(l.scanned_at)}</td>
                <td style="padding:10px;">
                  <strong style="color:#0f172a; font-size:0.88rem;">${i(l.merchant_name)}</strong>
                  ${l.merchant_category?`<small style="color:#64748b; margin-left:4px;">(${i(l.merchant_category)})</small>`:""}
                </td>
                <td style="font-size:0.83rem; color:#475569; padding:10px;">${i(l.merchant_address||"-")}</td>
                <td style="font-size:0.83rem; padding:10px; white-space:nowrap;">
                  <span style="background:${b?"#fef3c7":"#ecfdf5"}; color:${b?"#92400e":"#065f46"}; padding:2px 6px; border-radius:4px; font-weight:600; font-size:0.75rem;">
                    ${b?"지류":"모바일"}
                  </span>
                  <span style="color:#64748b; font-size:0.78rem; margin-left:2px;">#${l.coupon_id}</span>
                </td>
                <td style="text-align:right; font-weight:700; color:#0f172a; font-size:0.88rem; padding:10px; white-space:nowrap;">
                  ${Number(l.amount||0).toLocaleString()}원
                </td>
              </tr>
            `}).join(""):m='<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">대상 거래 내역이 없습니다.</td></tr>',t.innerHTML=`
          <!-- 알림 기본 정보 요약 -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 18px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="rule-tag ${$(o.rule_id)}" style="font-size:0.8rem; padding:3px 8px;">
                  ${i(o.rule_id)}
                </span>
                <span class="badge ${o.resolved?"badge-success":"badge-danger"}" style="font-size:0.78rem;">
                  ${o.resolved?"해결 완료":"미결"}
                </span>
              </div>
              <span style="font-size:0.8rem; color:#64748b;">탐지일시: ${y(o.detected_at)}</span>
            </div>
            <div style="font-size:0.92rem; font-weight:700; color:#0f172a; margin-bottom:4px;">
              ${i(o.description||"-")}
            </div>
            <div style="font-size:0.82rem; color:#64748b;">
              대상 이용자: <strong>${i(o.user_nickname||"익명")} (ID: ${o.user_id||"-"})</strong>
            </div>
          </div>

          <!-- 대상 거래 목록 -->
          <div style="margin-bottom:20px;">
            <div style="font-weight:700; font-size:0.9rem; color:#0f172a; margin-bottom:8px;">
              대상 거래 내역 (${a?a.length:0}건)
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
              <table class="admin-table" style="margin:0; width:100%;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="width:40px; text-align:center; padding:10px;">No</th>
                    <th style="width:160px; padding:10px;">결제 일시</th>
                    <th style="padding:10px;">가맹점</th>
                    <th style="padding:10px;">주소</th>
                    <th style="width:105px; padding:10px;">쿠폰</th>
                    <th style="width:95px; text-align:right; padding:10px;">금액</th>
                  </tr>
                </thead>
                <tbody>
                  ${m}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 확인 완료 / 메모 입력 영역 -->
          <div style="border-top:1px solid #e2e8f0; padding-top:16px;">
            ${o.resolved?`
              <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px 16px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                  <strong style="color:#166534; font-size:0.88rem;">확인 완료된 내역</strong>
                  <span style="font-size:0.8rem; color:#15803d;">
                    ${y(o.resolved_at)} ${o.resolved_by_name?`(${i(o.resolved_by_name)})`:""}
                  </span>
                </div>
                <div style="color:#166534; font-size:0.88rem; line-height:1.5;">
                  ${i(o.resolution_note||"(기록된 메모 없음)")}
                </div>
              </div>
              <div style="display:flex; justify-content:flex-end; margin-top:14px;">
                <button type="button" class="btn btn-neutral-outline btn-sm" onclick="closeDetailModal()">닫기</button>
              </div>
            `:`
              <div>
                <label for="fds-resolve-note" style="display:block; font-weight:700; font-size:0.88rem; color:#0f172a; margin-bottom:6px;">
                  확인 메모
                </label>
                <textarea id="fds-resolve-note" rows="3" style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:10px 12px; font-family:inherit; font-size:0.88rem; box-sizing:border-box; resize:vertical;" placeholder="확인 메모를 입력하세요 (선택)"></textarea>
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                  <button type="button" class="btn btn-neutral-outline btn-sm" onclick="closeDetailModal()">취소</button>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-submit-resolve" onclick="submitResolveWithMemo(${o.id})" style="font-weight:700; background:#0284c7; color:#fff; border:none; padding:8px 18px; border-radius:6px; cursor:pointer;">
                    확인 완료
                  </button>
                </div>
              </div>
            `}
          </div>
        `,e&&!o.resolved&&setTimeout(()=>{const l=document.getElementById("fds-resolve-note");l&&l.focus()},150)}catch(d){t.innerHTML=`
          <div style="padding:40px; text-align:center; color:#ef4444;">
            <div style="font-size:2rem; margin-bottom:8px;">⚠️</div>
            <strong>상세 정보 로드 실패</strong><br>
            <small style="color:#64748b;">${i(d.message||"데이터를 불러오는 중 오류가 발생했습니다.")}</small>
          </div>
        `}}};window.submitResolveWithMemo=async n=>{const e=document.getElementById("fds-resolve-note"),t=e?e.value.trim():"";if(!confirm("확인 완료 처리하시겠습니까?"))return;const d=document.getElementById("btn-submit-resolve");d&&(d.disabled=!0);try{await x.patch(`/admin/fds/${n}/resolve`,{note:t}),h("확인 완료 처리되었습니다.","success"),g(),await v()}catch(o){h(o.message||"처리 중 오류가 발생했습니다.","error"),d&&(d.disabled=!1)}};const c=document.getElementById("modal-fds-guide"),z=document.getElementById("btn-open-fds-guide"),B=document.getElementById("btn-close-guide"),M=document.getElementById("btn-modal-confirm");function L(){c.classList.add("active"),document.body.style.overflow="hidden"}function f(){c.classList.remove("active"),document.body.style.overflow="",document.querySelectorAll(".rule-card.highlighted").forEach(n=>n.classList.remove("highlighted"))}window.openFdsGuideWithHighlight=n=>{L();const e=I(n);e&&setTimeout(()=>{const t=document.getElementById(e);t&&(t.scrollIntoView({behavior:"smooth",block:"center"}),t.classList.add("highlighted"),setTimeout(()=>{t.classList.remove("highlighted")},3e3))},150)};z.addEventListener("click",()=>L());B.addEventListener("click",f);M.addEventListener("click",f);c.addEventListener("click",n=>{n.target===c&&f()});window.addEventListener("keydown",n=>{n.key==="Escape"&&c.classList.contains("active")&&f()});document.querySelectorAll(".tab-pill").forEach(n=>{n.addEventListener("click",()=>{document.querySelectorAll(".tab-pill").forEach(e=>e.classList.remove("active")),n.classList.add("active"),u=n.dataset.filter,w()})});v();const p=document.getElementById("btn-refresh-fds");p&&p.addEventListener("click",async()=>{p.disabled=!0;try{await v();let n=document.getElementById("toast-container");n||(n=document.createElement("div"),n.id="toast-container",n.style.cssText="position:fixed; bottom:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:8px;",document.body.appendChild(n));const e=document.createElement("div");e.style.cssText="padding: 10px 16px; border-radius: 6px; background: #0f172a; color: #fff; font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);",e.innerText="FDS 탐지 내역이 새로고침되었습니다.",n.appendChild(e),setTimeout(()=>{e.style.opacity="0",e.style.transition="opacity 0.3s ease",setTimeout(()=>e.remove(),300)},2e3)}catch(n){console.error(n)}finally{p.disabled=!1}});
