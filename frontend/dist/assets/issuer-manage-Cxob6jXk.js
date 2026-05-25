import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as y,s as a}from"./api-cr5AAT4V.js";const l=localStorage.getItem("ongjin_kiosk_target_host");if(l)if(l.includes("192.168.")&&!l.includes("192.168.0.10")){const t=/192\.168\.\d+\.\d+/;localStorage.setItem("ongjin_kiosk_target_host",l.replace(t,"192.168.0.10"))}else(l.includes("localhost")||l.includes("127.0.0.1"))&&localStorage.setItem("ongjin_kiosk_target_host",l.replace("localhost","192.168.0.10").replace("127.0.0.1","192.168.0.10"));const E=localStorage.getItem("ongjin_issuer_token"),x=localStorage.getItem("ongjin_issuer_info");(!E||!x)&&w();const S=JSON.parse(x),b=document.getElementById("header-issuer-name");b&&(b.textContent=S.name);function w(){localStorage.removeItem("ongjin_issuer_token"),localStorage.removeItem("ongjin_issuer_info"),localStorage.removeItem("ongjin_token"),window.location.replace("/issuer/login.html")}window.triggerLogout=function(){confirm("로그아웃 하시겠습니까?")&&w()};window.goToQrPage=function(){confirm("QR 화면으로 이동합니다.")&&(window.location.href="./coupon-qr.html")};let d=null,i=null,k="hourly",m=null,v="localhost";async function I(){try{let t=`/auth/issuer/stats?filter=${k}`;if(k==="hourly"){const e=document.getElementById("chart-date-input");e&&e.value&&(t+=`&date=${e.value}`)}const s=await y.get(t);s.success&&(i=s.data,$(),L(),T())}catch(t){console.error("차트 데이터 로드 실패",t)}}window.switchChartFilter=function(t){k=t,document.querySelectorAll(".chart-filter-btn").forEach(o=>{o.textContent===(t==="hourly"?"시간대별":t==="daily"?"일별":t==="monthly"?"월별":"년별")?o.classList.add("active"):o.classList.remove("active")});const e=document.getElementById("chart-date-picker-container");e&&(t==="hourly"?e.style.display="flex":e.style.display="none");const n=document.getElementById("chart-subtitle-text");n&&(t==="hourly"?n.textContent="금일 실시간 시간대별 발급 추이입니다.":t==="daily"?n.textContent="최근 7일간 일별 누적 발급 추이입니다.":t==="monthly"?n.textContent="올해 월별 누적 발급 추이입니다.":t==="yearly"&&(n.textContent="최근 5개년간 년별 발급 추이입니다.")),I()};window.switchViewMode=function(t){const s=document.getElementById("btn-view-chart"),e=document.getElementById("btn-view-table"),n=document.getElementById("chart-bars-container"),o=document.getElementById("chart-table-container");t==="chart"?(s.classList.add("active"),e.classList.remove("active"),n.style.display="flex",o.style.display="none"):(s.classList.remove("active"),e.classList.add("active"),n.style.display="none",o.style.display="block",L())};function L(){const t=document.getElementById("chart-table-tbody");if(!t||!i||!Array.isArray(i))return;const s=i.reduce((e,n)=>e+n.count,0);t.innerHTML=i.map(e=>{const n=s>0?(e.count/s*100).toFixed(1):"0.0";return`
          <tr>
            <td style="font-weight: 700; color: #475569;">${e.label}</td>
            <td style="font-weight: 800; color: #0f172a;">${e.count.toLocaleString()}장</td>
            <td style="color: #2563eb; font-weight: 800;">${n}%</td>
          </tr>
        `}).join("")}function $(){if(!i||!Array.isArray(i))return;const t=document.getElementById("chart-bars-container");if(!t)return;const s=Math.max(...i.map(e=>e.count),1);t.innerHTML=`
        <div class="chart-grid-lines">
          <div class="chart-grid-line"></div>
          <div class="chart-grid-line"></div>
          <div class="chart-grid-line"></div>
          <div class="chart-grid-line"></div>
          <div class="chart-grid-line"></div>
        </div>
      `,i.forEach(e=>{const n=Math.round(e.count/s*85),o=document.createElement("div");o.className="chart-bar-item",e.isToday&&o.classList.add("active-today"),e.count===0&&o.classList.add("zero-value");const c=e.count>0?`${e.count.toLocaleString()}장`:"";o.innerHTML=`
          <div class="chart-tooltip">${e.count.toLocaleString()}장</div>
          <div class="chart-bar-val-label">${c}</div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="height: 0%;" data-height="${n}%"></div>
          </div>
          <div class="chart-bar-label">${e.label}</div>
        `,t.appendChild(o)}),setTimeout(()=>{t.querySelectorAll(".chart-bar-fill").forEach(n=>{const o=n.getAttribute("data-height");n.style.height=o})},50)}function T(){const t=document.getElementById("insight-feed-content");if(!t)return;if(!d||!i||!Array.isArray(i)){t.innerHTML='<div class="insight-loading">분석 데이터를 조회하는 중입니다...</div>';return}const s=d.total_count-d.issued_count,e=d.total_count,n=e>0?Math.round(s/e*100):0,o=i||[],c=o.reduce((h,C)=>h+C.count,0);let u=null,r=0;o.forEach(h=>{h.count>r&&(r=h.count,u=h.label)});let g="";s===0?g+=`
          <div class="insight-item">
            <div class="insight-icon-wrap rose">
              <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div class="insight-text-wrap">
              <span class="insight-item-title" style="color:#dc2626;">배정 쿠폰 한도 소진 완료</span>
              <span class="insight-item-desc">현재 배정된 쿠폰 수량이 완전히 소진되었습니다. 추가 쿠폰 배정을 요청해 주세요.</span>
            </div>
          </div>
        `:n<=20?g+=`
          <div class="insight-item">
            <div class="insight-icon-wrap amber">
              <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div class="insight-text-wrap">
              <span class="insight-item-title" style="color:#d97706;">배정 한도 도달 위험 (잔여 ${n}%)</span>
              <span class="insight-item-desc">잔여 한도 수량이 20% 이하(${s.toLocaleString()}장)입니다. 원활한 서비스를 위해 조속히 추가 배정을 진행하는 것이 좋습니다.</span>
            </div>
          </div>
        `:g+=`
          <div class="insight-item">
            <div class="insight-icon-wrap green">
              <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="insight-text-wrap">
              <span class="insight-item-title" style="color:#16a34a;">쿠폰 소진 상태 안정</span>
              <span class="insight-item-desc">현재 남은 한도 수량이 전체의 ${n}%(${s.toLocaleString()}장)로 매우 안정적인 발급 여유를 가지고 있습니다.</span>
            </div>
          </div>
        `,r>0&&(g+=`
          <div class="insight-item">
            <div class="insight-icon-wrap blue">
              <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div class="insight-text-wrap">
              <span class="insight-item-title" style="color:#2563eb;">발급 피크 시점 감지</span>
              <span class="insight-item-desc">최다 발급 기록 시점은 <strong>${u}</strong>대 이며, 해당 시간대에만 <strong>${r.toLocaleString()}장</strong>의 쿠폰이 집중 발급되었습니다.</span>
            </div>
          </div>
        `),g+=`
        <div class="insight-item">
          <div class="insight-icon-wrap blue">
            <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div class="insight-text-wrap">
            <span class="insight-item-title">실시간 누적 발급 통계</span>
            <span class="insight-item-desc">선택된 기간/시간대 동안 총 <strong>${c.toLocaleString()}장</strong>의 쿠폰이 발급되었습니다.</span>
          </div>
        </div>
      `,t.innerHTML=g}window.switchTab=function(t){document.getElementById("tab-btn-stats").classList.remove("active"),document.getElementById("tab-btn-account").classList.remove("active"),document.getElementById("content-stats").classList.remove("active"),document.getElementById("content-account").classList.remove("active"),m&&(clearInterval(m),m=null),t==="stats"?(document.getElementById("tab-btn-stats").classList.add("active"),document.getElementById("content-stats").classList.add("active"),B=null,d&&(_(d),I()),p(),m=setInterval(p,3e3)):t==="account"&&(document.getElementById("tab-btn-account").classList.add("active"),document.getElementById("content-account").classList.add("active"))};async function j(){try{const t=await y.get("/auth/issuer/me");t.success&&t.serverIp&&(v=t.serverIp)}catch(t){console.error("발행처 정보 로드 실패",t)}}async function p(){localStorage.setItem("ongjin_token",E);try{v==="localhost"&&await j();const t=await y.get("/auth/issuer/allocations");if(t.success&&t.data.length>0){const s=t.data[0];d=s;let e=localStorage.getItem("ongjin_kiosk_target_host");e||(e=window.location.origin,(e.includes("localhost")||e.includes("127.0.0.1"))&&(e=v&&!v.startsWith("172.")?`http://${v}:8080`:"http://192.168.0.10:8080"));const n=document.getElementById("kiosk-host-input");n&&!n.value&&(n.value=e),_(s),I()}else a("배정된 쿠폰 정보가 없습니다.","error")}catch(t){console.error("발행처 배정 로드 실패",t),(t.status===401||t.status===403)&&w()}}let B=null;function _(t){if(!t)return;const s=t.total_count-t.issued_count,e=t.total_count>0?Math.round(t.issued_count/t.total_count*100):0;B=s;const n=document.getElementById("metric-issued");n&&(n.textContent=`${t.issued_count.toLocaleString()}장`);const o=document.getElementById("metric-remaining");o&&(o.textContent=`${s.toLocaleString()}장`);const c=document.getElementById("metric-total");c&&(c.textContent=`${t.total_count.toLocaleString()}장`);const u=document.getElementById("progress-bar-text-el"),r=document.getElementById("progress-bar-fill-el");r&&u&&(r.style.width=`${e}%`,u.textContent=`${e}% 발급 완료`)}document.getElementById("btn-save-host").onclick=function(){let t=document.getElementById("kiosk-host-input").value.trim();if(!t){a("접속 주소를 입력해 주세요.","error");return}t.includes("192.168.0.75")&&(t=t.replace("192.168.0.75","192.168.0.10"),document.getElementById("kiosk-host-input").value=t),localStorage.setItem("ongjin_kiosk_target_host",t),a("휴대폰 접속 주소가 반영되었습니다.","success"),p()};window.submitChangePassword=async function(){const t=document.getElementById("change-current-password").value.trim(),s=document.getElementById("change-new-password").value,e=document.getElementById("change-new-password-confirm").value;if(!t){a("현재 비밀번호를 입력해 주세요.","error");return}if(!s||!e){a("새 비밀번호를 입력해 주세요.","error");return}if(s!==e){a("새 비밀번호가 일치하지 않습니다.","error");return}if(s.length<5){a("새 비밀번호는 5자 이상이어야 합니다.","error");return}try{(await y.post("/auth/issuer/change-password",{currentPassword:t,newPassword:s})).success&&(a("비밀번호가 변경되었습니다. 다시 로그인 해주세요.","success"),setTimeout(()=>{w()},1500))}catch(n){a(n.message||"비밀번호 변경에 실패했습니다.","error")}};function M(){return new Date(Date.now()+324e5).toISOString().split("T")[0]}const f=document.getElementById("chart-date-input");if(f){const t=M();f.value=t,f.max=t,f.addEventListener("change",()=>{I()})}p();m=setInterval(p,3e3);
