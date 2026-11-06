import"./mock-backend-Cm1IoOFL.js";/* empty css             */import{a as $,f as d}from"./api-CKTZsajb.js";import{r as C}from"./admin-guard-B2I11LFN.js";await C();function i(t){if(!t)return"-";const s=new Date(t);if(isNaN(s.getTime()))return"-";const n=s.getFullYear(),o=String(s.getMonth()+1).padStart(2,"0"),r=String(s.getDate()).padStart(2,"0"),a=String(s.getHours()).padStart(2,"0"),c=String(s.getMinutes()).padStart(2,"0");return`${n}.${o}.${r} ${a}:${c}`}function f(t){return{phone:"휴대폰 인증",kakao:"카카오 가입",naver:"네이버 가입",google:"구글 가입"}[t]||"휴대폰 인증"}function l({items:t,containerId:s,limit:n=6,renderRow:o,emptyText:r}){const a=document.getElementById(s);if(a){if(!t||t.length===0){a.innerHTML=`<div class="dash-list-row"><span class="dash-list-name" style="color:#94a3b8;">${r}</span></div>`;return}a.innerHTML=t.slice(0,n).map(o).join("")}}async function x(){try{const t=await $.get("/admin/stats/summary");document.getElementById("stat-total-amount").textContent=d(t.totalAmount||0),document.getElementById("stat-tx-count").textContent=`(결제 ${t.txCount||0}건)`,document.getElementById("stat-executed-budget").textContent=d(t.executedBudget||0),document.getElementById("stat-total-budget").textContent=d(t.totalBudget||2e6),document.getElementById("stat-reserved-budget-sub").textContent=d(t.reservedBudget||0),document.getElementById("stat-available-budget").textContent=d(t.availableBudget||0);const s=t.unregisteredCount||0,n=t.stage2_registered??t.couponIssued??0,o=t.stage3_used??t.couponUsed??0,r=n>0?(o/n*100).toFixed(1):"0.0";document.getElementById("stat-coupon-unregistered").textContent=`${s.toLocaleString()}매`,document.getElementById("stat-coupon-registered").textContent=`${n.toLocaleString()}매`,document.getElementById("stat-coupon-used").textContent=`${o.toLocaleString()}매`,document.getElementById("stat-coupon-rate").textContent=`(사용률 ${r}%)`,l({items:t.recentUnregisteredCoupons||[],containerId:"unregistered-coupons-list",limit:6,emptyText:"미등록 대기 쿠폰이 없습니다.",renderRow:e=>`
            <div class="dash-list-row cols-3">
              <span class="dash-col-left">${e.issuer_name||"발행처"}</span>
              <span class="dash-col-center">${Number(e.face_value||0).toLocaleString()}원</span>
              <span class="dash-col-right">${i(e.issued_at)}</span>
            </div>
          `}),l({items:t.recentRegisteredCoupons||[],containerId:"registered-coupons-list",limit:6,emptyText:"등록된 쿠폰 내역이 없습니다.",renderRow:e=>`
            <div class="dash-list-row cols-3">
              <span class="dash-col-left">${e.issuer_name||"발행처"}</span>
              <span class="dash-col-center">${Number(e.face_value||0).toLocaleString()}원</span>
              <span class="dash-col-right">${i(e.issued_at)}</span>
            </div>
          `});const a=t.userCount||0;document.getElementById("stat-users").textContent=`${a.toLocaleString()}명`,document.getElementById("stat-reserved-budget").textContent=d(t.reservedBudget||0),l({items:t.recentUsers||[],containerId:"users-list",limit:6,emptyText:"가입된 관광객이 없습니다.",renderRow:e=>{const h=String(e.phone||"").replace(/[^0-9]/g,""),y=h.length>=4?h.slice(-4):e.phone||"-";return`
              <div class="dash-list-row cols-3">
                <span class="dash-col-left">${f(e.social_provider)}</span>
                <span class="dash-col-center">${y}</span>
                <span class="dash-col-right">${i(e.created_at)}</span>
              </div>
            `}});const c=t.merchantCount||0,u=t.pendingCount||0;document.getElementById("stat-merchants").textContent=`${c.toLocaleString()}곳`;const m=document.getElementById("stat-pending");m.textContent=`${u.toLocaleString()}곳`,m.style.color=u>0?"#e11d48":"#0f172a";const v={approved:"승인완료",pending:"승인대기",rejected:"반려"};l({items:t.recentMerchants||[],containerId:"merchants-list",limit:6,emptyText:"등록된 가맹점이 없습니다.",renderRow:e=>`
            <div class="dash-list-row">
              <span class="dash-list-name">${e.name}</span>
              <span class="dash-list-val">${v[e.status]||e.status}</span>
            </div>
          `});const p=t.fdsCount||0,g=document.getElementById("stat-fds");g.textContent=`${p.toLocaleString()}건`,g.style.color=p>0?"#e11d48":"#0f172a",document.getElementById("stat-fds-total").textContent=`${(t.totalFdsCount||0).toLocaleString()}건`,t.recentFds&&t.recentFds.length>0?l({items:t.recentFds,containerId:"fds-list",limit:6,emptyText:"탐지된 이상거래가 없습니다.",renderRow:e=>`
              <div class="dash-list-row">
                <span class="dash-list-name">${e.merchant_name||"미상"} (${e.rule_id})</span>
                <span class="dash-list-val" style="color: ${e.resolved?"#0f172a":"#e11d48"};">${e.resolved?"해결됨":"미해결"}</span>
              </div>
            `}):document.getElementById("fds-list").innerHTML=`
            <div class="dash-list-row">
              <span class="dash-list-name">단시간 반복 결제 감시</span>
              <span class="dash-list-val">정상 작동</span>
            </div>
            <div class="dash-list-row">
              <span class="dash-list-name">고액 비정상 할인 감시</span>
              <span class="dash-list-val">정상 작동</span>
            </div>
            <div class="dash-list-row">
              <span class="dash-list-name">심야 시간대 이상 결제 감시</span>
              <span class="dash-list-val">정상 작동</span>
            </div>
          `}catch(t){console.error("통계 로드 실패",t)}}x();
