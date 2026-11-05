import"./mock-backend-a_Dp-F9x.js";/* empty css             */import{r as m,g as h}from"./admin-guard-H1fWcU3T.js";await m();const i=document.getElementById("usersTableBody"),l=h();let s=[];async function u(){try{const e=await(await fetch("/api/admin/users",{headers:{Authorization:`Bearer ${l}`}})).json();e.success?(s=e.data,c(s)):alert("목록을 불러오는데 실패했습니다: "+e.message)}catch(t){console.error(t),alert("서버 오류가 발생했습니다.")}}function f(t){return t||"미인증"}function c(t){if(i.innerHTML="",t.length===0){i.innerHTML='<tr><td colspan="3" class="text-center" style="padding: 40px; color: #64748b;">등록된 회원이 없습니다.</td></tr>';return}t.forEach(e=>{const r=document.createElement("tr");r.id="user-row-"+e.id,r.classList.add("row-clickable");const a=f(e.nickname),o=e.created_at?new Date(e.created_at).toLocaleString("ko-KR"):"—";r.innerHTML=`
      <td style="font-weight: 700; color: var(--text-primary);">${a}</td>
      <td style="color: var(--text-secondary);">${o}</td>
      <td>
        <div class="admin-table-actions">
          <a href="detail-user.html?id=${e.id}" class="btn-table-edit">상세보기</a>
          <button class="btn-table-delete" onclick="window.deleteUser(event, ${e.id})">탈퇴</button>
        </div>
      </td>
    `,r.addEventListener("click",n=>{n.target.closest("button")||n.target.closest("a")||(window.location.href=`detail-user.html?id=${e.id}`)}),i.appendChild(r)})}window.deleteUser=async function(t,e){if(t&&t.stopPropagation(),!!confirm(`이 회원을 탈퇴 처리하시겠습니까?
(해당 회원의 모든 DB 정보와 연동 내역이 영구 삭제됩니다.)`))try{const a=await(await fetch(`/api/admin/users/${e}`,{method:"DELETE",headers:{Authorization:`Bearer ${l}`}})).json();a.success?(alert("회원이 탈퇴 처리되었습니다."),u()):alert("오류: "+a.message)}catch{alert("서버 오류가 발생했습니다.")}};const d=document.getElementById("search-phone");d&&d.addEventListener("input",t=>{const e=t.target.value.trim();if(!e){c(s);return}const r=e.replace(/[^0-9]/g,""),a=r.length>0,o=s.filter(n=>a?n.phone_last4&&n.phone_last4.includes(r):n.nickname&&n.nickname.toLowerCase().includes(e.toLowerCase()));c(o)});u();
