import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { channelUrl, createServer, createUser, loginAs, skipTagOnboarding, uniqueId } from './fixtures'

/**
 * VITE_GIPHY_KEY/VITE_TENOR_KEY는 Vite가 브라우저 번들에만 주입하는 값이라
 * Playwright 테스트 프로세스(Node)의 process.env에는 안 잡힌다. GifPicker.tsx가
 * 보는 것과 같은 소스(Frontend/.env, .env.local)를 직접 읽어서 판단한다.
 */
function hasGifProviderKey(): boolean {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file)
    if (!existsSync(path)) continue
    const content = readFileSync(path, 'utf-8')
    if (/^VITE_(GIPHY|TENOR)_KEY=\S+/m.test(content)) return true
  }
  return false
}

/**
 * chat.spec.ts가 보지 않는 채팅 부가기능 — 이모지 피커, 리치텍스트 자동 임베드
 * (이미지·유튜브), 링크 프리뷰 카드, GIF 피커.
 *
 * 링크 프리뷰는 백엔드 services/link_preview/service.py가 pytest 0개라 이 e2e가
 * 유일한 안전망이다. https://example.com을 대상으로 쓴다 — IANA가 관리하는 테스트
 * 전용 도메인이라 안정적이고, <title>만 있고 OG 이미지가 없어(negative 필드 존재
 * 확인에도 좋다) 응답이 가볍고 빠르다.
 *
 * 이미지/유튜브 임베드는 richText.tsx의 순수 파싱 로직만 검증한다 — 실제 이미지가
 * 로드되는지는 보지 않는다(그건 브라우저 몫이고 외부망에 달렸다). <img src=...>가
 * 기대한 주소로 만들어지는지, 유튜브면 페이사드→iframe 전환이 되는지만 구조적으로
 * 확인해서 외부망 상태와 무관하게 안정적으로 돈다.
 *
 * GIF 피커만 예외적으로 실제 GIPHY API를 브라우저에서 직접 호출한다(설계상 백엔드를
 * 거치지 않음, GifPicker.tsx 주석 참고) — Frontend/.env에 VITE_GIPHY_KEY가 있으면 돈다.
 */

async function setup(context: BrowserContext, page: Page) {
  const user = await createUser('chatextra')
  const server = await createServer(user)
  await loginAs(context, user)
  await skipTagOnboarding(context, user.id, server.id)
  await page.goto(channelUrl(server))
  await expect(page.locator('.chat-editor-input')).toBeVisible()
  return { user, server }
}

test.describe('이모지 피커', () => {
  test('열기 → 고르기 → 입력창 삽입 → 전송되어 로그에 보인다', async ({ page, context }) => {
    await setup(context, page)

    await page.getByRole('button', { name: '이모지' }).click()
    await expect(page.locator('.emoji-popover')).toBeVisible()

    // 어떤 이모지든 첫 번째를 고른다 — 실제로 삽입된 문자를 나중에 그대로 검증에 쓴다
    const firstEmoji = page.locator('.emoji-cell').first()
    const char = (await firstEmoji.innerText()).trim()
    await firstEmoji.click()

    // 골랐다고 팝오버가 자동으로 닫히진 않는다(EmojiPicker.tsx — onPick은 onClose를 부르지 않음).
    // 입력창엔 그 문자가 바로 삽입돼야 한다.
    await expect(page.locator('.chat-editor-input')).toHaveValue(char)

    await page.getByRole('button', { name: '이모지' }).click() // 팝오버 닫기(토글)
    await page.getByRole('button', { name: '전송', exact: true }).click()

    await expect(page.locator('.chat-text', { hasText: char })).toBeVisible()
    await expect(page.locator('.chat-editor-input')).toHaveValue('')
  })
})

test.describe('리치텍스트 자동 임베드', () => {
  test('단독 이미지 URL은 이미지로 임베드된다', async ({ page, context }) => {
    await setup(context, page)
    // 실제로 로드 가능한 이미지일 필요는 없다 — richText.tsx는 확장자만 보고
    // <img> 태그를 만든다(isMediaUrl). 로드 성공 여부는 브라우저 몫이라 검증 대상이 아니다.
    const url = `https://example.com/e2e-${uniqueId()}.png`

    await page.locator('.chat-editor-input').fill(url)
    await page.getByRole('button', { name: '전송', exact: true }).click()

    const img = page.locator('.chat-media')
    await expect(img).toBeVisible()
    await expect(img).toHaveAttribute('src', url)
    // 이미지 링크로 감싸져야 새 탭에서 원본을 열 수 있다
    await expect(page.locator('.chat-media-link')).toHaveAttribute('href', url)
  })

  test('유튜브 링크는 페이사드로 임베드되고 클릭하면 iframe으로 바뀐다', async ({
    page,
    context,
  }) => {
    await setup(context, page)
    const videoId = 'dQw4w9WgXcQ' // 어떤 유효한 형식의 ID든 상관없다 — 파싱 로직만 본다
    const url = `https://www.youtube.com/watch?v=${videoId}`

    await page.locator('.chat-editor-input').fill(url)
    await page.getByRole('button', { name: '전송', exact: true }).click()

    // 처음엔 무거운 iframe 대신 썸네일 페이사드만 그린다(YouTubeEmbed.tsx)
    const facade = page.locator('.yt-facade')
    await expect(facade).toBeVisible()
    await expect(facade.locator('img')).toHaveAttribute(
      'src',
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    )
    await expect(page.locator('.yt-embed iframe')).toHaveCount(0)

    // 클릭하면 그제서야 iframe으로 교체된다
    await facade.click()
    const iframe = page.locator('.yt-embed iframe')
    await expect(iframe).toBeVisible()
    await expect(iframe).toHaveAttribute('src', new RegExp(`youtube-nocookie\\.com/embed/${videoId}`))
  })
})

test.describe('링크 프리뷰 카드', () => {
  test('URL을 보내면 OG 메타를 읽어 카드가 붙는다', async ({ page, context }) => {
    await setup(context, page)
    const tag = uniqueId()

    // 단독 URL이 아니라 앞에 말을 붙인다 — standalone이면 richText가 먼저 처리를
    // 시도하므로(이미지/유튜브 판정), 링크 프리뷰만 순수하게 보려면 문장 속 링크가 낫다.
    await page.locator('.chat-editor-input').fill(`참고 ${tag} https://example.com`)
    await page.getByRole('button', { name: '전송', exact: true }).click()

    const row = page.locator('.chat-row', { hasText: tag })
    await expect(row).toBeVisible()
    // 백엔드가 실제로 외부 URL을 받아와 파싱해야 하므로(services/link_preview) 넉넉히 기다린다.
    const card = row.locator('.lp-card')
    await expect(card).toBeVisible({ timeout: 20_000 })
    // example.com은 <title>만 있고 OG 이미지가 없다 — site_name도 없어 도메인으로 대체돼야 한다.
    await expect(card.locator('.lp-title')).toHaveText('Example Domain')
    await expect(card.locator('.lp-domain')).toHaveText('example.com')
    await expect(card).toHaveAttribute('href', 'https://example.com')
  })
})

test.describe('GIF 피커', () => {
  test('검색해서 고르면 첨부 미리보기가 뜨고 전송하면 이미지로 로그에 남는다', async ({
    page,
    context,
  }) => {
    // GIPHY/Tenor 키가 없으면 피커는 안내 문구만 보여주고 검색이 안 된다 — 그 경로는
    // 코드로 뻔히 보이므로(GifPicker.tsx의 !PROVIDER 분기) 여기서 굳이 다시 확인하지 않고,
    // 실제 검색·전송 흐름만 키가 있을 때 검증한다.
    test.skip(
      !hasGifProviderKey(),
      'VITE_GIPHY_KEY/VITE_TENOR_KEY가 설정돼 있지 않아 GIF 검색을 실행할 수 없다 — Frontend/.env 확인',
    )

    await setup(context, page)

    await page.getByRole('button', { name: 'GIF' }).click()
    await expect(page.locator('.gif-popover')).toBeVisible()

    // 검색어 없이 열면 인기 GIF를 바로 보여준다(디바운스 300ms + 외부 API 응답 대기)
    const cells = page.locator('.gif-cell')
    await expect(cells.first()).toBeVisible({ timeout: 15_000 })

    const firstImg = cells.first().locator('img')
    const previewSrc = await firstImg.getAttribute('src')
    await cells.first().click()

    // 바로 전송되지 않고 입력창 위에 대기(첨부) 상태로 먼저 뜬다
    const attach = page.locator('.chat-attach-gif')
    await expect(attach).toBeVisible()
    expect(await attach.getAttribute('src')).toBeTruthy()

    await page.getByRole('button', { name: '전송', exact: true }).click()

    // 전송되면 대기 미리보기는 사라지고, 로그에 이미지로 렌더된다(GIF URL 단독 메시지 → 임베드)
    await expect(attach).toHaveCount(0)
    const logged = page.locator('.chat-media')
    await expect(logged).toBeVisible()
    // 검색 결과 썸네일과 실제로 보낸 원본은 해상도가 다른 URL일 수 있어 내용 동일까진
    // 보장 못 하지만, 최소한 GIPHY/Tenor CDN 도메인이어야 한다(잘못된 URL을 보낸 게 아님).
    const loggedSrc = await logged.getAttribute('src')
    expect(loggedSrc).toMatch(/giphy\.com|tenor\.com/i)
    void previewSrc
  })
})
