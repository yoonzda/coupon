import"./modulepreload-polyfill-B5Qt9EMX.js";import{a as k,g as R}from"./api-DIUxAG8e.js";import"./tracker-D60jFAt5.js";const z=/^[A-Za-z0-9_-]{10,40}$/,U=new URLSearchParams(location.search),h=(U.get("t")||"").trim(),c=document.getElementById("share-root"),C=`${location.origin}/tourist/share.html?t=${encodeURIComponent(h)}`,T=`/tourist/login.html?redirect=${encodeURIComponent(`/tourist/share.html?t=${h}`)}`;let g=null,a=1,I=!1;const d=e=>Number(e||0).toLocaleString("ko-KR"),r=e=>String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),F=(e,t)=>new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",...t}).formatToParts(new Date(e)).reduce((n,i)=>(n[i.type]=i.value,n),{}),B=e=>{const t=F(e,{month:"numeric",day:"numeric"});return`${t.month}/${t.day}`},V=e=>{const t=F(e,{year:"numeric",month:"2-digit",day:"2-digit"});return`${t.year}-${t.month}-${t.day}`};function s(e){const t=document.getElementById("share-toast");t.textContent=e,t.classList.add("show"),clearTimeout(s._t),s._t=setTimeout(()=>t.classList.remove("show"),2600)}function L(){const e=g?.breakdown||[];return e.length===1?e[0].faceValue:null}async function N(){const e="함께 온 일행분은 아래 링크에서 옹진관광쿠폰을 1인 1장씩 받으세요.";if(navigator.share)try{await navigator.share({title:"옹진관광쿠폰 받기",text:e,url:C});return}catch(t){if(t&&t.name==="AbortError")return}D()}async function D(){try{await navigator.clipboard.writeText(C),s("링크를 복사했어요. 카카오톡 단톡방에 붙여넣어 주세요.")}catch{window.prompt("아래 링크를 복사해 일행에게 보내 주세요.",C)}}function f({compact:e=!1,subtitle:t}={}){const n=g,i=L(),u=n.totalCount?Math.round(n.remainingCount/n.totalCount*100):0,p=i?`${d(i)}원 <span>× ${n.totalCount}장</span>`:`총 ${d(n.totalAmount)}원 <span>· ${n.totalCount}장</span>`,m=i?"":n.breakdown.map(b=>`${d(b.faceValue)}원권 ${b.total}장`).join(" · ");return`
        <section class="ticket fade-in" aria-label="쿠폰 정보">
          <div class="ticket-loc">📍 ${r(n.location)} · 단체 발급</div>
          <div class="ticket-amt" style="${e?"font-size:23px":""}">${p}</div>
          <div class="ticket-meta">${r(t||m||`총 ${d(n.totalAmount)}원 · 옹진관광쿠폰 전 가맹점 사용`)}</div>
          <div class="ticket-bar"><i style="width:${u}%"></i></div>
          <div class="ticket-remain"><span>남은 쿠폰 ${n.remainingCount}장</span><span>${B(n.expiresAt)}까지 받기</span></div>
        </section>`}function M(e="일행에게 공유"){return`
        <div class="row">
          <button type="button" class="btn btn-share btn-sm" id="btn-share-native">${e}</button>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-share-copy">링크 복사</button>
        </div>`}function j(){localStorage.removeItem("ongjin_token"),localStorage.removeItem("ongjin_refresh"),localStorage.removeItem("ongjin_user"),location.href=T}function E(){document.getElementById("btn-share-native")?.addEventListener("click",N),document.getElementById("btn-share-copy")?.addEventListener("click",D),document.querySelectorAll(".btn-switch-account").forEach(e=>e.addEventListener("click",j))}function v(e,t,n,i){return`
        <div class="card notice fade-in">
          <div class="notice-ico" style="background:${t}">${e}</div>
          <div><b>${r(n)}</b><span>${r(i)}</span></div>
        </div>`}function l(){const e=g,t=e.viewer;if(e.status!=="OPEN"){const o={EXPIRED:["⏰","#f1f5f9","받기 기간이 끝났어요",`${B(e.expiresAt)}까지만 받을 수 있는 링크였어요.`],SOLD_OUT:["🎟️","#fef3c7","쿠폰이 모두 소진됐어요",`${e.totalCount}장 모두 일행분들이 받아 갔어요.`],CANCELLED:["↩️","#fee2e2","결제가 취소된 쿠폰이에요","매표소에서 결제가 취소되어 받을 수 없어요."]},[$,w,x,H]=o[e.status]||["ℹ️","#f1f5f9","받을 수 없는 링크예요",e.statusMessage||""];c.innerHTML=`
          ${f()}
          ${t&&t.claimedCount>0?v("✅","#ecfdf5",`이미 ${t.claimedCount}장 받으셨어요`,`${d(t.claimedAmount)}원이 내 쿠폰함에 있어요.`):""}
          ${v($,w,x,H)}
          <div class="spacer"></div>
          <a class="btn btn-ghost" id="btn-go-wallet" href="${t?"/tourist/mypage.html":"/tourist/index.html"}">${t?"내 쿠폰함으로 가기":"옹진관광쿠폰 홈으로"}</a>`;return}if(!t){const o=Math.min(e.policy.proxyMax,e.totalCount);c.innerHTML=`
          ${f()}
          <section class="card rules fade-in" aria-label="받기 안내">
            <div><span class="dot">1</span><span><b>일행</b>은 1인 1장씩 받을 수 있어요</span></div>
            <div><span class="dot">2</span><span><b>구매자</b>는 본인 포함 최대 ${o}장까지 받을 수 있어요</span></div>
            <div><span class="dot">3</span><span>${B(e.expiresAt)}까지 받지 않은 쿠폰은 소멸돼요</span></div>
          </section>
          <div class="spacer"></div>
          <a class="btn btn-primary" id="btn-login-claim" href="${T}">휴대폰 번호로 로그인하고 받기</a>
          <p class="note">처음이면 인증번호만 입력하면 바로 가입돼요.<br/>로그인하면 이 화면으로 다시 돌아와요.</p>`;return}if(t.allowedCount===0){const o=t.claimedCount>0;c.innerHTML=`
          ${f()}
          ${o?v("✅","#ecfdf5",`이미 ${t.claimedCount}장 받으셨어요`,t.blockMessage||"내 쿠폰함에서 확인해 주세요."):v("🛡️","#ede9fe","지금은 받을 수 없어요",t.blockMessage||"")}
          <div class="spacer"></div>
          <a class="btn btn-primary" id="btn-go-wallet" href="/tourist/mypage.html">내 쿠폰함에서 보기</a>
          ${t.isPurchaser?M("일행에게 공유"):""}`,E();return}if(t.isPurchaser){const o=t.allowedCount;l._qtyInit||(a=e.totalCount<=e.policy.proxyMax?o:1,l._qtyInit=!0),a=Math.min(Math.max(1,a),o);const $=L(),w=t.claimedCount>0?`이미 <b>${t.claimedCount}장</b> 받으셨어요. `:"";c.innerHTML=`
          <span class="badge fade-in">✔ 구매자 확인됨${t.maskedPhone?` · ${r(t.maskedPhone)}`:""}</span>
          ${f({compact:!0})}
          <section class="card fade-in" aria-label="받을 수량 선택">
            <h2>몇 장 받으시겠어요?</h2>
            <div class="stepper">
              <button type="button" id="btn-qty-minus" aria-label="한 장 줄이기" ${a<=1?"disabled":""}>−</button>
              <div class="stepper-num" aria-live="polite"><span id="qty-value">${a}</span><small> 장</small></div>
              <button type="button" id="btn-qty-plus" aria-label="한 장 늘리기" ${a>=o?"disabled":""}>+</button>
            </div>
            ${o>1?`
            <div class="chips">
              <button type="button" class="chip ${a===1?"on":""}" data-qty="1" id="chip-qty-1">1장 (본인)</button>
              <button type="button" class="chip ${a===o?"on":""}" data-qty="${o}" id="chip-qty-max">최대 ${o}장</button>
            </div>`:""}
            <div class="hint">${w}아이·어르신처럼 휴대폰이 없는 일행 몫을 대신 받을 수 있어요.<br/>
              지금 최대 <b>${o}장</b>까지 받을 수 있어요 (본인 포함 ${e.policy.proxyMax}장 한도${e.policy.monthlyProxyMax?` · 최근 30일 대리 수령 가능 ${t.monthlyProxyLeft}장`:""}).</div>
          </section>
          <button type="button" class="btn btn-primary" id="btn-claim">${a}장 받기${$?` (${d($*a)}원)`:""}</button>
          ${M("일행에게 공유")}
          <div style="text-align:center;margin-top:14px;">
            <button type="button" class="btn-switch-account" style="background:none;border:none;color:#94a3b8;font-size:12.5px;text-decoration:underline;cursor:pointer;font-family:inherit;">다른 계정으로 로그인</button>
          </div>`,document.getElementById("btn-qty-minus").addEventListener("click",()=>{a--,l()}),document.getElementById("btn-qty-plus").addEventListener("click",()=>{a++,l()}),c.querySelectorAll(".chip").forEach(x=>x.addEventListener("click",()=>{a=Number(x.dataset.qty),l()})),document.getElementById("btn-claim").addEventListener("click",()=>_(a)),E();return}const n=L(),u={kakao:"카카오",naver:"네이버",google:"구글",phone:"휴대폰"}[t.socialProvider]||"소셜",p=e.purchaserMaskedPhone?r(e.purchaserMaskedPhone):"";let m="";t.hasPhone?m=`
          <section class="card fade-in" style="background:#F8FAFC;border:1px solid #E2E8F0;margin-bottom:12px;padding:14px 16px;">
            <div style="font-size:12.5px;color:#64748B;line-height:1.45;">
              현재 로그인: <b>${r(t.maskedPhone)}</b><br/>
              ${p?`키오스크 구매자 번호(<b>${p}</b>)와 달라 <b>일행(1인 1장)</b>으로 적용됩니다.`:"키오스크 구매자 번호와 달라 일행으로 적용됩니다."}
            </div>
            <div style="margin-top:8px;">
              <button type="button" class="btn-switch-account" style="background:none;border:none;padding:0;color:#0068F9;font-size:12.5px;font-weight:700;text-decoration:underline;cursor:pointer;font-family:inherit;">
                구매자 계정으로 다시 로그인
              </button>
            </div>
          </section>`:m=`
          <section class="card fade-in" style="background:#F0F7FF;border:1px solid #BFDBFE;margin-bottom:12px;padding:16px;">
            <div style="font-size:14.5px;font-weight:700;color:#1E3A8A;margin-bottom:4px;">
              키오스크에서 결제하신 구매자이신가요?
            </div>
            <div style="font-size:12.5px;color:#3B82F6;line-height:1.5;margin-bottom:12px;">
              현재 <b>${u} 계정</b>으로 로그인되어 있어 구매자 확인이 필요합니다.<br/>
              ${p?`결제 시 문자를 받으신 번호(<b>${p}</b>)로 인증하시면 일행 몫까지 모두 받을 수 있습니다.`:"결제 시 문자를 받으신 휴대폰 번호로 인증하시면 일행 몫까지 모두 받을 수 있습니다."}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" id="btn-open-verify" style="background:#0068F9;color:#fff;border:none;border-radius:10px;padding:9px 15px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
                구매자 번호 인증하기
              </button>
              <button type="button" class="btn-switch-account" style="background:#fff;color:#475569;border:1px solid #CBD5E1;border-radius:10px;padding:9px 13px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;">
                다른 계정으로 로그인
              </button>
            </div>
          </section>`,c.innerHTML=`
        ${m}
        ${f({subtitle:"받는 즉시 내 쿠폰함에 등록 · 등록일로부터 1년 사용"})}
        <section class="card fade-in">
          <h2>함께 온 일행이신가요?</h2>
          <div class="hint" style="margin-top:0">이 링크로는 <b>한 분당 1장</b>만 받을 수 있어요.<br/>쿠폰은 가맹점(식당·카페·마트 등)에서 QR로 결제할 때 사용해요.</div>
        </section>
        <div class="spacer"></div>
        <button type="button" class="btn btn-primary" id="btn-claim">쿠폰 1장 받기${n?` (${d(n)}원)`:""}</button>
        ${t.maskedPhone?`<p class="note">로그인: ${r(t.maskedPhone)}</p>`:""}`,document.getElementById("btn-claim").addEventListener("click",()=>_(1));const b=document.getElementById("btn-open-verify");b&&b.addEventListener("click",Z),E()}function O(e){const t=!!g?.viewer?.isPurchaser;c.innerHTML=`
        <div class="done fade-in">
          <div class="check"><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#10b981" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <h2>쿠폰을 받았어요!</h2>
          <p>내 쿠폰함에 바로 등록됐어요.</p>
        </div>
        <section class="card fade-in">
          <div class="kv"><span>받은 쿠폰</span><b class="blue">${d(e.totalAmount)}원 (${e.claimedCount}장)</b></div>
          <div class="kv"><span>발행처</span><b>${r(e.location)}</b></div>
          ${e.couponExpiresAt?`<div class="kv"><span>사용 기한</span><b>${V(e.couponExpiresAt)}까지</b></div>`:""}
          <div class="kv"><span>남은 단체 쿠폰</span><b>${Math.max(0,e.remainingCount)}장</b></div>
        </section>
        <div class="spacer"></div>
        <a class="btn btn-primary" id="btn-go-wallet" href="/tourist/mypage.html">내 쿠폰함에서 보기</a>
        ${e.remainingCount>0?M(t?"일행에게 공유":"다른 일행에게 공유"):""}`,E()}function S(e){c.innerHTML=`
        ${v("🔗","#f1f5f9","링크를 열 수 없어요",e||"유효하지 않은 공유 링크입니다. 문자로 받은 링크를 다시 확인해 주세요.")}
        <div class="spacer"></div>
        <a class="btn btn-ghost" id="btn-go-home" href="/tourist/index.html">옹진관광쿠폰 홈으로</a>`}let y=180;function K(){clearInterval(window._verifyTimer),y=180;const e=document.getElementById("verify-timer");window._verifyTimer=setInterval(()=>{if(y--,y<=0){clearInterval(window._verifyTimer),e&&(e.textContent="만료");return}const t=String(Math.floor(y/60)).padStart(2,"0"),n=String(y%60).padStart(2,"0");e&&(e.textContent=`${t}:${n}`)},1e3)}function Z(){const e=document.getElementById("modal-phone-verify");e&&(e.style.display="flex");const t=document.getElementById("input-verify-phone");t&&(t.value="",t.focus());const n=document.getElementById("verify-otp-area");n&&(n.style.display="none");const i=document.getElementById("btn-submit-verify");i&&(i.style.display="none");const u=document.getElementById("btn-send-verify-otp");u&&(u.disabled=!1,u.textContent="인증번호 받기"),clearInterval(window._verifyTimer)}function A(){const e=document.getElementById("modal-phone-verify");e&&(e.style.display="none"),clearInterval(window._verifyTimer)}document.getElementById("btn-close-verify")?.addEventListener("click",A);document.getElementById("modal-phone-verify")?.addEventListener("click",e=>{e.target.id==="modal-phone-verify"&&A()});const q=document.getElementById("input-verify-phone");q&&q.addEventListener("input",e=>{let t=e.target.value.replace(/\D/g,"");t.length>11&&(t=t.slice(0,11)),t.length>7?t=t.replace(/(\d{3})(\d{4})(\d{1,4})/,"$1-$2-$3"):t.length>3&&(t=t.replace(/(\d{3})(\d{1,4})/,"$1-$2")),e.target.value=t});document.getElementById("btn-send-verify-otp")?.addEventListener("click",async function(){const e=(document.getElementById("input-verify-phone").value||"").replace(/\D/g,"");if(!/^01[0-9]{8,9}$/.test(e)){s("올바른 휴대폰 번호 11자리를 입력해 주세요.");return}const t=this;t.disabled=!0,t.textContent="발송 중...";try{await k.post("/auth/tourist/otp/send",{phone:e}),s("인증번호가 문자로 발송되었습니다."),document.getElementById("verify-otp-area").style.display="block",document.getElementById("btn-submit-verify").style.display="block",t.textContent="재발송",t.disabled=!1,K(),document.getElementById("input-verify-otp").focus()}catch(n){s(n.message||"인증번호 발송 실패. 다시 시도해 주세요."),t.disabled=!1,t.textContent="인증번호 받기"}});document.getElementById("btn-submit-verify")?.addEventListener("click",async function(){const e=(document.getElementById("input-verify-phone").value||"").replace(/\D/g,""),t=(document.getElementById("input-verify-otp").value||"").trim();if(!t||t.length!==6){s("인증번호 6자리를 입력해 주세요.");return}const n=this;n.disabled=!0,n.textContent="확인 중...";try{await k.post("/auth/tourist/link-phone",{phone:e,otp:t}),s("구매자 확인이 완료되었습니다!"),A(),l._qtyInit=!1,await P()}catch(i){s(i.message||"인증에 실패했습니다. 번호를 다시 확인해 주세요.")}finally{n.disabled=!1,n.textContent="인증 완료"}});async function P(){if(!z.test(h))return S();await R().catch(()=>!1);try{g=(await k.get(`/coupon/share/${encodeURIComponent(h)}`)).data,l()}catch(e){S(e.message)}}async function _(e){if(I)return;I=!0;const t=document.getElementById("btn-claim");t&&(t.disabled=!0,t.textContent="받는 중...");try{const n=await k.post(`/coupon/share/${encodeURIComponent(h)}/claim`,{quantity:e});O(n.data)}catch(n){if(n.status===401){location.href=T;return}s(n.message||"쿠폰을 받지 못했어요. 다시 시도해 주세요."),l._qtyInit=!1,await P()}finally{I=!1}}P();
