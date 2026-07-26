import { expect, test } from '@playwright/test'
import { channelUrl, createServer, createUser, joinServer, openAs } from './fixtures'

/**
 * 미니게임 — 두 사람이 실제로 한 판을 굴린다.
 *
 * 게임은 상태가 서버(Redis)에 있고 상대의 수가 WebSocket으로 넘어온다. 즉
 * "내 화면에서 눌렀더니 상대 화면의 차례가 바뀐다"까지 봐야 동작을 확인한 것이다.
 * 그래서 판을 열고 → 둘 다 참여하고 → 번갈아 두는 데까지 간다.
 */

/** 슬랙 링크가 데려가는 것과 같은 전용 화면 경로. */
function playUrl(serverId: number, channelId: number, feature: string) {
  return `/servers/${serverId}/channels/${channelId}/play/${feature}`
}

async function twoPlayers(browser: Parameters<typeof openAs>[0]) {
  const host = await createUser('game-host')
  const server = await createServer(host)
  const guest = await createUser('game-guest')
  await joinServer(guest, server.inviteCode)

  const a = await openAs(browser, host, server)
  const b = await openAs(browser, guest, server)
  return { host, guest, server, a, b }
}

test.describe('빙고 한 판', () => {
  test('열기 → 둘 다 참여 → 시작 → 번갈아 두기', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      const url = playUrl(server.id, server.channelId, 'bingo')
      await a.page.goto(url)
      await b.page.goto(url)

      // ① 아직 판이 없다 → 한 명이 연다
      await expect(a.page.getByRole('button', { name: '게임 열기' })).toBeVisible()
      await a.page.getByRole('button', { name: '게임 열기' }).click()

      // ② 상대 화면에도 로비가 실시간으로 나타나야 한다
      await expect(b.page.getByText('대기 중')).toBeVisible({ timeout: 20_000 })
      await b.page.getByRole('button', { name: '게임 참여' }).click()

      // ③ 2명이 되면 시작 버튼이 열린다
      const startBtn = a.page.getByRole('button', { name: /게임 시작 \(2명\)/ })
      await expect(startBtn).toBeEnabled({ timeout: 20_000 })
      await startBtn.click()

      // ④ 양쪽 다 25칸 판을 받는다
      await expect(a.page.locator('.bingo-cell')).toHaveCount(25, { timeout: 20_000 })
      await expect(b.page.locator('.bingo-cell')).toHaveCount(25, { timeout: 20_000 })

      // ⑤ 정확히 한 사람만 자기 차례다 — 둘 다 두면 순서가 무너진다
      const aTurn = await a.page.locator('.bingo-turn.mine').count()
      const bTurn = await b.page.locator('.bingo-turn.mine').count()
      expect(aTurn + bTurn).toBe(1)

      const [mover, waiter] = aTurn === 1 ? [a.page, b.page] : [b.page, a.page]

      // ⑥ 차례인 사람이 숫자를 하나 부른다
      const cell = mover.locator('.bingo-cell:not(.marked)').first()
      const number = (await cell.innerText()).trim()
      await cell.click()

      // ⑦ 그 숫자가 상대 화면의 호출 기록에도 뜨고, 차례가 넘어간다
      await expect(waiter.locator('.bingo-log-list')).toContainText(number, { timeout: 20_000 })
      await expect(waiter.locator('.bingo-turn.mine')).toHaveCount(1, { timeout: 20_000 })
      await expect(mover.locator('.bingo-turn.mine')).toHaveCount(0)

      // ⑧ 차례가 아닌 쪽의 판은 잠겨 있어야 한다
      await expect(mover.locator('.bingo-cell:not(.marked)').first()).toBeDisabled()
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })

  test('혼자서는 시작할 수 없다', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      await a.page.goto(playUrl(server.id, server.channelId, 'bingo'))
      await a.page.getByRole('button', { name: '게임 열기' }).click()

      // 1명일 때 시작 버튼은 비활성이어야 한다.
      await expect(a.page.getByRole('button', { name: /게임 시작 \(1명\)/ })).toBeDisabled()
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})

test.describe('게임 전용 화면', () => {
  const features = ['bingo', 'wordchain', 'omok', 'tictactoe', 'balance', 'chosung', 'draw', 'watch']

  for (const feature of features) {
    test(`${feature} 전용 화면이 열린다`, async ({ browser }) => {
      // 슬랙 버튼이 데려가는 목적지다. 하나라도 빈 화면이면 그 기능은 슬랙에서 죽은 링크가 된다.
      const host = await createUser(`feat-${feature}`)
      const server = await createServer(host)
      const { context, page } = await openAs(browser, host, server)
      try {
        const errors: string[] = []
        page.on('pageerror', (e) => errors.push(e.message))

        await page.goto(playUrl(server.id, server.channelId, feature))

        // 헤더가 뜨고 채팅으로 돌아가는 길이 있어야 한다.
        await expect(page.locator('.feature-page-title')).toBeVisible()
        await expect(page.getByRole('link', { name: /채팅으로/ })).toBeVisible()
        expect(errors, `${feature} 화면에서 JS 에러가 났다`).toEqual([])
      } finally {
        await context.close()
      }
    })
  }

  test('모르는 기능 이름은 채팅방으로 되돌린다', async ({ browser }) => {
    const host = await createUser('feat-unknown')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(playUrl(server.id, server.channelId, '없는게임'))
      await expect(page).toHaveURL(new RegExp(`${channelUrl(server)}$`))
    } finally {
      await context.close()
    }
  })
})

test.describe('채팅방 안 미니게임', () => {
  test('게임을 열면 채팅에 입장 카드가 뜬다', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      await b.page.goto(channelUrl(server))
      await expect(b.page.locator('.chat-editor-input')).toBeVisible()

      // A는 전용 화면에서 판을 연다.
      await a.page.goto(playUrl(server.id, server.channelId, 'bingo'))
      await a.page.getByRole('button', { name: '게임 열기' }).click()

      // 채팅만 보고 있던 B에게도 알림 카드가 실시간으로 떠야 한다.
      const card = b.page.locator('.chat-game-card')
      await expect(card).toBeVisible({ timeout: 20_000 })
      await expect(card).toContainText('빙고')

      // 카드의 입장 버튼이 그 게임 화면으로 데려간다.
      await card.getByRole('link', { name: '입장하기' }).click()
      await expect(b.page).toHaveURL(new RegExp('/play/bingo$'))
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })

  test('헤더의 주사위 버튼으로 미니게임 창을 열고 닫는다', async ({ browser }) => {
    const host = await createUser('pip')
    const server = await createServer(host)
    const { context, page } = await openAs(browser, host, server)
    try {
      await page.goto(channelUrl(server))
      const dice = page.getByRole('button', { name: '미니게임', exact: false })

      await dice.click()
      await expect(page.locator('.game-pip')).toBeVisible()

      await dice.click()
      await expect(page.locator('.game-pip')).toHaveCount(0)
    } finally {
      await context.close()
    }
  })
})

test.describe('그림판 · 같이보기', () => {
  test('그림판에 그린 선이 상대 화면에도 나타난다', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      const url = playUrl(server.id, server.channelId, 'draw')
      await a.page.goto(url)
      await b.page.goto(url)

      const canvasA = a.page.locator('canvas').first()
      const canvasB = b.page.locator('canvas').first()
      await expect(canvasA).toBeVisible()
      await expect(canvasB).toBeVisible()

      // B의 캔버스가 비어 있는지 먼저 확인한다.
      const blank = await canvasB.screenshot()

      // A가 한 획 긋는다.
      const box = (await canvasA.boundingBox())!
      await a.page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3)
      await a.page.mouse.down()
      await a.page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, { steps: 12 })
      await a.page.mouse.up()

      // B의 캔버스가 달라져야 한다 (실시간 스트로크 전파).
      await expect(async () => {
        const now = await canvasB.screenshot()
        expect(Buffer.compare(blank, now)).not.toBe(0)
      }).toPass({ timeout: 20_000 })
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})
