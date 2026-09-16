import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  // 멀티페이지 앱: 3개 포털을 별도 엔트리로 구성
  build: {
    rollupOptions: {
      input: {
        // 관광객 포털
        'tourist-index':    resolve(__dirname, 'tourist/index.html'),
        'tourist-mypage':   resolve(__dirname, 'tourist/mypage.html'),
        'tourist-map':      resolve(__dirname, 'tourist/map.html'),
        'tourist-callback': resolve(__dirname, 'tourist/auth-callback.html'),
        'tourist-apply':    resolve(__dirname, 'tourist/apply-merchant.html'),
        'tourist-apply-pending': resolve(__dirname, 'tourist/apply-pending.html'),
        'tourist-landing':  resolve(__dirname, 'tourist/landing.html'),

        // 가맹점 포털
        'merchant-login':   resolve(__dirname, 'merchant/login.html'),
        'merchant-index':   resolve(__dirname, 'merchant/index.html'),
        'merchant-scan':    resolve(__dirname, 'merchant/scan.html'),
        'merchant-manual':  resolve(__dirname, 'merchant/manual.html'),
        'merchant-history': resolve(__dirname, 'merchant/history.html'),
        'merchant-etc':     resolve(__dirname, 'merchant/etc.html'),
        'merchant-reapply': resolve(__dirname, 'merchant/reapply.html'),

        // 발행처 포털
        'issuer-login':     resolve(__dirname, 'issuer/login.html'),
        'issuer-coupon-qr': resolve(__dirname, 'issuer/coupon-qr.html'),
        'issuer-manage':    resolve(__dirname, 'issuer/manage.html'),

        // 관리자 포털
        'admin-login':      resolve(__dirname, 'admin/login.html'),
        'admin-index':      resolve(__dirname, 'admin/index.html'),
        'admin-merchants':  resolve(__dirname, 'admin/merchants.html'),
        'admin-settlement': resolve(__dirname, 'admin/settlement.html'),
        'admin-fds':        resolve(__dirname, 'admin/fds.html'),
        'admin-statistics': resolve(__dirname, 'admin/statistics.html'),
        'admin-coupons':    resolve(__dirname, 'admin/coupons.html'),
        'admin-managers':   resolve(__dirname, 'admin/managers.html'),
        'admin-users':      resolve(__dirname, 'admin/users.html'),
        'admin-detail-user': resolve(__dirname, 'admin/detail-user.html'),
        'admin-detail-merchant': resolve(__dirname, 'admin/detail-merchant.html'),
        'admin-detail-issuer': resolve(__dirname, 'admin/detail-issuer.html'),
        'admin-issuers':    resolve(__dirname, 'admin/issuers.html'),
        'admin-register-issuer': resolve(__dirname, 'admin/register-issuer.html'),
        'admin-register-manager': resolve(__dirname, 'admin/register-manager.html'),
        'admin-edit-manager': resolve(__dirname, 'admin/edit-manager.html'),
        'admin-edit-issuer': resolve(__dirname, 'admin/edit-issuer.html'),
        'admin-allocate-coupon': resolve(__dirname, 'admin/allocate-coupon.html'),
        'admin-budget': resolve(__dirname, 'admin/budget.html'),
        'admin-edit-rules': resolve(__dirname, 'admin/edit-rules.html'),
      },
    },
    outDir: 'dist',      // 빌드 결과 → dist/ 폴더 (도커 빌드용)
    emptyOutDir: true,
    target: 'esnext',   // top-level await 지원
  },
  server: {
    port: 5180,
    proxy: {
      // 개발 중 백엔드 API 프록시 (Express 3010)
      '/api': 'http://localhost:3010',
      '/auth': 'http://localhost:3010',
    },
  },
})
