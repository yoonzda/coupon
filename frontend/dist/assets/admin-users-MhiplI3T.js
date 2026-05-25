import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css             */import{r as m,g as f}from"./admin-guard-_dmZlLiC.js";await m();const h=document.getElementById("usersTableBody"),l=f();let d=[];async function u(){try{const e=await(await fetch("/api/admin/users",{headers:{Authorization:`Bearer ${l}`}})).json();e.success?(d=e.data,w(d)):alert("목록을 불러오는데 실패했습니다: "+e.message)}catch(t){console.error(t),alert("서버 오류가 발생했습니다.")}}function y(t){return t==="kakao"?`
      <div style="display:flex; justify-content:center; align-items:center; width:28px; height:28px; background:#FEE500; border-radius:50%; margin:0 auto;" title="카카오톡">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#3e2723"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.3 4.4 6.7-.1.5-1 3.7-1 3.9 0 .2.1.2.2.2.1-.1 3.2-2.2 4.5-3 .5.1 1 .2 1.5.2 5.5 0 10-3.5 10-7.8s-4.5-7.8-10-7.8z"/></svg>
      </div>`:t==="naver"?`
      <div style="display:flex; justify-content:center; align-items:center; width:28px; height:28px; background:#03C75A; border-radius:50%; margin:0 auto;" title="네이버">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/></svg>
      </div>`:t==="google"?`
      <div style="display:flex; justify-content:center; align-items:center; width:28px; height:28px; background:#FFFFFF; border:1px solid #cbd5e1; border-radius:50%; margin:0 auto;" title="구글">
        <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </div>`:t}function w(t){h.innerHTML="",t.forEach(e=>{const n=document.createElement("tr");n.id="user-row-"+e.id;let r=`<button style="background:transparent; border:none; color:#64748b; text-decoration:underline; cursor:pointer; font-size:0.85rem; font-weight:bold; padding:0;" onclick="window.deleteUser(${e.id})">탈퇴</button>`,o="미인증";e.phone_hash&&e.phone_hash!=="null"&&e.phone_hash.length>5&&(o="010-****-"+e.phone_hash.substring(e.phone_hash.length-4)),n.innerHTML=`
      <td>${y(e.social_provider)}</td>
      <td style="font-weight:bold;">${e.nickname}</td>
      <td style="color:#64748b; font-size:0.85rem;">${o}</td>
      <td>
        <button class="btn-action btn-view-coupons" onclick="window.viewUserCoupons(${e.id}, '${e.nickname}')">확인하기</button>
      </td>
      <td>
        ${r}
      </td>
    `,h.appendChild(n)})}window.deleteUser=async function(t){if(confirm(`이 회원을 탈퇴 처리하시겠습니까?
(해당 회원의 모든 DB 정보와 연동 내역이 영구 삭제됩니다.)`))try{const n=await(await fetch(`/api/admin/users/${t}`,{method:"DELETE",headers:{Authorization:`Bearer ${l}`}})).json();n.success?(alert("회원이 탈퇴 처리되었습니다."),document.getElementById("couponSection").style.display="none",u()):alert("오류: "+n.message)}catch{alert("서버 오류가 발생했습니다.")}};const p=document.getElementById("couponSection"),s=document.getElementById("sideCouponsBody");document.getElementById("btn-close-side").addEventListener("click",()=>{p.style.display="none",document.querySelectorAll("#usersTableBody tr").forEach(t=>t.classList.remove("selected"))});window.viewUserCoupons=async function(t,e){document.querySelectorAll("#usersTableBody tr").forEach(o=>o.classList.remove("selected"));const n=document.getElementById("user-row-"+t);n&&n.classList.add("selected"),document.getElementById("sideUserName").innerText=e;const r=d.find(o=>o.id===t);document.getElementById("sideCouponBalance").innerText=r?Number(r.coupon_balance).toLocaleString()+"원":"0원",s.innerHTML='<tr><td colspan="4">데이터를 불러오는 중...</td></tr>',p.style.display="block";try{const a=await(await fetch(`/api/admin/users/${t}/coupons`,{headers:{Authorization:`Bearer ${l}`}})).json();if(a.success){if(s.innerHTML="",a.data.length===0){s.innerHTML='<tr><td colspan="4" style="color:#94a3b8;">발급받거나 사용한 쿠폰 내역이 없습니다.</td></tr>';return}a.data.forEach(i=>{const g={available:'<span style="color:#16a34a; font-weight:bold;">사용 가능</span>',used:'<span style="color:#94a3b8; font-weight:bold;">사용 완료</span>',expired:'<span style="color:#ef4444; font-weight:bold;">만료</span>',cancelled:'<span style="color:#ef4444; font-weight:bold;">취소됨</span>'}[i.status],c=document.createElement("tr");c.innerHTML=`
          <td>${i.coupon_type==="digital"?"디지털":"지류(종이)"}</td>
          <td style="font-weight:bold;">${Number(i.face_value).toLocaleString()}원</td>
          <td>${g}</td>
          <td style="font-size:0.85rem; color:#64748b;">${new Date(i.issued_at).toLocaleDateString()}</td>
        `,s.appendChild(c)})}}catch{s.innerHTML='<tr><td colspan="4" style="color:red;">데이터를 불러오지 못했습니다.</td></tr>'}};u();
