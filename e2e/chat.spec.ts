import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import {
  channelUrl,
  createServer,
  createUser,
  loginAs,
  messageInLog,
  sendMessage,
  skipTagOnboarding,
  uniqueId,
} from './fixtures'

/** 채팅방 하나가 준비된 상태로 시작한다.
 *
 * 사이드바의 서버 이름이 뜰 때까지 기다린다 — 서버 목록은 비동기로 오고, 그전엔
 * 채널 추가 폼이 `!server` 가드에 걸려 조용히 아무 일도 하지 않는다. */
async function setup(context: BrowserContext, page: Page) {
  const user = await createUser('chat')
  const server = await createServer(user)
  await loginAs(context, user)
  await skipTagOnboarding(context, user.id, server.id)
  await page.goto(channelUrl(server))
  await expect(page.locator('.chat-editor-input')).toBeVisible()
  await expect(page.locator('.sidebar-server-name')).toHaveText(server.name)
  return { user, server }
}

/** 사이드바에서 새 채널을 만들고 그 채널로 들어간 것까지 확인한다. */
async function addChannel(page: Page, name: string) {
  const input = page.getByPlaceholder('+ 새 채널')
  await input.fill(name)
  await input.press('Enter')
  await expect(page.locator('.chat-channel-name')).toContainText(name)
}

test.describe('메시지 보내기', () => {
  test('보낸 메시지가 로그에 뜨고 입력창이 비워진다', async ({ page, context }) => {
    await setup(context, page)
    const text = `안녕하세요 ${uniqueId()}`

    await sendMessage(page, text)

    await expect(messageInLog(page, text)).toBeVisible()
    // 입력창이 안 비면 같은 말을 두 번 보내기 쉽다.
    await expect(page.locator('.chat-editor-input')).toHaveValue('')
  })

  test('새로고침해도 메시지가 남아 있다', async ({ page, context }) => {
    const { server } = await setup(context, page)
    const text = `저장확인 ${uniqueId()}`

    await sendMessage(page, text)
    await expect(messageInLog(page, text)).toBeVisible()

    await page.reload()
    await expect(messageInLog(page, text)).toBeVisible()
    // 다시 들어와도 마찬가지 — 서버에 실제로 저장됐다는 뜻이다.
    await page.goto(channelUrl(server))
    await expect(messageInLog(page, text)).toBeVisible()
  })

  test('여러 개를 보내면 보낸 순서대로 쌓인다', async ({ page, context }) => {
    await setup(context, page)
    const tag = uniqueId()
    const texts = [`첫번째 ${tag}`, `두번째 ${tag}`, `세번째 ${tag}`]

    for (const t of texts) {
      await sendMessage(page, t)
      await expect(messageInLog(page, t)).toBeVisible()
    }

    const shown = await page.locator('.chat-text', { hasText: tag }).allInnerTexts()
    expect(shown).toEqual(texts)
  })

  test('빈 메시지는 보내지지 않는다', async ({ page, context }) => {
    await setup(context, page)
    const before = await page.locator('.chat-text').count()

    await page.locator('.chat-editor-input').fill('   ')
    await page.getByRole('button', { name: '전송', exact: true }).click()

    // 공백만 보내지면 로그가 지저분해진다.
    await page.waitForTimeout(1_000)
    expect(await page.locator('.chat-text').count()).toBe(before)
  })

  test('Enter로 보내고 Shift+Enter로는 줄을 바꾼다', async ({ page, context }) => {
    await setup(context, page)
    const editor = page.locator('.chat-editor-input')

    // Shift+Enter는 전송이 아니라 개행이어야 한다.
    await editor.fill('첫 줄')
    await editor.press('Shift+Enter')
    await expect(editor).toHaveValue(/\n/)

    const text = `엔터전송 ${uniqueId()}`
    await editor.fill(text)
    await editor.press('Enter')
    await expect(messageInLog(page, text)).toBeVisible()
  })
})

test.describe('메시지 서식', () => {
  test('굵게·기울임·코드가 실제 태그로 그려진다', async ({ page, context }) => {
    await setup(context, page)
    const tag = uniqueId()

    await sendMessage(page, `**굵게${tag}** _기울임${tag}_ \`코드${tag}\``)

    const body = page.locator('.chat-text', { hasText: tag })
    await expect(body.locator('strong')).toHaveText(`굵게${tag}`)
    await expect(body.locator('em')).toHaveText(`기울임${tag}`)
    await expect(body.locator('code')).toHaveText(`코드${tag}`)
  })

  test('HTML을 적어도 태그로 실행되지 않는다 (XSS)', async ({ page, context }) => {
    await setup(context, page)
    const tag = uniqueId()
    // 스크립트가 돌면 이 변수가 채워진다 — 렌더가 안전하면 끝까지 비어 있어야 한다.
    await page.evaluate(() => {
      ;(window as unknown as { __xss?: string }).__xss = undefined
    })

    const payload = `<img src=x onerror="window.__xss='터짐'"> <b>굵게안됨</b> ${tag}`
    await sendMessage(page, payload)

    const body = page.locator('.chat-text', { hasText: tag })
    await expect(body).toBeVisible()
    // 글자 그대로 보여야 한다 — 태그로 해석되면 안 된다.
    await expect(body).toContainText('<b>굵게안됨</b>')
    expect(await body.locator('b').count()).toBe(0)
    expect(await body.locator('img').count()).toBe(0)
    expect(await page.evaluate(() => (window as unknown as { __xss?: string }).__xss)).toBeUndefined()
  })

  test('링크는 새 탭으로 열리게 안전 속성이 붙는다', async ({ page, context }) => {
    await setup(context, page)
    const tag = uniqueId()

    await sendMessage(page, `참고 https://example.com/${tag} 봐주세요`)

    const link = page.locator('.chat-text', { hasText: tag }).locator('a').first()
    await expect(link).toHaveAttribute('target', '_blank')
    // noopener가 없으면 열린 페이지가 window.opener로 이쪽을 조작할 수 있다.
    await expect(link).toHaveAttribute('rel', /noopener/)
  })
})

test.describe('메시지 삭제', () => {
  test('확인을 눌러야 지워지고, 지운 뒤엔 다시 보이지 않는다', async ({ page, context }) => {
    const { server } = await setup(context, page)
    const text = `지울메시지 ${uniqueId()}`

    await sendMessage(page, text)
    const row = page.locator('.chat-row', { hasText: text }).first()
    await expect(messageInLog(page, text)).toBeVisible()

    await row.hover()
    await row.getByRole('button', { name: '메시지 삭제' }).click()

    // 되돌릴 수 없는 동작이라 한 번 더 묻는다.
    await expect(page.getByRole('heading', { name: '메시지를 삭제할까요?' })).toBeVisible()
    await page.getByRole('button', { name: '삭제', exact: true }).click()

    await expect(messageInLog(page, text)).toHaveCount(0)
    // 새로고침해도 안 돌아와야 진짜 지워진 것이다.
    await page.goto(channelUrl(server))
    await expect(messageInLog(page, text)).toHaveCount(0)
  })

  test('취소를 누르면 메시지가 남는다', async ({ page, context }) => {
    await setup(context, page)
    const text = `안지울메시지 ${uniqueId()}`

    await sendMessage(page, text)
    const row = page.locator('.chat-row', { hasText: text }).first()
    await row.hover()
    await row.getByRole('button', { name: '메시지 삭제' }).click()
    await page.getByRole('button', { name: '취소', exact: true }).click()

    await expect(messageInLog(page, text)).toBeVisible()
  })

  test('남의 메시지에는 삭제 버튼이 없다', async ({ page, context, browser }) => {
    const owner = await createUser('delowner')
    const server = await createServer(owner)
    const other = await createUser('delother')
    const { joinServer } = await import('./fixtures')
    await joinServer(other, server.inviteCode)

    // 주인이 메시지를 하나 남긴다.
    const ownerCtx = await browser.newContext()
    await loginAs(ownerCtx, owner)
    await skipTagOnboarding(ownerCtx, owner.id, server.id)
    const ownerPage = await ownerCtx.newPage()
    await ownerPage.goto(channelUrl(server))
    const text = `주인메시지 ${uniqueId()}`
    await sendMessage(ownerPage, text)
    await expect(messageInLog(ownerPage, text)).toBeVisible()
    await ownerCtx.close()

    // 다른 사람이 보면 삭제 버튼이 없어야 한다.
    await loginAs(context, other)
    await skipTagOnboarding(context, other.id, server.id)
    await page.goto(channelUrl(server))
    const row = page.locator('.chat-row', { hasText: text }).first()
    await expect(row).toBeVisible()
    await row.hover()
    expect(await row.getByRole('button', { name: '메시지 삭제' }).count()).toBe(0)
  })
})

test.describe('채널', () => {
  test('채널을 새로 만들면 그 채널로 이동하고 로그가 비어 있다', async ({ page, context }) => {
    await setup(context, page)
    const name = `채널${uniqueId().slice(-5)}`

    await addChannel(page, name)
    await expect(page.locator('.chat-empty')).toBeVisible()
  })

  test('채널마다 메시지가 섞이지 않는다', async ({ page, context }) => {
    const { server } = await setup(context, page)
    const first = `첫채널글 ${uniqueId()}`
    await sendMessage(page, first)
    await expect(messageInLog(page, first)).toBeVisible()

    // 두 번째 채널을 만들어 들어간다.
    await addChannel(page, `채널${uniqueId().slice(-5)}`)

    // 앞 채널의 글이 여기 보이면 채널 분리가 깨진 것이다.
    await expect(messageInLog(page, first)).toHaveCount(0)

    const second = `둘째채널글 ${uniqueId()}`
    await sendMessage(page, second)
    await expect(messageInLog(page, second)).toBeVisible()

    // 원래 채널로 돌아가면 원래 글만 있어야 한다.
    await page.goto(channelUrl(server))
    await expect(messageInLog(page, first)).toBeVisible()
    await expect(messageInLog(page, second)).toHaveCount(0)
  })
})
