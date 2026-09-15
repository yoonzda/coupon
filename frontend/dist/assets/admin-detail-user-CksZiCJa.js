import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{s as l}from"./api-BrJ7NzZM.js";import{r as h,g}from"./admin-guard-xv3IhYox.js";await h();const m=g(),w=new URLSearchParams(window.location.search),f=parseInt(w.get("id"));f?($(),x()):(l("잘못된 접근입니다.","error"),setTimeout(()=>{window.location.href="users.html"},1500));function y(s){return s||"미인증"}async function $(){try{const n=await(await fetch("/api/admin/users",{headers:{Authorization:`Bearer ${m}`}})).json();if(n.success){const e=n.data.find(c=>c.id===f);if(!e){l("존재하지 않는 회원입니다.","error"),setTimeout(()=>{window.location.href="users.html"},1500);return}const a=y(e.nickname),i=e.created_at?new Date(e.created_at).toLocaleString("ko-KR"):"—";document.getElementById("profile-phone").innerText=a,document.getElementById("profile-regdate").innerText=i}else l("회원 정보를 불러오지 못했습니다.","error")}catch(s){console.error(s),l("서버 통신 실패","error")}}function v(s=!1){const n=document.querySelector(".coupon-tabs-container"),e=n.querySelector(".coupon-tab-pill.active"),a=n.querySelector(".coupon-tab-indicator");e&&a&&(s&&a.style.setProperty("transition","none","important"),a.style.left=`${e.offsetLeft}px`,a.style.width=`${e.offsetWidth}px`,s&&(a.offsetHeight,a.style.removeProperty("transition")))}let d=[],o="available";window.switchTab=function(s){o=s,document.querySelectorAll(".coupon-tab-pill").forEach(n=>n.classList.remove("active")),document.getElementById(`tab-btn-${s}`).classList.add("active"),v(),b()};function T(){const s=d.filter(a=>a.status==="available").length,n=d.filter(a=>a.status==="used").length,e=d.filter(a=>a.status==="expired"||a.status==="cancelled").length;document.getElementById("count-available").innerText=s,document.getElementById("count-used").innerText=n,document.getElementById("count-expired").innerText=e}function b(){const s=document.getElementById("couponsCardContainer");s.innerHTML="";const n=d.filter(e=>o==="available"?e.status==="available":o==="used"?e.status==="used":e.status==="expired"||e.status==="cancelled");if(n.length===0){const e={available:"보유한 사용 전 쿠폰이 없습니다.",used:"사용 완료된 쿠폰이 없습니다.",expired:"만료되거나 취소된 쿠폰이 없습니다."}[o];s.innerHTML=`<div class="card-placeholder">${e}</div>`;return}n.forEach(e=>{const a=e.issuer_name?e.issuer_name:"키오스크 / 기타",i=e.issued_at?new Date(e.issued_at).toLocaleDateString("ko-KR"):"—",c=`${Number(e.face_value).toLocaleString()}원`;if(o==="available"){const t=document.createElement("div");t.className="coupon-card type-available",t.innerHTML=`
            <div class="coupon-card-top">
              <span class="coupon-amount">${c}</span>
            </div>
            <div class="coupon-card-divider"></div>
            <div class="coupon-card-body">
              <div class="coupon-info-row">
                <span class="info-label">발행처</span>
                <span class="info-value">${a}</span>
              </div>
              <div class="coupon-info-row">
                <span class="info-label">발급일</span>
                <span class="info-value">${i}</span>
              </div>
            </div>
          `,s.appendChild(t)}else if(o==="used"){const t=e.merchant_name?e.merchant_name:"—",u=e.used_at?new Date(e.used_at).toLocaleDateString("ko-KR"):"—",r=document.createElement("div");r.className="coupon-card type-used",r.innerHTML=`
            <div class="coupon-card-top">
              <span class="status-badge badge-used">사용 완료</span>
              <span class="coupon-amount">${c}</span>
            </div>
            <div class="coupon-card-divider"></div>
            <div class="coupon-card-body">
              <div class="info-section">
                <div class="info-section-title">발행 정보</div>
                <div class="coupon-info-row">
                  <span class="info-label">발행처</span>
                  <span class="info-value">${a}</span>
                </div>
                <div class="coupon-info-row">
                  <span class="info-label">발급일</span>
                  <span class="info-value">${i}</span>
                </div>
              </div>
              <div class="info-section-divider"></div>
              <div class="info-section">
                <div class="info-section-title">사용 정보</div>
                <div class="coupon-info-row">
                  <span class="info-label">사용처</span>
                  <span class="info-value">${t}</span>
                </div>
                <div class="coupon-info-row">
                  <span class="info-label">사용일</span>
                  <span class="info-value">${u}</span>
                </div>
              </div>
            </div>
          `,s.appendChild(r)}else{const t=e.status==="expired"?"만료":"취소됨",u=e.status==="expired"?"badge-expired":"badge-cancelled",r=e.status==="expired"?"기한 만료":"발행 취소",p=document.createElement("div");p.className="coupon-card type-expired",p.innerHTML=`
            <div class="coupon-card-top">
              <span class="status-badge ${u}">${t}</span>
              <span class="coupon-amount">${c}</span>
            </div>
            <div class="coupon-card-divider"></div>
            <div class="coupon-card-body">
              <div class="coupon-info-row">
                <span class="info-label">발행처</span>
                <span class="info-value">${a}</span>
              </div>
              <div class="coupon-info-row">
                <span class="info-label">발급일</span>
                <span class="info-value">${i}</span>
              </div>
              <div class="coupon-info-row">
                <span class="info-label">처리 상태</span>
                <span class="info-value status-red">${r}</span>
              </div>
            </div>
          `,s.appendChild(p)}})}async function x(){try{const n=await(await fetch(`/api/admin/users/${f}/coupons`,{headers:{Authorization:`Bearer ${m}`}})).json();n.success?(d=n.data,T(),b(),v(!0),window.addEventListener("resize",()=>v(!0))):document.getElementById("couponsCardContainer").innerHTML='<div class="card-placeholder status-red">쿠폰 내역 조회 실패</div>'}catch(s){console.error(s),document.getElementById("couponsCardContainer").innerHTML='<div class="card-placeholder status-red">서버 오류 발생</div>'}}
