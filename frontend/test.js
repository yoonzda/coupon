
    import { requireAdminAuth } from '../shared/js/admin-guard.js';
    await requireAdminAuth();

    import { getAdminToken } from '../shared/js/admin-guard.js';

    const tbody = document.getElementById('usersTableBody');
    const token = getAdminToken();

    async function loadUsers() {
      try {
        const res = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          renderUsers(data.data);
        } else {
          alert('목록을 불러오는데 실패했습니다: ' + data.message);
        }
      } catch (err) {
        console.error(err);
        alert('서버 오류가 발생했습니다.');
      }
    }

    function getProviderBadge(provider) {
      if(provider === 'kakao') return '<span style="color:#3e2723; background:#fee500; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:0.75rem;">Kakao</span>';
      if(provider === 'naver') return '<span style="color:#fff; background:#03c75a; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:0.75rem;">Naver</span>';
      if(provider === 'google') return '<span style="color:#333; background:#f1f5f9; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:0.75rem; border:1px solid #cbd5e1;">Google</span>';
      return provider;
    }

    function getStatusBadge(status) {
      if(status === 'active') return '<span class="status-badge status-active">정상</span>';
      if(status === 'withdrawn') return '<span class="status-badge status-withdrawn">탈퇴</span>';
      if(status === 'suspended') return '<span class="status-badge status-suspended">정지</span>';
      return status;
    }

    function renderUsers(users) {
      tbody.innerHTML = '';
      users.forEach(u => {
        const tr = document.createElement('tr');
        
        let actionBtn = '';
        if(u.status === 'active') {
          actionBtn = `<button class="btn-action btn-suspend" onclick="window.changeUserStatus(${u.id}, 'suspended')">정지 처리</button>`;
        } else if(u.status === 'suspended') {
          actionBtn = `<button class="btn-action btn-restore" onclick="window.changeUserStatus(${u.id}, 'active')">정지 해제</button>`;
        } else if(u.status === 'withdrawn') {
          actionBtn = `<span style="color: #94a3b8; font-size: 0.8rem;">탈퇴 완료</span>`;
        }

        tr.innerHTML = `
          <td style="text-align: center;">${getProviderBadge(u.social_provider)}</td>
          <td style="text-align: center; font-weight:bold;">${u.nickname}</td>
          <td style="text-align: center;">${u.email || '-'}</td>
          <td style="text-align: center; font-weight:bold; color:var(--primary);">${Number(u.coupon_balance).toLocaleString()}원</td>
          <td style="text-align: center;">${getStatusBadge(u.status)}</td>
          <td style="text-align: center; font-size:0.85rem; color:#64748b;">${new Date(u.created_at).toLocaleDateString()}</td>
          <td style="text-align: center; display:flex; gap:8px; justify-content:center;">
            <button class="btn-action btn-view-coupons" onclick="window.openCouponsModal(${u.id}, '${u.nickname}')">쿠폰 내역</button>
            ${actionBtn}
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    window.changeUserStatus = async function(userId, status) {
      const msg = status === 'suspended' ? '해당 회원을 정지하시겠습니까?' : '해당 회원의 정지를 해제하시겠습니까?';
      if(!confirm(msg)) return;
      
      try {
        const res = await fetch(\`/api/admin/users/\${userId}/status\`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
          body: JSON.stringify({ status })
        });
        const data = await res.json();
        if(data.success) {
          alert('처리되었습니다.');
          loadUsers();
        } else {
          alert('오류: ' + data.message);
        }
      } catch(err) {
        alert('서버 오류가 발생했습니다.');
      }
    };

    // 모달 제어
    const modal = document.getElementById('couponsModal');
    const modalBody = document.getElementById('modalCouponsBody');
    
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    window.openCouponsModal = async function(userId, userName) {
      document.getElementById('modalUserName').innerText = userName;
      modalBody.innerHTML = '<tr><td colspan="4">로딩 중...</td></tr>';
      modal.style.display = 'flex';
      
      try {
        const res = await fetch(\`/api/admin/users/\${userId}/coupons\`, {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        const data = await res.json();
        
        if(data.success) {
          modalBody.innerHTML = '';
          if(data.data.length === 0) {
            modalBody.innerHTML = '<tr><td colspan="4" style="color:#94a3b8;">발급된 쿠폰 내역이 없습니다.</td></tr>';
            return;
          }
          
          data.data.forEach(c => {
            const statusLabel = {
              'available': '<span style="color:#16a34a; font-weight:bold;">사용 가능</span>',
              'used': '<span style="color:#94a3b8; font-weight:bold;">사용 완료</span>',
              'expired': '<span style="color:#ef4444; font-weight:bold;">만료</span>',
              'cancelled': '<span style="color:#ef4444; font-weight:bold;">취소됨</span>'
            }[c.status];
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${c.coupon_type === 'digital' ? '디지털 쿠폰' : '지류(종이) 쿠폰'}</td>
              <td style="font-weight:bold;">${Number(c.face_value).toLocaleString()}원</td>
              <td>${statusLabel}</td>
              <td style="font-size:0.85rem; color:#64748b;">${new Date(c.issued_at).toLocaleDateString()}</td>
            `;
            modalBody.appendChild(tr);
          });
        }
      } catch(err) {
        modalBody.innerHTML = '<tr><td colspan="4" style="color:red;">데이터를 불러오지 못했습니다.</td></tr>';
      }
    };

    loadUsers();
  