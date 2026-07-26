import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { API_BASE } from '../playwright.config'

/**
 * E2E 공용 도구.
 *
 * 원칙: **검증하려는 것만 UI로 하고, 준비물은 API로 만든다.**
 * 예를 들어 "메시지 실시간 도착"을 보려고 회원가입·서버생성·채널이동을 매번 클릭으로
 * 하면 테스트가 느려지고, 정작 관심 없는 단계에서 깨져 원인을 가린다. 그래서
 * 가입/서버 준비는 API로 하고, 그 흐름 자체를 보는 auth.spec.ts만 UI로 클릭한다.
 */

export interface TestUser {
  email: string
  password: string
  displayName: string
  token: string
  id: number
}

export interface TestServer {
  id: number
  name: string
  inviteCode: string
  channelId: number
}

/** 개발 DB를 공유하므로 실행마다 겹치지 않는 값을 만든다. */
export function uniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  if (!res.ok) {
    throw new Error(`${opts.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export const apiRequest = api

/** API로 계정을 하나 만든다 (UI 회원가입 흐름 자체를 보는 테스트는 이걸 쓰지 않는다). */
export async function createUser(label = 'user'): Promise<TestUser> {
  const id = uniqueId()
  const email = `e2e-${label}-${id}@test.local`
  const password = 'e2e-pass-1234'
  const displayName = `E2E ${label} ${id.slice(-4)}`

  const { access_token } = await api<{ access_token: string }>('/auth/signup', {
    method: 'POST',
    body: { email, password, display_name: displayName },
  })
  const me = await api<{ id: number }>('/users/me', { token: access_token })

  return { email, password, displayName, token: access_token, id: me.id }
}

/** 서버 + 첫 채널까지 준비된 상태를 만든다. */
export async function createServer(user: TestUser, name?: string): Promise<TestServer> {
  const server = await api<{ id: number; name: string; invite_code: string }>('/servers', {
    method: 'POST',
    body: { name: name ?? `E2E 모임 ${uniqueId()}` },
    token: user.token,
  })
  const channels = await api<{ id: number }[]>(`/servers/${server.id}/channels`, {
    token: user.token,
  })
  expect(channels.length, '서버를 만들면 기본 채널이 하나 생겨야 한다').toBeGreaterThan(0)

  return {
    id: server.id,
    name: server.name,
    inviteCode: server.invite_code,
    channelId: channels[0].id,
  }
}

export async function joinServer(user: TestUser, inviteCode: string): Promise<void> {
  await api('/servers/join', {
    method: 'POST',
    body: { invite_code: inviteCode },
    token: user.token,
  })
}

/**
 * 로그인된 상태로 페이지를 연다.
 *
 * 앱은 localStorage의 access_token만 보고 로그인 여부를 판단하므로(client.ts),
 * 토큰을 미리 심어두면 UI 로그인을 건너뛸 수 있다. 첫 스크립트가 돌기 전에 심어야
 * AuthProvider의 첫 렌더가 로그인 상태로 시작한다.
 */
export async function loginAs(context: BrowserContext, user: TestUser): Promise<void> {
  await context.addInitScript((token) => {
    window.localStorage.setItem('access_token', token)
  }, user.token)
}

/** 태그 온보딩 모달을 미리 넘긴 것으로 표시한다 — 이 모달을 보려는 테스트가 아니면 방해물이다. */
export async function skipTagOnboarding(
  context: BrowserContext,
  userId: number,
  serverId: number,
): Promise<void> {
  await context.addInitScript(
    ([uid, sid]) => {
      window.localStorage.setItem(`tag_setup_skipped_${uid}_${sid}`, '1')
    },
    [userId, serverId],
  )
}

/** 로그인 + 온보딩 스킵까지 끝난 새 브라우저 컨텍스트. 두 사람이 필요한 테스트에 쓴다. */
export async function openAs(
  browser: Browser,
  user: TestUser,
  server: TestServer,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext()
  await loginAs(context, user)
  await skipTagOnboarding(context, user.id, server.id)
  const page = await context.newPage()
  return { context, page }
}

export function channelUrl(server: TestServer): string {
  return `/servers/${server.id}/channels/${server.channelId}`
}

/** 채팅 입력창에 치고 보낸다. */
export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.locator('.chat-editor-input').fill(text)
  await page.getByRole('button', { name: '전송', exact: true }).click()
}

/* ── 뷰포트 중립 헬퍼 ───────────────────────────────────────────────────────
 * 같은 spec을 데스크톱과 모바일 두 프로젝트에서 모두 돌리기 때문에, 화면 폭에
 * 따라 UI가 갈리는 자리는 아래 헬퍼로만 접근한다. 스펙 안에 "이 폭에서는 패널이
 * 열려 있다" 같은 가정을 박아두면 다른 프로젝트에서 그대로 깨진다.
 *
 * 실제로 레이아웃을 가르는 것은 순전히 화면 폭이다 — useMediaQuery.ts는
 * matchMedia만 보고 UA는 보지 않는다. 그래서 폭으로 판정한다.
 */

/** 채팅 셸이 모바일(드로어) 레이아웃인지 — useMediaQuery.ts의 MOBILE_QUERY와 같은 값. */
export const MOBILE_MAX_WIDTH = 720
/** 멤버 패널이 오버레이로 바뀌는 폭 — useMediaQuery.ts의 PANEL_OVERLAY_QUERY와 같은 값. */
export const PANEL_OVERLAY_MAX_WIDTH = 900

export function isMobileLayout(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) <= MOBILE_MAX_WIDTH
}

export function isPanelOverlay(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) <= PANEL_OVERLAY_MAX_WIDTH
}

/**
 * 채널 사이드바에 닿을 수 있는 상태로 만든다.
 * 넓은 화면에선 이미 늘 보이고, 좁은 화면에선 드로어를 열어야 한다.
 *
 * ⚠️ 첫 줄의 대기가 핵심이다. `isVisible()`은 폴링 없이 그 순간을 판정하므로,
 * goto 직후 앱이 그려지기 전에 부르면 토글을 "없다"로 읽고 드로어를 안 연다.
 * 게다가 그 뒤 `.sidebar-server-name`의 toBeVisible()은 통과해버린다 —
 * Playwright의 가시성 판정은 display/opacity만 보고 화면 밖으로 밀어낸
 * transform은 보지 않기 때문이다. 그래서 실패가 여기서 안 나고 한참 뒤
 * click()/hover()에서 "outside of viewport"로 터진다.
 */
export async function openChannelNav(page: Page): Promise<void> {
  // 채팅 셸이 DOM에 올라올 때까지 — 이게 하이드레이션 완료 신호다.
  await expect(page.locator('.chat-sidebar')).toBeAttached()

  const toggle = page.getByRole('button', { name: '채널 목록 열기' })
  // 이 버튼은 720px 이하에서만 display:inline-flex 다 (chat.css:20-23, :1501). 즉 보이면 모바일이다.
  if (await toggle.isVisible()) {
    await toggle.click()
    await expect(page.locator('.nav-drawer.open')).toBeVisible()
  }
  await expect(page.locator('.sidebar-server-name')).toBeVisible()
}

/**
 * 멤버 패널을 열린 상태로 만든다.
 * 900px 초과에선 기본으로 열려 있고, 그 이하에선 닫힌 채 시작한다(ChatPage.tsx:72-74).
 *
 * ⚠️ openChannelNav와 같은 이유로, 헤더가 그려지기 전에 `.side-panel`을 세면
 * 0이 나와 "닫혀 있다"로 오판한다. 토글 버튼을 먼저 기다린다.
 */
export async function openMembersPanel(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: '멤버', exact: true })
  await expect(toggle).toBeVisible()

  if ((await page.locator('.side-panel').count()) === 0) {
    await toggle.click()
  }
  await expect(page.locator('.side-panel')).toBeVisible()
}

/**
 * 좁은 화면에서 드로어와 멤버 패널을 동시에 열어두면 안 된다.
 *
 * 둘 다 `position:fixed; inset:0` 스크림을 깔기 때문에, 나중에 연 쪽의 스크림이
 * 헤더 버튼 클릭을 가로챈다. 드로어(z-index 60) > 멤버 패널(50) > 스크림(45).
 * Esc 리스너는 `panelIsOverlay`일 때만 붙으므로(ChatPage.tsx:172) 좁은 화면에서만 의미가 있다.
 */
export async function closeMembersPanelIfOverlay(page: Page): Promise<void> {
  if (!isPanelOverlay(page)) return
  if ((await page.locator('.side-panel').count()) === 0) return
  await page.keyboard.press('Escape')
  await expect(page.locator('.side-panel')).toHaveCount(0)
}

/** 채팅 로그에 그 문구가 뜰 때까지 기다린다. */
export function messageInLog(page: Page, text: string) {
  return page.locator('.chat-text', { hasText: text })
}
