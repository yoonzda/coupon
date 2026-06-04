import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as o,f as a,d}from"./api-yYhXsohp.js";import{r}from"./admin-guard-D2w6DInN.js";await r();async function c(){try{const t=await o.get("/admin/stats/summary");document.getElementById("stat-total-amount").textContent=a(t.totalAmount||0),document.getElementById("stat-tx-count").textContent=`결제 ${t.txCount||0}건`,document.getElementById("stat-users").textContent=(t.userCount||0).toLocaleString(),document.getElementById("stat-merchants").textContent=t.merchantCount||0,document.getElementById("stat-fds").textContent=t.fdsCount||0;const n=t.couponIssued||0,e=t.couponUsed||0,s=n>0?(e/n*100).toFixed(1):0;document.getElementById("stat-coupon-issued").textContent=`${n.toLocaleString()} / ${e.toLocaleString()}`,document.getElementById("stat-coupon-rate").textContent=`사용률 ${s}%`}catch(t){console.error("통계 로드 실패",t)}try{const t=await o.get("/admin/fds/recent"),n=document.getElementById("fds-recent-list");if(!t||t.length===0){n.innerHTML='<tr><td colspan="5" class="text-center" style="padding:40px; color:var(--text-muted);"> 이상 거래가 탐지되지 않았습니다.</td></tr>';return}n.innerHTML=t.map(e=>`
          <tr>
            <td>${d(e.detected_at)}</td>
            <td>${e.merchant_name||"—"}</td>
            <td>${e.nickname||"익명"}</td>
            <td><span class="badge badge-danger">${e.rule_id}</span></td>
            <td>${e.resolved?" 해결됨":'<span style="color:#ef4444;">️ 미해결</span>'}</td>
          </tr>
        `).join("")}catch(t){console.error("FDS 로드 실패",t),document.getElementById("fds-recent-list").innerHTML=`<tr><td colspan="5" class="text-center" style="padding:40px; color:#ef4444;">FDS 데이터를 불러오지 못했습니다. (${t.message})</td></tr>`}}c();
