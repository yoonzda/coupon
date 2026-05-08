import"./main-9hPShMGN.js";import{a as d,b as r,f as o}from"./api-CHX2GdQ8.js";import{b as m,t as n}from"./i18n-DJszV0mx.js";import{r as c}from"./admin-guard-DWwHCSqY.js";await c();m("lang-switcher");async function u(){try{const t=await d.get("/admin/stats/summary");document.getElementById("stat-total-amount").textContent=r(t.totalAmount||0),document.getElementById("stat-users").textContent=t.userCount||0,document.getElementById("stat-merchants").textContent=t.merchantCount||0,document.getElementById("stat-fds").textContent=t.fdsCount||0;const a=await d.get("/admin/fds/recent"),s=document.getElementById("fds-recent-list");if(a.length===0){s.innerHTML=`<tr><td colspan="5" class="text-center">${n("fds_empty")}</td></tr>`;return}s.innerHTML=a.map(e=>`
          <tr>
            <td>${o(e.detected_at)}</td>
            <td>${e.merchant_name}</td>
            <td>${e.nickname||"익명"}</td>
            <td><span class="badge badge-danger">${e.rule_id}</span></td>
            <td>${e.resolved?n("status_resolved"):n("status_unresolved")}</td>
          </tr>
        `).join("")}catch(t){console.error("대시보드 로드 실패",t)}}u();
