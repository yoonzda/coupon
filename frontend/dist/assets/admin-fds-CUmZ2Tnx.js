import{a as n,s as e,f as r}from"./api-vtkRPzLV.js";async function d(){try{const{data:t}=await n.get("/admin/fds"),a=document.getElementById("fds-list");if(t.length===0){a.innerHTML='<tr><td colspan="5" class="text-center" style="padding: 40px;">탐지된 이상 거래가 없습니다.</td></tr>';return}a.innerHTML=t.map(s=>`
          <tr>
            <td>
              <span class="rule-tag rule-${s.rule_id}">${s.rule_id}</span><br>
              <small>${r(s.detected_at)}</small>
            </td>
            <td>
              <strong>${s.merchant_name}</strong><br>
              <small>${s.user_nickname||"익명 사용자"}</small>
            </td>
            <td>${s.description}</td>
            <td>
              <span class="badge ${s.resolved?"badge-success":"badge-danger"}">
                ${s.resolved?"해결됨":"미결"}
              </span>
            </td>
            <td>
              ${s.resolved?"-":`<button class="btn btn-outline btn-xs" onclick="resolveFDS(${s.id})">확인 완료</button>`}
            </td>
          </tr>
        `).join("")}catch{e("FDS 내역을 불러오지 못했습니다.","error")}}window.resolveFDS=async t=>{try{await n.patch(`/admin/fds/${t}/resolve`),e("해결 상태로 변경되었습니다.","success"),d()}catch(a){e(a.message,"error")}};d();
