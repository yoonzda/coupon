import{a as d,s as a,b as l}from"./api-vtkRPzLV.js";async function s(){const e=document.getElementById("filter-year").value.replace("년",""),o=document.getElementById("filter-month").value,c=`${e}-${o}`;try{const{data:n}=await d.get(`/admin/settlements?period=${c}`),r=document.getElementById("settlement-list");if(n.length===0){r.innerHTML='<tr><td colspan="5" class="text-center" style="padding: 40px;">내역이 없습니다.</td></tr>';return}r.innerHTML=n.map(t=>`
          <tr>
            <td><strong>${t.merchant_name}</strong></td>
            <td>${t.period}</td>
            <td>${l(t.total_amount)}</td>
            <td>
              <span class="badge ${t.status==="transferred"?"badge-success":"badge-warning"}">
                ${t.status==="pending"?"대기":t.status==="file_generated"?"파일생성됨":"지급완료"}
              </span>
            </td>
            <td>
              ${t.file_path?`<a href="${t.file_path}" class="btn btn-outline btn-xs" download>XML 다운로드</a>`:"-"}
            </td>
          </tr>
        `).join("")}catch{a("정산 내역을 불러오지 못했습니다.","error")}}document.getElementById("btn-search").onclick=s;document.getElementById("btn-generate-file").onclick=async()=>{if(confirm("현재 기간의 가맹점 정산 파일을 일괄 생성하시겠습니까?"))try{const e=await d.post("/admin/settlements/generate");a(e.message,"success"),s()}catch(e){a(e.message,"error")}};s();
