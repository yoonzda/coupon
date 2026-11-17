# 옹진 관광 쿠폰 플랫폼 — VS Code 로컬 실행 및 직접 수정 가이드

이 문서는 VS Code에서 프로젝트 폴더(`c:\0_antigravity\coupon`)를 열고 **직접 로컬 서버를 켜고, 원본 파일을 수정·확인·반영하는 전체 순서**를 정리한 안내서입니다.

---

## 1. 꼭 알아두어야 할 폴더 구조 (핵심 요약)

로컬에서 화면을 수정할 때 가장 헷갈리기 쉬운 부분입니다.

- **`frontend/` (원본 소스 폴더 — 직접 수정하는 곳)**
  - `frontend/index.html` : 인트로 페이지
  - `frontend/tourist/*.html` : 관광객 화면 (`index.html`, `mypage.html`, `landing.html` 등)
  - `frontend/issuer/*.html` : 발행처 화면 (`login.html`, `coupon-qr.html`, `manage.html`)
  - `frontend/merchant/*.html` : 가맹점 화면 (`login.html`, `index.html`, `scan.html`, `history.html` 등)
  - `frontend/admin/*.html` : 관리자 화면 (`index.html`, `coupons.html`, `budget.html`, `merchants.html` 등)
  - `frontend/shared/js/*.js` : 공통 API 통신 및 정적 데모 데이터 (`api.js`, `mock-backend.js`, `mock-data.js`)
- **`frontend/dist/` (빌드 결과물 폴더 — 직접 수정하지 않는 곳)**
  - Docker(`http://localhost:8080`)와 GitHub Pages가 실제로 읽어서 보여주는 **최종 변환(번들링) 폴더**입니다.
  - 원본(`frontend/`)을 수정한 뒤 **`npm run build`** 명령어를 한 번 실행하면 `frontend/dist/` 폴더가 자동으로 새로 만들어집니다.
- **`backend/src/` (백엔드 API 서버 폴더 — 직접 수정하는 곳)**
  - `backend/src/routes/*.js` : 쿠폰·인증·지도·관리자·발행처·가맹점 API 로직
  - `backend/src/config/database.js` : DB 연결 및 초기 데이터 자동 세팅

---

## 2. VS Code에서 폴더 열고 터미널 준비하기

1. **VS Code 실행** → 상단 메뉴 `파일(File)` > `폴더 열기(Open Folder...)` 클릭
2. `c:\0_antigravity\coupon` 폴더를 선택해서 엽니다.
3. 단축키 **`Ctrl + ` ` (백틱, 탭 키 위)** 또는 상단 메뉴 `터미널(Terminal)` > `새 터미널(New Terminal)`을 눌러 하단 터미널 창을 엽니다.

---

## 3. 로컬 서버 실행하기 (2가지 방법 중 선택)

먼저 **Docker Desktop** 프로그램이 켜져 있어야 합니다.

### 방법 A. 실시간 화면 수정 모드 (가장 추천 ⭐ — 저장 즉시 화면 반영)
화면을 자주 고치면서 바로바로 결과를 확인할 때 가장 편한 방식입니다.
DB와 백엔드는 Docker로 켜 두고, 프론트엔드는 **Vite 개발 서버(`5180` 포트)**로 실행합니다.

1. **Docker 컨테이너(DB + 백엔드) 켜기** (최초 1회 또는 PC 재부팅 후)
   ```powershell
   docker compose up -d
   ```
2. **프론트엔드 폴더로 이동 후 패키지 설치** (최초 1회만 실행)
   ```powershell
   cd frontend
   npm install
   ```
3. **프론트엔드 실시간 개발 서버 켜기**
   ```powershell
   npm run dev
   ```
4. 브라우저에서 **`http://localhost:5180`** 으로 접속합니다.
   - 이제 VS Code에서 `frontend/` 안의 HTML/CSS/JS 파일을 수정하고 **`Ctrl + S` (저장)** 만 누르면 브라우저 화면이 **즉시 자동으로 바뀝니다.**

---

### 방법 B. Docker 통합 실행 모드 (`http://localhost:8080`)
실제 배포 환경과 똑같은 상태(`8080` 포트)로 전체를 확인할 때 사용합니다.

1. **Docker 컨테이너 전체 켜기**
   ```powershell
   docker compose up -d
   ```
2. 브라우저에서 **`http://localhost:8080`** 으로 접속합니다.
3. 만약 `frontend/` 원본 파일을 수정했다면, 아래 명령어로 **`dist` 폴더를 다시 빌드**해야 `http://localhost:8080` 화면에 반영됩니다.
   ```powershell
   cd frontend
   npm run build
   cd ..
   ```

---

## 4. 상황별 파일 수정 및 반영 순서 요약

### ① 프론트엔드 화면(HTML / CSS / JS)을 수정할 때
1. **`frontend/` 폴더 안의 원본 파일**을 열어 수정하고 저장(`Ctrl + S`)합니다.
   - 예: `frontend/index.html`, `frontend/tourist/mypage.html` 등 (`frontend/dist/` 안의 파일은 건드리지 않아도 됩니다.)
2. 실시간 개발 서버(`http://localhost:5180`)를 켜 두었다면 저장 즉시 반영됩니다.
3. 작업이 끝나서 `http://localhost:8080` 및 GitHub 배포용 파일(`frontend/dist/`)에도 반영하려면 터미널에서 아래 명령어를 실행합니다.
   ```powershell
   cd c:\0_antigravity\coupon\frontend
   npm run build
   ```

### ② 백엔드 코드(`backend/src/...`)를 수정할 때
1. `backend/src/` 안의 파일(예: `backend/src/routes/coupon.js`)을 수정하고 저장(`Ctrl + S`)합니다.
2. 터미널에서 백엔드 컨테이너만 재시작하면 즉시 반영됩니다.
   ```powershell
   docker restart ongjin-backend
   ```

### ③ Nginx 설정(`frontend/nginx.conf`)을 수정할 때
1. `frontend/nginx.conf` 파일을 수정하고 저장합니다.
2. 프론트엔드 컨테이너를 재시작합니다.
   ```powershell
   docker restart ongjin-frontend
   ```

---

## 5. 자주 쓰는 명령어 모음

| 하고 싶은 작업 | 터미널 입력 명령어 (`c:\0_antigravity\coupon` 기준) |
| :--- | :--- |
| **로컬 서버 전체 켜기** | `docker compose up -d` |
| **실시간 프론트엔드 개발 서버 켜기 (`5180`)** | `cd frontend` 입력 후 `npm run dev` |
| **수정한 프론트엔드를 `dist`에 반영하기 (`8080`/배포용)** | `cd frontend` 입력 후 `npm run build` |
| **백엔드 수정사항 반영 (재시작)** | `docker restart ongjin-backend` |
| **프론트엔드 Nginx 재시작** | `docker restart ongjin-frontend` |
| **현재 켜져 있는 컨테이너 상태 확인** | `docker compose ps` |
| **백엔드 에러 로그 실시간 확인** | `docker logs -f --tail 50 ongjin-backend` |
| **로컬 서버 전체 끄기** | `docker compose stop` |

---

## 6. GitHub에 수정한 내용 올리기 (배포)

수정한 화면을 확인하고 **`cd frontend` → `npm run build`** 까지 마쳤다면, 루트 폴더(`c:\0_antigravity\coupon`)에서 아래 순서로 GitHub에 올리면 됩니다.

```powershell
cd c:\0_antigravity\coupon
git status
git add .
git commit -m "수정 내용 요약"
git push origin main
```
