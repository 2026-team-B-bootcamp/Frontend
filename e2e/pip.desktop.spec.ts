/**
 * 떠다니는 PIP 창(미니게임·그림판·함께 보기)의 드래그·리사이즈 — PC 전용.
 *
 * GamePip.tsx:134-143이 보여주듯 모바일에선 이 UI 자체가 렌더되지 않는다
 * (`isMobile`이면 리사이즈 핸들을 그리지 않고 헤더 드래그도 끈다 — 하단 시트로
 * 뜨기 때문에 옮기거나 크기를 바꿀 이유가 없다). 그래서 이 스펙은 desktop
 * 프로젝트에서만 뜻이 있고, 파일명이 `*.desktop.spec.ts`라 mobile 프로젝트는
 * playwright.config.ts의 testIgnore로 아예 건너뛴다.
 *
 * 세 PIP(GamePip·Whiteboard·WatchTogether)가 usePipDrag를 공유하고 리사이즈
 * 핸들 클래스(`.game-pip-resize`)도 재사용하므로, 동작 검증은 미니게임 PIP에서
 * 자세히 하고 그림판에서 한 번 더 최소 확인한다.
 */
import { expect, test } from '@playwright/test'
import { channelUrl, createServer, createUser, openAs } from './fixtures'

test.describe('미니게임 PIP', () => {
  test('헤더를 잡고 끌면 창이 옮겨간다', async ({ browser }) => {
    const host = await createUser('pip-drag')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await page.getByRole('button', { name: /미니게임/ }).click()
      const pip = page.locator('.game-pip')
      await expect(pip).toBeVisible()

      const before = (await pip.boundingBox())!
      const head = page.locator('.game-pip-head')
      const headBox = (await head.boundingBox())!

      await page.mouse.move(headBox.x + headBox.width / 2, headBox.y + headBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(headBox.x - 80, headBox.y - 60, { steps: 10 })
      await page.mouse.up()

      const after = (await pip.boundingBox())!
      // 정확한 픽셀보다는 "실제로 움직였는가"가 중요하다 — 왼쪽 위로 끌었으니 둘 다 줄어야 한다.
      expect(after.x).toBeLessThan(before.x - 20)
      expect(after.y).toBeLessThan(before.y - 20)
    } finally {
      await context.close()
    }
  })

  test('왼쪽 위 리사이즈 핸들로 크기를 키울 수 있다', async ({ browser }) => {
    const host = await createUser('pip-resize')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await page.getByRole('button', { name: /미니게임/ }).click()
      const pip = page.locator('.game-pip')
      await expect(pip).toBeVisible()

      const handle = page.locator('.game-pip-resize')
      await expect(handle).toBeVisible()

      const before = (await pip.boundingBox())!
      const handleBox = (await handle.boundingBox())!

      // 앵커는 오른쪽 아래라, 핸들을 왼쪽 위로 끌수록 창이 커진다(GamePip.tsx의 onResizeMove).
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(handleBox.x - 60, handleBox.y - 60, { steps: 10 })
      await page.mouse.up()

      const after = (await pip.boundingBox())!
      expect(after.width).toBeGreaterThan(before.width + 20)
      expect(after.height).toBeGreaterThan(before.height + 20)
    } finally {
      await context.close()
    }
  })
})

test.describe('그림판 PIP', () => {
  test('헤더 드래그와 리사이즈 핸들이 미니게임 PIP와 같은 방식으로 동작한다', async ({
    browser,
  }) => {
    const host = await createUser('draw-pip')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await page.getByRole('button', { name: '공유 그림판' }).click()
      const pip = page.locator('.wb-pip')
      await expect(pip).toBeVisible()

      // 리사이즈 핸들이 존재하고 실제로 폭을 키운다
      const before = (await pip.boundingBox())!
      const handle = page.locator('.game-pip-resize')
      const handleBox = (await handle.boundingBox())!
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(handleBox.x - 60, handleBox.y, { steps: 10 })
      await page.mouse.up()
      const afterResize = (await pip.boundingBox())!
      expect(afterResize.width).toBeGreaterThan(before.width + 20)

      // 헤더를 잡고 끌면 창이 옮겨간다
      const head = page.locator('.wb-head')
      const headBox = (await head.boundingBox())!
      await page.mouse.move(headBox.x + headBox.width / 2, headBox.y + headBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(headBox.x - 80, headBox.y - 60, { steps: 10 })
      await page.mouse.up()
      const afterDrag = (await pip.boundingBox())!
      expect(afterDrag.x).toBeLessThan(afterResize.x - 20)
      expect(afterDrag.y).toBeLessThan(afterResize.y - 20)
    } finally {
      await context.close()
    }
  })
})
