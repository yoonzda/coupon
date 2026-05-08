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

        // 가맹점 포털
        'merchant-login':   resolve(__dirname, 'merchant/index.html'),
        'merchant-scan':    resolve(__dirname, 'merchant/scan.html'),
        'merchant-history': resolve(__dirname, 'merchant/history.html'),

        // 관리자 포털
        'admin-login':      resolve(__dirname, 'admin/login.html'),
        'admin-index':      resolve(__dirname, 'admin/index.html'),
        'admin-merchants':  resolve(__dirname, 'admin/merchants.html'),
        'admin-settlement': resolve(__dirname, 'admin/settlement.html'),
        'admin-fds':        resolve(__dirname, 'admin/fds.html'),
        'admin-statistics': resolve(__dirname, 'admin/statistics.html'),
        'admin-coupons':    resolve(__dirname, 'admin/coupons.html'),
      },
    },
    outDir: 'dist',      // 빌드 결과 → dist/ 폴더 (도커 빌드용)
    emptyOutDir: true,
    target: 'esnext',   // top-level await 지원
  },
  server: {
    port: 5173,
    proxy: {
      // 개발 중 백엔드 API 프록시 (Express 3010)
      '/api': 'http://localhost:3010',
      '/auth': 'http://localhost:3010',
    },
  },
})
