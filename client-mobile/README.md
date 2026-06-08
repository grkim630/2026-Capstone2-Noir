# NOIR Mobile Client

`client-mobile`은 사용자가 태블릿 테스트를 마친 뒤 QR 코드로 접속하는 모바일 결과 페이지입니다. PC에서 분석한 얼굴/피부 결과와 태블릿에서 최종 선택한 제품 정보를 조합해 개인 컬러 프로필, 추천 제품, 구매 확인용 정보를 모바일 화면에 맞게 보여줍니다.

## 주요 역할

- QR 코드 URL의 session id를 기준으로 최종 결과를 불러옵니다.
- 태블릿에서 저장한 `final_selection.json`이 있으면 그 데이터를 우선 사용합니다.
- 최종 선택 데이터가 없으면 서버의 `recommendation_result.json`을 fallback으로 사용합니다.
- 얼굴 분석 결과를 모바일용 섹션 데이터로 변환합니다.
- 추천 립, 블러셔, 아이 팔레트 제품을 모바일 카드 UI로 보여줍니다.

## 기술 스택

- React
- Vite
- Tailwind CSS

## 폴더 구조

```text
client-mobile/
├─ index.html
├─ package.json
├─ vite.config.js
├─ public/
│  ├─ favicon.svg
│  └─ icons.svg
└─ src/
   ├─ App.jsx
   ├─ main.jsx
   ├─ index.css
   ├─ pages/
   │  └─ ResultPage.jsx
   ├─ components/
   │  ├─ HeroSection.jsx
   │  ├─ ToneBlueprintSection.jsx
   │  ├─ ComprehensiveProfile.jsx
   │  ├─ NoirPaletteSection.jsx
   │  ├─ ProductCard.jsx
   │  ├─ FaceColorMap.jsx
   │  ├─ MetricBar.jsx
   │  ├─ ColorChip.jsx
   │  ├─ SectionHeading.jsx
   │  ├─ SubSectionTitle.jsx
   │  └─ ScrollArrow.jsx
   └─ utils/
      ├─ mobileViewModel.js
      ├─ metrics.js
      ├─ assets.js
      └─ fluid.js
```

## 페이지 역할

### `src/pages/ResultPage.jsx`

모바일 앱의 메인 페이지입니다. URL에서 session id를 읽고 서버에 결과 데이터를 요청합니다.

예시 URL:

```text
http://192.168.0.10:5174/result/session_20260606_225602
```

데이터 로딩 우선순위는 다음과 같습니다.

1. `/api/mobile/final-selection/{sessionId}`
2. `/api/mobile/final-selection/latest`
3. 추천 결과 fallback 데이터

즉, 태블릿에서 사용자가 최종 선택한 제품이 있으면 그 결과가 모바일 페이지에 반영되고, 없다면 서버 추천 결과를 기반으로 화면을 구성합니다.

## 주요 컴포넌트

### `HeroSection.jsx`

결과 페이지의 상단 대표 영역입니다. 사용자 분석 결과를 시각적으로 보여주는 첫 화면입니다.

### `ToneBlueprintSection.jsx`

피부 톤, 채도, 명도, 색온도 같은 핵심 컬러 분석 정보를 보여줍니다.

### `ComprehensiveProfile.jsx`

얼굴 분석에서 추출된 주요 특징과 컬러 프로필을 종합적으로 정리합니다.

### `NoirPaletteSection.jsx`

추천 제품과 컬러칩을 보여주는 영역입니다. 태블릿에서 최종 선택한 립/블러셔가 있으면 그 제품을 우선 표시합니다.

### `MetricBar.jsx`

채도, 명도, 색온도 값을 바 형태로 표현합니다. PC 결과 화면과 동일하게 색온도는 내추럴 구간 `-5 ~ 5`가 UI의 `40% ~ 60%` 구간에 표시되도록 보정됩니다.

## 데이터 변환 방식

### `src/utils/mobileViewModel.js`

서버 응답을 모바일 UI에서 바로 사용할 수 있는 view model로 변환합니다.

- `finalSelection`이 있으면 태블릿 최종 선택 제품을 우선 사용합니다.
- 없으면 `recommendations` 데이터에서 추천 제품을 구성합니다.
- 제품 이미지, 제품명, display id, 컬러값을 모바일 카드에 맞게 정리합니다.

### `src/utils/metrics.js`

분석 수치를 UI 바 위치로 변환합니다. 사용자가 수치를 직관적으로 볼 수 있도록 실제 분석값을 그대로 표시하지 않고, UI 표현에 맞는 정규화 값을 사용합니다.

## 설치 및 실행

```bash
cd client-mobile
npm install
npm run dev
```

`vite.config.js`에서 모바일 클라이언트는 `5174` 포트를 사용하도록 구성되어 있습니다. 외부 모바일 기기에서 접속하려면 서버 PC의 LAN IP를 사용합니다.

예시:

```text
http://192.168.0.10:5174/result/{sessionId}
```

## 서버 연결

모바일 클라이언트는 `server`의 API를 통해 최종 결과를 가져옵니다. 모바일 기기에서 접속하는 경우 서버도 `0.0.0.0`으로 실행되어야 하고, Windows 방화벽에서 서버 포트와 Vite 포트가 허용되어야 합니다.

## 데이터와 에셋

제품 이미지, 로고, 배경, 폰트 등은 `data/` 폴더의 에셋을 참조합니다. GitHub에는 큰 이미지 파일을 올리지 않는 구조이므로 실제 실행 환경에서는 `data/images`와 필요한 폰트 파일을 직접 준비해야 합니다.
