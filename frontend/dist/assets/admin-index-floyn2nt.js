import{a as d,b as s,f as o}from"./api-vtkRPzLV.js";async function r(){try{const t=await d.get("/admin/stats/summary");document.getElementById("stat-total-amount").textContent=s(t.totalAmount||0),document.getElementById("stat-users").textContent=t.userCount||0,document.getElementById("stat-merchants").textContent=t.merchantCount||0,document.getElementById("stat-fds").textContent=t.fdsCount||0;const n=await d.get("/admin/fds/recent"),a=document.getElementById("fds-recent-list");if(n.length===0){a.innerHTML='<tr><td colspan="5" class="text-center">탐지된 내역이 없습니다.</td></tr>';return}a.innerHTML=n.map(e=>`
          <tr>
            <td>${o(e.detected_at)}</td>
            <td>${e.merchant_name}</td>
            <td>${e.nickname||"익명"}</td>
            <td><span class="badge badge-danger">${e.rule_id}</span></td>
            <td>${e.resolved?"해결":"미해결"}</td>
          </tr>
        `).join("")}catch(t){console.error("대시보드 로드 실패",t)}}r();
