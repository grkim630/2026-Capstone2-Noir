# NOIR

NOIR는 얼굴 이미지 분석을 기반으로 개인의 피부 톤과 색상 특징을 파악하고, NOIR 화장품 데이터베이스에서 어울리는 립, 블러셔, 아이 팔레트를 추천하는 졸업 전시용 인터랙티브 퍼스널 컬러 추천 시스템입니다.

사용자는 PC 화면에서 얼굴을 촬영하고 분석 결과를 확인한 뒤, 태블릿 화면에서 추천 컬러와 전체 컬러칩을 직접 테스트합니다. 최종 선택 결과는 QR 코드로 연결되는 모바일 결과 페이지에서 확인할 수 있으며, 태블릿의 컬러 선택 이벤트는 TouchDesigner 같은 외부 시각화 시스템과 연동할 수 있도록 Socket.IO 이벤트로 전달됩니다.

## Team

- 팀명: NOIR
- 프로젝트명: NOIR

| Name | Role | Main Contribution |
| --- | --- | --- |
| 이화 | 팀장 | 추후 작성 |
| 김강륜 | 추후 작성 | 추후 작성 |
| 신하현 | 추후 작성 | 추후 작성 |
| 최정윤 | 추후 작성 | 추후 작성 |
| 황하린 | 추후 작성 | 추후 작성 |

## Overview

NOIR는 단순히 색상표를 보여주는 앱이 아니라, 촬영된 얼굴 이미지와 제품 색상 DB를 연결하는 전시형 시스템입니다.

주요 흐름은 다음과 같습니다.

1. PC Client에서 사용자가 얼굴을 촬영합니다.
2. Python 기반 얼굴 분석 모듈이 얼굴 랜드마크, 피부 베이스 색, 입술, 볼, 이마, 눈 주변 색을 추출합니다.
3. 서버가 분석 결과를 LAB/HSV 색공간 기준으로 해석해 색온도, 명도, 채도, 퍼스널 컬러 타입을 계산합니다.
4. 서버 추천 엔진이 사용자의 분석 결과와 NOIR 제품 DB를 비교해 립 3개, 블러셔 3개, 아이 팔레트 1개를 추천합니다.
5. 태블릿 앱에서 사용자가 추천 컬러 또는 전체 컬러칩을 터치해 테스트합니다.
6. 최종 선택 결과는 서버에 저장되고 모바일 결과 페이지에서 QR 코드로 확인할 수 있습니다.

## Exhibition Scenario

전시 환경에서는 PC, 태블릿, 모바일, 서버, TouchDesigner 장비가 같은 네트워크 안에서 동작하는 것을 전제로 합니다.

1. 사용자는 PC 화면에서 NOIR 인트로를 보고 메이크업 여부를 선택합니다.
2. PC 웹캠으로 얼굴을 촬영합니다.
3. 서버는 촬영 프레임을 세션 폴더에 저장하고 얼굴 분석을 실행합니다.
4. 분석이 끝나면 PC 화면에 피부 톤, 색온도, 명도, 채도, 추천 제품 정보가 표시됩니다.
5. 태블릿 화면에는 추천 컬러와 MUZIGAE MENSION 전체 컬러칩이 표시됩니다.
6. 사용자가 태블릿에서 컬러칩을 터치하면 서버를 통해 TouchDesigner 연동용 이벤트가 전달됩니다.
7. 사용자가 `테스팅 마치기`를 누르면 최종 선택 결과가 저장됩니다.
8. 태블릿 종료 화면의 QR 코드를 스캔하면 모바일 결과 페이지로 이동합니다.

## Project Structure

```txt
Capstone2/
├─ client/              # PC 촬영, 분석 결과, 추천 결과를 담당하는 메인 웹앱
├─ client-mobile/       # QR 코드로 접속하는 모바일 결과 페이지
├─ client-tablet/       # Android 태블릿용 컬러 테스트 UI
├─ face-feature-mvp/    # Python 기반 얼굴 랜드마크 및 피부 색상 분석 모듈
├─ server/              # FastAPI 서버, 추천 엔진, 세션 저장, Socket.IO 허브
├─ vite/                # data 에셋 접근을 돕는 Vite 공용 플러그인
├─ data/                # 제품 DB와 실행에 필요한 이미지/폰트 에셋 위치
├─ README.md
└─ .gitignore
```

각 주요 폴더 안에는 별도 `README.md`가 있습니다. 세부 구조와 실행 방법은 해당 폴더의 README를 먼저 확인하는 것이 좋습니다.

## Main Features

- 얼굴 이미지 기반 피부 색상 분석
- MediaPipe Face Mesh 기반 얼굴 랜드마크 감지
- 입술, 볼, 이마, 눈 주변, 홍채, 피부 베이스 색 추출
- LAB/HSV 기반 색온도, 명도, 채도 판정
- 8타입 퍼스널 컬러 분류
- 메이크업 여부에 따른 피부 분석 가중치 조정
- NOIR 제품 DB 기반 립, 블러셔, 아이 팔레트 추천
- 태블릿 터치 기반 컬러칩 테스트
- 최종 선택 결과 JSON 저장
- QR 코드 기반 모바일 결과 페이지
- TouchDesigner 연동을 위한 Socket.IO 이벤트 제공

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Framer Motion
- MediaPipe Tasks Vision
- Socket.IO Client
- qrcode.react

### Backend

- Python
- FastAPI
- Uvicorn
- python-socketio
- OpenCV
- MediaPipe
- NumPy
- scikit-learn
- openpyxl

### Data

- JSON
- XLSX
- 이미지/폰트 에셋

### External Integration

- Android Fully Kiosk Browser & Lockdown
- TouchDesigner 연동을 고려한 Socket.IO 이벤트 구조

## Folder Summary

### `client`

PC에서 실행되는 메인 웹앱입니다. 사용자는 이 화면에서 인트로를 보고, 메이크업 여부를 선택하고, 웹캠으로 얼굴을 촬영합니다. 촬영된 프레임은 서버로 업로드되며, 분석이 끝나면 피부 톤 결과와 추천 제품 화면을 확인합니다.

### `client-mobile`

모바일 결과 페이지입니다. 태블릿 종료 화면의 QR 코드로 접속하며, 서버에 저장된 최종 선택 결과를 불러와 개인 컬러 프로필과 추천 제품을 모바일 화면에 맞게 보여줍니다.

### `client-tablet`

Android 태블릿의 Fully Kiosk Browser 환경에서 실행되는 컬러 테스트 앱입니다. 추천 제품과 전체 컬러칩을 표시하고, 사용자의 터치 선택을 서버와 TouchDesigner 연동 이벤트로 전달합니다.

### `face-feature-mvp`

얼굴 분석 로직을 담당하는 Python 모듈입니다. MediaPipe Face Mesh로 얼굴 랜드마크를 감지하고, 피부/입술/볼/이마/눈 주변 색상을 추출합니다. 이후 LAB/HSV 색공간을 사용해 피부 톤과 퍼스널 컬러 방향성을 계산합니다.

### `server`

FastAPI 기반 백엔드입니다. 촬영 프레임 저장, 얼굴 분석 실행, 추천 결과 생성, 최종 선택 저장, 모바일 결과 API, Socket.IO 이벤트 중계를 담당합니다.

### `vite`

프론트엔드 앱들이 루트 `data/` 폴더의 이미지와 폰트를 사용할 수 있도록 돕는 Vite 공용 플러그인을 포함합니다.

### `data`

제품 DB와 실행에 필요한 이미지/폰트 에셋이 위치하는 폴더입니다. GitHub에는 `noir_color_db.json`과 안내용 README만 포함하는 것을 권장합니다.

## Getting Started

아래 명령어는 개발 환경 기준 예시입니다. 실제 실행 시 서버 PC의 LAN IP, 포트, 방화벽 설정, 에셋 위치를 확인해야 합니다.

### 1. Repository clone

```bash
git clone <repository-url>
cd Capstone2
```

### 2. Server 실행

```bash
cd server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app:asgi_app --host 0.0.0.0 --port 8000 --reload
```

서버는 태블릿과 모바일 기기에서도 접근할 수 있어야 하므로 `--host 0.0.0.0`으로 실행합니다.

### 3. PC Client 실행

```bash
cd client
npm install
npm run dev
```

### 4. Mobile Client 실행

```bash
cd client-mobile
npm install
npm run dev
```

기본 포트는 `5174`로 구성되어 있습니다.

### 5. Tablet Client 실행

```bash
cd client-tablet
npm install
npm run dev
```

Fully Kiosk Browser 테스트용 모드:

```bash
npm run dev:kiosk
```

### 6. Face Analysis 단독 테스트

```bash
cd face-feature-mvp
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

서버를 통해 분석하는 경우에는 보통 `face-feature-mvp`를 따로 실행하지 않고, `server`가 해당 모듈을 호출합니다.

## Network Notes

태블릿과 모바일은 서버 PC에 접속해야 하므로 `localhost`를 사용하면 안 됩니다. 외부 기기에서는 `localhost`가 서버 PC가 아니라 자기 자신을 의미합니다.

예시:

```txt
잘못된 예: http://localhost:8000
올바른 예: http://192.168.0.10:8000
```

Vite dev server와 FastAPI server는 외부 기기에서 접근 가능하도록 `0.0.0.0` host로 실행해야 합니다. Windows 방화벽에서 필요한 포트도 허용되어야 합니다.

### 네트워크가 바뀔 때 수정해야 하는 곳

와이파이 또는 공유기가 바뀌면 서버 PC의 LAN IP가 달라질 수 있습니다. 먼저 서버 PC에서 `ipconfig`를 실행해 새 IPv4 주소를 확인합니다. 예를 들어 기존 IP가 `192.168.0.10`이고 새 IP가 `192.168.1.23`이라면 아래 위치의 주소를 새 IP로 바꿉니다.

| 대상 | 파일/위치 | 바꿀 내용 |
| --- | --- | --- |
| 태블릿 앱 서버 주소 | `client-tablet/.env.kiosk` | `VITE_SERVER_ORIGIN=http://192.168.0.10:8000` → `VITE_SERVER_ORIGIN=http://새_IP:8000` |
| Fully Kiosk Browser 시작 URL | Android 태블릿 앱 설정 | `http://192.168.0.10:5175` → `http://새_IP:5175` |
| TouchDesigner WebSocket DAT | TouchDesigner의 `websocket1` 설정 | `Network Address`를 `새_IP`로 변경하고 `Network Port`는 `8000` 유지 |
| TouchDesigner WebSocket path | path 입력칸이 있는 경우 | `/ws/touchdesigner` 유지 |
| Arduino 코드 | Arduino 스케치의 `SERVER_ORIGIN` | `http://192.168.0.10:8000` → `http://새_IP:8000` |
| 이미지 수신 PC Python 코드 | 상대 컴퓨터의 이미지 다운로드 스크립트 | `ws://192.168.0.10:8000/ws/touchdesigner` → `ws://새_IP:8000/ws/touchdesigner` |
| 모바일 결과 URL | QR 또는 직접 접속 URL | `http://192.168.0.10:5174/result/{sessionId}` → `http://새_IP:5174/result/{sessionId}` |

다음 파일의 `127.0.0.1:8000`은 Vite가 서버 PC 내부에서 FastAPI로 프록시하기 위한 주소이므로 보통 수정하지 않습니다.

- `client/vite.config.js`
- `client-mobile/vite.config.js`
- `client-tablet/vite.config.js`

`0.0.0.0`도 수정하지 않습니다. 이 값은 외부 기기가 해당 개발 서버에 접속할 수 있도록 열어 두는 설정입니다.

## Environment Variables

실제 실행 환경에서는 각 클라이언트의 `.env` 또는 `.env.kiosk`에서 서버 주소를 LAN IP로 지정해야 합니다.

예시:

```env
VITE_SERVER_ORIGIN=http://192.168.0.10:8000
```

API key, 외부 서비스 key, 실제 서버 주소, 개인 정보가 포함된 `.env` 파일은 GitHub에 올리지 않습니다. 공유가 필요한 경우 실제 값 없이 `.env.example` 형태로 작성합니다.

## External Device Integration

NOIR는 웹앱만 단독으로 실행되는 구조가 아니라, 전시 환경에서 태블릿, TouchDesigner, Arduino 센서, 별도 이미지 처리 PC와 함께 동작할 수 있도록 구성되어 있습니다. 중심이 되는 장비는 FastAPI 서버 PC이며, 다른 장비들은 같은 네트워크에서 서버 PC의 LAN IP로 접속합니다.

```txt
PC client
→ FastAPI server
→ client-tablet / client-mobile
→ TouchDesigner WebSocket client
→ Arduino HTTP sensor input
→ external image receiver Python program
```

### TouchDesigner 연동

태블릿에서 컬러칩을 선택하면 `client-tablet`이 Socket.IO 이벤트를 서버로 보냅니다. 서버는 이 이벤트를 TouchDesigner WebSocket 클라이언트로 다시 전달합니다.

컬러 선택 이벤트 예시:

```json
{
  "event": "color_selected",
  "target": "blush",
  "productType": "objet_blush",
  "id": 1,
  "displayName": "JOYFUL",
  "displayID": "001",
  "hex": "#D98A91",
  "rgb": [217, 138, 145],
  "normalizedRgb": {
    "r": 0.85,
    "g": 0.541,
    "b": 0.568
  }
}
```

TouchDesigner WebSocket DAT 기본 설정:

```txt
Network Address: 서버_PC_LAN_IP
Network Port: 8000
Path: /ws/touchdesigner
```

일부 TouchDesigner 환경에서는 path 입력칸이 없거나 동작 방식이 다를 수 있으므로 서버는 `/`, `/ws`, `/ws/`, `/ws/touchdesigner` 경로를 모두 받을 수 있게 구성되어 있습니다.

### Arduino 리드센서 연동

리드센서는 사용자가 자성 펜을 어느 위치에 가져다 댔는지 감지하기 위해 사용합니다. Arduino는 TouchDesigner로 직접 보내지 않고 FastAPI 서버에 HTTP 요청을 보냅니다. 서버는 이 값을 다시 TouchDesigner WebSocket으로 전달합니다.

센서 매핑:

```txt
sensor 1 → blush_left
sensor 2 → blush_right
sensor 3 → lips
```

HTTP 요청 예시:

```txt
GET http://서버_PC_LAN_IP:8000/api/touchdesigner/sensor?id=1&value=1
GET http://서버_PC_LAN_IP:8000/api/touchdesigner/sensor?id=2&value=1
GET http://서버_PC_LAN_IP:8000/api/touchdesigner/sensor?id=3&value=1
```

서버가 TouchDesigner로 전달하는 센서 이벤트 예시:

```json
{
  "event": "sensor_triggered",
  "sensor": 1,
  "value": 1,
  "region": "blush_left"
}
```

현재 Arduino 배선 기준은 ESP32의 `GPIO 14`, `GPIO 27`, `GPIO 26`을 사용합니다. 코드는 `INPUT_PULLUP`을 기준으로 하며, 각 리드 스위치는 `GPIO ↔ 리드 스위치 ↔ GND` 형태로 연결합니다.

```txt
GPIO 14 ─ 리드 스위치 ─ GND  # sensor 1, blush_left
GPIO 27 ─ 리드 스위치 ─ GND  # sensor 2, blush_right
GPIO 26 ─ 리드 스위치 ─ GND  # sensor 3, lips
```

### 촬영 대표 이미지 전달

PC client에서 촬영과 분석이 끝나면 서버는 세션 폴더 안의 대표 이미지를 생성합니다.

```txt
server/outputs/sessions/session_YYYYMMDD_HHMMSS/front/representative.jpg
```

분석 완료 후 `/api/capture/finalize` 단계에서 서버는 TouchDesigner WebSocket 채널로 이미지 준비 이벤트를 보냅니다. TouchDesigner가 직접 이미지를 쓰지 않더라도, 같은 WebSocket에 연결된 별도 Python 프로그램이 이 JSON을 받아 `imageUrl`의 이미지를 다운로드할 수 있습니다.

이미지 준비 이벤트 예시:

```json
{
  "event": "capture_image_ready",
  "sessionId": "session_YYYYMMDD_HHMMSS",
  "pose": "front",
  "imagePath": "/outputs/sessions/session_YYYYMMDD_HHMMSS/front/representative.jpg",
  "imageUrl": "http://서버_PC_LAN_IP:8000/outputs/sessions/session_YYYYMMDD_HHMMSS/front/representative.jpg"
}
```

이미지 수신 PC의 Python 프로그램은 `ws://서버_PC_LAN_IP:8000/ws/touchdesigner`에 연결해 이 JSON을 받고, `imageUrl`로 HTTP 다운로드를 수행하면 됩니다.

### QR 모바일 결과 페이지를 외부에서 열기

기본 개발 구조에서는 태블릿 종료 화면의 QR이 같은 네트워크 안의 모바일 앱 주소를 가리킵니다.

```txt
http://서버_PC_LAN_IP:5174/result/{sessionId}
```

이 주소는 사용자가 같은 Wi-Fi에 있지 않으면 열리지 않습니다. 사용자가 다른 Wi-Fi나 모바일 데이터를 사용해도 QR 결과 페이지를 열게 하려면 모바일 결과 페이지를 외부에서 접근 가능한 URL로 제공해야 합니다. 예를 들어 Cloudflare Tunnel, ngrok, 별도 배포 서버 등을 사용할 수 있습니다.

태블릿 QR에 외부 모바일 주소를 넣으려면 `client-tablet/.env.kiosk`에 다음 값을 추가합니다.

```env
VITE_MOBILE_PUBLIC_ORIGIN=https://외부_모바일_결과페이지_주소
```

예시:

```env
VITE_SERVER_ORIGIN=http://192.168.0.10:8000
VITE_MOBILE_PUBLIC_ORIGIN=https://noir-mobile.example.com
VITE_TABLET_SOCKET_ENABLED=true
VITE_TABLET_UI_ONLY=false
```

이렇게 설정하면 태블릿이 최종 선택 결과를 저장할 때 서버에서 QR URL을 다음처럼 만들어 줍니다.

```txt
https://noir-mobile.example.com/result/session_YYYYMMDD_HHMMSS
```

모바일 결과 페이지가 외부 URL에서 열릴 때 API 서버가 다른 주소에 있다면 `client-mobile/.env`에 API 서버 주소를 지정합니다.

```env
VITE_SERVER_ORIGIN=https://외부_API_서버_주소
```

비워두면 `client-mobile`은 현재 모바일 페이지와 같은 주소의 `/api`, `/outputs`를 요청합니다. 즉 모바일 페이지와 API 서버를 같은 터널/도메인으로 묶는 경우에는 따로 설정하지 않아도 됩니다.

## Data and Generated Files

NOIR는 얼굴 이미지와 분석 결과를 다루기 때문에 GitHub에 올리면 안 되는 파일이 많습니다.

공개 저장소에 포함하지 않는 것을 권장하는 항목:

- 촬영된 얼굴 이미지
- 분석 결과 JSON
- 세션 폴더
- `server/outputs/`
- `face-feature-mvp/outputs/`
- `data/images/`
- 폰트 파일
- `.env`, `.env.*`
- `node_modules/`
- Python 가상환경
- `__pycache__/`
- 로그 파일

현재 GitHub 업로드 기준으로 `data/` 폴더에는 `noir_color_db.json`과 `README.md`만 포함하고, 이미지/폰트/세션 결과물은 제외하는 것을 권장합니다.

## Generated Result Files

실행 중 생성되는 주요 결과 파일은 다음과 같습니다.

```txt
server/outputs/sessions/session_YYYYMMDD_HHMMSS/
├─ front/
│  ├─ frames/
│  ├─ representative.jpg
│  └─ result.json
├─ final_result.json
├─ recommendation_result.json
└─ final_selection.json
```

- `result.json`: 얼굴 분석 모듈의 원본 분석 결과입니다.
- `final_result.json`: 서버가 최종 분석 데이터로 정리한 파일입니다.
- `recommendation_result.json`: 추천 엔진이 만든 추천 제품 결과입니다.
- `final_selection.json`: 태블릿에서 사용자가 최종 선택한 제품 결과입니다.

이 파일들은 개인 얼굴 이미지 또는 분석 결과를 포함할 수 있으므로 공개 저장소에 커밋하지 않습니다.

## Development Notes

- 각 폴더는 독립적으로 실행되는 구조입니다.
- 서버를 먼저 실행한 뒤 PC, 태블릿, 모바일 클라이언트를 실행하는 것이 좋습니다.
- 태블릿 최종 실행 환경은 일반 브라우저가 아니라 Android Fully Kiosk Browser & Lockdown입니다.
- 태블릿 화면은 fullscreen kiosk browser에서 `100dvw x 100dvh`를 채우는 고정형 앱처럼 동작하도록 구성되어 있습니다.
- TouchDesigner 연동이 완성되면 기존 Socket.IO 이벤트를 구독하는 방식으로 연결할 수 있습니다.
- 추천 결과와 최종 선택 결과의 JSON 구조는 프론트엔드와 외부 시각화 시스템에서 함께 사용하므로 임의로 변경하지 않는 것이 좋습니다.

## Git Ignore Notice

`.gitignore`는 대용량 에셋, 촬영 이미지, 분석 결과, 환경 변수, 의존성 폴더가 GitHub에 올라가지 않도록 관리합니다.

대표적으로 제외해야 하는 항목:

```txt
.env
.env.*
node_modules/
.venv/
__pycache__/
outputs/
sessions/
uploads/
captures/
analysis_results/
recommendation_result.json
final_selection.json
*.log
```

실제 비밀값이 없는 `.env.example`은 공유할 수 있습니다.

## License

본 프로젝트는 졸업 전시 및 학습 목적으로 제작되었습니다. 라이선스는 추후 명시 예정입니다.
