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

/** 채팅 로그에 그 문구가 뜰 때까지 기다린다. */
export function messageInLog(page: Page, text: string) {
  return page.locator('.chat-text', { hasText: text })
}
