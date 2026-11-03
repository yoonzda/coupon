import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{r as T,g as E}from"./admin-guard-DxYVQPuN.js";await T();const d=document.getElementById("usersTableBody"),m=document.getElementById("search-input"),g=E();let w=[],u="all";function h(n){if(n==null)return"";const t={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(n).replace(/[&<>"']/g,e=>t[e])}function p(n){if(!n)return"—";const t=new Date(n);if(isNaN(t.getTime()))return"—";const e=t.getFullYear(),a=String(t.getMonth()+1).padStart(2,"0"),s=String(t.getDate()).padStart(2,"0"),r=String(t.getHours()).padStart(2,"0"),o=String(t.getMinutes()).padStart(2,"0");return`${e}.${a}.${s} ${r}:${o}`}function L(n,t="info"){let e=document.getElementById("toast-container");e||(e=document.createElement("div"),e.id="toast-container",document.body.appendChild(e));const a=document.createElement("div");a.className=`toast ${t}`,a.style.cssText="padding: 10px 16px; border-radius: 6px; background: #0f172a; color: #fff; font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 8px; animation: slideUp 0.25s ease;",a.innerText=n,e.appendChild(a),setTimeout(()=>{a.style.opacity="0",a.style.transition="opacity 0.3s ease",setTimeout(()=>a.remove(),300)},2200)}window.loadUsers=c;async function c(n=!1){const t=document.getElementById("btn-refresh-users");t&&(t.disabled=!0);try{const a=await(await fetch("/api/admin/users",{headers:{Authorization:`Bearer ${g}`}})).json();a.success?(w=a.data||[],a.summary&&(document.getElementById("stat-total-users").innerText=`${Number(a.summary.total).toLocaleString()}명`,document.getElementById("stat-active-users").innerText=`${Number(a.summary.active).toLocaleString()}명`,document.getElementById("stat-withdrawn-users").innerText=`${Number(a.summary.withdrawn).toLocaleString()}명`,document.getElementById("stat-with-coupons").innerText=`${Number(a.summary.withCoupons).toLocaleString()}명`,document.getElementById("tab-count-all").innerText=a.summary.total,document.getElementById("tab-count-active").innerText=a.summary.active,document.getElementById("tab-count-withdrawn").innerText=a.summary.withdrawn),f(),n&&L("회원 목록이 새로고침되었습니다.","success")):alert("회원 목록을 불러오는데 실패했습니다: "+a.message)}catch(e){console.error(e),alert("서버 오류가 발생했습니다.")}finally{t&&(t.disabled=!1)}}function f(){const n=(m?.value||"").trim().toLowerCase(),t=w.filter(e=>{if(u==="active"&&e.status!=="active"||u==="withdrawn"&&e.status!=="withdrawn")return!1;if(!n)return!0;const a=(e.nickname||"").toLowerCase(),s=(e.email||"").toLowerCase(),r=(e.phone_hash||"").toLowerCase(),o=(e.last_login_ip||"").toLowerCase(),l=e.phone_last4||"",i=n.replace(/[^0-9]/g,"");return i&&(l.includes(i)||a.includes(i))?!0:a.includes(n)||s.includes(n)||r.includes(n)||o.includes(n)});B(t)}function B(n){if(d.innerHTML="",n.length===0){d.innerHTML='<tr><td colspan="6" class="table-placeholder">조건에 맞는 회원이 없습니다.</td></tr>';return}n.forEach(t=>{const e=document.createElement("tr");e.id="user-row-"+t.id,e.classList.add("row-clickable");const a=t.social_provider==="kakao"?'<span class="badge" style="background:#fef08a; color:#854d0e; margin-right:8px; font-weight:600;">카카오</span>':t.social_provider==="naver"?'<span class="badge" style="background:#dcfce7; color:#15803d; margin-right:8px; font-weight:600;">네이버</span>':t.social_provider==="google"?'<span class="badge badge-gray" style="margin-right:8px; font-weight:600;">구글</span>':'<span class="badge badge-info" style="margin-right:8px; font-weight:600;">휴대폰</span>',s=t.nickname||"미인증 회원",r=t.email?`<div style="font-size:12px; color:var(--adm-text-sub); margin-top:2px;">${h(t.email)}</div>`:"",o=t.status==="withdrawn",l=o?`<div>
           <span class="badge badge-danger">탈퇴</span>
           <div style="font-size:11.5px; color:var(--adm-danger); margin-top:2px;" title="${h(t.withdrawn_reason||"탈퇴")}">
             ${p(t.withdrawn_at)}
           </div>
         </div>`:'<span class="badge badge-success">정상 (이용 중)</span>',i=Number(t.available_coupon_count||0),v=Number(t.available_coupon_amount||0),b=i>0?`<div>
           <strong style="color:var(--adm-primary); font-size:13px;">${v.toLocaleString()}원</strong>
           <span class="badge badge-info" style="margin-left:4px;">${i}장</span>
           ${t.used_coupon_count>0?`<div style="font-size:11.5px; color:var(--adm-text-sub); margin-top:2px;">사용 완료: ${t.used_coupon_count}장</div>`:""}
         </div>`:`<div>
           <span style="color:var(--adm-text-sub); font-size:13px;">0원 (0장)</span>
           ${t.used_coupon_count>0?`<div style="font-size:11.5px; color:var(--adm-text-sub); margin-top:2px;">사용 완료: ${t.used_coupon_count}장</div>`:""}
         </div>`,x=t.last_login_at?`<div class="login-info-cell">
           <span class="login-info-date">${p(t.last_login_at)}</span>
           <span class="login-info-ip">${t.last_login_ip||"IP 미기록"} · 누적 ${t.login_count||1}회</span>
         </div>`:'<span style="color:var(--adm-text-sub); font-size:12px;">접속 기록 없음</span>',$=p(t.created_at),_=o?`<button type="button" class="btn-action-success" onclick="window.restoreUser(event, ${t.id})">복구</button>`:`<button type="button" class="btn-action-danger" onclick="window.deleteUser(event, ${t.id})">탈퇴</button>`;e.innerHTML=`
      <td style="text-align: left !important; padding-left: 20px !important;">
        <div style="display:flex; align-items:center; justify-content:flex-start; text-align:left; gap:8px;">
          ${a}
          <div style="min-width:0; text-align:left;">
            <div style="font-weight:600; color:var(--adm-text-main); font-size:13px; text-align:left;">${s}</div>
            ${r}
          </div>
        </div>
      </td>
      <td style="white-space:nowrap;">${l}</td>
      <td style="white-space:nowrap;">${b}</td>
      <td style="white-space:nowrap;">${x}</td>
      <td style="color:var(--adm-text-sub); font-size:12.5px; white-space:nowrap;">${$}</td>
      <td style="white-space:nowrap; text-align:center;">
        <div class="admin-table-actions">
          <a href="detail-user.html?id=${t.id}" class="btn-action-view">상세</a>
          ${_}
        </div>
      </td>
    `,e.addEventListener("click",y=>{y.target.closest("button")||y.target.closest("a")||(window.location.href=`detail-user.html?id=${t.id}`)}),d.appendChild(e)})}window.deleteUser=async function(n,t){n&&n.stopPropagation();const e=prompt(`해당 회원을 탈퇴 처리하시겠습니까?
보유 중인 모든 유효 쿠폰은 즉시 회수/취소됩니다.

탈퇴 사유를 입력하세요 (선택):`,"관리자 탈퇴 처리");if(e!==null)try{const s=await(await fetch(`/api/admin/users/${t}`,{method:"DELETE",headers:{Authorization:`Bearer ${g}`,"Content-Type":"application/json"},body:JSON.stringify({reason:e.trim()||"관리자 탈퇴 처리"})})).json();s.success?(alert("회원이 탈퇴 처리되었습니다."),c()):alert("오류: "+s.message)}catch{alert("서버 통신 중 오류가 발생했습니다.")}};window.restoreUser=async function(n,t){if(n&&n.stopPropagation(),!!confirm("이 탈퇴 회원의 계정을 정상 이용 상태로 복구하시겠습니까?"))try{const a=await(await fetch(`/api/admin/users/${t}/restore`,{method:"PATCH",headers:{Authorization:`Bearer ${g}`,"Content-Type":"application/json"}})).json();a.success?(alert("회원 계정이 정상 상태로 복구되었습니다."),c()):alert("오류: "+a.message)}catch{alert("서버 통신 중 오류가 발생했습니다.")}};document.querySelectorAll(".filter-tab-pill").forEach(n=>{n.addEventListener("click",()=>{document.querySelectorAll(".filter-tab-pill").forEach(t=>t.classList.remove("active")),n.classList.add("active"),u=n.getAttribute("data-tab"),f()})});m&&m.addEventListener("input",()=>{f()});c();
