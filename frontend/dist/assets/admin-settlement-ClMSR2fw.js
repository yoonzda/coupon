import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{a as i,s as l,f as p}from"./api-BxOpvEgq.js";import{r as g}from"./admin-guard-CkaXWeUD.js";await g();let s=[];async function u(){try{const t=await i.get("/admin/settlements/periods");t.success&&t.data&&(s=t.data,c())}catch(t){console.error("정산 가능 연월 조회 실패",t);const r=new Date,n=r.getFullYear(),a=String(r.getMonth()+1).padStart(2,"0");s=[`${n}-${a}`],c()}}function c(){const t=document.getElementById("filter-year"),r=Array.from(new Set(s.map(n=>n.split("-")[0]))).sort().reverse();t.innerHTML=r.map(n=>`<option>${n}년</option>`).join(""),d()}function d(){const t=document.getElementById("filter-year"),r=document.getElementById("filter-month");if(!t.value)return;const n=t.value.replace("년",""),a=s.filter(e=>e.startsWith(n)).map(e=>e.split("-")[1]).sort().reverse();r.innerHTML=a.map(e=>`<option value="${e}">${parseInt(e)}월</option>`).join("")}document.getElementById("filter-year").onchange=d;async function m(){const t=document.getElementById("filter-year").value.replace("년",""),r=document.getElementById("filter-month").value,n=`${t}-${r}`;try{const{data:a}=await i.get(`/admin/settlements?period=${n}`),e=document.getElementById("settlement-list");if(!a||a.length===0){e.innerHTML=`<tr><td colspan="5" style="padding: 60px; text-align: center; color: #64748b;">
            <div style="font-size: 2rem; margin-bottom: 8px;"></div>
            ${n} 정산 내역이 없습니다.
          </td></tr>`;return}e.innerHTML=a.map(o=>`
          <tr>
            <td><strong>${o.merchant_name}</strong></td>
            <td>${o.period}</td>
            <td>${p(o.total_amount)}</td>
            <td>
              <span class="badge ${o.status==="transferred"?"badge-success":"badge-warning"}">
                ${o.status==="pending"?"대기":o.status==="file_generated"?"파일생성됨":"지급완료"}
              </span>
            </td>
            <td>
              ${o.file_path?`<a href="${o.file_path}" class="btn btn-neutral-outline btn-xs" download>XML 다운로드</a>`:"-"}
            </td>
          </tr>
        `).join("")}catch(a){const e=document.getElementById("settlement-list");e.innerHTML=`<tr><td colspan="5" style="padding: 60px; text-align: center; color: #ef4444;">
          <div style="font-size: 2rem; margin-bottom: 8px;">️</div>
          <strong>정산 내역 조회 실패</strong><br>
          <small style="color: #94a3b8; margin-top: 8px; display:block;">${a.message}</small>
        </td></tr>`}}document.getElementById("btn-search").onclick=m;document.getElementById("btn-generate-file").onclick=async()=>{if(confirm("현재 기간의 가맹점 정산 파일을 일괄 생성하시겠습니까?"))try{const t=await i.post("/admin/settlements/generate");l(t.message,"success"),m()}catch(t){l(t.message,"error")}};u();
