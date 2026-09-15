import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as n,s as a,d as o}from"./api-BrJ7NzZM.js";import{r as d}from"./admin-guard-xv3IhYox.js";await d();async function r(){const e=document.getElementById("fds-list");try{const{data:s}=await n.get("/admin/fds");if(!s||s.length===0){e.innerHTML=`
            <tr><td colspan="5" style="padding: 60px; text-align: center; color: #64748b;">
              <div style="font-size: 2rem; margin-bottom: 8px;"></div>
              탐지된 이상 거래가 없습니다.
            </td></tr>`;return}e.innerHTML=s.map(t=>`
          <tr>
            <td>
              <span class="rule-tag rule-${t.rule_id}">${t.rule_id}</span><br>
              <small>${o(t.detected_at)}</small>
            </td>
            <td>
              <strong>${t.merchant_name||"-"}</strong><br>
              <small>${t.user_nickname||"익명 사용자"}</small>
            </td>
            <td>${t.description||"-"}</td>
            <td>
              <span class="badge ${t.resolved?"badge-success":"badge-danger"}">
                ${t.resolved?"해결됨":"미결"}
              </span>
            </td>
            <td>
              ${t.resolved?"-":`<button class="btn btn-neutral-outline btn-xs" onclick="resolveFDS(${t.id})">확인 완료</button>`}
            </td>
          </tr>
        `).join("")}catch(s){console.error("[FDS] 로드 실패:",s);const t=s.message?.includes("인증")||s.message?.includes("토큰");e.innerHTML=`
          <tr><td colspan="5" style="padding: 60px; text-align: center; color: #ef4444;">
            <div style="font-size: 2rem; margin-bottom: 8px;">${t?"":"️"}</div>
            <strong>${t?"로그인이 필요합니다":"FDS 데이터 로드 실패"}</strong><br>
            <small style="color: #94a3b8; margin-top: 8px; display: block;">${s.message}</small>
            ${t?'<a href="/tourist/index.html" style="margin-top:16px; display:inline-block; padding: 8px 20px; background:#3b82f6; color:#fff; border-radius:8px; text-decoration:none;">로그인 페이지로</a>':""}
          </td></tr>`}}window.resolveFDS=async e=>{try{await n.patch(`/admin/fds/${e}/resolve`),a("해결 상태로 변경되었습니다.","success"),r()}catch(s){a(s.message,"error")}};r();
