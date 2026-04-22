import{r as l,c as d,a as r,s as c,b as n,f as m}from"./api-vtkRPzLV.js";if(!l("/merchant/index.html"))throw new Error("not auth");async function u(){if(localStorage.getItem("ongjin_token")==="test_dummy_merchant_token"){const e=[{id:1,amount:1e4,coupon_type:"digital",scanned_at:new Date().toISOString(),is_offline:!1},{id:2,amount:5e3,coupon_type:"digital",scanned_at:new Date(Date.now()-36e5).toISOString(),is_offline:!1},{id:3,amount:1e4,coupon_type:"paper",scanned_at:new Date(Date.now()-72e5).toISOString(),is_offline:!0}];i(e);return}try{const{data:e}=await r.get("/merchant/transactions");i(e)}catch(e){c(e.message,"error")}}function i(e){const a=e.reduce((t,s)=>t+s.amount,0),o=e.filter(t=>t.is_offline).length;if(document.getElementById("summary-row").innerHTML=`
          <div class="summary-box">
            <div class="summary-value">${n(a)}</div>
            <div class="summary-label">총 정산 금액</div>
          </div>
          <div class="summary-box">
            <div class="summary-value">${e.length}건</div>
            <div class="summary-label">총 거래 (오프라인 ${o}건)</div>
          </div>`,e.length===0){document.getElementById("tx-list").innerHTML='<div style="padding:32px;text-align:center;color:var(--text-muted);">거래 내역이 없습니다.</div>';return}document.getElementById("tx-list").innerHTML=e.map(t=>`
          <div class="tx-item">
            <div class="tx-icon ${t.is_offline?"offline":""}">
              ${t.is_offline?"📡":"✅"}
            </div>
            <div class="tx-info">
              <div class="tx-type">${t.coupon_type==="paper"?"종이쿠폰":"디지털쿠폰"} 사용</div>
              <div class="tx-date">${m(t.scanned_at)} ${t.is_offline?"(오프라인)":""}</div>
            </div>
            <div class="tx-amount">+${n(t.amount)}</div>
          </div>`).join("")}document.getElementById("nav-logout").onclick=e=>{e.preventDefault(),d(),window.location.href="/merchant/index.html"};u();
