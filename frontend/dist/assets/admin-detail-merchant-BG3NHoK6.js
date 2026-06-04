import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{b as i,a as c,d as g}from"./api-yYhXsohp.js";import{r as p,g as u}from"./admin-guard-D2w6DInN.js";await p();u();const b=new URLSearchParams(window.location.search),r=parseInt(b.get("id"));r?w():(i("잘못된 접근입니다.","error"),setTimeout(()=>{window.location.href="merchants.html"},1500));window.openImageLarge=n=>{window.open().document.write(`<img src="${n}" style="max-width:100%; border:none; display:block; margin: 20px auto;" />`)};window.printMerchant=()=>{window.print()};window.downloadImage=(n,e)=>{const o=document.createElement("a");o.href=n;let t="png";if(n.startsWith("data:image/")){const a=n.match(/data:image\/([a-zA-Z0-9+]+);/);a&&(t=a[1],t==="svg+xml"&&(t="svg"),t==="jpeg"&&(t="jpg"))}else{const a=n.split(/[#?]/)[0].split(".");a.length>1&&(t=a.pop().toLowerCase())}o.download=`${e}.${t}`,document.body.appendChild(o),o.click(),document.body.removeChild(o)};async function w(){try{const n=await c.get(`/admin/merchants/${r}`);if(n.success&&n.data){const e=n.data;document.getElementById("info-name").innerText=e.name||"-",document.getElementById("info-owner-name").innerText=e.owner_name||"-",document.getElementById("info-phone").innerText=e.phone||"-",document.getElementById("info-store-phone").innerText=e.store_phone||"-",document.getElementById("info-category").innerText=e.category||"-",document.getElementById("info-business-hours").innerText=e.business_hours||"-",e.address?document.getElementById("info-address").innerHTML=`
              ${e.address}
              <a href="https://map.naver.com/v5/search/${encodeURIComponent(e.address)}" target="_blank" class="print-hide" style="margin-left: 8px; font-size: 0.8rem; color: #10b981; text-decoration: underline; font-weight: 600;">
                [네이버 지도 검색]
              </a>
            `:document.getElementById("info-address").innerText="-",document.getElementById("info-business-no").innerText=e.business_no||"-",document.getElementById("info-bank-name").innerText=e.bank_name||"-",document.getElementById("info-account-no").innerText=e.account_no||"-",document.getElementById("info-username").innerText=e.username||"-",document.getElementById("info-applied-at").innerText=e.applied_at?g(e.applied_at):"-";const t={pending:"승인 대기",approved:"승인 완료",rejected:"반려됨",suspended:"정지됨"}[e.status]||e.status;document.getElementById("info-status").innerHTML=`
            <span class="status-badge-lg status-${e.status||"pending"}">${t}</span>
            ${e.status==="rejected"&&e.rejection_reason?`
              <div style="margin-top: 8px; padding: 10px; background: #fee2e2; border-radius: 6px; color: #991b1b; font-size: 0.8rem;">
                <strong>반려 사유:</strong> ${e.rejection_reason}
              </div>
            `:""}
          `,e.business_cert_image&&(document.getElementById("cert-img-container").innerHTML=`
              <img class="doc-img-view" src="${e.business_cert_image}" onclick="window.openImageLarge('${e.business_cert_image}')" alt="사업자등록증" />
            `),e.bankbook_image&&(document.getElementById("bankbook-img-container").innerHTML=`
              <img class="doc-img-view" src="${e.bankbook_image}" onclick="window.openImageLarge('${e.bankbook_image}')" alt="통장사본" />
            `);const a=e.images?JSON.parse(e.images):[],d=document.getElementById("store-images-gallery");a.length>0?d.innerHTML=a.map((s,l)=>`
              <div class="gallery-img-box-wrapper" style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
                <div class="gallery-img-box" onclick="window.openImageLarge('${s}')">
                  <img src="${s}" alt="가게 이미지" />
                </div>
                <button class="btn btn-xs btn-neutral-outline print-hide" onclick="event.stopPropagation(); window.downloadImage('${s}', 'store-image-${l+1}')" style="width: 100%; padding: 4px 8px !important; font-size: 0.75rem;">
                  다운로드
                </button>
              </div>
            `).join(""):d.innerHTML='<span style="color:#94a3b8;font-size:0.85rem;padding: 10px 0;">등록된 가게 이미지가 없습니다.</span>';const m=document.getElementById("top-action-buttons");e.status==="pending"&&m.insertAdjacentHTML("beforeend",`
              <button class="btn btn-primary btn-sm" onclick="window.updateMerchantStatus('approved')">입점 승인</button>
              <button class="btn btn-neutral-outline btn-sm" onclick="window.updateMerchantStatus('rejected')">입점 반려</button>
            `)}else i("가맹점 정보를 조회할 수 없습니다.","error")}catch(n){console.error(n),i("서버 통신 오류","error")}}window.updateMerchantStatus=async n=>{const e=n==="approved"?"승인":"반려";let o="";if(n==="rejected"){if(o=prompt("반려 사유를 입력해주세요:","서류 미비 (사업자등록증 확인 불가)"),!o)return}else if(!confirm(`가맹점을 ${e} 처리하시겠습니까?`))return;try{await c.patch(`/admin/merchants/${r}/status`,{status:n,reason:o}),i(`${e} 처리가 완료되었습니다.`,"success"),setTimeout(()=>{window.location.reload()},1200)}catch(t){i(`처리 실패: ${t.message}`,"error")}};
