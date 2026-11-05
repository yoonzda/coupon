import"./mock-backend-a_Dp-F9x.js";/* empty css             */import{s as i,d as c,a as u}from"./api-BGCgjaV1.js";import{r as h,g as v}from"./admin-guard-H1fWcU3T.js";await h();v();const b=new URLSearchParams(window.location.search),p=parseInt(b.get("id"));p?f():(i("잘못된 접근입니다.","error"),setTimeout(()=>{window.location.href="merchants.html"},1500));window.docRotations={};window.rotateDoc=t=>{const e=document.getElementById(t);e&&(window.docRotations[t]=((window.docRotations[t]||0)+90)%360,e.style.transform=`rotate(${window.docRotations[t]}deg)`)};window.openImageLarge=t=>{window.open().document.write(`<img src="${t}" style="max-width:100%; border:none; display:block; margin: 20px auto;" />`)};window.printMerchant=()=>{window.print()};window.downloadImage=(t,e)=>{const o=document.createElement("a");o.href=t;let s="png";if(t.startsWith("data:image/")){const a=t.match(/data:image\/([a-zA-Z0-9+]+);/);a&&(s=a[1],s==="svg+xml"&&(s="svg"),s==="jpeg"&&(s="jpg"))}else{const a=t.split(/[#?]/)[0].split(".");a.length>1&&(s=a.pop().toLowerCase())}o.download=`${e}.${s}`,document.body.appendChild(o),o.click(),document.body.removeChild(o)};const n=(t,e)=>{const o=document.getElementById(t);o&&(o.innerText=e||"-")},d=(t,e)=>{const o=document.getElementById(t);o&&(o.innerHTML=e||"-")};window.currentMerchantData=null;window.exportMerchantExcel=()=>{const t=window.currentMerchantData;if(!t){i("가맹점 데이터를 불러오는 중입니다.","error");return}const e=`\uFEFF항목,내용
상호명,"${t.name||""}"
대표자 성명,"${t.owner_name||""}"
연락처,"${t.phone||""}"
가게 전화번호,"${t.store_phone||""}"
카테고리,"${t.category||""}"
영업시간,"${t.business_hours||""}"
소재지 주소,"${t.address||""}"
사업자등록번호,"${t.business_no||""}"
가입 희망 ID,"${t.username||""}"
은행명,"${t.bank_name||""}"
정산 계좌번호,"${t.account_no||""}"
신청 일시,"${t.applied_at?c(t.applied_at):""}"
심사 상태,"${t.status||""}"
`,o=new Blob([e],{type:"text/csv;charset=utf-8;"}),s=URL.createObjectURL(o),a=document.createElement("a");a.href=s,a.download=`가맹점상세_${t.name||"정보"}.csv`,document.body.appendChild(a),a.click(),document.body.removeChild(a)};async function f(){try{const t=await u.get(`/admin/merchants/${p}`);if(t.success&&t.data){const e=t.data;window.currentMerchantData=e,window.currentMerchantPhone=e.phone||"-",n("info-name",e.name),n("info-owner-name",e.owner_name),n("info-phone",e.phone),n("info-store-phone",e.store_phone),n("info-category",e.category),n("info-business-hours",e.business_hours),e.address?d("info-address",`
              ${e.address}
              <a href="https://map.naver.com/v5/search/${encodeURIComponent(e.address)}" target="_blank" class="print-hide" style="margin-left: 8px; font-size: 0.82rem; color: #10b981; text-decoration: underline; font-weight: 600;">
                [네이버 지도 검색]
              </a>
            `):n("info-address","-"),n("cmp-business-no",e.business_no),n("cmp-owner-name",e.owner_name),n("cmp-name",e.name),n("cmp-address",e.address),n("cmp-business-no-2",e.business_no),n("cmp-owner-name-2",e.owner_name),n("cmp-name-2",e.name),n("cmp-address-2",e.address),n("cmp-bank-name",e.bank_name),n("cmp-account-no",e.account_no),n("cmp-account-holder",e.owner_name),n("cmp-username",e.username),n("cmp-applied-at",e.applied_at?c(e.applied_at):"-"),n("cmp-bank-name-2",e.bank_name),n("cmp-account-no-2",e.account_no),n("cmp-account-holder-2",e.owner_name),n("cmp-username-2",e.username),n("cmp-applied-at-2",e.applied_at?c(e.applied_at):"-");const s={pending:"승인 대기",approved:"승인 완료",rejected:"반려됨",suspended:"정지됨"}[e.status]||e.status,a=(e.rejection_reason||"").replace(/\[사유\]/g,"").trim();d("info-status",`
            <span class="status-badge-lg status-${e.status||"pending"}">${s}</span>
            ${e.status==="rejected"&&a?`
              <span style="margin-left: 8px; color: #ef4444; font-size: 0.85rem; font-weight: 500;">
                (반려 사유: ${a})
              </span>
            `:""}
          `),e.business_cert_image&&(d("cert-img-container",`
              <img id="cert-img-el" class="doc-viewer-img" src="${e.business_cert_image}" onclick="window.openImageLarge('${e.business_cert_image}')" title="클릭 시 새 창에서 크게 보기" alt="사업자등록증" />
            `),d("cert-download-btn",`
              <button class="btn btn-xs btn-neutral-outline" onclick="window.downloadImage('${e.business_cert_image}', '사업자등록증_${e.name}')">다운로드</button>
            `)),e.bankbook_image&&(d("bankbook-img-container",`
              <img id="bankbook-img-el" class="doc-viewer-img" src="${e.bankbook_image}" onclick="window.openImageLarge('${e.bankbook_image}')" title="클릭 시 새 창에서 크게 보기" alt="통장사본" />
            `),d("bankbook-download-btn",`
              <button class="btn btn-xs btn-neutral-outline" onclick="window.downloadImage('${e.bankbook_image}', '통장사본_${e.name}')">다운로드</button>
            `));const w=e.images?JSON.parse(e.images):[],g=document.getElementById("store-images-gallery");w.length>0?g.innerHTML=w.map((r,m)=>`
              <div class="gallery-img-box-wrapper">
                <div class="gallery-img-box" onclick="window.openImageLarge('${r}')" title="클릭 시 크게 보기">
                  <img src="${r}" alt="가게 이미지" />
                </div>
              </div>
            `).join(""):g.innerHTML='<span style="color:#94a3b8;font-size:0.85rem;padding: 10px 0;">등록된 가게 이미지가 없습니다.</span>';const l=document.getElementById("sticky-center-actions");if(l){if(e.status==="pending")l.innerHTML=`
                <div class="segmented-action-panel">
                  <button class="action-chip action-chip-approve" onclick="window.updateMerchantStatus('approved')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    입점 승인
                  </button>
                  <button class="action-chip action-chip-reject" onclick="window.updateMerchantStatus('rejected')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    입점 반려
                  </button>
                </div>
              `;else if(e.status==="approved"){let r=e.updated_at?c(e.updated_at):e.applied_at?c(e.applied_at):"";l.innerHTML=`
                <div class="action-panel-wrapper" style="position: relative; display: inline-flex;">
                  <!-- 모던 캡슐 툴팁 팝오버 -->
                  <div class="status-tooltip-popover type-approved">
                    <svg style="width: 16px; height: 16px; stroke: #059669;" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>${r?`<strong>${r}</strong>에 `:""}입점 승인 완료되었습니다.</span>
                  </div>
                  <div class="segmented-action-panel">
                    <button class="action-chip action-chip-approve active" style="cursor:default;">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      승인 완료됨
                    </button>
                  </div>
                </div>
              `}else if(e.status==="rejected"){let r=(e.rejection_reason||"입점 신청 반려").replace(/\[사유\]/g,"").trim(),m=e.updated_at?c(e.updated_at):e.applied_at?c(e.applied_at):"";l.innerHTML=`
                <div class="action-panel-wrapper" style="position: relative; display: inline-flex;">
                  <!-- 모던 캡슐 툴팁 팝오버 -->
                  <div class="status-tooltip-popover type-rejected">
                    <svg style="width: 16px; height: 16px; stroke: #e11d48;" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    <span><strong>${r}</strong> 사유로 ${m?`${m}에 `:""}반려되었습니다.</span>
                  </div>
                  <div class="segmented-action-panel">
                    <button class="action-chip action-chip-reject active" style="cursor:default;">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      반려 완료됨
                    </button>
                  </div>
                </div>
              `}}setTimeout(()=>{const r=document.querySelector(".status-tooltip-popover");r&&(r.classList.add("show-pop-in"),setTimeout(()=>{r.classList.add("auto-fade-out")},3500))},450)}else i("가맹점 정보를 조회할 수 없습니다.","error")}catch(t){console.error(t),i("서버 통신 오류","error")}}window.updateMerchantStatus=async t=>{const e=t==="approved"?"승인":"반려";if(t==="rejected"){const o=window.currentMerchantPhone||"-",s=document.getElementById("drawer-phone-link");if(s){s.textContent=o;const a=o.replace(/\D/g,"");s.href=a?`tel:${a}`:"#"}document.querySelectorAll('input[name="reject-reason"]').forEach(a=>{a.checked=!1,a.parentElement.classList.remove("selected")}),document.getElementById("reject-custom-reason").value="",document.getElementById("reject-modal").classList.add("active")}else{if(!confirm(`가맹점을 ${e} 처리하시겠습니까?`))return;try{await u.patch(`/admin/merchants/${p}/status`,{status:t,reason:null}),i(`${e} 처리가 완료되었습니다.`,"success"),setTimeout(()=>{window.location.reload()},1200)}catch(o){i(`처리 실패: ${o.message}`,"error")}}};window.closeRejectModal=()=>{document.getElementById("reject-modal").classList.remove("active")};window.submitRejection=async()=>{const t=document.querySelectorAll('input[name="reject-reason"]:checked'),e=Array.from(t).map(a=>a.value),o=document.getElementById("reject-custom-reason").value.trim();if(e.length===0&&!o){alert("최소 하나 이상의 반려 사유를 체크하거나 직접 입력해 주세요.");return}let s="";e.length>0&&(s=`[사유] ${e.join(", ")}`),o&&(s=s?`${s} (${o})`:o);try{await u.patch(`/admin/merchants/${p}/status`,{status:"rejected",reason:s}),i("반려 처리가 완료되었습니다.","success"),setTimeout(()=>{window.location.reload()},1200)}catch(a){i(`처리 실패: ${a.message}`,"error")}};
