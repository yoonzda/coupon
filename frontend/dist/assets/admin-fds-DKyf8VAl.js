import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as x,e as u,c as h}from"./api-DIUxAG8e.js";import{r as R}from"./admin-guard-DxYVQPuN.js";import"./tracker-D60jFAt5.js";await R();let s=[],f="all";function $(t){if(!t)return"rule-default";const e=t.trim();return e.includes("RULE-001")||e.includes("RAPID_REUSE")?"rule-RULE-001":e.includes("RULE-002")||e.includes("EXCESSIVE_AMOUNT")?"rule-RULE-002":e.includes("RULE-003")||e.includes("OFF_HOURS")?"rule-RULE-003":e.includes("RULE-004")||e.includes("RAPID_MERCHANT")?"rule-RULE-004":e.includes("RULE-005")||e.includes("IMPOSSIBLE_TRAVEL")?"rule-RULE-005":e.includes("RULE-006")||e.includes("PROXY_BULK_USE")?"rule-RULE-006":"rule-default"}function k(t){if(!t)return null;const e=t.trim();return e.includes("RULE-001")||e.includes("RAPID_REUSE")?"rule-card-RULE-001":e.includes("RULE-002")||e.includes("EXCESSIVE_AMOUNT")?"rule-card-RULE-002":e.includes("RULE-003")||e.includes("OFF_HOURS")?"rule-card-RULE-003":e.includes("RULE-004")||e.includes("RAPID_MERCHANT")?"rule-card-RULE-004":e.includes("RULE-005")||e.includes("IMPOSSIBLE_TRAVEL")?"rule-card-RULE-005":e.includes("RULE-006")||e.includes("PROXY_BULK_USE")?"rule-card-RULE-006":null}async function v(){const t=document.getElementById("fds-list");try{const{data:e}=await x.get("/admin/fds");s=Array.isArray(e)?e:[],I(),w()}catch(e){console.error("[FDS] 로드 실패:",e);const n=e.message?.includes("인증")||e.message?.includes("토큰");t.innerHTML=`
          <tr><td colspan="5" style="padding: 60px; text-align: center; color: #ef4444;">
            <div style="font-size: 2rem; margin-bottom: 8px;">${n?"🔒":"⚠️"}</div>
            <strong>${n?"로그인이 필요합니다":"FDS 데이터 로드 실패"}</strong><br>
            <small style="color: #94a3b8; margin-top: 8px; display: block;">${e.message}</small>
            ${n?'<a href="/admin/login.html" style="margin-top:16px; display:inline-block; padding: 8px 20px; background:#3b82f6; color:#fff; border-radius:8px; text-decoration:none;">로그인 페이지로</a>':""}
          </td></tr>`}}function I(){const t=s.length,e=s.filter(l=>!l.resolved).length,n=s.filter(l=>!!l.resolved).length;document.getElementById("kpi-total").textContent=`${t}건`,document.getElementById("kpi-unresolved").textContent=`${e}건`,document.getElementById("kpi-resolved").textContent=`${n}건`,document.getElementById("badge-all").textContent=t,document.getElementById("badge-unresolved").textContent=e,document.getElementById("badge-resolved").textContent=n}function d(t){return t?String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}function w(){const t=document.getElementById("fds-list");let e=s;if(f==="unresolved"?e=s.filter(n=>!n.resolved):f==="resolved"&&(e=s.filter(n=>!!n.resolved)),e.length===0){t.innerHTML=`
          <tr><td colspan="5" style="padding: 60px; text-align: center; color: #64748b;">
            <div style="font-size: 2rem; margin-bottom: 8px;">✨</div>
            ${f==="unresolved"?"미결 상태인 이상거래 알림이 없습니다. (모두 조치 완료)":"조회된 이상 거래 내역이 없습니다."}
          </td></tr>`;return}t.innerHTML=e.map(n=>`
          <tr>
            <td>
              <span class="rule-tag ${$(n.rule_id)}" onclick="window.openFdsGuideWithHighlight('${n.rule_id}')" title="클릭 시 이 규칙의 세부 정의와 대응 매뉴얼을 엽니다.">
                <span>🛡️</span> ${n.rule_id||"기타 룰"}
              </span><br>
              <small style="color:#64748b; font-size:0.8rem; margin-top:4px; display:inline-block;">${u(n.detected_at)}</small>
            </td>
            <td>
              <strong style="color:#0f172a; font-size:0.92rem;">${d(n.merchant_name||"미등록 가맹점")}</strong><br>
              <small style="color:#64748b;">이용자: ${d(n.user_nickname||"익명 관광객")} (ID: ${n.user_id||"-"})</small>
            </td>
            <td>
              <div style="font-weight:600; color:#1e293b; line-height:1.45;">${d(n.description||"-")}</div>
              ${n.coupon_id?`<small style="color:#94a3b8; font-size:0.75rem;">쿠폰 식별번호: #${n.coupon_id}</small>`:""}
              ${n.resolved&&n.resolution_note?`
                <div style="margin-top:6px; padding:6px 10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:0.8rem; color:#166534; line-height:1.4;">
                  <strong>📝 조치 메모:</strong> ${d(n.resolution_note)}
                  ${n.resolved_by_name?`<span style="color:#65a30d; margin-left:6px;">(처리자: ${d(n.resolved_by_name)})</span>`:""}
                </div>
              `:""}
            </td>
            <td style="text-align:center;">
              <span class="badge ${n.resolved?"badge-success":"badge-danger"}" style="font-size:0.8rem; padding:4px 10px;">
                ${n.resolved?"해결 완료":"미결 (대기)"}
              </span>
            </td>
            <td style="text-align:center; white-space:nowrap;">
              <div style="display:inline-flex; align-items:center; gap:6px;">
                <button type="button" class="btn btn-neutral-outline btn-xs" onclick="openFdsDetail(${n.id})" style="font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:4px; padding:5px 10px;" title="대상 목록 보기">
                  자세히 보기
                </button>
                ${n.resolved?'<span style="color:#10b981; font-weight:700; font-size:0.8rem; padding:4px 8px; background:#f0fdf4; border-radius:6px;">완료</span>':`<button type="button" class="btn btn-primary-outline btn-xs" onclick="openFdsDetail(${n.id}, true)" style="font-weight:700; border-radius:6px; padding:5px 10px; color:#0284c7; border-color:#0284c7;" title="확인 완료">확인 완료</button>`}
              </div>
            </td>
          </tr>
        `).join("")}const r=document.getElementById("modal-fds-detail"),E=document.getElementById("btn-close-detail");function g(){r&&(r.classList.remove("active"),document.body.style.overflow="")}E&&E.addEventListener("click",g);r&&r.addEventListener("click",t=>{t.target===r&&g()});window.closeDetailModal=g;window.openFdsDetail=async(t,e=!1)=>{const n=document.getElementById("fds-detail-body");if(n){n.innerHTML='<div style="text-align:center; padding:40px; color:#64748b;">데이터를 불러오는 중입니다...</div>',r.classList.add("active"),document.body.style.overflow="hidden";try{const l=await x.get(`/admin/fds/${t}/details`),{alert:o,transactions:a}=l.data;let b="";a&&a.length>0?b=a.map((i,_)=>{const y=i.coupon_type==="paper";return`
              <tr>
                <td style="text-align:center; color:#64748b; font-size:0.85rem; padding:10px;">${_+1}</td>
                <td style="font-size:0.85rem; color:#334155; padding:10px; white-space:nowrap;">${u(i.scanned_at)}</td>
                <td style="padding:10px;">
                  <strong style="color:#0f172a; font-size:0.88rem;">${d(i.merchant_name)}</strong>
                  ${i.merchant_category?`<small style="color:#64748b; margin-left:4px;">(${d(i.merchant_category)})</small>`:""}
                </td>
                <td style="font-size:0.83rem; color:#475569; padding:10px;">${d(i.merchant_address||"-")}</td>
                <td style="font-size:0.83rem; padding:10px; white-space:nowrap;">
                  <span style="background:${y?"#fef3c7":"#ecfdf5"}; color:${y?"#92400e":"#065f46"}; padding:2px 6px; border-radius:4px; font-weight:600; font-size:0.75rem;">
                    ${y?"지류":"모바일"}
                  </span>
                  <span style="color:#64748b; font-size:0.78rem; margin-left:2px;">#${i.coupon_id}</span>
                </td>
                <td style="text-align:right; font-weight:700; color:#0f172a; font-size:0.88rem; padding:10px; white-space:nowrap;">
                  ${Number(i.amount||0).toLocaleString()}원
                </td>
              </tr>
            `}).join(""):b='<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">대상 거래 내역이 없습니다.</td></tr>',n.innerHTML=`
          <!-- 알림 기본 정보 요약 -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 18px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="rule-tag ${$(o.rule_id)}" style="font-size:0.8rem; padding:3px 8px;">
                  ${d(o.rule_id)}
                </span>
                <span class="badge ${o.resolved?"badge-success":"badge-danger"}" style="font-size:0.78rem;">
                  ${o.resolved?"해결 완료":"미결"}
                </span>
              </div>
              <span style="font-size:0.8rem; color:#64748b;">탐지일시: ${u(o.detected_at)}</span>
            </div>
            <div style="font-size:0.92rem; font-weight:700; color:#0f172a; margin-bottom:4px;">
              ${d(o.description||"-")}
            </div>
            <div style="font-size:0.82rem; color:#64748b;">
              대상 이용자: <strong>${d(o.user_nickname||"익명")} (ID: ${o.user_id||"-"})</strong>
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
                    <th style="width:150px; padding:10px;">결제 일시</th>
                    <th style="padding:10px;">가맹점</th>
                    <th style="padding:10px;">주소</th>
                    <th style="width:105px; padding:10px;">쿠폰</th>
                    <th style="width:95px; text-align:right; padding:10px;">금액</th>
                  </tr>
                </thead>
                <tbody>
                  ${b}
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
                    ${u(o.resolved_at)} ${o.resolved_by_name?`(${d(o.resolved_by_name)})`:""}
                  </span>
                </div>
                <div style="color:#166534; font-size:0.88rem; line-height:1.5;">
                  ${d(o.resolution_note||"(기록된 메모 없음)")}
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
        `,e&&!o.resolved&&setTimeout(()=>{const i=document.getElementById("fds-resolve-note");i&&i.focus()},150)}catch(l){n.innerHTML=`
          <div style="padding:40px; text-align:center; color:#ef4444;">
            <div style="font-size:2rem; margin-bottom:8px;">⚠️</div>
            <strong>상세 정보 로드 실패</strong><br>
            <small style="color:#64748b;">${d(l.message||"데이터를 불러오는 중 오류가 발생했습니다.")}</small>
          </div>
        `}}};window.submitResolveWithMemo=async t=>{const e=document.getElementById("fds-resolve-note"),n=e?e.value.trim():"";if(!confirm("확인 완료 처리하시겠습니까?"))return;const l=document.getElementById("btn-submit-resolve");l&&(l.disabled=!0);try{await x.patch(`/admin/fds/${t}/resolve`,{note:n}),h("확인 완료 처리되었습니다.","success"),g(),await v()}catch(o){h(o.message||"처리 중 오류가 발생했습니다.","error"),l&&(l.disabled=!1)}};const c=document.getElementById("modal-fds-guide"),U=document.getElementById("btn-open-fds-guide"),z=document.getElementById("btn-close-guide"),B=document.getElementById("btn-modal-confirm");function L(){c.classList.add("active"),document.body.style.overflow="hidden"}function m(){c.classList.remove("active"),document.body.style.overflow="",document.querySelectorAll(".rule-card.highlighted").forEach(t=>t.classList.remove("highlighted"))}window.openFdsGuideWithHighlight=t=>{L();const e=k(t);e&&setTimeout(()=>{const n=document.getElementById(e);n&&(n.scrollIntoView({behavior:"smooth",block:"center"}),n.classList.add("highlighted"),setTimeout(()=>{n.classList.remove("highlighted")},3e3))},150)};U.addEventListener("click",()=>L());z.addEventListener("click",m);B.addEventListener("click",m);c.addEventListener("click",t=>{t.target===c&&m()});window.addEventListener("keydown",t=>{t.key==="Escape"&&c.classList.contains("active")&&m()});document.querySelectorAll(".tab-pill").forEach(t=>{t.addEventListener("click",()=>{document.querySelectorAll(".tab-pill").forEach(e=>e.classList.remove("active")),t.classList.add("active"),f=t.dataset.filter,w()})});v();const p=document.getElementById("btn-refresh-fds");p&&p.addEventListener("click",async()=>{p.disabled=!0;try{await v();let t=document.getElementById("toast-container");t||(t=document.createElement("div"),t.id="toast-container",t.style.cssText="position:fixed; bottom:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:8px;",document.body.appendChild(t));const e=document.createElement("div");e.style.cssText="padding: 10px 16px; border-radius: 6px; background: #0f172a; color: #fff; font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);",e.innerText="FDS 탐지 내역이 새로고침되었습니다.",t.appendChild(e),setTimeout(()=>{e.style.opacity="0",e.style.transition="opacity 0.3s ease",setTimeout(()=>e.remove(),300)},2e3)}catch(t){console.error(t)}finally{p.disabled=!1}});
