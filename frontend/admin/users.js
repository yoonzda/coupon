import { requireAdminAuth, getAdminToken } from '../shared/js/admin-guard.js';
await requireAdminAuth();

const tbody = document.getElementById('usersTableBody');
const token = getAdminToken();
let currentUsers = [];

async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      currentUsers = data.data;
      renderUsers(currentUsers);
    } else {
      alert('목록을 불러오는데 실패했습니다: ' + data.message);
    }
  } catch (err) {
    console.error(err);
    alert('서버 오류가 발생했습니다.');
  }
}

function getMaskedPhone(nickname) {
  return nickname || '미인증';
}

function renderUsers(users) {
  tbody.innerHTML = '';
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="table-placeholder">등록된 회원이 없습니다.</td></tr>';
    return;
  }

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.id = 'user-row-' + u.id;
    tr.classList.add('row-clickable');
    
    // 전화번호 처리 (nickname 컬럼에 이미 백엔드 마스킹된 전화번호가 내려옵니다)
    const phoneStr = getMaskedPhone(u.nickname);

    // 가입 일시 포맷팅
    const regDateStr = u.created_at ? new Date(u.created_at).toLocaleString('ko-KR') : '—';

    tr.innerHTML = `
      <td class="user-nickname">${phoneStr}</td>
      <td class="user-phone">${regDateStr}</td>
      <td>
        <div class="admin-table-actions">
          <a href="detail-user.html?id=${u.id}" class="btn-table-edit">상세 보기</a>
          <button class="btn-table-delete" onclick="window.deleteUser(event, ${u.id})">탈퇴</button>
        </div>
      </td>
    `;
    
    // Row click navigates to detail page, unless clicking actions
    tr.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      window.location.href = `detail-user.html?id=${u.id}`;
    });

    tbody.appendChild(tr);
  });
}

// 회원 완전 삭제 (탈퇴)
window.deleteUser = async function(event, userId) {
  if (event) event.stopPropagation(); // Prevent row click navigation
  if(!confirm('이 회원을 탈퇴 처리하시겠습니까?\n(해당 회원의 모든 DB 정보와 연동 내역이 영구 삭제됩니다.)')) return;
  
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if(data.success) {
      alert('회원이 탈퇴 처리되었습니다.');
      loadUsers();
    } else {
      alert('오류: ' + data.message);
    }
  } catch(err) {
    alert('서버 오류가 발생했습니다.');
  }
};

// 검색 기능 구현 (전화번호 뒷 4자리 숫자 매칭 및 닉네임 부분 일치 검색)
const searchInput = document.getElementById('search-phone');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (!query) {
      renderUsers(currentUsers);
      return;
    }
    
    // 입력값에서 대시 등 특수문자 제거 후 숫자 여부 체크
    const cleanQuery = query.replace(/[^0-9]/g, '');
    const isNumeric = cleanQuery.length > 0;
    
    const filtered = currentUsers.filter(u => {
      if (isNumeric) {
        // 숫자인 경우, 백엔드에서 넘겨준 phone_last4 필드와 비교 매칭
        return u.phone_last4 && u.phone_last4.includes(cleanQuery);
      } else {
        // 숫자가 아닌 경우, 마스킹된 nickname(바다별 등 일반명칭 매칭)과 부분 비교
        return u.nickname && u.nickname.toLowerCase().includes(query.toLowerCase());
      }
    });
    renderUsers(filtered);
  });
}

loadUsers();
