# 옹진 관광 쿠폰 플랫폼 — 로컬 실행 및 수정 완벽 가이드 (상세본)

이전 문서(`LOCAL_DEV_GUIDE.md`)에서 생략되었거나 헷갈리게 적혔던 부분들을 모두 바로잡아, **원리부터 실제 작업 시작 → 수정 → 마무리까지 하나의 흐름**으로 다시 정리한 문서입니다.

---

## 1. 먼저 궁금하셨던 핵심 질문 4가지 명쾌한 답변

### Q1. "(최초 1회만 실행)"이라고 적힌 것들, 지금 내 PC에서 해야 하나요?
- **`npm install` → 하실 필요 없습니다! (이미 완료됨)**
  - 확인 결과 현재 PC의 `c:\0_antigravity\coupon\frontend\node_modules` 폴더에 필요한 프로그램들이 **이미 모두 설치되어 있습니다.** 앞으로 실행하실 필요가 없습니다.
- **`docker compose up -d` → 지금 당장은 안 하셔도 됩니다! (현재 켜져 있음)**
  - 현재 Docker에 데이터베이스(`ongjin-db`), 백엔드(`ongjin-backend`), 웹서버(`ongjin-frontend`)가 **이미 켜져 있는 상태**입니다.
  - 단, **컴퓨터를 껐다가 다시 켠 날**에는 Docker 컨테이너가 멈춰 있을 수 있으므로, 작업 시작 전에 한 번 실행해 주시면 됩니다.

---

### Q2. 왜 `frontend/` 파일을 고치면 바로 적용되고, `5180`과 `8080`의 차이는 무엇인가요?
현재 프로젝트에는 성격이 완전히 다른 두 개의 폴더와 두 개의 주소가 있습니다.

1. **`frontend/` 폴더 (작업실 원본) ↔ `http://localhost:5180` (실시간 작업용 서버)**
   - 터미널에서 `npm run dev`를 입력하면 **Vite(비트)**라는 개발 도구가 `5180`번 포트로 켜집니다.
   - 이 `5180` 서버는 **`frontend/` 원본 폴더를 실시간으로 감시**하고 있습니다.
   - 그래서 VS Code에서 `frontend/` 안의 파일을 고치고 `Ctrl + S`(저장)를 누르는 순간, `5180` 서버가 바뀐 부분을 감지해서 열려 있는 브라우저 화면을 **0.1초 만에 자동으로 새로고침**해 줍니다.

2. **`frontend/dist/` 폴더 (출고용 완성본) ↔ `http://localhost:8080` (Docker 배포용 서버)**
   - Docker가 띄워둔 `8080`번 주소는 `frontend/` 원본 폴더를 보지 않고, 오직 **`frontend/dist/` 폴더만 읽어서 화면에 보여줍니다.**
   - 또한 **GitHub Pages(인터넷 배포 주소)** 역시 이 `frontend/dist/` 폴더에 들어 있는 파일을 사람들에게 보여줍니다.
   - 따라서 `frontend/` 원본만 고친 상태에서는 `8080` 주소나 GitHub 배포 화면은 바뀌지 않으며, 작업이 끝난 뒤 **`npm run build`(원본을 `dist/` 폴더로 변환·포장하는 명령어)**를 실행해야 비로소 `8080`과 배포 파일에 반영됩니다.

---

### Q3. `frontend/dist/` 폴더는 "안 건드려도 되는 것"인가요, "건드리면 안 되는 것"인가요?
- **절대 직접 수정하시면 안 됩니다! (금지)**
- **이유**: `npm run build` 명령어를 실행하는 순간, 프로그램이 기존의 **`frontend/dist/` 폴더를 통째로 지워버리고** `frontend/` 원본 폴더의 내용으로 새로 덮어씁니다.
- 만약 `frontend/dist/` 안의 파일을 직접 열어서 고치시면, 다음에 빌드할 때 **수정한 내용이 100% 날아갑니다.**
- 따라서 수정은 무조건 **`frontend/` 원본 폴더(dist 바깥)**에서만 해야 합니다.

---

### Q4. 수정할 때 `5180`이랑 `8080` 둘 다 켜고 봐야 하나요?
- **아니요! 수정할 때는 무조건 `http://localhost:5180` 하나만 켜고 작업하시면 됩니다.**
- 이전 문서에서 방법 A, 방법 B로 나누어 적어 혼란을 드렸습니다. 앞으로는 아래 **2번의 단일 순서**대로만 진행하시면 됩니다.

---

## 2. 앞으로 매번 작업할 때 따라 하는 표준 순서 (처음부터 끝까지)

VS Code에서 `c:\0_antigravity\coupon` 폴더를 연 상태에서 아래 **1단계 → 2단계 → 3단계** 순서로만 진행하시면 됩니다.

---

### [1단계: 작업 시작할 때] 실시간 작업 서버(`5180`) 켜기

1. **Docker Desktop** 프로그램이 실행 중인지 확인합니다.
2. VS Code에서 **`Ctrl + ` ` (백틱, 탭 키 위)** 를 눌러 하단 터미널 창을 엽니다.
3. 터미널에 아래 명령어를 순서대로 입력하고 엔터를 칩니다.
   ```powershell
   docker compose up -d
   cd frontend
   npm run dev
   ```
   - `docker compose up -d` : 이미 켜져 있으면 1초 만에 `Running`이라고 뜨고 넘어갑니다.
   - `cd frontend` : 프론트엔드 폴더 안으로 들어갑니다.
   - `npm run dev` : 실시간 감시 서버(`5180`)를 켭니다.
4. 터미널에 `Local: http://localhost:5180/` 이라는 글자가 나타나면, 인터넷 브라우저(크롬 등)를 열고 **`http://localhost:5180`** 으로 접속합니다.
   - *(주의: 작업하는 동안 이 터미널 창을 끄지 말고 그대로 열어 두세요.)*

---

### [2단계: 작업하는 중] 파일 수정하고 화면 확인하기

#### A. 화면(HTML / 디자인 CSS / 화면 동작 JS)을 고칠 때
1. VS Code 왼쪽 파일 목록에서 **`frontend/` 폴더 안의 원본 파일**을 클릭해 엽니다. *(절대 `frontend/dist/` 안의 파일을 열지 마세요!)*
   - 인트로 화면: `frontend/index.html`
   - 관광객 지갑/지도/목록 화면: `frontend/tourist/mypage.html`
   - 관광객 로그인 화면: `frontend/tourist/index.html`
   - 관광객 쿠폰 수령 화면: `frontend/tourist/landing.html`
   - 발행처 화면: `frontend/issuer/coupon-qr.html`, `frontend/issuer/manage.html`
   - 가맹점 화면: `frontend/merchant/index.html`, `frontend/merchant/scan.html`, `frontend/merchant/history.html`
   - 관리자 화면: `frontend/admin/index.html`, `frontend/admin/coupons.html`, `frontend/admin/budget.html` 등
2. 원하는 텍스트, 색상(CSS), 코드를 수정합니다.
3. **`Ctrl + S` (저장)** 를 누릅니다.
4. 켜 두었던 **`http://localhost:5180`** 브라우저 화면을 보면 **방금 수정한 내용이 즉시 반영**되어 있습니다.
5. 마음에 들 때까지 `수정 → Ctrl + S → 5180 화면 확인`을 반복합니다.

#### B. 만약 백엔드 서버 로직(`backend/src/...`)을 고쳤다면?
- 화면 파일(`frontend/`)이 아니라 `backend/src/routes/coupon.js` 같은 서버 파일을 고쳤을 때만 백엔드를 재시작해 주면 됩니다.
- VS Code 터미널 우측 상단의 **`+` 버튼(새 터미널 추가)**을 눌러 두 번째 터미널 창을 열고 아래 한 줄을 입력합니다:
  ```powershell
  docker restart ongjin-backend
  ```

---

### [3단계: 오늘 수정 작업이 다 끝났을 때] 완성본(`dist`) 만들기

`http://localhost:5180`에서 원하는 대로 화면 수정이 모두 끝났다면, 마지막으로 **내가 고친 `frontend/` 원본을 `frontend/dist/`(완성본 폴더)에 반영**해 주어야 합니다.

1. `npm run dev`가 돌아가고 있는 터미널 창을 클릭하고 **`Ctrl + C`** 를 누른 뒤, `Y`를 입력하고 엔터를 쳐서 실시간 개발 서버를 끕니다.
2. 같은 터미널(`c:\0_antigravity\coupon\frontend>` 위치)에서 아래 명령어를 입력하고 엔터를 칩니다:
   ```powershell
   npm run build
   ```
3. 약 2~3초 뒤 `✓ built in ...` 이라는 완료 메시지가 나옵니다.
   - **이 명령어가 하는 일**: 방금까지 내가 수정한 `frontend/` 원본 파일들을 읽어서, `frontend/dist/` 폴더 안의 파일들을 최신 상태로 자동 변환해 덮어씌웁니다.
   - 이제 **`http://localhost:8080`** 으로 접속해 보셔도 방금 수정한 내용과 100% 똑같이 나오며, GitHub에 올릴 준비도 모두 끝난 상태가 됩니다.

---

### [4단계: 선택 사항] 내가 수정한 내용을 GitHub에 올리고 싶을 때

3단계의 `npm run build`까지 마쳤다면, 내 컴퓨터에만 저장된 수정본을 GitHub 원격 저장소에도 똑같이 올릴 수 있습니다.

1. 터미널에서 아래 명령어를 한 줄씩 입력합니다:
   ```powershell
   cd c:\0_antigravity\coupon
   git add .
   git commit -m "화면 수정"
   git push origin main
   ```
   - `cd c:\0_antigravity\coupon` : 프로젝트 최상위 폴더로 이동합니다.
   - `git add .` : 내가 수정한 원본(`frontend/`)과 방금 빌드된 완성본(`frontend/dist/`)을 모두 업로드 목록에 담습니다.
   - `git commit -m "화면 수정"` : 수정 기록에 이름을 붙여서 저장합니다 (`"화면 수정"` 대신 원하는 메모를 적으셔도 됩니다).
   - `git push origin main` : GitHub 서버로 실제 전송합니다.

---

## 3. 한눈에 보는 3줄 요약 치트시트

1. **작업 시작**: 터미널 열고 `cd frontend` → `npm run dev` 입력 후 **`http://localhost:5180`** 접속
2. **작업 진행**: **`frontend/` 원본 파일**(dist 제외)만 수정하고 **`Ctrl + S`** → `5180` 화면에서 즉시 확인
3. **작업 종료**: 터미널에서 **`Ctrl + C`** 로 서버 끄고 → **`npm run build`** 실행 (이후 필요시 `git push`)
