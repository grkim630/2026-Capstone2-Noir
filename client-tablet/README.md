# NOIR Tablet Client

`client-tablet`은 Android 태블릿의 Fully Kiosk Browser & Lockdown 환경에서 실행되는 컬러 테스트용 태블릿 웹앱입니다. PC에서 얼굴 분석과 추천이 끝난 뒤, 태블릿에서는 추천 컬러와 전체 컬러칩을 터치로 선택하고, 최종 선택 결과를 서버에 저장한 다음 QR 코드 종료 화면으로 넘어갑니다.

## 실행 전제

이 앱은 일반 브라우저의 주소창/탭바를 웹 코드로 숨기는 방식이 아니라, Fully Kiosk Browser의 fullscreen 설정을 전제로 합니다.

- 화면은 fullscreen kiosk browser에서 실행됩니다.
- `html`, `body`, `#root`는 `100dvw`, `100dvh`를 기준으로 꽉 차게 동작합니다.
- body 전체 세로 스크롤은 막습니다.
- MUZIGAE MENSION 컬러칩 영역만 가로 터치 스크롤을 허용합니다.
- WebSocket/Socket.IO 통신은 일반 브라우저와 동일하게 동작합니다.
- 태블릿에서 서버에 접근해야 하므로 API와 Socket.IO 주소에는 `localhost`가 아니라 서버 PC의 LAN IP를 사용합니다.

예시:

```text
잘못된 예: http://localhost:8000
올바른 예: http://192.168.0.10:8000
```

## 주요 역할

- 서버에서 최신 추천 결과를 불러옵니다.
- 추천 블러셔/립과 전체 컬러칩 리스트를 표시합니다.
- 사용자가 터치한 컬러를 Socket.IO로 서버에 전달합니다.
- 서버는 이 이벤트를 TouchDesigner 연결용 이벤트로 다시 브로드캐스트합니다.
- 사용자가 `테스팅 마치기`를 누르면 확인 팝업을 띄웁니다.
- 최종 선택 결과를 서버의 `final_selection.json`으로 저장합니다.
- 모바일 결과 페이지로 이동할 QR 코드를 보여줍니다.

## 기술 스택

- React
- Vite
- Tailwind CSS
- Socket.IO Client
- qrcode.react

## 폴더 구조

```text
client-tablet/
├─ index.html
├─ package.json
├─ vite.config.js
├─ public/
│  ├─ manifest.webmanifest
│  └─ icons/
└─ src/
   ├─ App.jsx
   ├─ main.jsx
   ├─ index.css
   ├─ constants.js
   ├─ pages/
   │  └─ TabletPage.jsx
   ├─ components/
   │  ├─ Header.jsx
   │  ├─ TabBar.jsx
   │  ├─ RecommendSection.jsx
   │  ├─ AllColorsSection.jsx
   │  ├─ HorizontalColorList.jsx
   │  ├─ ColorChipButton.jsx
   │  ├─ FinishButton.jsx
   │  ├─ TestingFinishModal.jsx
   │  ├─ EndingPage.jsx
   │  └─ FullscreenScaleWrapper.jsx
   ├─ hooks/
   │  ├─ useTabletData.js
   │  └─ useTabletHooks.js
   └─ utils/
      ├─ serverConfig.js
      ├─ loadRecommendation.js
      ├─ finalSelection.js
      ├─ preloadImages.js
      ├─ productUtils.js
      └─ devConfig.js
```

## 화면 구성

### 메인 컬러 테스트 화면

`src/pages/TabletPage.jsx`가 전체 태블릿 상태를 관리합니다.

- `Header`: 상단 NOIR 로고, 타이틀, 안내 문구를 보여줍니다. NOIR 로고는 새로고침 버튼 역할을 하지만 UI상 버튼처럼 보이지 않도록 구성되어 있습니다.
- `TabBar`: `OBJET BLUSH`, `OBJET LIQUID` 탭을 전환합니다.
- `RecommendSection`: 서버 추천 컬러 3개를 보여줍니다.
- `AllColorsSection`: MUZIGAE MENSION 전체 컬러칩을 가로 스크롤로 보여줍니다.
- `FinishButton`: 하단의 `테스팅 마치기` 버튼입니다.

### 확인 팝업

`TestingFinishModal.jsx`는 테스트 종료 확인용 팝업입니다. 팝업 배경에는 blur 효과와 반투명 레이어가 적용되어 있으며, 내부 버튼에는 터치 피드백 효과가 들어가 있습니다.

### 종료 QR 화면

`EndingPage.jsx`는 태블릿 최종 화면입니다.

- 배경 이미지는 화면을 꽉 채우도록 표시합니다.
- QR 코드는 모바일 결과 페이지 URL을 담습니다.
- QR 내부 크기는 `240 x 240`이고, 흰색/검은색 테두리를 포함한 전체 박스는 `250 x 250` 기준으로 구성됩니다.
- QR 중앙에는 로고가 잘 보이도록 작은 검정 박스와 로고가 올라갑니다.

## 데이터 로딩 방식

### `src/hooks/useTabletData.js`

서버에서 최신 추천 결과를 가져오고, 실패 시 로컬 fallback 데이터를 사용합니다.

### `src/utils/loadRecommendation.js`

서버 API와 로컬 `src/data/recommendation_result.json` fallback을 처리합니다.

### `src/utils/preloadImages.js`

블러셔/립 탭을 오갈 때 컬러칩 이미지가 매번 새로 깜빡이며 로딩되지 않도록, 데이터 로딩 후 전체 컬러칩 이미지를 미리 로딩합니다.

## Socket.IO 통신

태블릿에서 컬러칩을 터치하면 서버로 다음 이벤트가 전송됩니다.

```text
tablet:color-select
```

서버는 이 이벤트를 TouchDesigner 연결용으로 다시 전달합니다.

```text
touchdesigner:apply-color
```

테스트 종료 시에는 다음 이벤트가 사용됩니다.

```text
tablet:testing-finish
touchdesigner:testing-finished
```

따라서 TouchDesigner가 완성되면 기존 WebSocket/Socket.IO 흐름을 그대로 받아서 `touchdesigner:*` 이벤트를 구독하면 됩니다. 단, 실제 태블릿 환경에서는 서버 주소가 LAN IP여야 합니다.

## 최종 선택 저장

`src/utils/finalSelection.js`는 사용자가 최종적으로 선택한 립/블러셔 정보를 서버에 전송합니다.

서버는 `data/noir_color_db.json`의 제품 DB를 기준으로 display id 또는 display name을 매칭해 `final_selection.json`에 정리된 형태로 저장합니다. 이 구조 덕분에 추천 영역에서 고른 제품과 MUZIGAE MENSION 전체 컬러칩에서 고른 제품의 저장 형식이 통일됩니다.

## 설치 및 실행

```bash
cd client-tablet
npm install
npm run dev
```

Fully Kiosk Browser 테스트용으로 실행할 때:

```bash
npm run dev:kiosk
```

외부 태블릿에서 접속하려면 Vite dev server가 `0.0.0.0`으로 열려 있어야 하며, 현재 스크립트는 `vite --host`를 사용합니다.

## 환경 변수

서버 PC의 LAN IP를 사용해 서버 주소를 지정합니다.

```env
VITE_SERVER_ORIGIN=http://192.168.0.10:8000
```

모바일 결과 페이지의 origin은 현재 태블릿 접속 host를 바탕으로 계산하거나, 필요한 경우 환경 변수로 별도 관리할 수 있습니다.

## 데이터와 에셋

태블릿 앱은 다음과 같은 `data/images` 에셋을 사용합니다.

- 컬러칩 이미지
- `blush_icon.png`
- 종료 화면 배경
- QR 중앙 로고
- 브랜드 로고

GitHub에는 대용량 이미지 파일을 올리지 않는 구조이므로, 실제 실행 환경에서는 `data/images` 폴더를 별도로 준비해야 합니다.
