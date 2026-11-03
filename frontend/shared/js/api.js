// =====================================================
// shared/js/api.js — 공통 API 클라이언트
// =====================================================

const BASE = '/api'

function getToken() {
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  if (path.includes('/issuer/')) {
    return localStorage.getItem('ongjin_issuer_token') || localStorage.getItem('ongjin_token')
  }
  if (path.includes('/admin/')) {
    return localStorage.getItem('ongjin_admin_token') || localStorage.getItem('ongjin_token')
  }
  return localStorage.getItem('ongjin_token') || localStorage.getItem('ongjin_issuer_token') || localStorage.getItem('ongjin_admin_token')
}

function setTokens(token, refresh) {
  localStorage.setItem('ongjin_token', token)
  if (refresh) localStorage.setItem('ongjin_refresh', refresh)
}

function clearTokens() {
  localStorage.removeItem('ongjin_token')
  localStorage.removeItem('ongjin_refresh')
  localStorage.removeItem('ongjin_user')
  localStorage.removeItem('ongjin_admin_token')
  localStorage.removeItem('ongjin_admin_info')
  localStorage.removeItem('ongjin_issuer_token')
  localStorage.removeItem('ongjin_issuer_info')
}

let isRefreshing = false
let refreshQueue = []

function redirectToLogin() {
  const path = window.location.pathname
  if (path.includes('/tourist/landing')) {
    return
  }
  let target = '/tourist/index.html'
  if (path.includes('/admin/')) {
    target = '/admin/login.html'
  } else if (path.includes('/merchant/')) {
    target = '/merchant/login.html'
  } else if (path.includes('/issuer/')) {
    target = '/issuer/login.html'
  }
  
  const cleanTarget = target.replace('.html', '')
  if (path !== target && !path.includes(cleanTarget)) {
    window.location.href = target
  }
}

async function request(method, path, body = null) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })

  // 401 Unauthorized 발생 시 리프레시 시도
  if (res.status === 401) {
    // 로그인 시도, OTP 전송/검증, 비밀번호 확인/변경 등의 인증 관련 API 요청은 예외 처리하여 리다이렉트나 토큰 초기화를 수행하지 않음
    const isAuthAction = path.includes('/login') || 
                          path.includes('/verify-password') || 
                          path.includes('/change-password') || 
                          path.includes('/otp/verify') ||
                          path.includes('/otp/send')
    
    if (isAuthAction) {
      const data = await res.json().catch(() => ({}))
      const error = new Error(data.message || '인증에 실패했습니다.')
      error.status = 401
      throw error
    }

    const refreshToken = localStorage.getItem('ongjin_refresh')
    // 이미 refresh 요청을 보내는 중인 API는 재귀 401을 유발하지 않도록 함
    if (refreshToken && path !== '/auth/refresh') {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshRes = await fetch(`${BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json()
            setTokens(refreshData.token, refreshData.refresh)
            isRefreshing = false
            
            // 대기열 재실행
            refreshQueue.forEach((cb) => cb(refreshData.token))
            refreshQueue = []
          } else {
            throw new Error('Session renewal failed')
          }
        } catch (err) {
          isRefreshing = false
          refreshQueue = []
          clearTokens()
          redirectToLogin()
          const error = new Error('세션이 만료되었습니다. 다시 로그인해 주세요.')
          error.status = 401
          throw error
        }
      }

      // 토큰 갱신 완료까지 요청 대기
      return new Promise((resolve, reject) => {
        refreshQueue.push((newToken) => {
          headers['Authorization'] = `Bearer ${newToken}`
          fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
          })
            .then(async (retryRes) => {
              const data = await retryRes.json().catch(() => ({}))
              if (!retryRes.ok) {
                const errorMsg = data.message ||
                                 (Array.isArray(data.errors) && data.errors[0]?.msg) ||
                                 (typeof data.error === 'string' ? data.error : null) ||
                                 '요청에 실패했습니다.'
                const error = new Error(errorMsg)
                error.status = retryRes.status
                reject(error)
              } else {
                resolve(data)
              }
            })
            .catch((err) => reject(err))
        })
      })
    } else {
      clearTokens()
      redirectToLogin()
      const error = new Error('세션이 만료되었거나 권한이 없습니다.')
      error.status = 401
      throw error
    }
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errorMsg = data.message ||
                     (Array.isArray(data.errors) && data.errors[0]?.msg) ||
                     (typeof data.error === 'string' ? data.error : null) ||
                     '요청에 실패했습니다.'
    const error = new Error(errorMsg)
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
}

export { getToken, setTokens, clearTokens, isTokenExpired }

function isTokenExpired(token) {
  if (!token) return true;
  if (token === 'test_dummy_jwt_token') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

// ── 토스트 알림 ─────────────────────────────────────
export function showToast(msg, type = '') {
  const container = document.getElementById('toast-container')
    || (() => {
      const el = document.createElement('div')
      el.id = 'toast-container'
      document.body.appendChild(el)
      return el
    })()

  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = msg
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

// ── 로그인 여부 확인 ─────────────────────────────────
export function requireAuth(redirectTo = '/tourist/index.html') {
  if (!getToken()) {
    window.location.href = redirectTo
    return false
  }
  return true
}

// ── 날짜 포맷 ────────────────────────────────────────
export function fmtDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

// ── 금액 포맷 ────────────────────────────────────────
export function fmtMoney(amount) {
  return Number(amount).toLocaleString('ko-KR') + '원'
}
