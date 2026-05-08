import"./main-9hPShMGN.js";import{a as o,s as a,b as i}from"./api-CHX2GdQ8.js";import{r as l}from"./admin-guard-DWwHCSqY.js";await l();async function r(){const e=document.getElementById("filter-year").value.replace("년",""),d=document.getElementById("filter-month").value,c=`${e}-${d}`;try{const{data:n}=await o.get(`/admin/settlements?period=${c}`),s=document.getElementById("settlement-list");if(n.length===0){s.innerHTML='<tr><td colspan="5" class="text-center" style="padding: 40px;">내역이 없습니다.</td></tr>';return}s.innerHTML=n.map(t=>`
          <tr>
            <td><strong>${t.merchant_name}</strong></td>
            <td>${t.period}</td>
            <td>${i(t.total_amount)}</td>
            <td>
              <span class="badge ${t.status==="transferred"?"badge-success":"badge-warning"}">
                ${t.status==="pending"?"대기":t.status==="file_generated"?"파일생성됨":"지급완료"}
              </span>
            </td>
            <td>
              ${t.file_path?`<a href="${t.file_path}" class="btn btn-outline btn-xs" download>XML 다운로드</a>`:"-"}
            </td>
          </tr>
        `).join("")}catch{a("정산 내역을 불러오지 못했습니다.","error")}}document.getElementById("btn-search").onclick=r;document.getElementById("btn-generate-file").onclick=async()=>{if(confirm("현재 기간의 가맹점 정산 파일을 일괄 생성하시겠습니까?"))try{const e=await o.post("/admin/settlements/generate");a(e.message,"success"),r()}catch(e){a(e.message,"error")}};r();
