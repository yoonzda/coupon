import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as e,s as a,d as o}from"./api-BxOpvEgq.js";import{r as n}from"./admin-guard-CkaXWeUD.js";await n();async function l(){const r=document.getElementById("fds-list");try{const{data:s}=await e.get("/admin/fds");if(!s||s.length===0){r.innerHTML='<tr><td colspan="5" class="text-center" style="padding: 40px; color: #64748b;">탐지된 이상 거래가 없습니다.</td></tr>';return}r.innerHTML=s.map(t=>`
          <tr>
            <td>
              <span class="rule-tag rule-${t.rule_id}">${t.rule_id}</span><br>
              <small style="color: var(--text-muted);">${o(t.detected_at)}</small>
            </td>
            <td>
              <strong style="color: var(--text-primary);">${t.merchant_name||"-"}</strong><br>
              <small style="color: var(--text-secondary);">${t.user_nickname||"익명 사용자"}</small>
            </td>
            <td style="color: var(--text-secondary);">${t.description||"-"}</td>
            <td>
              <span class="badge ${t.resolved?"badge-success":"badge-danger"}">
                ${t.resolved?"해결됨":"미결"}
              </span>
            </td>
            <td>
              ${t.resolved?"-":`<button class="btn-table-edit" onclick="resolveFDS(${t.id})">확인 완료</button>`}
            </td>
          </tr>
        `).join("")}catch(s){console.error("[FDS] 로드 실패:",s),r.innerHTML=`
          <tr><td colspan="5" class="text-center" style="padding: 40px; color: #ef4444;">
            <strong>FDS 데이터 로드 실패</strong><br>
            <small style="color: #94a3b8; margin-top: 8px; display: block;">${s.message}</small>
          </td></tr>`}}window.resolveFDS=async r=>{try{await e.patch(`/admin/fds/${r}/resolve`),a("해결 상태로 변경되었습니다.","success"),l()}catch(s){a(s.message,"error")}};l();
