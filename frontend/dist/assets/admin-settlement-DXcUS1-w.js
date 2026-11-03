import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{h as $,c as r,a as u,f as h}from"./api-DIUxAG8e.js";import{r as v}from"./admin-guard-DxYVQPuN.js";import"./tracker-D60jFAt5.js";await v();function I(){const t=document.getElementById("filter-year"),e=document.getElementById("filter-month"),n=new Date,a=n.getFullYear(),d=String(n.getMonth()+1).padStart(2,"0");t.innerHTML="";for(let s=2027;s>=2024;s--){const i=document.createElement("option");i.value=String(s),i.textContent=`${s}년`,s===a&&(i.selected=!0),t.appendChild(i)}e.innerHTML="";for(let s=1;s<=12;s++){const i=String(s).padStart(2,"0"),c=document.createElement("option");c.value=i,c.textContent=`${s}월`,i===d&&(c.selected=!0),e.appendChild(c)}x()}function f(){const t=document.getElementById("filter-year").value,e=document.getElementById("filter-month").value;return`${t}-${e}`}function x(){const t=f(),e=document.getElementById("btn-generate-text");e&&(e.textContent=`${t} 정산파일 생성`)}document.getElementById("filter-year").addEventListener("change",x);document.getElementById("filter-month").addEventListener("change",x);function l(t,e,n=null){if(!t)return;t.disabled=e;const a=t.querySelector(".btn-text")||t;e?(t.classList.add("loading"),t.dataset.originalText=a.textContent,a.innerHTML=`<span class="btn-spinner"></span>${n||"처리 중..."}`):(t.classList.remove("loading"),t.dataset.originalText&&(a.textContent=t.dataset.originalText))}window.downloadSettlement=async function(t,e){if(!t)return;const n=t.split("/").pop()||"settlement.xml";let a="";e&&(e.disabled=!0,a=e.innerHTML,e.innerHTML='<span class="btn-spinner" style="border-top-color:#334155; width:11px; height:11px;"></span> 다운로드 중');try{const d=`/admin/settlements/download/${n}`;await $(d,n),r(`${n} 다운로드를 완료했습니다.`,"success")}catch(d){r(d.message||"파일 다운로드에 실패했습니다.","error")}finally{e&&(e.disabled=!1,e.innerHTML=a)}};async function m(){const t=f(),e=document.getElementById("btn-search");l(e,!0,"조회 중");try{let n=[];const{data:a}=await u.get(`/admin/settlements?period=${t}`),d=document.getElementById("settlement-list"),s=a||[];n=s,document.getElementById("kpi-period").textContent=t,document.getElementById("kpi-merchants").textContent=`${s.length}개소`;const i=s.reduce((o,g)=>o+Number(g.total_amount||0),0);document.getElementById("kpi-amount").textContent=h(i);const c=s.filter(o=>o.status==="file_generated"||o.file_path).length;if(document.getElementById("kpi-files").textContent=`${c}건`,s.length===0){d.innerHTML=`<tr><td colspan="7" style="padding: 60px 20px; text-align: center; color: #64748b;">
            <div style="font-size: 2.2rem; margin-bottom: 12px; line-height: 1;">📋</div>
            <strong style="font-size: 1.05rem; color: #334155; display: block; margin-bottom: 6px;">${t} 정산 내역이 없습니다.</strong>
            <p style="font-size: 0.88rem; color: #94a3b8; margin-bottom: 20px;">해당 월의 가맹점 쿠폰 사용 내역을 집계하여 정산 데이터를 생성해 보세요.</p>
            <button type="button" class="btn btn-neutral btn-sm" onclick="document.getElementById('btn-generate-file').click()">
              ${t} 정산파일 지금 생성하기
            </button>
          </td></tr>`;return}d.innerHTML=s.map(o=>{const g=!o.status||o.status==="pending",y=o.status==="file_generated",b=o.status==="transferred",w=b?"status-approved":y?"status-pending":"status-rejected",B=g?"background: #fffbeb; color: #b45309; border: 1px solid #fde68a;":y?"background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;":"background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;",k=b?"지급완료":y?"파일생성됨":"정산대기 (실시간)";return`
            <tr>
              <td>
                <strong style="color: #0f172a; font-size: 0.95rem;">${o.merchant_name}</strong>
                ${o.business_no?`<div style="font-size: 0.78rem; color: #94a3b8; font-family: monospace;">사업자: ${o.business_no}</div>`:""}
              </td>
              <td>
                ${o.bank_name||o.account_no?`
                  <div style="font-size: 0.88rem; font-weight: 700; color: #1e293b;">
                    ${o.bank_name||""} <span style="font-family: monospace; font-weight: 600; color: #2563eb;">${o.account_no||""}</span>
                  </div>
                  <div style="font-size: 0.78rem; color: #64748b;">예금주: ${o.owner_name||o.merchant_name}</div>
                `:`
                  <span style="font-size: 0.8rem; color: #94a3b8; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px dashed #cbd5e1;">계좌 미등록</span>
                `}
              </td>
              <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${o.period}</code></td>
              <td style="text-align: center; font-weight: 600; color: #334155;">${o.tx_count?o.tx_count+"건":"-"}</td>
              <td style="text-align: right; font-weight: 800; color: #0f172a; font-size: 0.98rem;">${h(o.total_amount)}</td>
              <td style="text-align: center;">
                <span class="status-badge ${w}" style="padding: 4px 10px; border-radius: 12px; font-size: 0.78rem; font-weight: 700; ${B}">
                  ${k}
                </span>
              </td>
              <td style="text-align: center;">
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                  ${o.file_path?`
                    <button type="button" onclick="downloadSettlement('${o.file_path}', this)" class="btn btn-secondary" style="height: 26px; padding: 0 8px; font-size: 11px;">
                      XML 다운
                    </button>
                  `:`
                    <button type="button" onclick="document.getElementById('btn-generate-file').click()" class="btn btn-secondary" style="height: 26px; padding: 0 8px; font-size: 11px;" title="상단 정산파일 생성 버튼을 눌러 정산 XML을 생성하세요">
                      파일 미생성
                    </button>
                  `}
                  ${o.id&&!b?`
                    <button type="button" onclick="markAsTransferred(${o.id}, '${(o.merchant_name||"").replace(/'/g,"\\'")}', this)" class="btn btn-primary" style="height: 26px; padding: 0 8px; font-size: 11px;">
                      지급완료 처리
                    </button>
                  `:""}
                </div>
              </td>
            </tr>
          `}).join("")}catch(n){const a=document.getElementById("settlement-list");a.innerHTML=`<tr><td colspan="7" style="padding: 60px; text-align: center; color: #ef4444;">
          <div style="font-size: 2rem; margin-bottom: 8px;">⚠️</div>
          <strong>정산 내역 조회 실패</strong><br>
          <small style="color: #94a3b8; margin-top: 8px; display:block;">${n.message}</small>
        </td></tr>`}finally{l(e,!1)}}window.markAsTransferred=async function(t,e,n){if(confirm(`[${e}] 가맹점 정산금을 실제 입금 완료하셨습니까?

상태를 '지급완료'로 변경합니다.`)){n&&(n.disabled=!0);try{await u.patch(`/admin/settlements/${t}/status`,{status:"transferred"}),r(`[${e}] 정산 지급완료 처리되었습니다.`,"success"),await m()}catch(a){r(a.message||"지급완료 처리에 실패했습니다.","error"),n&&(n.disabled=!1)}}};document.getElementById("btn-search").onclick=m;document.getElementById("btn-generate-file").onclick=async()=>{const t=f();if(!confirm(`[${t}] 기간의 가맹점 정산 데이터를 일괄 생성하시겠습니까?

- 이미 생성된 정산 건은 최신 거래 금액으로 갱신됩니다.
- 가맹점별 정산 XML 파일이 안전하게 생성됩니다.`))return;const e=document.getElementById("btn-generate-file");l(e,!0,"정산 생성 중");try{const n=await u.post("/admin/settlements/generate",{period:t});r(n.message||`${t} 정산 생성이 완료되었습니다.`,"success"),await m()}catch(n){r(n.message||"정산 생성 중 오류가 발생했습니다.","error")}finally{l(e,!1)}};document.getElementById("btn-export-csv").onclick=async function(){const t=f(),e=document.getElementById("btn-export-csv");l(e,!0,"CSV 생성 중");try{const n=`/admin/settlements/export-csv?period=${t}`,a=`옹진군_정산내역_${t}.csv`;await $(n,a),r(`${a} 다운로드를 완료했습니다.`,"success")}catch(n){r(n.message||"CSV 다운로드에 실패했습니다.","error")}finally{l(e,!1)}};document.getElementById("btn-batch-transfer").onclick=async function(){const t=f();if(!confirm(`[${t}] 기간의 모든 정산 대상 가맹점을 일괄 '지급완료' 처리하시겠습니까?

실제 금융 송금이 완료된 후 실행해 주세요.`))return;const e=document.getElementById("btn-batch-transfer");l(e,!0,"처리 중");try{const n=await u.post("/admin/settlements/mark-transferred",{period:t});r(n.message||"일괄 지급완료 처리되었습니다.","success"),await m()}catch(n){r(n.message||"일괄 지급완료 처리에 실패했습니다.","error")}finally{l(e,!1)}};I();m();const p=document.getElementById("btn-refresh-settlement");p&&p.addEventListener("click",async()=>{p.disabled=!0;try{await m(),r("정산 내역이 새로고침되었습니다.","success")}catch{r("새로고침 중 오류가 발생했습니다.","error")}finally{p.disabled=!1}});
