# 옹진관광 쿠폰 플랫폼 작업 내역 (CHANGELOG)

## [2026-05-08] 관리자 대시보드 시스템 구현 및 데이터 연동 완료

### 🚀 기능 추가 (Features)
- **관리자 웹 대시보드 구성**
  - 관리자 로그인, 쿠폰 발급/사용 내역, 가맹점별 정산, 플랫폼 전체 통계 페이지 등 UI/UX 완성
  - 사용자 인증(`admin-guard.js`) 및 다국어 지원(`i18n.js`) 파일 추가로 확장성 확보
- **관리자 전용 API 엔드포인트**
  - `backend/src/routes/adminAuth.js` 및 `admin.js` 라우터 보강
  - 통계(`statistics`), 정산(`settlement`), FDS(이상거래탐지) 관련 API 연동 구조 확립
- **시드 데이터 구축**
  - 원활한 로컬 테스트 및 UI 확인을 위한 개발용 시드 데이터(`database/seeds/dev_seed_data.sql`) 생성

### 🐛 버그 수정 (Bug Fixes)
- 프론트엔드/백엔드 간 문자열 인코딩 문제 점검 및 보완 (정상 렌더링 확인)

### ⚙️ 시스템 및 배포 (System & Deployment)
- Vite 빌드 설정을 통한 정적 파일 산출물(`.html`, `.js`, `.css`) 업데이트 및 `dist/` 폴더 동기화
- Nginx 라우팅 설정 파일(`frontend/nginx.conf`) 점검 및 관리자 경로 매핑 업데이트
- 로컬 변경 사항 전체를 원격 리포지토리(`nuridkdl/Ongjin_coupon`)의 `main` 브랜치에 반영 (Commit & Push 완료)
