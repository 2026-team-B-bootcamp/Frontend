/**
 * 미니게임 PIP·그림판·함께 보기가 모바일에서 하단 시트로 바뀌는지 — 모바일 전용.
 *
 * PC(pip.desktop.spec.ts)와 정반대를 확인한다: GamePip.tsx:134-143이 `isMobile`이면
 * 리사이즈 핸들을 아예 그리지 않고 헤더 드래그(dragControls.start)도 걸지 않으므로,
 * 여기서는 "핸들이 없다 / 옮겨지지 않는다"와 "화면 폭을 꽉 채우는 시트 모양"을 확인한다.
 * (games.css:876-898의 `@media (max-width: 720px)` 규칙과 짝이다.)
 */
import { expect, test } from '@playwright/test'
import { channelUrl, createServer, createUser, openAs } from './fixtures'

test.describe('미니게임 PIP', () => {
  test('하단 시트로 뜨고 리사이즈 핸들이 없다', async ({ browser }) => {
    const host = await createUser('game-sheet')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await page.getByRole('button', { name: /미니게임/ }).click()
      const pip = page.locator('.game-pip')
      await expect(pip).toBeVisible()

      // PC와 반대: 리사이즈 핸들 자체가 렌더되지 않는다 (숨김이 아니라 DOM에 없음)
      await expect(page.locator('.game-pip-resize')).toHaveCount(0)

      // 좌우를 꽉 채우는 시트다 (games.css: left:8px; right:8px)
      const viewport = page.viewportSize()!
      const box = (await pip.boundingBox())!
      expect(box.x).toBeLessThan(20)
      expect(box.width).toBeGreaterThan(viewport.width - 40)

      // 헤더를 끌어도 옮겨지지 않는다 — dragListener가 꺼져 있다
      const head = page.locator('.game-pip-head')
      const headBox = (await head.boundingBox())!
      await page.mouse.move(headBox.x + headBox.width / 2, headBox.y + headBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(headBox.x - 80, headBox.y - 60, { steps: 10 })
      await page.mouse.up()
      const after = (await pip.boundingBox())!
      expect(Math.abs(after.x - box.x)).toBeLessThan(5)
      expect(Math.abs(after.y - box.y)).toBeLessThan(5)
    } finally {
      await context.close()
    }
  })
})

test.describe('그림판', () => {
  test('하단 시트로 뜨지만 그리기는 그대로 동작한다', async ({ browser }) => {
    const host = await createUser('draw-sheet')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await page.getByRole('button', { name: '공유 그림판' }).click()
      const pip = page.locator('.wb-pip')
      await expect(pip).toBeVisible()
      await expect(page.locator('.game-pip-resize')).toHaveCount(0)

      const viewport = page.viewportSize()!
      const box = (await pip.boundingBox())!
      expect(box.x).toBeLessThan(20)
      expect(box.width).toBeGreaterThan(viewport.width - 40)

      const canvas = page.locator('.wb-canvas')
      await expect(canvas).toBeVisible()
      const blank = await canvas.screenshot()

      const canvasBox = (await canvas.boundingBox())!
      await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3)
      await page.mouse.down()
      await page.mouse.move(canvasBox.x + canvasBox.width * 0.7, canvasBox.y + canvasBox.height * 0.6, {
        steps: 12,
      })
      await page.mouse.up()

      await expect(async () => {
        const now = await canvas.screenshot()
        expect(Buffer.compare(blank, now)).not.toBe(0)
      }).toPass({ timeout: 10_000 })
    } finally {
      await context.close()
    }
  })
})

test.describe('함께 보기', () => {
  test('하단 시트로 뜬다', async ({ browser }) => {
    const host = await createUser('watch-sheet')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      await page.getByRole('button', { name: '함께 보기' }).click()
      const pip = page.locator('.watch-pip')
      await expect(pip).toBeVisible()
      await expect(page.locator('.game-pip-resize')).toHaveCount(0)

      const viewport = page.viewportSize()!
      const box = (await pip.boundingBox())!
      expect(box.x).toBeLessThan(20)
      expect(box.width).toBeGreaterThan(viewport.width - 40)
    } finally {
      await context.close()
    }
  })
})
