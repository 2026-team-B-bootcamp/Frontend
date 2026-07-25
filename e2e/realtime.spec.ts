import { expect, test, type Page } from '@playwright/test'
import {
  channelUrl,
  createServer,
  createUser,
  joinServer,
  messageInLog,
  openAs,
  sendMessage,
  uniqueId,
} from './fixtures'

/**
 * 실시간(WebSocket) — 브라우저 두 개를 띄워 진짜로 확인한다.
 *
 * 이 층은 단위 테스트로 대신할 수 없다. WS 핸드셰이크의 토큰 전달, 채널 구독,
 * Redis pub/sub을 거친 브로드캐스트, 프론트의 이벤트 반영이 전부 맞물려야만
 * "상대 화면에 뜬다"가 성립하기 때문이다. 한 군데만 어긋나도 여기서 걸린다.
 */

/** 같은 채널에 두 사람을 들여보낸다. */
async function twoPeopleInOneChannel(browser: Parameters<typeof openAs>[0]) {
  const host = await createUser('rt-host')
  const server = await createServer(host)
  const guest = await createUser('rt-guest')
  await joinServer(guest, server.inviteCode)

  const a = await openAs(browser, host, server)
  const b = await openAs(browser, guest, server)

  await a.page.goto(channelUrl(server))
  await b.page.goto(channelUrl(server))
  await expect(a.page.locator('.chat-editor-input')).toBeVisible()
  await expect(b.page.locator('.chat-editor-input')).toBeVisible()

  return { host, guest, server, a, b }
}

/** 접속 인원 표시가 최소 n명이 될 때까지 기다린다 — WS가 붙었다는 신호로도 쓴다. */
async function waitForOnline(page: Page, n: number) {
  await expect(page.locator('.online-count')).toContainText(new RegExp(`\\b[${n}-9]\\b`), {
    timeout: 20_000,
  })
}

test.describe('실시간 메시지', () => {
  test('한쪽이 보낸 메시지가 새로고침 없이 상대 화면에 뜬다', async ({ browser }) => {
    const { a, b } = await twoPeopleInOneChannel(browser)
    try {
      await waitForOnline(a.page, 2)

      const text = `실시간 ${uniqueId()}`
      await sendMessage(a.page, text)

      // 상대는 아무것도 하지 않았는데 떠야 한다.
      await expect(messageInLog(b.page, text)).toBeVisible({ timeout: 20_000 })
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })

  test('양방향으로 오간다', async ({ browser }) => {
    const { a, b } = await twoPeopleInOneChannel(browser)
    try {
      await waitForOnline(a.page, 2)

      const fromA = `A가보냄 ${uniqueId()}`
      await sendMessage(a.page, fromA)
      await expect(messageInLog(b.page, fromA)).toBeVisible({ timeout: 20_000 })

      const fromB = `B가보냄 ${uniqueId()}`
      await sendMessage(b.page, fromB)
      await expect(messageInLog(a.page, fromB)).toBeVisible({ timeout: 20_000 })

      // 둘 다 같은 대화를 보고 있어야 한다.
      await expect(messageInLog(a.page, fromA)).toBeVisible()
      await expect(messageInLog(b.page, fromB)).toBeVisible()
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })

  test('보낸 사람 화면에 같은 메시지가 두 번 뜨지 않는다', async ({ browser }) => {
    // 낙관적 렌더 + 브로드캐스트 수신이 겹치면 흔히 나는 버그다.
    const { a, b } = await twoPeopleInOneChannel(browser)
    try {
      await waitForOnline(a.page, 2)

      const text = `중복확인 ${uniqueId()}`
      await sendMessage(a.page, text)
      await expect(messageInLog(b.page, text)).toBeVisible({ timeout: 20_000 })

      // 브로드캐스트가 한 바퀴 돌 시간을 준 뒤에 센다.
      await a.page.waitForTimeout(1_500)
      await expect(messageInLog(a.page, text)).toHaveCount(1)
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })

  test('삭제도 실시간으로 상대 화면에서 사라진다', async ({ browser }) => {
    const { a, b } = await twoPeopleInOneChannel(browser)
    try {
      await waitForOnline(a.page, 2)

      const text = `지울실시간 ${uniqueId()}`
      await sendMessage(a.page, text)
      await expect(messageInLog(b.page, text)).toBeVisible({ timeout: 20_000 })

      const row = a.page.locator('.chat-row', { hasText: text }).first()
      await row.hover()
      await row.getByRole('button', { name: '메시지 삭제' }).click()
      await a.page.getByRole('button', { name: '삭제', exact: true }).click()

      await expect(messageInLog(b.page, text)).toHaveCount(0, { timeout: 20_000 })
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })

  test('다른 채널의 메시지는 넘어오지 않는다', async ({ browser }) => {
    const { server, a, b } = await twoPeopleInOneChannel(browser)
    try {
      await waitForOnline(a.page, 2)

      // B만 새 채널로 옮긴다.
      const name = `격리${uniqueId().slice(-5)}`
      await expect(b.page.locator('.sidebar-server-name')).toHaveText(server.name)
      await b.page.getByPlaceholder('+ 새 채널').fill(name)
      await b.page.getByPlaceholder('+ 새 채널').press('Enter')
      await expect(b.page.locator('.chat-channel-name')).toContainText(name)

      const text = `안넘어와야함 ${uniqueId()}`
      await sendMessage(a.page, text)

      // A의 채널 메시지가 B의 다른 채널로 새면 채널 구독이 깨진 것이다.
      await b.page.waitForTimeout(3_000)
      await expect(messageInLog(b.page, text)).toHaveCount(0)
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})

test.describe('접속 상태', () => {
  test('둘이 들어오면 접속 인원이 2명 이상으로 보인다', async ({ browser }) => {
    const { a, b } = await twoPeopleInOneChannel(browser)
    try {
      await waitForOnline(a.page, 2)
      await waitForOnline(b.page, 2)
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })

  test('한 명이 나가면 접속 인원이 줄어든다', async ({ browser }) => {
    const { a, b } = await twoPeopleInOneChannel(browser)
    try {
      await waitForOnline(a.page, 2)

      await b.context.close()

      // 연결이 끊기면 남은 사람 화면에서 1명으로 돌아와야 한다.
      await expect(a.page.locator('.online-count')).toContainText(/\b1\b/, { timeout: 25_000 })
    } finally {
      await a.context.close()
    }
  })

  test('입력 중이면 상대에게 표시된다', async ({ browser }) => {
    const { host, a, b } = await twoPeopleInOneChannel(browser)
    try {
      await waitForOnline(a.page, 2)

      await a.page.locator('.chat-editor-input').fill('무언가 적는 중')

      const bar = b.page.locator('.typing-bar')
      await expect(bar).toContainText('입력 중', { timeout: 20_000 })
      await expect(bar).toContainText(host.displayName)
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})
