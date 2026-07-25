import { defineConfig, devices } from '@playwright/test'

/**
 * 웹 E2E 설정.
 *
 * 전제: 백엔드가 http://localhost:8000 에 떠 있어야 한다 (`docker compose up -d`).
 * 목을 두지 않는 이유 — 이 테스트들이 잡으려는 버그가 정확히 프론트와 백엔드
 * 사이(인증 헤더, CORS, WebSocket 핸드셰이크, 응답 스키마)에 있기 때문이다.
 * 목을 끼우면 그 층이 통째로 검증 대상에서 빠진다.
 *
 * ⚠️ 개발 DB에 실제 계정·서버를 만든다. 이름이 겹치지 않도록 e2e/fixtures.ts가
 * 실행마다 유일한 이메일을 만든다 (`e2e-<시각>-<난수>@test.local`).
 */
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5173)
export const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8000'

export default defineConfig({
  testDir: './e2e',
  // 실시간(WebSocket) 테스트가 있어 넉넉히 준다 — 붙는 데 몇 초 걸릴 수 있다.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // 같은 백엔드·DB를 공유하므로 파일 간 병렬은 켜되, 워커를 과하게 늘리지 않는다.
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // 실패한 것만 남긴다 — 통과한 테스트의 영상까지 쌓으면 금방 수 GB가 된다.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // 백엔드가 떠 있는지 먼저 확인하고, 없으면 바로 알려준다 (전부 타임아웃으로
  // 죽은 뒤에 원인을 찾는 것보다 낫다).
  globalSetup: './e2e/global-setup.ts',

  webServer: {
    command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
