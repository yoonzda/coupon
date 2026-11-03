import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{r as B,g as I}from"./admin-guard-DxYVQPuN.js";await B();const u=I();let T=15,A=[];window.switchTab=function(e){const a=document.getElementById("tab-btn-managers"),t=document.getElementById("tab-btn-audit"),n=document.getElementById("section-managers"),o=document.getElementById("section-audit"),d=document.getElementById("page-main-title");if(e==="audit"){a.classList.remove("active"),t.classList.add("active"),n.style.display="none",o.style.display="block",d.innerText="개인정보처리시스템 업무 활동 감사 로그 (Audit Trail)";const i=new URL(window.location);i.searchParams.set("tab","audit"),window.history.replaceState({},"",i),E(),loadAuditLogs(1)}else{t.classList.remove("active"),a.classList.add("active"),o.style.display="none",n.style.display="block",d.innerText="관리자 계정 관리";const i=new URL(window.location);i.searchParams.delete("tab"),window.history.replaceState({},"",i),f()}};function x(e){if(e=parseInt(e,10)||0,e===0)return'<span class="dwell-pill instant">순간 접속</span>';if(e<60)return`<span class="dwell-pill ${e>=30?"long":""}">${e}초</span>`;const a=Math.floor(e/60),t=e%60;return`<span class="dwell-pill long">${a}분 ${t>0?t+"초":""}</span>`}function v(e){if(!e)return"-";const a=new Date(e),t=a.getFullYear(),n=String(a.getMonth()+1).padStart(2,"0"),o=String(a.getDate()).padStart(2,"0"),d=String(a.getHours()).padStart(2,"0"),i=String(a.getMinutes()).padStart(2,"0"),c=String(a.getSeconds()).padStart(2,"0");return`${t}.${n}.${o} ${d}:${i}:${c}`}function w(e){switch(e){case"LOGIN":return'<span class="badge badge-login">LOGIN</span>';case"LOGOUT":return'<span class="badge badge-logout">LOGOUT</span>';case"PAGE_VIEW":return'<span class="badge badge-view">조회/체류</span>';case"CREATE":return'<span class="badge badge-create">등록/생성</span>';case"UPDATE":return'<span class="badge badge-update">정보수정</span>';case"DELETE":return'<span class="badge badge-delete">삭제/파기</span>';case"EXPORT":return'<span class="badge badge-export">다운로드</span>';default:return`<span class="badge badge-logout">${e}</span>`}}async function f(){const e=document.getElementById("managersTableBody");try{const t=await(await fetch("/api/admin/managers",{headers:{Authorization:`Bearer ${u}`}})).json();t.success?(A=t.data,document.getElementById("badge-manager-count").innerText=t.data.length,k(t.data),M(t.data)):alert("목록을 불러오는데 실패했습니다: "+t.message)}catch(a){console.error(a),e.innerHTML='<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 24px;">서버 통신 오류가 발생했습니다.</td></tr>'}}function k(e){const a=document.getElementById("managersTableBody");if(a.innerHTML="",e.length===0){a.innerHTML='<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 24px;">등록된 관리자가 없습니다.</td></tr>';return}e.forEach(t=>{const n=document.createElement("tr"),o=t.role==="super"?'<span class="badge badge-super">최고 관리자</span>':'<span class="badge badge-operator">일반 운영자</span>',d=`
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn-action-view" onclick="viewManagerLogs('${t.id}', '${t.username}')" title="해당 관리자의 모든 접속 및 업무 활동 로그를 조회합니다">
              활동 로그
            </button>
            ${t.role!=="super"?`<a href="edit-manager.html?id=${t.id}" class="btn-action-view" style="text-decoration: none;">수정</a>`:""}
          </div>
        `;n.innerHTML=`
          <td style="text-align: center;"><input type="checkbox" class="manager-checkbox" value="${t.id}" style="cursor: pointer;"></td>
          <td style="text-align: center; font-weight: 600;">${t.name}</td>
          <td style="text-align: center; font-family: monospace; font-size: 0.92rem;"><strong>${t.username}</strong></td>
          <td style="text-align: center;">${o}</td>
          <td style="text-align: center; color: #64748b; font-size: 0.82rem;">${v(t.created_at)}</td>
          <td style="text-align: center;">${d}</td>
        `,a.appendChild(n)}),document.getElementById("selectAllManagers").checked=!1}function M(e){const a=document.getElementById("filter-admin");a.innerHTML='<option value="">전체 관리자</option>',e.forEach(t=>{const n=document.createElement("option");n.value=t.id,n.innerText=`${t.name} (${t.username})`,a.appendChild(n)})}window.viewManagerLogs=function(e,a){switchTab("audit"),document.getElementById("filter-admin").value=e,document.getElementById("filter-date-quick").value="all",document.getElementById("filter-start-date").value="",document.getElementById("filter-end-date").value="",loadAuditLogs(1)};async function E(){try{const a=await(await fetch("/api/admin/logs/stats",{headers:{Authorization:`Bearer ${u}`}})).json();if(a.success&&a.stats){const t=a.stats;document.getElementById("stat-today-total").innerText=t.todayTotalActions.toLocaleString(),document.getElementById("stat-today-admins").innerText=t.todayActiveAdmins.toLocaleString(),document.getElementById("stat-today-mod").innerText=t.todayModifications.toLocaleString();const n=t.avgDurationSeconds||0;n>=60?(document.getElementById("stat-avg-dwell").innerText=(n/60).toFixed(1),document.getElementById("stat-avg-unit").innerText="분"):(document.getElementById("stat-avg-dwell").innerText=n,document.getElementById("stat-avg-unit").innerText="초")}}catch(e){console.error("감사 통계 로드 실패",e)}}window.loadAuditLogs=async function(e=1){const a=document.getElementById("auditTableBody");a.innerHTML='<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 24px;">감사 로그를 불러오는 중입니다...</td></tr>';const t=document.getElementById("filter-admin").value,n=document.getElementById("filter-action").value,o=document.getElementById("filter-start-date").value,d=document.getElementById("filter-end-date").value,i=document.getElementById("filter-keyword").value.trim(),c=new URLSearchParams({page:e,limit:T,...t&&{adminId:t},...n&&n!=="ALL"&&{actionType:n},...o&&{startDate:o},...d&&{endDate:d},...i&&{keyword:i}});try{const s=await(await fetch(`/api/admin/logs?${c.toString()}`,{headers:{Authorization:`Bearer ${u}`}})).json();s.success?(S(s.data),_(s.pagination)):a.innerHTML=`<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 24px;">조회 실패: ${s.message}</td></tr>`}catch(l){console.error(l),a.innerHTML='<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 24px;">서버 통신 오류가 발생했습니다.</td></tr>'}};let $=[];function S(e){$=e;const a=document.getElementById("auditTableBody");if(a.innerHTML="",!e||e.length===0){a.innerHTML='<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 32px;">일치하는 업무 감사 로그 기록이 없습니다.</td></tr>';return}e.forEach((t,n)=>{const o=document.createElement("tr"),d=v(t.created_at),i=d.split(" "),c=i.length===2?`<div style="font-weight: 600; color: #1e293b; font-size: 12.5px;">${i[0]}</div>
             <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${i[1]}</div>`:`<span>${d}</span>`,l=`
          <div style="font-weight: 600; color: #0f172a; font-size: 13px; text-align: left;">${r(t.admin_name||t.admin_username)}</div>
          <div style="font-size: 11.5px; color: #64748b; font-family: monospace; margin-top: 2px; text-align: left;">${r(t.admin_username)} (${r(t.admin_role||"admin")})</div>
        `,s=x(t.duration_seconds),m=t.page_title||t.page_url||"-",L=`
          <div style="display: flex; align-items: center; justify-content: flex-start; gap: 6px; text-align: left;">
            <span style="font-weight: 600; color: #1e293b; font-size: 13px; max-width: 175px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r(m)}">
              ${r(m)}
            </span>
            ${s}
          </div>
          <div style="font-size: 11.5px; color: #94a3b8; font-family: monospace; margin-top: 3px; max-width: 230px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;" title="${r(t.page_url)}">
            ${r(t.page_url)}
          </div>
        `;let g=t.action_detail||"-";g.length>70&&(g=g.substring(0,70)+"..."),o.innerHTML=`
          <td style="text-align: center !important; font-family: monospace;">${c}</td>
          <td style="text-align: left !important; padding-left: 18px !important;">${l}</td>
          <td style="text-align: center !important; font-family: monospace; font-size: 12.5px; color: #334155;">${r(t.ip_address)}</td>
          <td style="text-align: center !important;">${w(t.action_type)}</td>
          <td style="text-align: left !important; padding-left: 16px !important;">${L}</td>
          <td style="text-align: left !important; padding-left: 16px !important; font-size: 12.5px; color: #334155; line-height: 1.45;" title="${r(t.action_detail||"")}">
            ${r(g)}
          </td>
          <td style="text-align: center !important;">
            <button type="button" class="btn-action-view" onclick="openAuditModal(${n})">보기</button>
          </td>
        `,a.appendChild(o)})}function r(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function _(e){const a=document.getElementById("pagination-info"),t=document.getElementById("pagination-btns"),n=(e.page-1)*e.limit+1,o=Math.min(e.total,e.page*e.limit);if(a.innerText=`총 ${e.total.toLocaleString()}건 중 ${e.total>0?n:0} - ${o}건 표시`,t.innerHTML="",e.totalPages<=1)return;const d=document.createElement("button");d.className="page-num-btn",d.innerText="‹",d.disabled=e.page<=1,d.onclick=()=>loadAuditLogs(e.page-1),t.appendChild(d);let i=Math.max(1,e.page-2),c=Math.min(e.totalPages,i+4);c-i<4&&(i=Math.max(1,c-4));for(let s=i;s<=c;s++){const m=document.createElement("button");m.className=`page-num-btn ${s===e.page?"active":""}`,m.innerText=s,m.onclick=()=>loadAuditLogs(s),t.appendChild(m)}const l=document.createElement("button");l.className="page-num-btn",l.innerText="›",l.disabled=e.page>=e.totalPages,l.onclick=()=>loadAuditLogs(e.page+1),t.appendChild(l)}window.openAuditModal=function(e){const a=$[e];if(!a)return;const t=document.getElementById("auditDetailModal"),n=document.getElementById("auditModalContent");n.innerHTML=`
        <div class="modal-detail-row">
          <div class="modal-detail-label">로그 번호</div>
          <div class="modal-detail-val">#${a.id}</div>
        </div>
        <div class="modal-detail-row">
          <div class="modal-detail-label">발생 일시</div>
          <div class="modal-detail-val">${v(a.created_at)}</div>
        </div>
        <div class="modal-detail-row">
          <div class="modal-detail-label">수행 관리자</div>
          <div class="modal-detail-val"><strong>${a.admin_name||"-"}</strong> (${a.admin_username}) / ${a.admin_role}</div>
        </div>
        <div class="modal-detail-row">
          <div class="modal-detail-label">접속 IP 주소</div>
          <div class="modal-detail-val">${a.ip_address}</div>
        </div>
        <div class="modal-detail-row">
          <div class="modal-detail-label">행위 구분</div>
          <div class="modal-detail-val">${w(a.action_type)}</div>
        </div>
        <div class="modal-detail-row">
          <div class="modal-detail-label">대상 리소스</div>
          <div class="modal-detail-val">${a.target_resource||"-"} (ID: ${a.target_id||"-"})</div>
        </div>
        <div class="modal-detail-row">
          <div class="modal-detail-label">접속 페이지</div>
          <div class="modal-detail-val">${a.page_title||"-"} (<code>${a.page_url}</code>)</div>
        </div>
        <div class="modal-detail-row">
          <div class="modal-detail-label">체류 시간</div>
          <div class="modal-detail-val">${a.duration_seconds||0}초 (${x(a.duration_seconds)})</div>
        </div>
        <div class="modal-detail-row">
          <div class="modal-detail-label">단말 환경</div>
          <div class="modal-detail-val" style="font-size: 0.78rem; color: #64748b;">${r(a.user_agent||"-")}</div>
        </div>
        <div class="modal-detail-row">
          <div class="modal-detail-label">상세 수행 내역</div>
          <div class="modal-detail-val">
            <pre>${r(a.action_detail||"상세 내역 없음")}</pre>
          </div>
        </div>
      `,t.classList.add("open")};window.closeAuditModal=function(){document.getElementById("auditDetailModal").classList.remove("open")};document.getElementById("auditDetailModal").addEventListener("click",e=>{e.target.id==="auditDetailModal"&&closeAuditModal()});window.applyQuickDate=function(e){const a=document.getElementById("filter-start-date"),t=document.getElementById("filter-end-date"),n=new Date,o=d=>d.toISOString().substring(0,10);if(e==="today")a.value=o(n),t.value=o(n);else if(e==="7days"){const d=new Date;d.setDate(n.getDate()-7),a.value=o(d),t.value=o(n)}else if(e==="month"){const d=new Date(n.getFullYear(),n.getMonth(),1);a.value=o(d),t.value=o(n)}else e==="all"&&(a.value="",t.value="")};document.getElementById("btn-search-logs").addEventListener("click",()=>loadAuditLogs(1));document.getElementById("filter-keyword").addEventListener("keyup",e=>{e.key==="Enter"&&loadAuditLogs(1)});document.getElementById("btn-reset-logs").addEventListener("click",()=>{document.getElementById("filter-admin").value="",document.getElementById("filter-action").value="ALL",document.getElementById("filter-date-quick").value="7days",applyQuickDate("7days"),document.getElementById("filter-keyword").value="",loadAuditLogs(1)});document.getElementById("btn-export-csv").addEventListener("click",async()=>{const e=document.getElementById("filter-admin").value,a=document.getElementById("filter-action").value,t=document.getElementById("filter-start-date").value,n=document.getElementById("filter-end-date").value,o=new URLSearchParams({...e&&{adminId:e},...a&&a!=="ALL"&&{actionType:a},...t&&{startDate:t},...n&&{endDate:n}});try{const d=await fetch(`/api/admin/logs/export?${o.toString()}`,{headers:{Authorization:`Bearer ${u}`}});if(!d.ok)throw new Error("다운로드 실패");const i=await d.blob(),c=window.URL.createObjectURL(i),l=document.createElement("a");l.href=c;const s=new Date().toISOString().substring(0,10);l.download=`ongjin_admin_audit_logs_${s}.csv`,document.body.appendChild(l),l.click(),l.remove(),window.URL.revokeObjectURL(c)}catch(d){alert("CSV 다운로드 중 오류가 발생했습니다: "+d.message)}});const y=document.getElementById("selectAllManagers");y&&y.addEventListener("change",e=>{document.querySelectorAll(".manager-checkbox").forEach(t=>t.checked=e.target.checked)});document.addEventListener("change",e=>{if(e.target.classList.contains("manager-checkbox")){const a=Array.from(document.querySelectorAll(".manager-checkbox")),t=a.length>0&&a.every(n=>n.checked);y&&(y.checked=t)}});const b=document.getElementById("btn-delete-managers");b&&b.addEventListener("click",async()=>{const e=document.querySelectorAll(".manager-checkbox:checked");if(e.length===0)return alert("삭제할 관리자를 선택해주세요.");if(!confirm(`선택한 ${e.length}명의 관리자를 삭제하시겠습니까?`))return;const a=Array.from(e).map(t=>Number(t.value));try{const n=await(await fetch("/api/admin/managers",{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:`Bearer ${u}`},body:JSON.stringify({ids:a})})).json();n.success?(alert("삭제되었습니다."),f()):alert("삭제 실패: "+n.message)}catch(t){console.error(t),alert("서버 오류가 발생했습니다.")}});function h(e,a="info"){let t=document.getElementById("toast-container");t||(t=document.createElement("div"),t.id="toast-container",t.style.cssText="position:fixed; bottom:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:8px;",document.body.appendChild(t));const n=document.createElement("div");n.style.cssText="padding: 10px 16px; border-radius: 6px; background: #0f172a; color: #fff; font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);",n.innerText=e,t.appendChild(n),setTimeout(()=>{n.style.opacity="0",n.style.transition="opacity 0.3s ease",setTimeout(()=>n.remove(),300)},2e3)}const p=document.getElementById("btn-refresh-managers");p&&p.addEventListener("click",async()=>{p.disabled=!0;try{document.getElementById("tab-btn-audit")?.classList.contains("active")?await Promise.all([E(),loadAuditLogs(1)]):await f(),h("데이터가 새로고침되었습니다.","success")}catch(e){console.error(e),h("새로고침 중 오류가 발생했습니다.","error")}finally{p.disabled=!1}});const D=new URLSearchParams(window.location.search);applyQuickDate("7days");D.get("tab")==="audit"?(switchTab("audit"),f()):switchTab("managers");
