import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{r as w,g as $}from"./admin-guard-DxYVQPuN.js";await w();const m=$(),x=new URLSearchParams(window.location.search),u=parseInt(x.get("id"));let y=null,d=[],b=[],l="available";function T(e,n="info"){let t=document.getElementById("toast-container");t||(t=document.createElement("div"),t.id="toast-container",t.style.cssText="position:fixed; bottom:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:8px;",document.body.appendChild(t));const s=document.createElement("div");s.style.cssText="padding: 10px 16px; border-radius: 6px; background: #0f172a; color: #fff; font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);",s.innerText=e,t.appendChild(s),setTimeout(()=>{s.style.opacity="0",s.style.transition="opacity 0.3s ease",setTimeout(()=>s.remove(),300)},2e3)}u?g():(alert("잘못된 접근입니다."),window.location.href="users.html");window.init=g;async function g(e=!1){const n=document.getElementById("btn-refresh-user");n&&(n.disabled=!0);try{await Promise.all([E(),_(),C()]),e&&T("회원 상세 정보가 새로고침되었습니다.","success")}catch(t){console.error(t)}finally{n&&(n.disabled=!1)}}function p(e){if(!e)return"—";const n=new Date(e);if(isNaN(n.getTime()))return"—";const t=n.getFullYear(),s=String(n.getMonth()+1).padStart(2,"0"),o=String(n.getDate()).padStart(2,"0"),r=String(n.getHours()).padStart(2,"0"),i=String(n.getMinutes()).padStart(2,"0"),a=String(n.getSeconds()).padStart(2,"0");return`${t}.${s}.${o} ${r}:${i}:${a}`}async function E(){try{const n=await(await fetch(`/api/admin/users/${u}`,{headers:{Authorization:`Bearer ${m}`}})).json();n.success?(y=n.data,B(y)):(alert("회원 정보를 불러오지 못했습니다: "+n.message),window.location.href="users.html")}catch(e){console.error(e),alert("서버 오류가 발생했습니다.")}}function B(e){document.getElementById("profile-name").innerText=e.nickname||"미인증 회원";const n=[e.provider_label?`[${e.provider_label}]`:"",e.email?e.email:"",e.social_provider==="phone"?e.provider_id:""].filter(Boolean).join(" · ");document.getElementById("profile-sub").innerText=n||"간편 가입 계정";const t=e.status==="withdrawn",s=document.getElementById("profile-status"),o=document.getElementById("profile-status-desc");t?(s.innerHTML='<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:600; font-size:12px;">탈퇴 처리됨</span>',o.innerText=`탈퇴일시: ${p(e.withdrawn_at)} (${e.withdrawn_reason||"사유 없음"})`):(s.innerHTML='<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:600; font-size:12px;">정상 (이용 중)</span>',o.innerText="");const r=Number(e.available_coupon_count||0),i=Number(e.available_coupon_amount||0);document.getElementById("profile-coupon-balance").innerText=`${i.toLocaleString()}원`,document.getElementById("profile-coupon-summary").innerText=`사용 가능: ${r}장 / 사용 완료: ${e.used_coupon_count||0}장`,document.getElementById("profile-last-login").innerText=p(e.last_login_at),document.getElementById("profile-last-ip").innerText=`${e.last_login_ip||"IP 미기록"} (누적 ${e.login_count||1}회)`,document.getElementById("profile-regdate").innerText=p(e.created_at);const a=document.getElementById("user-action-area");t?a.innerHTML='<button type="button" class="btn btn-secondary" style="color:var(--adm-success, #059669); border-color:#a7f3d0;" onclick="window.restoreCurrentUser()">회원 계정 복구</button>':a.innerHTML='<button type="button" class="btn btn-danger" onclick="window.withdrawCurrentUser()">회원 탈퇴 처리</button>'}window.switchMainTab=function(e){document.querySelectorAll(".stats-tab-btn").forEach(n=>n.classList.remove("active")),document.getElementById(`main-tab-${e}`).classList.add("active"),e==="coupons"?(document.getElementById("section-coupons").style.display="block",document.getElementById("section-logs").style.display="none"):(document.getElementById("section-coupons").style.display="none",document.getElementById("section-logs").style.display="block")};window.switchCouponTab=function(e){l=e,document.querySelectorAll(".filter-tab-pill").forEach(n=>n.classList.remove("active")),document.getElementById(`tab-btn-${e}`).classList.add("active"),h()};function L(){const e=d.filter(s=>s.status==="available").length,n=d.filter(s=>s.status==="used").length,t=d.filter(s=>s.status==="expired"||s.status==="cancelled").length;document.getElementById("count-available").innerText=e,document.getElementById("count-used").innerText=n,document.getElementById("count-expired").innerText=t,document.getElementById("main-coupons-count").innerText=d.length}function h(){const e=document.getElementById("couponsCardContainer");e.innerHTML="";const n=d.filter(t=>l==="available"?t.status==="available":l==="used"?t.status==="used":t.status==="expired"||t.status==="cancelled");if(n.length===0){const t={available:"보유한 사용 전 쿠폰이 없습니다.",used:"사용 완료된 쿠폰이 없습니다.",expired:"만료되거나 취소된 쿠폰이 없습니다."}[l];e.innerHTML=`<div class="card-placeholder">${t}</div>`;return}n.forEach(t=>{const s=t.issuer_name||t.issued_by_location||"옹진군청 관광과",o=p(t.issued_at),r=`${Number(t.face_value).toLocaleString()}원`;let i="";if(t.share_claim_type){const a=t.share_claim_type==="proxy",f=a?"단체 공유 · 대리 수령":"단체 공유 · 본인",c=t.share_source==="code"?"쿠폰번호 등록":"공유 링크";i=`
              <div class="coupon-info-row">
                <span class="info-label">수령 경로</span>
                <span class="info-value" style="${a?"color:#b45309; font-weight:700;":""}">${f} (${c})</span>
              </div>`}if(l==="available"){const a=document.createElement("div");a.className="coupon-card type-available",a.innerHTML=`
            <div class="coupon-card-top">
              <span class="status-badge badge-available">사용 가능</span>
              <span class="coupon-amount">${r}</span>
            </div>
            <div class="coupon-card-divider"></div>
            <div class="coupon-card-body">
              <div class="coupon-info-row">
                <span class="info-label">발행처</span>
                <span class="info-value">${s}</span>
              </div>
              <div class="coupon-info-row">
                <span class="info-label">발급일시</span>
                <span class="info-value">${o}</span>
              </div>${i}
            </div>
          `,e.appendChild(a)}else if(l==="used"){const a=t.merchant_name?t.merchant_name:"—",f=p(t.used_at),c=document.createElement("div");c.className="coupon-card type-used",c.innerHTML=`
            <div class="coupon-card-top">
              <span class="status-badge badge-used">사용 완료</span>
              <span class="coupon-amount">${r}</span>
            </div>
            <div class="coupon-card-divider"></div>
            <div class="coupon-card-body">
              <div class="info-section">
                <div class="info-section-title">발행 정보</div>
                <div class="coupon-info-row">
                  <span class="info-label">발행처</span>
                  <span class="info-value">${s}</span>
                </div>
                <div class="coupon-info-row">
                  <span class="info-label">발급일시</span>
                  <span class="info-value">${o}</span>
                </div>${i}
              </div>
              <div class="info-section-divider"></div>
              <div class="info-section">
                <div class="info-section-title">사용 정보</div>
                <div class="coupon-info-row">
                  <span class="info-label">사용처(가맹점)</span>
                  <span class="info-value">${a}</span>
                </div>
                <div class="coupon-info-row">
                  <span class="info-label">사용일시</span>
                  <span class="info-value">${f}</span>
                </div>
              </div>
            </div>
          `,e.appendChild(c)}else{const a=t.status==="expired"?"만료":"취소됨",f=t.status==="expired"?"badge-expired":"badge-cancelled",c=t.status==="expired"?"기한 만료":"회수 / 탈퇴 취소",v=document.createElement("div");v.className="coupon-card type-expired",v.innerHTML=`
            <div class="coupon-card-top">
              <span class="status-badge ${f}">${a}</span>
              <span class="coupon-amount">${r}</span>
            </div>
            <div class="coupon-card-divider"></div>
            <div class="coupon-card-body">
              <div class="coupon-info-row">
                <span class="info-label">발행처</span>
                <span class="info-value">${s}</span>
              </div>
              <div class="coupon-info-row">
                <span class="info-label">발급일시</span>
                <span class="info-value">${o}</span>
              </div>${i}
              <div class="coupon-info-row">
                <span class="info-label">처리 상태</span>
                <span class="info-value status-red">${c}</span>
              </div>
            </div>
          `,e.appendChild(v)}})}async function _(){try{const n=await(await fetch(`/api/admin/users/${u}/coupons`,{headers:{Authorization:`Bearer ${m}`}})).json();n.success?(d=n.data,L(),h()):document.getElementById("couponsCardContainer").innerHTML='<div class="card-placeholder status-red">쿠폰 내역 조회 실패</div>'}catch(e){console.error(e),document.getElementById("couponsCardContainer").innerHTML='<div class="card-placeholder status-red">서버 오류 발생</div>'}}async function C(){const e=document.getElementById("loginLogsTableBody");try{const t=await(await fetch(`/api/admin/users/${u}/login-logs`,{headers:{Authorization:`Bearer ${m}`}})).json();t.success?(b=t.data,document.getElementById("main-logs-count").innerText=b.length,S(b)):e.innerHTML='<tr><td colspan="4" class="table-placeholder status-red">접속 로그를 불러오지 못했습니다.</td></tr>'}catch(n){console.error(n),e.innerHTML='<tr><td colspan="4" class="table-placeholder status-red">서버 통신 오류가 발생했습니다.</td></tr>'}}function I(e){if(!e)return"정보 없음";let n="PC / 데스크톱";/Android/i.test(e)?n="Android 모바일":/iPhone|iPad|iPod/i.test(e)&&(n="iOS 모바일");let t="웹 브라우저";return/KAKAOTALK/i.test(e)?t="카카오톡 인앱":/NAVER/i.test(e)?t="네이버 인앱":/SamsungBrowser/i.test(e)?t="삼성 인터넷":/Chrome/i.test(e)?t="Chrome":/Safari/i.test(e)?t="Safari":/Firefox/i.test(e)?t="Firefox":/Edge/i.test(e)&&(t="Edge"),`${n} (${t})`}function S(e){const n=document.getElementById("loginLogsTableBody");if(n.innerHTML="",e.length===0){n.innerHTML='<tr><td colspan="4" class="table-placeholder">접속 로그 기록이 없습니다.</td></tr>';return}e.forEach(t=>{const s=document.createElement("tr"),o=p(t.login_at),r=t.provider==="kakao"?'<span class="badge" style="background:#fef08a; color:#854d0e; font-weight:600;">카카오</span>':t.provider==="naver"?'<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:600;">네이버</span>':t.provider==="google"?'<span class="badge badge-gray" style="font-weight:600;">구글</span>':'<span class="badge badge-info" style="font-weight:600;">휴대폰 OTP</span>',i=I(t.user_agent);s.innerHTML=`
          <td style="text-align: left !important; padding-left: 20px !important; font-weight:600; color:var(--adm-text-main);">${o}</td>
          <td>${r}</td>
          <td style="font-family:monospace; font-size:12.5px; color:var(--adm-text-sub);">${t.ip_address||"—"}</td>
          <td style="color:var(--adm-text-sub); font-size:12px;" title="${t.user_agent||""}">${i}</td>
        `,n.appendChild(s)})}window.withdrawCurrentUser=async function(){const e=prompt(`이 회원을 탈퇴 처리하시겠습니까?
보유한 모든 미사용 쿠폰은 즉시 취소 처리됩니다.

탈퇴 사유를 입력하세요 (선택):`,"관리자 탈퇴 처리");if(e!==null)try{const t=await(await fetch(`/api/admin/users/${u}`,{method:"DELETE",headers:{Authorization:`Bearer ${m}`,"Content-Type":"application/json"},body:JSON.stringify({reason:e.trim()||"관리자 탈퇴 처리"})})).json();t.success?(alert("회원이 성공적으로 탈퇴 처리되었습니다."),g()):alert("오류: "+t.message)}catch{alert("서버 오류가 발생했습니다.")}};window.restoreCurrentUser=async function(){if(confirm("이 탈퇴 회원의 계정을 정상 이용 상태로 복구하시겠습니까?"))try{const n=await(await fetch(`/api/admin/users/${u}/restore`,{method:"PATCH",headers:{Authorization:`Bearer ${m}`,"Content-Type":"application/json"}})).json();n.success?(alert("회원 계정이 정상 상태로 복구되었습니다."),g()):alert("오류: "+n.message)}catch{alert("서버 오류가 발생했습니다.")}};
