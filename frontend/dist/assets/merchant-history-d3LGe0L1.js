import"./main-9hPShMGN.js";import{r as l,c as d,a as r,s as c,b as n,f as m}from"./api-CHX2GdQ8.js";if(!l("/merchant/index.html"))throw new Error("not auth");async function u(){if(localStorage.getItem("ongjin_token")==="test_dummy_merchant_token"){const t=[{id:1,amount:1e4,coupon_type:"digital",scanned_at:new Date().toISOString(),is_offline:!1},{id:2,amount:5e3,coupon_type:"digital",scanned_at:new Date(Date.now()-36e5).toISOString(),is_offline:!1},{id:3,amount:1e4,coupon_type:"paper",scanned_at:new Date(Date.now()-72e5).toISOString(),is_offline:!0}];i(t);return}try{const{data:t}=await r.get("/merchant/transactions");i(t)}catch(t){c(t.message,"error")}}function i(t){const a=t.reduce((e,s)=>e+s.amount,0),o=t.filter(e=>e.is_offline).length;if(document.getElementById("summary-row").innerHTML=`
          <div class="summary-box">
            <div class="summary-value">${n(a)}</div>
            <div class="summary-label">총 정산 금액</div>
          </div>
          <div class="summary-box">
            <div class="summary-value">${t.length}건</div>
            <div class="summary-label">총 거래 (오프라인 ${o}건)</div>
          </div>`,t.length===0){document.getElementById("tx-list").innerHTML='<div style="padding:32px;text-align:center;color:var(--text-muted);">거래 내역이 없습니다.</div>';return}document.getElementById("tx-list").innerHTML=t.map(e=>`
          <div class="tx-item">
            <div class="tx-icon ${e.is_offline?"offline":""}">
              ${e.is_offline?"📡":"✅"}
            </div>
            <div class="tx-info">
              <div class="tx-type">${e.coupon_type==="paper"?"종이쿠폰":"디지털쿠폰"} 사용</div>
              <div class="tx-date">${m(e.scanned_at)} ${e.is_offline?"(오프라인)":""}</div>
            </div>
            <div class="tx-amount">+${n(e.amount)}</div>
          </div>`).join("")}document.getElementById("nav-logout").onclick=t=>{t.preventDefault(),d(),window.location.href="/merchant/index.html"};u();
