import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{i as S,a as u,s as k,c as I,r as B,b as l,f as _}from"./api-yYhXsohp.js";setInterval(()=>{const e=localStorage.getItem("ongjin_token");if(e&&e!=="test_dummy_jwt_token"){if(S(e)){const n=localStorage.getItem("ongjin_refresh");n?u.post("/auth/refresh",{refreshToken:n}).then(a=>{a.success?k(a.token,a.refresh):y()}).catch(()=>{y()}):y()}}else e||(window.location.href="/tourist/index.html")},1e4);function y(){I(),alert("인증 세션이 만료되었습니다. 다시 로그인해 주세요."),window.location.href="/tourist/index.html"}if(!B())throw new Error("not authenticated");const T={음식점:"https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=500&q=80",수산물:"https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=500&q=80",카페:"https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=500&q=80",숙박:"https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80",기념품:"https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=500&q=80",체험:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=500&q=80"},D="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=500&q=80",C={"백령도 해물칼국수":"백령도 바다의 신선한 해물을 듬뿍 담은 깊은 맛의 해물칼국수 전문점","연평도 꽃게직판장":"연평도에서 갓 잡아 올린 알이 꽉 찬 명품 꽃게 직판장 및 요리 전문점","대청도 서풍받이 카페":"서풍받이 해안 절벽의 비경을 감상하며 즐기는 오션뷰 디저트 카페","소청도 민박 파도소리":"소청도 파도 소리를 들으며 힐링할 수 있는 편안하고 아늑한 민박집","덕적도 솔밭 기념품":"덕적도 솔밭 명물 특산품과 직접 제작한 정성 어린 기념품 판매점","자월도 해수욕장 식당":"자월도 모래사장 앞 시원한 바람과 함께 즐기는 활어회와 제철 수산물","이작도 낚시체험":"아름다운 이작도 바다에서 초보자도 쉽게 즐기는 짜릿한 배낚시 체험 프로그램"};function v(e){if(!e)return"-";const n=new Date(e),a=t=>String(t).padStart(2,"0");return`${n.getFullYear()}.${a(n.getMonth()+1)}.${a(n.getDate())} ${a(n.getHours())}:${a(n.getMinutes())}`}function M(e){if(!e)return"-";const n=new Date(e);n.setFullYear(n.getFullYear()+1),n.setDate(n.getDate()-1);const a=t=>String(t).padStart(2,"0");return`${n.getFullYear()}.${a(n.getMonth()+1)}.${a(n.getDate())}`}let i=[],r=null,o=null,p=null,$=null;async function h(){if(localStorage.getItem("ongjin_token")==="test_dummy_jwt_token"){const e=[{id:999,code_hash:"PASS",coupon_type:"digital",status:"available",face_value:1e4,issued_at:"2026-05-26T10:00:00Z",issuer_name:"소야"},{id:998,code_hash:"USED_TEST",coupon_type:"paper",status:"used",face_value:5e3,issued_at:"2026-05-25T11:20:00Z",used_at:"2026-05-25T15:30:00Z",issuer_name:"연안부두 안내소",used_merchant_name:"백령도 해물칼국수"}];i=e,d(e);return}try{const{data:e}=await u.get("/coupon/my");i=e,d(e)}catch{l("쿠폰 정보를 불러오지 못했습니다.","error")}}function d(e){const n=document.getElementById("coupon-list");if(e.length===0){n.innerHTML=`
          <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 0.9rem;">
            등록된 쿠폰이 없습니다.
          </div>`;return}const a=e.sort((t,s)=>t.status==="available"&&s.status!=="available"?-1:t.status!=="available"&&s.status==="available"?1:new Date(s.issued_at)-new Date(t.issued_at));n.innerHTML=a.map(t=>{const s=t.status==="available",c=t.status==="used",g=t.status==="expired";let f="coupon-card";return c&&(f+=" used"),g&&(f+=" expired"),`
          <div class="${f}">
            <div class="coupon-card-header">
              <div class="coupon-value">${_(t.face_value)}</div>
            </div>
            
            <div class="coupon-info-grid">
              <span class="coupon-info-label">발행처</span>
              <span class="coupon-info-value">${t.issuer_name||"옹진군청"}</span>
              
              <span class="coupon-info-label">발행 일시</span>
              <span class="coupon-info-value">${v(t.issued_at)}</span>
              
              <span class="coupon-info-label">유효기간</span>
              <span class="coupon-info-value">~ ${M(t.issued_at)}</span>
              
              ${c?`
                <span class="coupon-info-label" style="color: var(--success);">사용처</span>
                <span class="coupon-info-value" style="color: var(--success);">${t.used_merchant_name||"등록 가맹점"}</span>
                
                <span class="coupon-info-label" style="color: var(--success);">사용 일시</span>
                <span class="coupon-info-value" style="color: var(--success);">${v(t.used_at)}</span>
              `:""}
            </div>

            ${s?`
              <button class="btn btn-primary btn-full" onclick="window.useCoupon(${t.id}, '${t.code_hash}')" style="padding: 10px 0; font-size: 0.85rem; border-radius: var(--radius-sm); margin-top: 4px; background: linear-gradient(135deg, #0284c7 0%, #1e3a8a 100%); border: none;">
                사용하기
              </button>
            `:""}
          </div>
        `}).join("")}window.useCoupon=function(e,n){p=e,$=n;const a=document.getElementById("use-qr-modal"),t=document.getElementById("use-modal-qr-img");t.src=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(n)}`,document.getElementById("use-modal-qr-container").style.display="block",document.getElementById("use-modal-expired-container").style.display="none",a.classList.add("active"),b(180),q(e,n)};function b(e){r&&clearInterval(r);let n=e;const a=document.getElementById("use-modal-timer"),t=()=>{const s=Math.floor(n/60),c=n%60;a.textContent=`${String(s).padStart(2,"0")}:${String(c).padStart(2,"0")}`,n<=30?a.style.color="#ef4444":a.style.color="var(--primary)"};t(),r=setInterval(()=>{n--,n<=0?(clearInterval(r),clearInterval(o),document.getElementById("use-modal-qr-container").style.display="none",document.getElementById("use-modal-expired-container").style.display="block"):t()},1e3)}function q(e,n){if(o&&clearInterval(o),localStorage.getItem("ongjin_token")==="test_dummy_jwt_token"&&n==="PASS"){o=setInterval(async()=>{clearInterval(o),clearInterval(r);const a=i.find(t=>t.id===e);a&&(a.status="used",a.used_at=new Date().toISOString(),a.used_merchant_name="백령도 해물칼국수"),document.getElementById("use-qr-modal").classList.remove("active"),l("쿠폰 사용이 완료되었습니다!","success"),d(i)},5e3);return}o=setInterval(async()=>{try{const{data:a}=await u.get("/coupon/my"),t=a.find(s=>s.id===e);t&&t.status==="used"&&(clearInterval(o),clearInterval(r),document.getElementById("use-qr-modal").classList.remove("active"),l("쿠폰 사용이 완료되었습니다!","success"),i=a,d(a))}catch(a){console.error("쿠폰 상태 체크 오류:",a)}},2e3)}window.regenerateQr=function(){document.getElementById("use-modal-qr-container").style.display="block",document.getElementById("use-modal-expired-container").style.display="none",b(180),q(p,$)};window.completePayment=async function(){if(window.closeUseModal(),localStorage.getItem("ongjin_token")==="test_dummy_jwt_token"){const e=i.find(n=>n.id===p);e&&e.status!=="used"&&(e.status="used",e.used_at=new Date().toISOString(),e.used_merchant_name="백령도 해물칼국수",l("데모 결제가 완료 처리되었습니다.","success")),d(i);return}try{const{data:e}=await u.get("/coupon/my");i=e,d(e);const n=e.find(a=>a.id===p);n&&n.status==="used"?l("결제가 성공적으로 완료되었습니다!","success"):l("결제 대기 상태입니다. 가맹점에서 정상 스캔되면 즉시 반영됩니다.","")}catch(e){console.error(e)}};window.closeUseModal=function(){document.getElementById("use-qr-modal").classList.remove("active"),r&&(clearInterval(r),r=null),o&&(clearInterval(o),o=null)};async function L(){const e=document.getElementById("merchant-list");try{const a=(await u.get("/merchant/map")).data||[];if(a.length===0){e.innerHTML=`
            <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.85rem;">
              사용 가능한 가맹점이 없습니다.
            </div>`;return}e.innerHTML=a.map(t=>{const s=T[t.category]||D,c=C[t.name]||`옹진군 공인 ${t.category||"관광"} 추천 가맹점입니다. 친절과 정성으로 모시겠습니다.`;return`
            <div class="merchant-card">
              <div class="merchant-img-container">
                <img class="merchant-img" src="${s}" alt="${t.name}" />
                <span class="merchant-category">${t.category||"가맹점"}</span>
              </div>
              <div class="merchant-body">
                <h4 class="merchant-name">${t.name}</h4>
                <p class="merchant-desc">${c}</p>
                <div class="merchant-address">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right: 2px;">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                  <span>${t.address||"주소 정보 없음"}</span>
                </div>
                <button class="btn btn-outline btn-full" onclick="window.openNaverMap(${t.lat}, ${t.lng}, '${t.name}', '${t.address}')" style="padding: 10px 0; font-size: 0.82rem; border-radius: var(--radius-sm); margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 4px; border-color: var(--primary); color: var(--primary);">
                  📍 길찾기
                </button>
              </div>
            </div>
          `}).join("")}catch(n){console.error(n),e.innerHTML=`
          <div style="text-align: center; padding: 30px; color: var(--danger); font-size: 0.85rem;">
            가맹점 정보를 불러오지 못했습니다.
          </div>`}}window.openNaverMap=function(e,n,a,t){const s=e&&n?`navermap://route/walk?dlat=${e}&dlng=${n}&dname=${encodeURIComponent(a)}&appname=ongjin`:`navermap://search?query=${encodeURIComponent(t||a)}`,c=e&&n?`https://map.naver.com/v5/directions/-,/-,${e},${n},${encodeURIComponent(a)}`:`https://map.naver.com/v5/search/${encodeURIComponent(t||a)}`,g=Date.now();window.location.href=s,setTimeout(()=>{Date.now()-g<1500&&window.open(c,"_blank")},1e3)};function j(){I(),window.location.href="/tourist/index.html"}document.getElementById("nav-logout").onclick=e=>{e.preventDefault(),j()};const x=new URLSearchParams(window.location.search),U=x.get("action"),w=x.get("allocationId");U==="issue"&&w&&sessionStorage.setItem("pending_qr_issue",w);const E=document.getElementById("qr-modal"),z=document.getElementById("qr-state-loading"),P=document.getElementById("qr-state-success"),R=document.getElementById("qr-state-error");function m(e){z.style.display=e==="loading"?"block":"none",P.style.display=e==="success"?"block":"none",R.style.display=e==="error"?"block":"none",E.classList.add("active")}document.getElementById("btn-qr-success-ok").onclick=()=>{E.classList.remove("active")};h().then(async()=>{const e=sessionStorage.getItem("pending_qr_issue");if(e){sessionStorage.removeItem("pending_qr_issue");const n=window.location.protocol+"//"+window.location.host+window.location.pathname;window.history.replaceState({},"",n);const a=parseInt(e);if(!isNaN(a)){m("loading");try{const t=await u.post("/coupon/issue-by-qr",{allocationId:a});t.success?(document.getElementById("qr-success-msg").textContent=`${_(t.faceValue||1e4)} 쿠폰이 지갑에 성공적으로 발급되었습니다!`,m("success"),await h()):(document.getElementById("qr-error-msg").textContent=t.message||"쿠폰 발급에 실패했습니다.",m("error"))}catch(t){document.getElementById("qr-error-msg").textContent=t.message||"쿠폰 발급 중 오류가 발생했습니다.",m("error")}}}});L();
