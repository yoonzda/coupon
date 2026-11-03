import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as x,e as u,c as k}from"./api-DIUxAG8e.js";import{r as C}from"./admin-guard-DxYVQPuN.js";import"./tracker-D60jFAt5.js";await C();let d=[],f="all";function I(t){if(!t)return"rule-default";const e=t.trim();return e.includes("RULE-001")||e.includes("RAPID_REUSE")?"rule-RULE-001":e.includes("RULE-002")||e.includes("EXCESSIVE_AMOUNT")?"rule-RULE-002":e.includes("RULE-003")||e.includes("OFF_HOURS")?"rule-RULE-003":e.includes("RULE-004")||e.includes("RAPID_MERCHANT")?"rule-RULE-004":e.includes("RULE-005")||e.includes("IMPOSSIBLE_TRAVEL")?"rule-RULE-005":e.includes("RULE-006")||e.includes("PROXY_BULK_USE")?"rule-RULE-006":"rule-default"}function D(t){if(!t)return null;const e=t.trim();return e.includes("RULE-001")||e.includes("RAPID_REUSE")?"rule-card-RULE-001":e.includes("RULE-002")||e.includes("EXCESSIVE_AMOUNT")?"rule-card-RULE-002":e.includes("RULE-003")||e.includes("OFF_HOURS")?"rule-card-RULE-003":e.includes("RULE-004")||e.includes("RAPID_MERCHANT")?"rule-card-RULE-004":e.includes("RULE-005")||e.includes("IMPOSSIBLE_TRAVEL")?"rule-card-RULE-005":e.includes("RULE-006")||e.includes("PROXY_BULK_USE")?"rule-card-RULE-006":null}async function h(){const t=document.getElementById("fds-list");try{const{data:e}=await x.get("/admin/fds");d=Array.isArray(e)?e:[],A(),U()}catch(e){console.error("[FDS] 로드 실패:",e);const n=e.message?.includes("인증")||e.message?.includes("토큰");t.innerHTML=`
          <tr><td colspan="5" style="padding: 60px; text-align: center; color: #ef4444;">
            <div style="font-size: 2rem; margin-bottom: 8px;">${n?"🔒":"⚠️"}</div>
            <strong>${n?"로그인이 필요합니다":"FDS 데이터 로드 실패"}</strong><br>
            <small style="color: #94a3b8; margin-top: 8px; display: block;">${e.message}</small>
            ${n?'<a href="/admin/login.html" style="margin-top:16px; display:inline-block; padding: 8px 20px; background:#3b82f6; color:#fff; border-radius:8px; text-decoration:none;">로그인 페이지로</a>':""}
          </td></tr>`}}function A(){const t=d.length,e=d.filter(l=>!l.resolved).length,n=d.filter(l=>!!l.resolved).length;document.getElementById("kpi-total").textContent=`${t}건`,document.getElementById("kpi-unresolved").textContent=`${e}건`,document.getElementById("kpi-resolved").textContent=`${n}건`,document.getElementById("badge-all").textContent=t,document.getElementById("badge-unresolved").textContent=e,document.getElementById("badge-resolved").textContent=n}function i(t){return t?String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}function U(){const t=document.getElementById("fds-list");let e=d;if(f==="unresolved"?e=d.filter(n=>!n.resolved):f==="resolved"&&(e=d.filter(n=>!!n.resolved)),e.length===0){t.innerHTML=`
          <tr><td colspan="5" style="padding: 60px; text-align: center; color: #64748b;">
            <div style="font-size: 2rem; margin-bottom: 8px;">✨</div>
            ${f==="unresolved"?"미결 상태인 이상거래 알림이 없습니다. (모두 조치 완료)":"조회된 이상 거래 내역이 없습니다."}
          </td></tr>`;return}t.innerHTML=e.map(n=>`
          <tr>
            <td>
              <span class="rule-tag ${I(n.rule_id)}" onclick="window.openFdsGuideWithHighlight('${n.rule_id}')" title="클릭 시 이 규칙의 세부 정의와 대응 매뉴얼을 엽니다.">
                <span>🛡️</span> ${n.rule_id||"기타 룰"}
              </span><br>
              <small style="color:#64748b; font-size:0.8rem; margin-top:4px; display:inline-block;">${u(n.detected_at)}</small>
            </td>
            <td>
              <strong style="color:#0f172a; font-size:0.92rem;">${i(n.merchant_name||"미등록 가맹점")}</strong><br>
              <small style="color:#64748b;">이용자: ${i(n.user_nickname||"익명 관광객")} (ID: ${n.user_id||"-"})</small>
            </td>
            <td>
              <div style="font-weight:600; color:#1e293b; line-height:1.45;">${i(n.description||"-")}</div>
              ${n.coupon_id?`<small style="color:#94a3b8; font-size:0.75rem;">쿠폰 식별번호: #${n.coupon_id}</small>`:""}
              ${n.resolved&&n.resolution_note?`
                <div style="margin-top:6px; padding:6px 10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:0.8rem; color:#166534; line-height:1.4;">
                  <strong>📝 조치 메모:</strong> ${i(n.resolution_note)}
                  ${n.resolved_by_name?`<span style="color:#65a30d; margin-left:6px;">(처리자: ${i(n.resolved_by_name)})</span>`:""}
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
                <button type="button" class="btn btn-neutral-outline btn-xs" onclick="openFdsDetail(${n.id})" style="font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:4px; padding:5px 10px;" title="거래 타임라인 및 상세 분석 보기">
                  🔍 자세히 보기
                </button>
                ${n.resolved?'<span style="color:#10b981; font-weight:700; font-size:0.8rem; padding:4px 8px; background:#f0fdf4; border-radius:6px;">조치 완료</span>':`<button type="button" class="btn btn-primary-outline btn-xs" onclick="openFdsDetail(${n.id}, true)" style="font-weight:700; border-radius:6px; padding:5px 10px; color:#0284c7; border-color:#0284c7;" title="소명 메모 작성 및 확인 완료">확인 완료</button>`}
              </div>
            </td>
          </tr>
        `).join("")}const a=document.getElementById("modal-fds-detail"),z=document.getElementById("btn-close-detail");function m(){a&&(a.classList.remove("active"),document.body.style.overflow="")}z&&z.addEventListener("click",m);a&&a.addEventListener("click",t=>{t.target===a&&m()});window.closeDetailModal=m;window.setResolveMemo=t=>{const e=document.getElementById("fds-resolve-note");e&&(e.value=t,e.focus())};window.openFdsDetail=async(t,e=!1)=>{const n=document.getElementById("fds-detail-body");if(n){n.innerHTML='<div style="text-align:center; padding:50px; color:#64748b;"><div style="font-size:2rem; margin-bottom:8px;">⏳</div>상세 결제 데이터 및 시공간 지리 정보를 분석 중입니다...</div>',a.classList.add("active"),document.body.style.overflow="hidden";try{const l=await x.get(`/admin/fds/${t}/details`),{alert:s,transactions:r}=l.data;let E=!1,$="";if(r&&r.length>=2){const o=r.map(c=>(c.merchant_address||"").split(",")[0].trim()).filter(Boolean);o.length>=2&&o[0]===o[1]&&(E=!0,$=o[0])}let y="";r&&r.length>0?y=`
            <div style="margin-top:20px;">
              <div style="font-size:0.95rem; font-weight:800; color:#0f172a; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
                <span>🕒</span> 연관 결제 시공간 타임라인 (총 ${r.length}건)
              </div>
              <div class="timeline-container">
                ${r.map((o,c)=>{let w="";if(c>0){const B=new Date(r[c-1].scanned_at).getTime(),S=new Date(o.scanned_at).getTime(),_=Math.max(0,Math.round((S-B)/1e3)),R=Math.floor(_/60),T=_%60;w=`
                      <div class="timeline-gap-pill">
                        ⚡ <strong>결제 간격: ${`${R>0?R+"분 ":""}${T}초`}</strong> (5분 이내 결제로 이동 불가 룰 발동)
                      </div>
                    `}const v=o.coupon_type==="paper";return`
                    ${w}
                    <div class="timeline-node">
                      <div class="timeline-dot"></div>
                      <div class="timeline-card">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                          <div>
                            <span style="display:inline-block; padding:2px 8px; background:#e0f2fe; color:#0369a1; border-radius:4px; font-size:0.75rem; font-weight:800; margin-right:6px;">
                              ${c+1}차 결제
                            </span>
                            <strong style="font-size:1rem; color:#0f172a;">${i(o.merchant_name)}</strong>
                            <span style="font-size:0.78rem; color:#64748b; margin-left:4px;">(${i(o.merchant_category||"가맹점")})</span>
                          </div>
                          <span style="font-size:0.82rem; font-weight:700; color:#475569;">
                            ${u(o.scanned_at)}
                          </span>
                        </div>
                        <div style="font-size:0.83rem; color:#475569; margin-bottom:6px; display:flex; align-items:center; gap:4px;">
                          <span>📍</span> <strong>매장 주소:</strong> ${i(o.merchant_address||"주소 정보 없음")}
                        </div>
                        <div style="font-size:0.83rem; color:#334155; display:flex; align-items:center; gap:6px;">
                          <span>🎫</span> <strong>사용 쿠폰:</strong> 
                          <span style="background:${v?"#fef3c7":"#ecfdf5"}; color:${v?"#92400e":"#065f46"}; padding:1px 6px; border-radius:4px; font-weight:700; font-size:0.75rem;">
                            ${v?"지류(종이)쿠폰":"디지털 모바일"}
                          </span>
                          <span>결제금액: <strong>${Number(o.amount||0).toLocaleString()}원</strong> (액면가: ${Number(o.face_value||o.amount||0).toLocaleString()}원)</span>
                          <span style="color:#94a3b8; font-size:0.75rem;">(#${o.coupon_id})</span>
                        </div>
                      </div>
                    </div>
                  `}).join("")}
              </div>
            </div>
          `:y='<div style="padding:20px; text-align:center; color:#94a3b8; background:#f8fafc; border-radius:8px; margin-top:16px;">관련된 상세 거래 기록이 없습니다.</div>';let L="";E&&(L=`
            <div style="background:#eff6ff; border:1.5px solid #93c5fd; border-radius:10px; padding:14px 18px; margin: 16px 0; display:flex; gap:12px; align-items:flex-start;">
              <span style="font-size:24px; line-height:1;">🏬</span>
              <div style="font-size:0.86rem; color:#1e40af; line-height:1.5;">
                <strong style="font-size:0.92rem; color:#1e3a8a;">[지리적 분석 결과: 동일 건물 인접 매장]</strong><br>
                연속 결제가 일어난 두 매장은 동일 지번(<strong>${i($)}</strong>)에 위치해 있습니다.<br>
                물리적 이동이 불가능한 원거리 어뷰징이 아니며, 관광객이 식당 및 인접 카페에서 소액 지류쿠폰을 연속 사용한 <strong>정상적인 관광 소비(오탐, False Positive)</strong>로 확인됩니다.
              </div>
            </div>
          `),n.innerHTML=`
          <!-- 탐지 정보 요약 카드 -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="rule-tag ${I(s.rule_id)}" style="font-size:0.82rem; padding:4px 10px;">
                  🛡️ ${i(s.rule_id)}
                </span>
                <span class="badge ${s.resolved?"badge-success":"badge-danger"}" style="font-size:0.8rem; padding:4px 10px;">
                  ${s.resolved?"해결 완료":"미결 (대기)"}
                </span>
              </div>
              <span style="font-size:0.82rem; color:#64748b;">
                탐지 일시: <strong>${u(s.detected_at)}</strong>
              </span>
            </div>
            <div style="font-size:0.92rem; font-weight:700; color:#0f172a; margin-bottom:4px;">
              ${i(s.description||"이상거래 감지")}
            </div>
            <div style="font-size:0.82rem; color:#64748b;">
              대상 이용자: <strong>${i(s.user_nickname||"익명")} (ID: ${s.user_id||"-"})</strong> · 
              기준 가맹점: <strong>${i(s.merchant_name||"-")}</strong> (${i(s.merchant_category||"-")}, ${i(s.merchant_island||"-")})
            </div>
          </div>

          <!-- 지리적 분석 배너 -->
          ${L}

          <!-- 거래 시공간 타임라인 -->
          ${y}

          <!-- 행정 조치 및 소명 메모 영역 -->
          <div style="margin-top:20px;">
            ${s.resolved?`
              <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:18px 22px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                  <span class="badge badge-success" style="font-size:0.82rem; padding:4px 10px; font-weight:700;">✅ 확인 완료 (소명 종결됨)</span>
                  <span style="font-size:0.8rem; color:#15803d;">
                    처리일시: <strong>${u(s.resolved_at)}</strong> ${s.resolved_by_name?`· 처리자: <strong>${i(s.resolved_by_name)}</strong>`:""}
                  </span>
                </div>
                <div style="background:#fff; border:1px solid #bbf7d0; border-radius:8px; padding:12px 16px; font-size:0.9rem; color:#166534; font-weight:600; line-height:1.6;">
                  📝 <strong>기록된 소명/조치 메모:</strong><br>
                  ${i(s.resolution_note||"소명 메모 없이 확인 완료 처리되었습니다.")}
                </div>
              </div>
            `:`
              <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:12px; padding:20px;">
                <div style="font-weight:800; font-size:0.95rem; color:#0f172a; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                  <span>📝</span> 행정 조치 및 소명 메모 기록
                </div>
                <div style="font-size:0.82rem; color:#64748b; margin-bottom:12px;">
                  향후 군청 감사 및 점검 시 소명 근거가 되도록 확인 내용을 간략히 기록하고 확인 완료합니다.
                </div>

                <div style="font-size:0.8rem; font-weight:700; color:#475569; margin-bottom:6px;">추천 소명 사유 선택 (클릭 시 자동 입력):</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
                  <button type="button" class="memo-chip" onclick="setResolveMemo('동일 건물(덕적북로 32) 내 입점 매장(회나라, 산토니커피) 간 연속 결제로 정상 소명 확인되어 종결 처리함.')">
                    🏬 동일 건물/인접 매장 연속 결제
                  </button>
                  <button type="button" class="memo-chip" onclick="setResolveMemo('가맹점 유선 통화 확인 결과, 관광객의 정상적인 소액 지류쿠폰 결제 건으로 확인되어 종결 처리함.')">
                    📞 가맹점 유선 통화 소명 확인
                  </button>
                  <button type="button" class="memo-chip" onclick="setResolveMemo('현장 지류(종이) 쿠폰 회수 실물 및 결제 영수증 대조 결과 정상 결제로 확인됨.')">
                    🧾 영수증/지류쿠폰 대조 확인
                  </button>
                </div>

                <textarea id="fds-resolve-note" rows="3" style="width:100%; border:1.5px solid #cbd5e1; border-radius:8px; padding:10px 14px; font-family:inherit; font-size:0.88rem; line-height:1.5; box-sizing:border-box; resize:vertical;" placeholder="소명 확인 내용 및 처리 사유를 입력하세요 (예: 동일 건물 내 입점 매장 간 연속 결제로 정상 소명 확인되어 종결 처리함)"></textarea>

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px;">
                  <button type="button" class="btn btn-neutral-outline btn-sm" onclick="closeDetailModal()">닫기</button>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-submit-resolve" onclick="submitResolveWithMemo(${s.id})" style="font-weight:700; background:#0284c7; color:#fff; border:none; padding:8px 22px; border-radius:6px; cursor:pointer;">
                    확인 완료 (해결) 처리
                  </button>
                </div>
              </div>
            `}
          </div>
        `,e&&!s.resolved&&setTimeout(()=>{const o=document.getElementById("fds-resolve-note");o&&o.focus()},200)}catch(l){n.innerHTML=`
          <div style="padding:40px; text-align:center; color:#ef4444;">
            <div style="font-size:2rem; margin-bottom:8px;">⚠️</div>
            <strong>상세 정보 로드 실패</strong><br>
            <small style="color:#64748b;">${i(l.message||"데이터를 불러오는 중 오류가 발생했습니다.")}</small>
          </div>
        `}}};window.submitResolveWithMemo=async t=>{const e=document.getElementById("fds-resolve-note"),n=e?e.value.trim():"";if(!confirm(`해당 이상거래 의심 건에 대해 사실 확인 및 소명이 완료되었습니까?
확인 완료 상태로 변경합니다.`))return;const l=document.getElementById("btn-submit-resolve");l&&(l.disabled=!0);try{await x.patch(`/admin/fds/${t}/resolve`,{note:n}),k("이상거래 의심 건이 확인 완료(해결) 처리되었습니다.","success"),m(),await h()}catch(s){k(s.message||"처리 중 오류가 발생했습니다.","error"),l&&(l.disabled=!1)}};const p=document.getElementById("modal-fds-guide"),F=document.getElementById("btn-open-fds-guide"),H=document.getElementById("btn-close-guide"),P=document.getElementById("btn-modal-confirm");function M(){p.classList.add("active"),document.body.style.overflow="hidden"}function b(){p.classList.remove("active"),document.body.style.overflow="",document.querySelectorAll(".rule-card.highlighted").forEach(t=>t.classList.remove("highlighted"))}window.openFdsGuideWithHighlight=t=>{M();const e=D(t);e&&setTimeout(()=>{const n=document.getElementById(e);n&&(n.scrollIntoView({behavior:"smooth",block:"center"}),n.classList.add("highlighted"),setTimeout(()=>{n.classList.remove("highlighted")},3e3))},150)};F.addEventListener("click",()=>M());H.addEventListener("click",b);P.addEventListener("click",b);p.addEventListener("click",t=>{t.target===p&&b()});window.addEventListener("keydown",t=>{t.key==="Escape"&&p.classList.contains("active")&&b()});document.querySelectorAll(".tab-pill").forEach(t=>{t.addEventListener("click",()=>{document.querySelectorAll(".tab-pill").forEach(e=>e.classList.remove("active")),t.classList.add("active"),f=t.dataset.filter,U()})});h();const g=document.getElementById("btn-refresh-fds");g&&g.addEventListener("click",async()=>{g.disabled=!0;try{await h();let t=document.getElementById("toast-container");t||(t=document.createElement("div"),t.id="toast-container",t.style.cssText="position:fixed; bottom:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:8px;",document.body.appendChild(t));const e=document.createElement("div");e.style.cssText="padding: 10px 16px; border-radius: 6px; background: #0f172a; color: #fff; font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);",e.innerText="FDS 탐지 내역이 새로고침되었습니다.",t.appendChild(e),setTimeout(()=>{e.style.opacity="0",e.style.transition="opacity 0.3s ease",setTimeout(()=>e.remove(),300)},2e3)}catch(t){console.error(t)}finally{g.disabled=!1}});
