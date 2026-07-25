import { expect, test } from '@playwright/test'
import {
  channelUrl,
  createServer,
  createUser,
  joinServer,
  openAs,
  uniqueId,
} from './fixtures'

/**
 * 슬랙 입장 링크가 웹에 도착한 뒤 — 핸드오프의 **웹쪽 절반**.
 *
 * 백엔드가 링크를 제대로 만드는지는 pytest(tests/test_slack_e2e.py)가 본다.
 * 여기서는 그 링크를 실제 브라우저에 붙여넣었을 때 벌어지는 일을 본다:
 * 로그인된 채로 목적지에 떨어지는가, 토큰이 주소창에 남지 않는가, 이 브라우저를
 * 쓰던 앞사람 흔적이 남지 않는가.
 *
 * 링크의 토큰은 일반 로그인 토큰과 같은 형식이라(app/slack/link_token.py),
 * 여기서는 API로 받은 토큰을 그대로 `?t=` 에 실어 같은 경로를 태운다.
 */

function entryLink(serverId: number, channelId: number, feature: string, token: string) {
  return `/servers/${serverId}/channels/${channelId}/play/${feature}?t=${encodeURIComponent(token)}`
}

test.describe('입장 링크로 들어오기', () => {
  test('로그인한 적 없는 브라우저인데 바로 그 게임 화면에 떨어진다', async ({ browser }) => {
    const user = await createUser('slack-entry')
    const server = await createServer(user)

    // 토큰을 심지 않은 완전히 새 브라우저 — 슬랙에서 링크를 처음 누른 상황.
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.goto(entryLink(server.id, server.channelId, 'bingo', user.token))

      // 로그인 화면으로 튕기지 않고 목적지에 있어야 한다.
      await expect(page.locator('.feature-page-title')).toContainText('빙고')
      await expect(page).not.toHaveURL(/\/login/)
      // 실제로 그 계정으로 로그인된 상태여야 한다.
      expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBe(user.token)
    } finally {
      await context.close()
    }
  })

  test('토큰이 주소창에서 즉시 지워진다', async ({ browser }) => {
    const user = await createUser('slack-strip')
    const server = await createServer(user)
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.goto(entryLink(server.id, server.channelId, 'draw', user.token))
      await expect(page.locator('.feature-page-title')).toBeVisible()

      // 주소창·브라우저 기록·공유 링크에 로그인 토큰이 남으면 그대로 계정 탈취다.
      await expect(page).not.toHaveURL(/[?&]t=/)
      expect(page.url()).not.toContain(user.token)
    } finally {
      await context.close()
    }
  })

  test('모든 기능의 링크가 살아 있다', async ({ browser }) => {
    // 슬랙 카탈로그(features.py)에 있는 것들. 하나라도 죽으면 그 버튼은 빈 화면으로 간다.
    const features = ['bingo', 'wordchain', 'omok', 'tictactoe', 'balance', 'chosung', 'watch', 'draw']
    const user = await createUser('slack-all')
    const server = await createServer(user)

    for (const feature of features) {
      const context = await browser.newContext()
      const page = await context.newPage()
      try {
        await page.goto(entryLink(server.id, server.channelId, feature, user.token))
        await expect(
          page.locator('.feature-page-title'),
          `${feature} 링크가 화면을 열지 못했다`,
        ).toBeVisible()
        await expect(page).not.toHaveURL(/\/login/)
      } finally {
        await context.close()
      }
    }
  })

  test('앞사람이 쓰던 브라우저여도 앞사람 이름이 남지 않는다', async ({ browser }) => {
    const previous = await createUser('slack-prev')
    const server = await createServer(previous)
    const next = await createUser('slack-next')
    await joinServer(next, server.inviteCode)

    const context = await browser.newContext()
    // 앞사람이 쓰던 흔적을 남겨둔다 (공용 노트북·시연 상황).
    await context.addInitScript(
      ([token, name]) => {
        window.localStorage.setItem('access_token', token)
        window.localStorage.setItem('display_name', name)
        window.localStorage.setItem('avatar_url', 'https://example.com/old.png')
      },
      [previous.token, previous.displayName],
    )
    const page = await context.newPage()
    try {
      // 다음 사람이 자기 슬랙 링크로 들어온다.
      await page.goto(entryLink(server.id, server.channelId, 'bingo', next.token))
      await expect(page.locator('.feature-page-title')).toBeVisible()

      // 신원이 새 사람으로 갈아끼워져야 한다.
      expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBe(next.token)
      expect(await page.evaluate(() => localStorage.getItem('avatar_url'))).toBeNull()
      const shownName = await page.evaluate(() => localStorage.getItem('display_name'))
      expect(shownName).not.toBe(previous.displayName)
    } finally {
      await context.close()
    }
  })

  test('만료·위조된 링크는 로그인 화면으로 보낸다', async ({ browser }) => {
    const user = await createUser('slack-bad')
    const server = await createServer(user)
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      // 15분이 지나 만료된 링크를 뒤늦게 누른 경우 — 흰 화면이 아니라 로그인이어야 한다.
      await page.goto(entryLink(server.id, server.channelId, 'bingo', 'expired.or.forged'))
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 })
    } finally {
      await context.close()
    }
  })

  test('링크로 들어온 사람도 채팅방으로 건너갈 수 있다', async ({ browser }) => {
    const user = await createUser('slack-toschat')
    const server = await createServer(user)
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.goto(entryLink(server.id, server.channelId, 'wordchain', user.token))
      await page.getByRole('link', { name: /채팅으로/ }).click()

      await expect(page).toHaveURL(new RegExp(`${channelUrl(server)}$`))
      await expect(page.locator('.chat-editor-input')).toBeVisible()
    } finally {
      await context.close()
    }
  })
})

test.describe('슬랙에서 온 사람과 웹 사람이 같은 판에서 만난다', () => {
  test('링크로 들어온 사람이 웹 사용자의 게임에 그대로 합류한다', async ({ browser }) => {
    // 이 봇의 존재 이유 — 슬랙에서 누른 사람과 웹에서 놀던 사람이 한 판에 있어야 한다.
    const webUser = await createUser('web-side')
    const server = await createServer(webUser)
    const slackUser = await createUser('slack-side')
    await joinServer(slackUser, server.inviteCode)

    const web = await openAs(browser, webUser, server)
    // 슬랙에서 온 사람은 토큰이 없는 새 브라우저다.
    const slackCtx = await browser.newContext()
    const slackPage = await slackCtx.newPage()

    try {
      // ① 웹 사용자가 채팅방의 미니게임 창에서 빙고를 연다.
      await web.page.goto(channelUrl(server))
      await web.page.getByRole('button', { name: '미니게임', exact: false }).click()
      await expect(web.page.locator('.game-pip')).toBeVisible()
      await web.page.locator('.game-pip').getByText('빙고', { exact: true }).click()
      await web.page.getByRole('button', { name: '게임 열기' }).click()
      await expect(web.page.getByText('대기 중')).toBeVisible({ timeout: 20_000 })

      // ② 슬랙 링크로 들어온 사람이 같은 채널·같은 게임 화면에 떨어진다.
      await slackPage.goto(entryLink(server.id, server.channelId, 'bingo', slackUser.token))
      await expect(slackPage.locator('.feature-page-title')).toContainText('빙고')

      // ③ 이미 열려 있는 판(로비)이 보여야 한다 — 새 판을 따로 만들면 안 된다.
      await expect(slackPage.getByText('대기 중')).toBeVisible({ timeout: 20_000 })
      await slackPage.getByRole('button', { name: '게임 참여' }).click()

      // ④ 서로의 이름이 상대 화면의 참가자 목록에 뜬다 = 같은 판이다.
      await expect(web.page.locator('.bingo-lobby-players')).toContainText(
        slackUser.displayName,
        { timeout: 20_000 },
      )
      await expect(slackPage.locator('.bingo-lobby-players')).toContainText(webUser.displayName)

      // ⑤ 웹 사용자가 시작하면 슬랙 쪽 화면에도 판이 깔린다.
      await web.page.getByRole('button', { name: /게임 시작 \(2명\)/ }).click()
      await expect(slackPage.locator('.bingo-cell')).toHaveCount(25, { timeout: 20_000 })
    } finally {
      await web.context.close()
      await slackCtx.close()
    }
  })

  test('링크로 들어온 사람이 채팅에 남긴 말이 웹 사용자에게 보인다', async ({ browser }) => {
    const webUser = await createUser('web-chat')
    const server = await createServer(webUser)
    const slackUser = await createUser('slack-chat')
    await joinServer(slackUser, server.inviteCode)

    const web = await openAs(browser, webUser, server)
    const slackCtx = await browser.newContext()
    await slackCtx.addInitScript(
      ([uid, sid]) => {
        window.localStorage.setItem(`tag_setup_skipped_${uid}_${sid}`, '1')
      },
      [slackUser.id, server.id],
    )
    const slackPage = await slackCtx.newPage()

    try {
      await web.page.goto(channelUrl(server))
      await expect(web.page.locator('.chat-editor-input')).toBeVisible()

      // 링크로 들어와 채팅방까지 건너간다.
      await slackPage.goto(entryLink(server.id, server.channelId, 'bingo', slackUser.token))
      await slackPage.getByRole('link', { name: /채팅으로/ }).click()
      await expect(slackPage.locator('.chat-editor-input')).toBeVisible()

      const text = `슬랙에서왔어요 ${uniqueId()}`
      await slackPage.locator('.chat-editor-input').fill(text)
      await slackPage.getByRole('button', { name: '전송', exact: true }).click()

      // 웹 사용자 화면에 실시간으로 떠야 한다 — 두 입구가 같은 채널이라는 최종 확인.
      await expect(web.page.locator('.chat-text', { hasText: text })).toBeVisible({
        timeout: 20_000,
      })
      await expect(
        web.page.locator('.chat-row', { hasText: text }).first(),
      ).toContainText(slackUser.displayName)
    } finally {
      await web.context.close()
      await slackCtx.close()
    }
  })
})
