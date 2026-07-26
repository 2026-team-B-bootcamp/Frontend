/**
 * 모바일 레이아웃(≤720px) 자체가 검증 대상인 스펙.
 *
 * `*.spec.ts`는 데스크톱·모바일 두 프로젝트에서 다 돌지만, 여기 있는 것들은
 * "좁은 화면에서만 존재하는 UI"(드로어·오버레이·시트)라 mobile 프로젝트에서만 뜻이 있다.
 * 파일명이 `*.mobile.spec.ts`라 playwright.config.ts가 desktop 프로젝트에서는 아예 건너뛴다.
 *
 * 뷰포트 폭은 여기서 하드코딩하지 않는다 — mobile 프로젝트(Pixel 5, 393px)가 이미 준다.
 * 예전엔 games.spec.ts 안에 `test.use({ viewport: { width: 390, ... } })`로 폭을
 * 직접 지정한 '모바일 폭' describe가 있었는데, mobile 프로젝트가 생기면서 중복이 됐다.
 * 그 블록의 케이스를 이 파일로 옮기고 하드코딩만 지웠다.
 */
import { expect, test } from '@playwright/test'
import {
  channelUrl,
  createServer,
  createUser,
  openAs,
  uniqueId,
} from './fixtures'

test.describe('채널 드로어', () => {
  test('좁은 화면에서 드로어로 채널을 옮길 수 있다', async ({ browser }) => {
    const host = await createUser('mobile')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await expect(page.locator('.chat-editor-input')).toBeVisible()

      // 좁은 화면에서는 사이드바가 드로어로 숨는다.
      await page.getByRole('button', { name: '채널 목록 열기' }).click()
      await expect(page.locator('.nav-drawer.open')).toBeVisible()

      // 서버 목록이 도착할 때까지 기다린다 — 그전에 Enter를 치면 채널 추가 폼이
      // `!server` 가드에 걸려 아무 일도 하지 않고, 부하가 걸린 실행에서만 간헐적으로 터진다.
      await expect(page.locator('.sidebar-server-name')).toHaveText(server.name)

      const name = `모바일${uniqueId().slice(-4)}`
      await page.getByPlaceholder('+ 새 채널').fill(name)
      await page.getByPlaceholder('+ 새 채널').press('Enter')

      await expect(page.locator('.chat-channel-name')).toContainText(name)
      // 채널을 고르면 드로어는 닫혀 채팅으로 돌아와야 한다.
      await expect(page.locator('.nav-drawer.open')).toHaveCount(0)
    } finally {
      await context.close()
    }
  })

  test('기본은 닫혀 있고, 뒤의 스크림을 탭하면 닫힌다', async ({ browser }) => {
    const host = await createUser('drawer-scrim')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await expect(page.locator('.chat-editor-input')).toBeVisible()

      // 첫 방문엔 드로어가 닫혀 있다 (nav-drawer는 항상 DOM에 있지만 open 클래스가 없다)
      await expect(page.locator('.nav-drawer.open')).toHaveCount(0)

      await page.getByRole('button', { name: '채널 목록 열기' }).click()
      await expect(page.locator('.nav-drawer.open')).toBeVisible()
      await expect(page.locator('.nav-scrim')).toBeVisible()

      // 드로어 뒤 어둡게 깔리는 면을 탭하면 채널을 고르지 않아도 닫힌다.
      // 스크림은 전체 화면(inset:0)이지만 z-index는 드로어보다 낮아(nav.css) 기본 클릭
      // 좌표(요소 중앙)가 드로어 폭 안에 들어가면 드로어 쪽이 가로챈다 — 드로어 밖(오른쪽)을 짚는다.
      const viewport = page.viewportSize()!
      await page.locator('.nav-scrim').click({ position: { x: viewport.width - 10, y: 10 } })
      await expect(page.locator('.nav-drawer.open')).toHaveCount(0)
      await expect(page.locator('.nav-scrim')).toHaveCount(0)
    } finally {
      await context.close()
    }
  })
})

test.describe('멤버 패널 오버레이', () => {
  test('기본은 닫혀 있고, 헤더 버튼으로 열면 스크림과 함께 뜬다', async ({ browser }) => {
    const host = await createUser('panel-overlay')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await expect(page.locator('.chat-editor-input')).toBeVisible()

      // 900px 이하에서는 멤버 패널이 채팅을 가리므로 기본은 닫혀 있다 (ChatPage.tsx)
      await expect(page.locator('.side-panel')).toHaveCount(0)

      await page.getByRole('button', { name: '멤버', exact: true }).click()
      await expect(page.locator('.side-panel')).toBeVisible()
      // 오버레이라 뒤를 탭해 닫을 수 있어야 한다 — 좁은 화면에서만 뜨는 면
      await expect(page.locator('.side-scrim')).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('스크림을 탭하면 멤버 패널이 닫힌다', async ({ browser }) => {
    const host = await createUser('panel-scrim')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await page.getByRole('button', { name: '멤버', exact: true }).click()
      await expect(page.locator('.side-panel')).toBeVisible()

      // 패널은 오른쪽에서 덮는 오버레이(panel.css: right:0, min(84vw,340px))라, 스크림의
      // 기본 클릭 좌표(요소 중앙)가 패널 폭 안에 들어가 패널 쪽이 가로챈다 — 왼쪽을 짚는다.
      await page.locator('.side-scrim').click({ position: { x: 10, y: 10 } })
      await expect(page.locator('.side-panel')).toHaveCount(0)
      await expect(page.locator('.side-scrim')).toHaveCount(0)
    } finally {
      await context.close()
    }
  })
})

test.describe('삭제 버튼 항상 노출', () => {
  test('터치 기기에서는 hover 없이도 내 메시지 삭제 버튼이 보인다', async ({ browser }) => {
    const host = await createUser('delete-visible')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await page.locator('.chat-editor-input').fill('모바일에서 지울 메시지')
      await page.getByRole('button', { name: '전송', exact: true }).click()

      const deleteBtn = page.locator('.chat-delete').last()
      // hover를 흉내내지 않는다 — chat.css의 `@media (hover: none)` 규칙이 터치 기기에서
      // 삭제 버튼을 늘 반투명하게 노출해야 하고, 그게 실제로 먹는지가 이 테스트의 요점이다.
      await expect(deleteBtn).toBeVisible()
      await expect(deleteBtn).toHaveCSS('opacity', '0.5')
    } finally {
      await context.close()
    }
  })
})
