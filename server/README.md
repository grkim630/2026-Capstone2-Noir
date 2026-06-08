# NOIR Server

`server`는 NOIR 프로젝트의 백엔드입니다. PC Client에서 업로드한 얼굴 촬영 프레임을 분석하고, 분석 결과를 바탕으로 제품 추천을 계산하며, 태블릿과 모바일 클라이언트가 사용할 최종 결과 데이터를 저장합니다. 또한 Socket.IO를 통해 태블릿 터치 이벤트를 TouchDesigner로 전달하는 실시간 통신 허브 역할도 합니다.

## 주요 역할

- PC Client에서 촬영 프레임을 업로드받습니다.
- `face-feature-mvp` 분석 모듈을 호출해 얼굴/피부 분석 결과를 생성합니다.
- 분석 결과를 세션별 폴더에 저장합니다.
- `data/noir_color_db.json`의 제품 색상 DB를 기준으로 추천 제품을 계산합니다.
- 태블릿에서 선택한 최종 제품을 `final_selection.json`으로 저장합니다.
- 모바일 결과 페이지가 사용할 데이터를 제공합니다.
- Socket.IO 이벤트를 통해 태블릿과 TouchDesigner를 연결합니다.

## 기술 스택

- Python
- FastAPI
- Uvicorn
- python-socketio
- OpenCV
- MediaPipe
- NumPy
- scikit-learn

## 폴더 구조

```text
server/
├─ app.py
├─ socket_hub.py
├─ requirements.txt
├─ recommendation/
│  ├─ __init__.py
│  ├─ recommend.py
│  ├─ score_utils.py
│  └─ color_utils.py
├─ scripts/
│  ├─ export_noir_color_db_json.py
│  └─ create_sample_noir_db.py
└─ outputs/
   └─ sessions/
```

## API 서버

### `app.py`

FastAPI 앱의 중심 파일입니다. HTTP API와 Socket.IO ASGI 앱을 함께 구성합니다.

주요 API:

- `POST /api/capture/analyze`
  - PC Client에서 촬영 프레임을 업로드합니다.
  - 얼굴 분석을 실행하고 `front/result.json`을 저장합니다.

- `POST /api/capture/finalize`
  - 분석 결과를 최종 결과로 정리합니다.
  - 추천 엔진을 실행해 `recommendation_result.json`을 생성합니다.

- `GET /api/sessions/latest/recommendation`
  - 최신 세션의 추천 결과를 반환합니다.
  - 태블릿이 추천 컬러를 불러올 때 사용합니다.

- `GET /api/capture/{session_id}/recommendation`
  - 특정 세션의 추천 결과를 반환합니다.

- `POST /api/tablet/final-selection`
  - 태블릿에서 사용자가 최종 선택한 립/블러셔를 저장합니다.
  - `data/noir_color_db.json`을 조회해 제품 정보를 정리된 형태로 저장합니다.

- `GET /api/mobile/final-selection/{session_id}`
  - 모바일 결과 페이지가 특정 세션의 최종 선택 결과를 가져갑니다.

- `GET /api/mobile/final-selection/latest`
  - 모바일 결과 페이지가 최신 최종 선택 결과를 가져갑니다.

- `POST /api/sessions/prune?keep=5`
  - 오래된 세션 폴더를 삭제하고 최신 세션 5개만 유지합니다.
  - PC Client 새로고침/시작 시 세션이 무한히 쌓이는 것을 막기 위한 정리 API입니다.

## 실시간 통신

### `socket_hub.py`

Socket.IO 서버 이벤트를 관리합니다.

태블릿에서 컬러칩을 선택하면:

```text
tablet:color-select
```

서버는 TouchDesigner가 받을 수 있도록 다음 이벤트로 다시 전달합니다.

```text
touchdesigner:apply-color
```

태블릿에서 테스트 종료를 누르면:

```text
tablet:testing-finish
```

서버는 다음 이벤트로 종료 상태를 전달합니다.

```text
touchdesigner:testing-finished
```

TouchDesigner 연결이 완성되면 새 통신 구조를 만들 필요 없이, 기존 Socket.IO 서버에 연결해서 `touchdesigner:*` 이벤트를 구독하면 됩니다.

## 세션 저장 구조

촬영과 분석 결과는 `server/outputs/sessions` 아래에 세션별로 저장됩니다.

```text
outputs/sessions/
└─ session_YYYYMMDD_HHMMSS/
   ├─ front/
   │  ├─ frames/
   │  ├─ representative.jpg
   │  └─ result.json
   ├─ final_result.json
   ├─ recommendation_result.json
   └─ final_selection.json
```

- `front/frames`: PC Client가 업로드한 촬영 프레임입니다.
- `front/result.json`: 얼굴 분석 모듈이 만든 원본 분석 결과입니다.
- `final_result.json`: 서버가 최종 결과로 정리한 분석 데이터입니다.
- `recommendation_result.json`: 추천 엔진이 만든 제품 추천 결과입니다.
- `final_selection.json`: 태블릿에서 사용자가 최종 선택한 제품 결과입니다.

## 얼굴 분석 처리 흐름

서버는 직접 얼굴 분석 알고리즘을 모두 구현하기보다, `face-feature-mvp` 폴더의 분석 모듈을 호출합니다.

처리 흐름:

1. PC Client가 프레임을 업로드합니다.
2. 서버가 세션 폴더를 생성합니다.
3. 프레임을 저장합니다.
4. `face-feature-mvp`의 랜드마크/색상 분석 모듈을 호출합니다.
5. 얼굴 부위별 색상과 피부 베이스 값을 추출합니다.
6. LAB/HSV 기반으로 색온도, 명도, 채도, 퍼스널 컬러 방향성을 계산합니다.
7. 결과를 `front/result.json`과 `final_result.json`에 저장합니다.

## 제품 추천 방식

추천 로직은 `server/recommendation` 폴더에 있습니다.

### `recommendation/recommend.py`

분석 결과와 제품 DB를 읽어 추천 결과를 생성합니다.

입력 데이터:

- 얼굴 분석 결과
- 피부 대표색
- LAB/HSV 분석값
- 색온도/명도/채도 분류
- `data/noir_color_db.json` 제품 DB

출력 데이터:

- 추천 립
- 추천 블러셔
- 추천 아이 팔레트
- 태블릿/모바일 화면에서 사용할 제품 표시 정보

### `recommendation/score_utils.py`

제품별 점수를 계산하는 규칙을 담고 있습니다. 사용자의 피부 분석값과 제품의 색상 정보를 비교해 어울림 정도를 점수화합니다.

추천 점수는 단순히 RGB 거리를 비교하는 방식이 아니라, 다음 요소를 함께 봅니다.

- 사용자 피부의 웜/쿨/뉴트럴 방향
- 피부 명도와 제품 명도의 어울림
- 피부 채도와 제품 채도의 균형
- 제품 색상의 LAB/HSV 특성
- 립/블러셔/아이 팔레트 카테고리별 가중치

### `recommendation/color_utils.py`

추천 계산에 필요한 색상 변환 유틸입니다. RGB, HEX, LAB, HSV 사이의 변환을 담당합니다.

## 추천 결과와 최종 선택 결과의 차이

`recommendation_result.json`은 서버가 자동으로 추천한 후보 목록입니다. 추천 과정에서 필요한 분석 설명, 점수, 후보 정보가 함께 들어갈 수 있어 데이터가 비교적 큽니다.

반면 `final_selection.json`은 사용자가 태블릿에서 실제로 고른 최종 제품만 저장합니다. 이때 서버는 태블릿이 보낸 제품 식별자를 기준으로 `data/noir_color_db.json`을 다시 조회해, 제품 DB와 동일한 구조의 깔끔한 데이터로 저장합니다. 그래서 추천 영역에서 고른 제품과 MUZIGAE MENSION 전체 컬러칩에서 고른 제품이 동일한 저장 형식을 갖습니다.

## 설치 및 실행

```bash
cd server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

개발 서버 실행:

```bash
python -m uvicorn app:asgi_app --host 0.0.0.0 --port 8000 --reload
```

외부 태블릿/모바일 기기에서 접근하려면 `--host 0.0.0.0`으로 실행해야 합니다. Windows 방화벽에서도 `8000` 포트를 허용해야 합니다.

## 데이터 파일

추천 엔진은 루트 `data/noir_color_db.json`을 사용합니다. 이 파일에는 NOIR 제품의 display id, display name, 색상값, 제품 이미지 참조 등이 들어갑니다.

GitHub에는 대용량 이미지나 세션 결과물을 올리지 않는 구조이므로 다음 폴더는 제외하는 것을 권장합니다.

- `server/outputs/`
- `face-feature-mvp/outputs/`
- `data/images/`
- `node_modules/`
- Python cache 폴더
