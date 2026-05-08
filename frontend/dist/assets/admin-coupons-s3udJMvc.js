import"./main-9hPShMGN.js";import{a as S,s as u}from"./api-CHX2GdQ8.js";import{b}from"./i18n-DJszV0mx.js";b("lang-switcher");window.generateCoupons=async function(g){g.preventDefault();const e=document.getElementById("btn-submit"),p=e.innerHTML,o=document.getElementById("issuer-select"),s=o.options[o.selectedIndex].text,r=document.getElementById("issue-qty").value,d=document.getElementById("coupon-type").value;e.innerHTML="생성 중...",e.disabled=!0,e.style.opacity="0.7";try{const n=await S.post("/admin/coupons/generate",{issuer:s,type:parseInt(d),quantity:parseInt(r)});u(n.message,"success");const c=document.getElementById("batch-list"),i=document.createElement("tr"),t=new Date,m=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`,y=`data:text/csv;charset=utf-8,\uFEFF발행처,권종(원),쿠폰번호
`+n.data.map(a=>`${a.issuer},${a.faceValue},${a.code}`).join(`
`),$=encodeURI(y),l=`BATCH-${t.getFullYear()}${String(t.getMonth()+1).padStart(2,"0")}${String(t.getDate()).padStart(2,"0")}-${Math.floor(Math.random()*1e3)}`;i.innerHTML=`
          <td><strong>${l}</strong></td>
          <td>${m}</td>
          <td>${s}</td>
          <td>${Number(d).toLocaleString()}원권</td>
          <td>${r}장</td>
          <td><a href="${$}" download="coupons_${l}.csv" class="btn-download" style="text-decoration:none; display:inline-block;">⬇️ 난수 추출 (CSV)</a></td>
        `,c.insertBefore(i,c.firstChild)}catch(n){u(n.message,"error")}finally{e.innerHTML=p,e.disabled=!1,e.style.opacity="1"}};
