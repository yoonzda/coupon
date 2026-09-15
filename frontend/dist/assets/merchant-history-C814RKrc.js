import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{r as i,a as c,s as m,d as l}from"./api-BrJ7NzZM.js";if(!i("/merchant/login.html"))throw new Error("not authenticated");async function u(){try{const{data:t}=await c.get("/merchant/transactions");p(t||[])}catch(t){m(t.message,"error")}}function p(t){const s=t.reduce((n,e)=>n+e.amount,0),o=Number(s).toLocaleString("ko-KR");document.getElementById("total-amount-num").textContent=o,document.getElementById("total-count-num").textContent=t.length;const a=document.getElementById("tx-list");if(!t||t.length===0){a.innerHTML=`
          <div class="empty-state">
            <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="square" stroke-linejoin="miter" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span class="empty-text">조회된 거래 내역이 없습니다.</span>
          </div>`;return}a.innerHTML=t.map(n=>{const e=n.coupon_type==="paper",r=Number(n.amount).toLocaleString("ko-KR");return`
          <div class="tx-item-row">
            <div class="tx-info-group">
              <span class="tx-badge ${e?"paper":""}">${e?"종이쿠폰":"디지털"}</span>
              <div>
                <div class="tx-title">${e?"종이 지류 쿠폰":"디지털 관광 쿠폰"} 결제</div>
                <div class="tx-sub">${l(n.scanned_at)}</div>
              </div>
            </div>
            <div class="tx-val-wrap">
              <span class="tx-val-num">+${r}</span>
              <span class="unit-text">원</span>
            </div>
          </div>`}).join("")}u();
