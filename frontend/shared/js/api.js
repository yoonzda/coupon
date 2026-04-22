// =====================================================
// shared/js/api.js — 공통 API 클라이언트
// =====================================================

const BASE = '/api'

function getToken() {
  return localStorage.getItem('ongjin_token')
}

function setTokens(token, refresh) {
  localStorage.setItem('ongjin_token', token)
  if (refresh) localStorage.setItem('ongjin_refresh', refresh)
}

function clearTokens() {
  localStorage.removeItem('ongjin_token')
  localStorage.removeItem('ongjin_refresh')
}

async function request(method, path, body = null) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })

  // 401 → 자동 로그아웃 (로컬 테스트를 위해 잠시 주석 처리)
  if (res.status === 401) {
    console.warn('401 Unauthorized - Dev Mode: Stay on page');
    // clearTokens()
    // window.location.href = '/tourist/index.html'
    // return
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || '요청에 실패했습니다.')
  return data
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
}

export { getToken, setTokens, clearTokens }

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
