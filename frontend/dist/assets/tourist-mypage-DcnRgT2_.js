import"./modulepreload-polyfill-B5Qt9EMX.js";import{c as B,a as v,s as y,f as D}from"./api-BxOpvEgq.js";const q=localStorage.getItem("ongjin_token");q||(window.location.href="/tourist/index.html");const k=document.getElementById("user-phone-display"),F=localStorage.getItem("ongjin_user_phone")||"010-****-****";k&&(k.textContent=F);document.getElementById("nav-logout").addEventListener("click",t=>{t.preventDefault(),confirm("로그아웃 하시겠습니까?")&&(B(),window.location.href="/tourist/index.html")});let l=[],h="all",f="all",u="",i=null,c=[],p=null,w=null;const E=document.querySelectorAll(".nav-tab-btn");E.forEach(t=>{t.addEventListener("click",()=>{E.forEach(o=>o.classList.remove("active")),t.classList.add("active");const e=t.getAttribute("data-target"),n=document.getElementById(e);if(n){const a=n.getBoundingClientRect().top+window.pageYOffset-110;window.scrollTo({top:a,behavior:"smooth"})}})});window.addEventListener("scroll",()=>{const t=window.scrollY+130,e=["sec-coupon","sec-map","sec-store"];for(const n of e){const o=document.getElementById(n);if(o){const s=o.offsetTop,a=o.offsetHeight;if(t>=s&&t<s+a){E.forEach(r=>{r.classList.toggle("active",r.getAttribute("data-target")===n)});break}}}});function z(t,e){let n;t?n=new Date(t):e?(n=new Date(e),n.setFullYear(n.getFullYear()+1)):(n=new Date,n.setFullYear(n.getFullYear()+1));const o=n.getFullYear(),s=String(n.getMonth()+1).padStart(2,"0"),a=String(n.getDate()).padStart(2,"0");return`${o}.${s}.${a}`}function P(t,e){let n;t?n=new Date(t):e?(n=new Date(e),n.setFullYear(n.getFullYear()+1)):(n=new Date,n.setFullYear(n.getFullYear()+1));const o=new Date,s=n.getTime()-o.getTime(),a=Math.ceil(s/(1e3*60*60*24));return a<0?"만료":a===0?"D-Day":`D-${a}`}function j(t){const e=document.getElementById("coupon-list-container"),n=document.getElementById("tab-coupon-count"),o=document.getElementById("coupon-summary-text");if(!e)return;const s=(t||[]).filter(a=>a.status==="issued"||a.status==="registered"||a.status==="active");if(n.textContent=s.length,o.textContent=`사용 가능한 쿠폰 ${s.length}장`,s.length===0){e.innerHTML=`
          <div class="empty-coupon-box">
            <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5zM5 15a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2H5z" />
            </svg>
            <div class="empty-title">보유 중인 쿠폰이 없습니다</div>
            <div class="empty-desc">
              여객터미널 등 옹진군 현장 발행처에서 발급받은 QR을 스캔하시면<br>이곳 지갑에 즉시 쿠폰이 등록됩니다.
            </div>
          </div>
        `;return}e.innerHTML=s.map(a=>{const r=a.id,d=D(a.face_value||1e4),S=z(a.expires_at,a.issued_at);return`
          <div class="coupon-card">
            <div class="coupon-top">
              <span class="coupon-label">옹진 섬 관광 특별 쿠폰</span>
              <span class="coupon-dday">${P(a.expires_at,a.issued_at)}</span>
            </div>
            <div class="coupon-body">
              <div>
                <div class="coupon-amount">${d}</div>
                <div class="coupon-desc">옹진군 전역 공식 가맹점 사용 가능</div>
              </div>
            </div>
            <div class="coupon-footer">
              <span class="coupon-expiry">유효기간: ~ ${S}</span>
              <button type="button" class="btn-coupon-qr" onclick="window.openUseModal('${r}')">
                <svg style="width:16px;height:16px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR 결제하기
              </button>
            </div>
          </div>
        `}).join("")}function Y(){if(!document.getElementById("real-map")||typeof L>"u")return;i&&(i.remove(),i=null);let e=37.255,n=126.31;if(l.length>0){const s=l.find(a=>a.lat&&a.lng);s&&(e=parseFloat(s.lat),n=parseFloat(s.lng))}i=L.map("real-map",{center:[e,n],zoom:11,zoomControl:!1}),L.control.zoom({position:"bottomright"}).addTo(i),L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap"}).addTo(i),m();const o=document.getElementById("map-search-input");o&&o.addEventListener("input",s=>{const a=s.target.value.trim().toLowerCase();if(!a)return;const r=c.find(d=>d.name.toLowerCase().includes(a)||d.address.toLowerCase().includes(a));r&&i&&(i.flyTo([r.lat,r.lng],14,{duration:1}),r.marker.openPopup())})}function m(){if(!i)return;c.forEach(e=>e.marker.remove()),c=[],$().forEach(e=>{const n=parseFloat(e.lat||e.latitude),o=parseFloat(e.lng||e.longitude);if(isNaN(n)||isNaN(o))return;const s=L.marker([n,o]).addTo(i),a=`
          <div style="font-family:'Pretendard',sans-serif; text-align:left; min-width:180px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="font-size:0.72rem; font-weight:700; color:#0284c7; background:#e0f2fe; padding:2px 6px; border-radius:4px;">${e.category||"가맹점"}</span>
            </div>
            <div style="font-size:1.02rem; font-weight:800; color:#0f172a; margin-bottom:3px;">${e.name}</div>
            <div style="font-size:0.78rem; color:#64748b; margin-bottom:6px; line-height:1.3;">${e.address||"인천광역시 옹진군"}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:6px;">
              <span style="font-size:0.75rem; color:#475569;">${e.phone||""}</span>
              <a href="tel:${e.phone||""}" style="font-size:0.75rem; font-weight:700; color:#0284c7; text-decoration:none;">전화걸기</a>
            </div>
          </div>
        `;s.bindPopup(a),c.push({id:e.id,name:e.name,address:e.address||"",lat:n,lng:o,marker:s})})}const b=document.querySelectorAll("#island-chips .chip-btn");b.forEach(t=>{t.addEventListener("click",()=>{b.forEach(o=>o.classList.remove("active")),t.classList.add("active"),f=t.getAttribute("data-island");const e=t.getAttribute("data-lat"),n=t.getAttribute("data-lng");if(e&&n&&i)i.flyTo([parseFloat(e),parseFloat(n)],12,{duration:1});else if(f==="all"&&i&&l.length>0){const o=l.find(s=>s.lat&&s.lng);o&&i.flyTo([parseFloat(o.lat),parseFloat(o.lng)],11,{duration:1})}g(),m()})});function $(){return l.filter(t=>{if(f!=="all"&&!(t.address||"").includes(f)||h!=="all"&&!(t.category||"").includes(h))return!1;if(u){const e=(t.name||"").toLowerCase(),n=(t.address||"").toLowerCase();if(!e.includes(u)&&!n.includes(u))return!1}return!0})}function N(t){const e=t||"";return e.includes("음식")||e.includes("식당")||e.includes("분식")?{emoji:"🍚",className:"avatar-food"}:e.includes("카페")||e.includes("커피")||e.includes("디저트")?{emoji:"☕",className:"avatar-cafe"}:e.includes("수산")||e.includes("특산")||e.includes("농산")?{emoji:"🐟",className:"avatar-fish"}:e.includes("숙박")||e.includes("펜션")||e.includes("민박")?{emoji:"🏡",className:"avatar-stay"}:{emoji:"🏪",className:"avatar-etc"}}function g(){const t=document.getElementById("merchant-list-container"),e=document.getElementById("merchant-total-count");if(!t)return;const n=$();if(e&&(e.textContent=`총 ${n.length}곳`),n.length===0){t.innerHTML=`
          <div style="padding: 40px 20px; text-align: center; color: var(--slate-400); background: var(--slate-50); border-radius: var(--radius-md);">
            검색 조건에 맞는 가맹점이 없습니다.
          </div>
        `;return}t.innerHTML=n.map(o=>{const s=N(o.category),a=(o.address||"").includes("자월")?"자월면":(o.address||"").includes("덕적")?"덕적면":(o.address||"").includes("백령")?"백령면":(o.address||"").includes("대청")?"대청면":(o.address||"").includes("영흥")?"영흥면":(o.address||"").includes("연평")?"연평면":"옹진군";return`
          <div class="store-card" onclick="window.focusStoreOnMap('${o.id}')">
            <div class="store-avatar ${s.className}">${s.emoji}</div>
            <div class="store-info">
              <div class="store-badge-row">
                <span class="store-category-tag">${o.category||"일반"}</span>
                <span class="store-island-tag">${a}</span>
              </div>
              <div class="store-name">${o.name}</div>
              <div class="store-address">${o.address||"인천광역시 옹진군"}</div>
              <div class="store-phone">${o.phone||"연락처 준비중"}</div>
            </div>
            <button type="button" class="btn-view-map" onclick="event.stopPropagation(); window.focusStoreOnMap('${o.id}')">
              <svg style="width:13px;height:13px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              위치
            </button>
          </div>
        `}).join("")}const I=document.querySelectorAll("#category-filter-wrap .category-btn");I.forEach(t=>{t.addEventListener("click",()=>{I.forEach(e=>e.classList.remove("active")),t.classList.add("active"),h=t.getAttribute("data-cat"),g(),m()})});const M=document.getElementById("store-search-input");M&&M.addEventListener("input",t=>{u=t.target.value.trim().toLowerCase(),g(),m()});window.focusStoreOnMap=function(t){const e=c.find(o=>String(o.id)===String(t)),n=document.getElementById("sec-map");if(n){const a=n.getBoundingClientRect().top+window.pageYOffset-110;window.scrollTo({top:a,behavior:"smooth"})}setTimeout(()=>{e&&i&&(i.flyTo([e.lat,e.lng],14,{duration:1}),e.marker.openPopup())},350)};window.openUseModal=async function(t){w=t,document.getElementById("use-modal-expired-container").style.display="none",document.getElementById("use-modal-qr-container").style.display="block",document.getElementById("use-qr-modal").classList.add("active"),await T(t),C(180)};window.closeUseModal=function(){document.getElementById("use-qr-modal").classList.remove("active"),x()};document.getElementById("btn-re-qr").addEventListener("click",async()=>{w&&(document.getElementById("use-modal-expired-container").style.display="none",document.getElementById("use-modal-qr-container").style.display="block",await T(w),C(180))});async function T(t){try{const e=await v.post(`/coupon/${t}/use-qr`);if(e.success&&e.qrToken){const n=document.getElementById("use-modal-qr-img");n.src=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(e.qrToken)}`}}catch(e){y(e.message||"QR 코드 생성 실패","error")}}function C(t){x();let e=t;const n=document.getElementById("use-modal-timer");function o(){const s=String(Math.floor(e/60)).padStart(2,"0"),a=String(e%60).padStart(2,"0");n.textContent=`${s}:${a}`}o(),p=setInterval(()=>{e--,e<=0?(x(),document.getElementById("use-modal-qr-container").style.display="none",document.getElementById("use-modal-expired-container").style.display="block"):o()},1e3)}function x(){p&&(clearInterval(p),p=null)}async function O(){try{const[t,e]=await Promise.all([v.get("/coupon/my"),v.get("/merchant/map")]);l=e.data||[],j(t.data||[]),g(),Y()}catch(t){t.status===401||t.status===403||t.message&&t.message.includes("인증")?(B(),y("로그인이 필요한 서비스입니다.","info"),setTimeout(()=>{window.location.href="/tourist/index.html"},600)):y(t.message||"데이터를 불러오는 중 오류가 발생했습니다.","error")}}O();
