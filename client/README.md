# NOIR PC Client

`client`는 사용자가 PC 화면에서 얼굴 촬영을 진행하고, 서버 분석 결과를 확인한 뒤 추천 제품 흐름으로 넘어가는 메인 웹앱입니다. 전시/시연 흐름에서 가장 먼저 사용하는 화면이며, 얼굴 촬영, 분석 대기, 컬러 결과, 추천 제품 확인, 테스트 완료 페이지를 담당합니다.

## 주요 역할

- 웹캠으로 사용자의 얼굴을 촬영합니다.
- MediaPipe FaceLandmarker로 얼굴 위치와 정렬 상태를 확인합니다.
- 촬영 프레임을 서버에 업로드하고 얼굴/피부 분석을 요청합니다.
- 서버가 생성한 `final_result.json`, `recommendation_result.json` 기반으로 분석 결과와 추천 제품을 보여줍니다.
- 사용자가 다시 시작할 수 있도록 최근 세션 정리 API를 호출합니다.

## 기술 스택

- React
- Vite
- Tailwind CSS
- Framer Motion
- MediaPipe Tasks Vision

## 폴더 구조

```text
client/
├─ index.html
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
└─ src/
   ├─ App.jsx
   ├─ main.jsx
   ├─ index.css
   ├─ api/
   │  └─ captureApi.js
   ├─ pages/
   │  ├─ StartPage.jsx
   │  └─ CapturePage.jsx
   ├─ components/
   │  ├─ OpeningScreen.jsx
   │  ├─ GetReadyScreen.jsx
   │  ├─ WebcamCapture.jsx
   │  ├─ CaptureCompleteScreen.jsx
   │  ├─ AnalyzingScreen.jsx
   │  ├─ AnalysisResultScreen.jsx
   │  ├─ RecommendationsScreen.jsx
   │  ├─ TestingCompleteScreen.jsx
   │  └─ GlassButton.jsx
   └─ utils/
      ├─ capturePreview.js
      ├─ playAudio.js
      └─ recommendationViewModel.js
```

## 페이지와 화면 흐름

`src/pages/StartPage.jsx`가 전체 화면 흐름을 관리합니다. 현재 phase 값에 따라 다음 화면으로 전환됩니다.

1. `opening`: NOIR 인트로 화면입니다. 사용자가 메이크업 여부를 선택합니다.
2. `getReady`: 촬영 전 안내 화면입니다.
3. `capture`: 웹캠 촬영 화면입니다.
4. `complete`: 촬영 완료 화면입니다.
5. `analyzing`: 서버 분석 요청 중 보여주는 대기 화면입니다.
6. `result`: 채도, 명도, 색온도 등 얼굴 분석 결과 화면입니다.
7. `recommendations`: 추천 제품 리스트 화면입니다.
8. `testingComplete`: 테스트 완료 화면입니다.

## 주요 파일 설명

### `src/api/captureApi.js`

서버와 통신하는 API 모음입니다.

- `/api/capture/analyze`: 촬영 프레임을 서버로 업로드하고 얼굴 분석을 요청합니다.
- `/api/capture/finalize`: 분석 결과를 최종 세션 결과로 저장하고 추천 결과 생성을 요청합니다.
- 요청에는 `hasMakeup` 값이 포함되어 서버가 메이크업 여부를 분석 가중치에 반영할 수 있습니다.

### `src/pages/CapturePage.jsx`

웹캠 촬영과 얼굴 정렬 확인을 담당합니다. MediaPipe FaceLandmarker를 사용해 얼굴이 화면 중앙에 있는지, 충분히 감지되는지 확인한 뒤 촬영을 진행합니다.

### `src/components/AnalyzingScreen.jsx`

분석 요청 중의 화면입니다. React StrictMode 환경에서 같은 분석 요청이 중복 호출되지 않도록 요청 가드를 사용합니다.

### `src/components/AnalysisResultScreen.jsx`

서버 분석 결과를 사용자에게 보여주는 화면입니다. 채도, 명도, 색온도 값은 UI 바에서 보기 좋은 위치로 정규화되어 표시됩니다.

- 색온도: `-15`는 웜 쪽 끝, `15`는 쿨 쪽 끝으로 표시됩니다.
- 내추럴 구간인 `-5 ~ 5`는 UI 바의 `40% ~ 60%` 범위에 모이도록 표시됩니다.
- 명도와 채도는 분석값을 기반으로 각각의 바 위치에 맞게 변환됩니다.

### `src/components/RecommendationsScreen.jsx`

서버가 추천한 립, 블러셔, 아이 팔레트 데이터를 화면용 카드 데이터로 변환해 보여줍니다.

## 설치 및 실행

```bash
cd client
npm install
npm run dev
```

기본 Vite 개발 서버는 보통 `http://localhost:5173`에서 실행됩니다.

## 서버 연결

PC Client는 `server` 폴더의 FastAPI 서버가 실행 중이어야 정상적으로 분석을 진행할 수 있습니다.

```bash
cd server
python -m uvicorn app:asgi_app --host 0.0.0.0 --port 8000 --reload
```

프론트엔드에서 서버 주소를 바꿔야 하는 경우 `.env` 또는 코드의 API origin 설정을 확인해야 합니다. 태블릿/모바일 기기에서 접근할 때는 `localhost`가 아니라 서버 PC의 LAN IP를 사용해야 합니다.

## 데이터와 에셋

이 앱은 일부 이미지, 로고, 제품 이미지, 폰트 등 `data/` 폴더의 에셋을 참조합니다. GitHub에는 `data/noir_color_db.json`과 `data/README.md`만 올리는 구조이므로, 실제 실행 환경에서는 필요한 이미지와 폰트 파일을 별도로 배치해야 합니다.
