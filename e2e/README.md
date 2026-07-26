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
npm run e2e              # 전부 — PC·모바일 두 프로젝트 모두
npm run e2e:desktop      # PC(1280px, Desktop Chrome)만
npm run e2e:mobile       # 모바일(Pixel 5, 393px)만
npm run e2e -- chat      # 파일 이름으로 골라서 (두 프로젝트 다 돈다)
npm run e2e:ui           # 눈으로 보며 디버깅
npm run e2e:report       # 마지막 리포트 열기
```

Vite 개발 서버는 Playwright가 알아서 띄운다(`playwright.config.ts`의 `webServer`).
이미 5173에 떠 있으면 그걸 재사용한다.

## PC / 모바일 두 프로젝트

이 앱의 반응형은 순전히 화면 폭으로 갈린다 — `useMediaQuery.ts`는 `matchMedia`만
보고 UA는 보지 않는다(720px에서 셸이 드로어로, 900px에서 멤버 패널이 오버레이로
바뀐다). 그래서 `playwright.config.ts`는 디바이스를 흉내내는 것보다 이 두 기준의
양쪽에 서는 걸 목표로 `desktop`(Desktop Chrome, 1280px)과 `mobile`(Pixel 5,
393px) 두 프로젝트를 돈다.

**파일명이 적용 범위를 가른다:**

| 패턴 | 도는 곳 | 용도 |
| --- | --- | --- |
| `*.spec.ts` | PC + 모바일 둘 다 (기본) | 레이아웃과 무관한 동작 — `fixtures.ts`의 뷰포트 중립 헬퍼(`openChannelNav`, `openMembersPanel`)로 사이드바·멤버 패널에 닿는다 |
| `*.mobile.spec.ts` | 모바일 전용 | 드로어·오버레이·하단 시트처럼 좁은 화면에서만 존재하는 UI |
| `*.desktop.spec.ts` | PC 전용 | 드래그·리사이즈처럼 넓은 화면에서만 존재하는 UI(모바일엔 그 UI 자체가 렌더되지 않는다) |

💡 "Desktop Chrome 프로젝트인데 왜 좁히면 모바일 레이아웃이 뜨지?"에 대한 답:
안 뜬다 — `desktop` 프로젝트는 뷰포트를 줄이는 게 아니라 애초에 1280px로 고정해서
띄운다. 레이아웃을 가르는 건 오직 실행 시점의 뷰포트 폭이다.

## 구성

| 파일 | 보는 것 |
| --- | --- |
| `auth.spec.ts` | 회원가입·로그인·로그아웃, 비로그인 접근 차단, 서버 생성/초대코드 참여 |
| `chat.spec.ts` | 메시지 송수신·영속·삭제, 서식 렌더, XSS 방어, 채널 격리 |
| `chat.mobile.spec.ts` | 채널 드로어(기본 닫힘·스크림 탭 닫기), 멤버 패널 오버레이, 터치 기기 삭제 버튼 항상 노출 — 모바일 전용 |
| `realtime.spec.ts` | 브라우저 2개로 WebSocket — 실시간 도착·삭제 전파·접속 인원·입력중 표시 |
| `admin.spec.ts` | 사이드바 색 테마, 서버·채널 이름 변경, 관심사 통계 다시 보기, 멤버 내보내기, 채널/모임 삭제·나가기, 게임 강제 종료 |
| `games.spec.ts` | 빙고 2인 한 판(턴 교대까지), 8개 전용 화면, 그림판 실시간 |
| `games.mobile.spec.ts` | 미니게임 PIP·그림판·함께 보기가 하단 시트로 뜨는지, 리사이즈 핸들이 없는지 — 모바일 전용 |
| `pip.desktop.spec.ts` | 미니게임 PIP·그림판 PIP의 헤더 드래그, 리사이즈 핸들 — PC 전용(모바일엔 이 UI 자체가 없다) |
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
- **`openChannelNav`/`openMembersPanel`은 `goto` 직후 바로 부르지 말 것.** 이 헬퍼는
  토글 버튼의 `isVisible()`/패널 존재 여부를 즉시(폴링 없이) 판정하는데, 앱이 아직
  하이드레이션되기 전에 부르면 "닫혀 있다"로 잘못 읽어 드로어/패널을 못 연 채로 넘어간다.
  그 뒤 `.sidebar-server-name` 같은 요소의 `toBeVisible()` 체크는 그래도 통과해버리는
  게 함정이다 — Playwright의 visible 판정은 CSS `display`/`opacity`만 보지 화면 밖으로
  트랜스폼된 것까지는 가리지 않는다. 실제 `click()`/`hover()`에서만 "element is outside
  of the viewport"로 뒤늦게 드러난다. `goto` 직후 `await expect(page.locator('.chat-sidebar')).toBeVisible()`
  처럼 셸이 그려지길 먼저 기다린 다음에 호출하면 안전하다(admin.spec.ts 전반에 이 패턴이 있다).
- **모바일에서 오버레이 두 개(드로어·멤버 패널)를 동시에 열어두지 말 것.** 둘 다
  `position: fixed; inset: 0` 스크림을 깔기 때문에, 하나가 열린 채로 다른 하나의 헤더
  토글을 누르면 스크림이 클릭을 가로챈다. 필요한 값을 먼저 확인한 뒤 `Esc`나 스크림
  탭으로 닫고 다음 오버레이를 열어라.

## 슬랙쪽 절반은 pytest에 있다

입장 링크를 **만드는** 쪽(서명 검증 → Bolt 디스패치 → DB 미러링 → 토큰 발급)은
`Backend/tests/test_slack_e2e.py`가 본다. 둘을 합쳐야 슬랙 버튼부터 웹 화면까지
한 줄이 된다.

```bash
cd ../Backend && .venv/bin/python -m pytest tests/test_slack_e2e.py
```

⚠️ pytest 세션을 두 개 동시에 돌리지 말 것 — 같은 테스트 DB(`bootcamp_test`)의
스키마를 테스트마다 갈아엎어서 서로를 깨뜨린다.
