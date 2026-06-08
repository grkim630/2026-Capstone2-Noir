# data

공유 데이터·미디어 폴더입니다.

```text
data/noir_color_db.xlsx   ← 추천 엔진 원본 DB
data/noir_color_db.json   ← xlsx와 동일 내용 (참고·연동용)
data/images/              ← UI·제품 이미지 (구 client/src/assets/images)
data/fonts/               ← 웹폰트
data/videos/              ← 인트로·효과 영상
data/audios/              ← TTS·효과음
```

클라이언트에서는 `/data/images/...` 형태의 URL로 참조합니다.

`server/recommendation/recommend.py`가 finalize 시 **xlsx**를 읽어
`outputs/sessions/<session>/recommendation_result.json`을 생성합니다.

xlsx를 JSON으로 다시보낼 때:

```bash
cd c:\Capstone2\server
& "c:\Capstone2\face-feature-mvp\.venv\Scripts\python.exe" scripts/export_noir_color_db_json.py
```

개발용 샘플 DB는 다음 명령으로 재생성할 수 있습니다 (운영 xlsx 덮어쓰지 말 것).

```bash
& "c:\Capstone2\face-feature-mvp\.venv\Scripts\python.exe" scripts/create_sample_noir_db.py
```

**추천 점수 계산은 항상 `noir_color_db.xlsx` 기준입니다.** JSON은 조회·문서화용입니다.
