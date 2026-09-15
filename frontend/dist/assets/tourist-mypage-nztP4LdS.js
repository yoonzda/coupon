import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css                      */import{c as v,a as p,s as f,f as w}from"./api-BrJ7NzZM.js";const x=localStorage.getItem("ongjin_token");x||(window.location.href="/tourist/index.html");document.getElementById("nav-logout").addEventListener("click",t=>{t.preventDefault(),confirm("로그아웃 하시겠습니까?")&&(v(),window.location.href="/tourist/index.html")});let s=null,c=[],d=[];function h(){if(!document.getElementById("real-map")||typeof L>"u")return;s&&(s.remove(),s=null);let i=37.26,e=126.49;if(d.length>0){const o=d[0];(o.lat||o.latitude)&&(i=parseFloat(o.lat||o.latitude)),(o.lng||o.longitude)&&(e=parseFloat(o.lng||o.longitude))}s=L.map("real-map",{center:[i,e],zoom:12,zoomControl:!1}),L.control.zoom({position:"bottomright"}).addTo(s),L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap"}).addTo(s),c=[],d.forEach(o=>{const a=parseFloat(o.lat||o.latitude)||37.26,r=parseFloat(o.lng||o.longitude)||126.49,l=L.marker([a,r]).addTo(s),y=`
          <div style="text-align:left;">
            <div style="font-size:0.98rem; font-weight:800; color:#0f172a; margin-bottom:4px;">${o.name}</div>
            <div style="font-size:0.8rem; color:#475569; margin-bottom:4px;">대표자: ${o.owner_name||o.representative_name||"대표"}</div>
            <div style="font-size:0.78rem; color:#64748b; margin-bottom:6px;">${o.address||"인천광역시 옹진군"}</div>
            <span style="font-size:0.72rem; font-weight:800; color:#0284c7; background:#e0f2fe; padding:2px 8px; border-radius:4px;">
              옹진관광 승인 가맹점
            </span>
          </div>
        `;l.bindPopup(y),l.openPopup(),c.push({id:o.id,name:o.name,lat:a,lng:r,marker:l})});const n=document.getElementById("map-search-input");n&&n.addEventListener("input",o=>{const a=o.target.value.trim().toLowerCase();if(!a)return;const r=c.find(l=>l.name.toLowerCase().includes(a));r&&s&&(s.flyTo([r.lat,r.lng],14,{duration:1}),r.marker.openPopup())})}window.switchTab=function(t){const i=document.querySelectorAll(".pill-tab"),e=document.getElementById("header-title-text");i.forEach(r=>r.classList.remove("active"));const n=document.querySelector(`.pill-tab[data-tab="${t}"]`);n&&n.classList.add("active");const o=document.getElementById("view-wallet"),a=document.getElementById("view-map");t==="wallet"?(o.classList.add("active-view"),a.classList.remove("active-view"),e.innerHTML="나의 <span>쿠폰함</span>",window.scrollTo(0,0)):(o.classList.remove("active-view"),a.classList.add("active-view"),e.innerHTML="가맹점 <span>지도</span>",window.scrollTo(0,0),setTimeout(()=>{h(),s&&s.invalidateSize()},50)),g(n)};function g(t){const i=document.getElementById("pill-slider"),e=document.getElementById("pill-nav");if(!t||!i||!e)return;const n=e.getBoundingClientRect(),o=t.getBoundingClientRect(),a=o.left-n.left;i.style.left=`${a}px`,i.style.width=`${o.width}px`}window.addEventListener("resize",()=>{const t=document.querySelector(".pill-tab.active");t&&g(t),s&&s.invalidateSize()});let m=null;function b(t,i){let e;t?e=new Date(t):i?(e=new Date(i),e.setFullYear(e.getFullYear()+1)):(e=new Date,e.setFullYear(e.getFullYear()+1));const n=e.getFullYear(),o=String(e.getMonth()+1).padStart(2,"0"),a=String(e.getDate()).padStart(2,"0");return`${n}.${o}.${a}`}function $(t,i){let e;t?e=new Date(t):i?(e=new Date(i),e.setFullYear(e.getFullYear()+1)):(e=new Date,e.setFullYear(e.getFullYear()+1));const n=new Date,o=e.getTime()-n.getTime(),a=Math.ceil(o/(1e3*60*60*24));return a<0?"만료":a===0?"D-Day":`D-${a}`}async function k(){try{const[t,i]=await Promise.all([p.get("/coupon/my"),p.get("/merchant/map")]);d=i.data||[],z(t.data||[]),M(d),setTimeout(()=>{const e=document.querySelector(".pill-tab.active");e&&g(e)},50)}catch(t){t.status===403||t.message&&t.message.includes("인증")?(v(),f("본인인증 후 이용 가능합니다.","info"),setTimeout(()=>{window.location.href="/tourist/index.html"},600)):f(t.message||"데이터를 불러오는 중 오류가 발생했습니다.","error")}}function z(t){const i=document.getElementById("coupon-list");if(t.length===0){i.innerHTML=`
          <div style="background:#ffffff; border:1.5px dashed #cbd5e1; border-radius:12px; text-align:center; padding: 48px 20px; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
            <div style="font-family: 'Gowun Dodum', sans-serif; font-size:1.4rem; font-weight:400; color:var(--text-dark); margin-bottom:6px;">보유 중인 쿠폰이 없습니다</div>
            <div style="font-size:0.85rem; color:var(--text-slate);">발행처 현장에서 QR 스캔 후 등록해보세요.</div>
          </div>`;return}i.innerHTML=t.map(e=>{const n=e.id,o=w(e.face_value),a=b(e.expires_at,e.issued_at);return`
          <div class="coupon-card-final">
            <div class="notch-l"></div>
            <div class="notch-r"></div>
            <div class="top-line">
              <span class="title-text">옹진 관광 섬 특별 할인 쿠폰</span>
              <span class="dday-badge">${$(e.expires_at,e.issued_at)}</span>
            </div>
            <div class="mid-line">
              <div class="price-text">${o}</div>
              <button class="btn-use-blue" onclick="window.openUseModal('${n}')">
                쿠폰 QR 사용
              </button>
            </div>
            <div class="bottom-line">
              <span>유효기간 ~ ${a}</span>
            </div>
          </div>
        `}).join("")}function M(t){const i=document.getElementById("merchant-list");(!t||t.length===0)&&(t=[{id:"m-yoonji",name:"윤지과일",owner_name:"정윤지",phone:"010-9801-2559",category:"수산물·농산물",address:"인천 옹진군 영흥면 영흥남로9번길 221-63 머드포레"}]);const e=t[0],n="../shared/images/yoonji_fruit.png",o="../shared/images/seafood.png";i.innerHTML=`
        <!-- 시안 1: 큼직한 시그니처 썸네일 카드 (Wide Thumbnail Card) -->
        <div class="m-wide-1" onclick="window.focusMerchantMap('${e.id}')" style="cursor:pointer;">
          <img src="${n}" alt="가맹점 대표 사진" style="width:90px; height:90px; border-radius:14px; object-fit:cover; flex-shrink:0; box-shadow:0 4px 12px rgba(0,0,0,0.1);" />
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="font-size:0.75rem; font-weight:800; color:#0284c7; background:#e0f2fe; padding:3px 8px; border-radius:6px;">${e.category||"수산물·농산물"}</span>
              <span style="font-size:0.75rem; color:#64748b;">${e.owner_name||"정윤지"} 대표</span>
            </div>
            <div style="font-size:1.15rem; font-weight:800; color:#0f172a; margin-bottom:4px;">${e.name}</div>
            <div style="font-size:0.8rem; color:#475569; line-height:1.3;">${e.address}</div>
          </div>
          <div style="align-self:flex-end; font-size:0.78rem; font-weight:800; color:#0284c7; white-space:nowrap;">
            지도 위치 >
          </div>
        </div>

        <!-- 시안 2: 풀-Width 탑 배너 카드 (Hero Top Banner Card) -->
        <div class="m-wide-2" onclick="window.focusMerchantMap('${e.id}')" style="cursor:pointer;">
          <div style="width:100%; height:130px; position:relative; overflow:hidden;">
            <img src="${n}" alt="가맹점 배경 배너" style="width:100%; height:100%; object-fit:cover;" />
            <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(15,23,42,0.7) 0%, transparent 60%);"></div>
            <span style="position:absolute; top:12px; left:14px; font-size:0.75rem; font-weight:800; color:#ffffff; background:rgba(2,132,199,0.9); padding:3px 10px; border-radius:99px; backdrop-filter:blur(4px);">
              옹진관광 정식 가맹점
            </span>
            <div style="position:absolute; bottom:10px; left:14px; color:#ffffff; font-size:1.2rem; font-weight:800;">
              ${e.name}
            </div>
          </div>
          <div style="padding:14px 18px; display:flex; align-items:center; justify-content:space-between; background:#ffffff;">
            <div>
              <div style="font-size:0.82rem; font-weight:700; color:#334155;">${e.category} • ${e.owner_name||"정윤지"} 대표</div>
              <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">${e.address}</div>
            </div>
            <span style="font-size:0.78rem; font-weight:800; color:#ffffff; background:#0284c7; padding:8px 14px; border-radius:10px; flex-shrink:0;">
              가맹점 지도보기
            </span>
          </div>
        </div>

        <!-- 시안 3: 모던 아일랜드 매장 카드 (Modern Island Store Card) -->
        <div class="m-wide-3" onclick="window.focusMerchantMap('${e.id}')" style="cursor:pointer;">
          <img src="${o}" alt="매장 이미지" style="width:84px; height:84px; border-radius:14px; object-fit:cover; flex-shrink:0;" />
          <div style="flex:1;">
            <div style="font-size:1.1rem; font-weight:800; color:#0369a1; margin-bottom:3px;">${e.name}</div>
            <div style="font-size:0.8rem; color:#334155; margin-bottom:4px;">${e.address}</div>
            <span style="font-size:0.72rem; font-weight:800; color:#0369a1; background:#ffffff; border:1px solid #7dd3fc; padding:2px 8px; border-radius:4px;">
              할인 쿠폰 결제 가능
            </span>
          </div>
        </div>

        <!-- 시안 4: 풀-와이드 스플릿 비주얼 카드 (Full-Wide Split Visual Card) -->
        <div class="m-wide-4" onclick="window.focusMerchantMap('${e.id}')" style="cursor:pointer;">
          <img src="${n}" alt="과일 스토어" style="width:88px; height:88px; border-radius:12px; object-fit:cover; flex-shrink:0;" />
          <div style="flex:1;">
            <div style="font-size:1.1rem; font-weight:800; color:#0f172a;">${e.name}</div>
            <div style="font-size:0.8rem; color:#64748b; margin-top:3px;">${e.address}</div>
            <div style="font-size:0.75rem; color:#0284c7; font-weight:700; margin-top:4px;">TEL: ${e.phone||"010-9801-2559"}</div>
          </div>
          <div style="width:36px; height:36px; border-radius:50%; background:#e0f2fe; display:flex; align-items:center; justify-content:center; color:#0284c7; flex-shrink:0;">
            <svg style="width:18px;height:18px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        <!-- 시안 5: 럭셔리 라운드 갤러리 카드 (Luxury Gallery Pill Card) -->
        <div class="m-wide-5" onclick="window.focusMerchantMap('${e.id}')" style="cursor:pointer;">
          <img src="${n}" alt="럭셔리 가맹점" style="width:96px; height:96px; border-radius:18px; object-fit:cover; flex-shrink:0; box-shadow:0 6px 16px rgba(0,0,0,0.12);" />
          <div style="flex:1;">
            <span style="font-size:0.74rem; font-weight:800; color:#ffffff; background:#0284c7; padding:3px 10px; border-radius:99px; display:inline-block; margin-bottom:6px;">
              옹진 수산·농산물
            </span>
            <div style="font-size:1.15rem; font-weight:800; color:#0f172a; margin-bottom:4px;">${e.name}</div>
            <div style="font-size:0.78rem; color:#475569;">${e.address}</div>
          </div>
        </div>
      `}window.focusMerchantMap=function(t){window.switchTab("map"),setTimeout(()=>{const i=c.find(e=>e.id===t);i&&s&&(s.flyTo([i.lat,i.lng],14,{duration:1}),i.marker.openPopup())},200)};window.openUseModal=async function(t){document.getElementById("use-modal-expired-container").style.display="none",document.getElementById("use-modal-qr-container").style.display="block",document.getElementById("use-qr-modal").classList.add("active"),await T(t),I(180)};window.closeUseModal=function(){document.getElementById("use-qr-modal").classList.remove("active"),u()};async function T(t){try{const i=await p.post(`/coupon/${t}/use-qr`);if(i.success&&i.qrToken){const e=document.getElementById("use-modal-qr-img");e.src=`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(i.qrToken)}`}}catch(i){f(i.message||"QR 코드 생성 실패","error")}}function I(t){u();let i=t;const e=document.getElementById("use-modal-timer");function n(){const o=String(Math.floor(i/60)).padStart(2,"0"),a=String(i%60).padStart(2,"0");e.textContent=`${o}:${a}`}n(),m=setInterval(()=>{i--,i<=0?(u(),document.getElementById("use-modal-qr-container").style.display="none",document.getElementById("use-modal-expired-container").style.display="block"):n()},1e3)}function u(){m&&clearInterval(m)}k();
