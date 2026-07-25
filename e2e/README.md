# 웹 E2E (Playwright)

진짜 브라우저로 진짜 백엔드를 친다. 목(mock)이 없다 — 이 테스트들이 잡으려는
버그가 정확히 프론트와 백엔드 사이(인증 헤더, CORS, WebSocket 핸드셰이크, 응답
스키마, 마이그레이션 누락)에 있기 때문이다.

## 실행

```bash
# 1) 백엔드부터 (Backend 폴더)
docker compose up -d
docker compose exec api alembic upgrade head   # 스키마를 최신으로

# 2) 웹 E2E (Frontend 폴더)
npm run e2e              # 전부
npm run e2e -- chat      # 파일 이름으로 골라서
npm run e2e:ui           # 눈으로 보며 디버깅
npm run e2e:report       # 마지막 리포트 열기
```

Vite 개발 서버는 Playwright가 알아서 띄운다(`playwright.config.ts`의 `webServer`).
이미 5173에 떠 있으면 그걸 재사용한다.

## 구성

| 파일 | 보는 것 |
| --- | --- |
| `auth.spec.ts` | 회원가입·로그인·로그아웃, 비로그인 접근 차단, 서버 생성/초대코드 참여 |
| `chat.spec.ts` | 메시지 송수신·영속·삭제, 서식 렌더, XSS 방어, 채널 격리 |
| `realtime.spec.ts` | 브라우저 2개로 WebSocket — 실시간 도착·삭제 전파·접속 인원·입력중 표시 |
| `games.spec.ts` | 빙고 2인 한 판(턴 교대까지), 8개 전용 화면, 그림판 실시간, 모바일 폭 |
| `slack-entry.spec.ts` | 슬랙 입장 링크(`?t=`)의 웹쪽 절반 + 슬랙/웹 사용자가 같은 판에서 만나는지 |

`fixtures.ts`가 준비물(계정·서버·채널)을 API로 만들어준다. **검증하려는 것만
UI로 클릭하고 준비물은 API로 만든다** — 관심 없는 단계에서 깨져 원인을 가리지
않게 하기 위해서다.

## 알아둘 것

- **개발 DB에 실제로 쓴다.** 계정·서버가 쌓인다. 겹침을 막으려고 `uniqueId()`가
  실행마다 다른 이메일(`e2e-<라벨>-<시각>-<난수>@test.local`)을 만든다.
  주기적으로 정리하려면 `email LIKE 'e2e-%@test.local'` 로 지우면 된다.
- **스키마가 최신이 아니면 전부 죽는다.** 개발 compose는 `uvicorn --reload`를
  직접 실행해 마이그레이션을 돌리는 `entrypoint.sh`를 건너뛴다. 즉 새 마이그레이션이
  들어와도 자동으로 반영되지 않는다. 이유 없이 `500`이 뜨면 먼저
  `docker compose exec api alembic current` 와 `alembic heads` 를 비교해보자.
- 백엔드가 안 떠 있으면 `global-setup.ts`가 첫 줄에서 끊고 이유를 알려준다.

## 슬랙쪽 절반은 pytest에 있다

입장 링크를 **만드는** 쪽(서명 검증 → Bolt 디스패치 → DB 미러링 → 토큰 발급)은
`Backend/tests/test_slack_e2e.py`가 본다. 둘을 합쳐야 슬랙 버튼부터 웹 화면까지
한 줄이 된다.

```bash
cd ../Backend && .venv/bin/python -m pytest tests/test_slack_e2e.py
```

⚠️ pytest 세션을 두 개 동시에 돌리지 말 것 — 같은 테스트 DB(`bootcamp_test`)의
스키마를 테스트마다 갈아엎어서 서로를 깨뜨린다.
