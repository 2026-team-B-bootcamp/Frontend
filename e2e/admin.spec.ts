/**
 * 이번에 추가한 운영 기능들의 실제 왕복 확인.
 *
 * - 사이드바 색 테마 (기본 아이보리 · 고른 값이 저장됨)
 * - 서버·채널 이름 변경 (다른 사람 화면에도 실시간 반영)
 * - 관심사 통계 모달 다시 열기
 * - 방장의 멤버 내보내기
 * - 채널 삭제 / 모임 삭제 / 모임 나가기
 * - 방장의 게임 강제 종료
 *
 * 전제: 백엔드가 localhost:8000에 떠 있어야 한다 (`docker compose up -d`).
 */
import { expect, test } from '@playwright/test'
import {
  apiRequest,
  channelUrl,
  createServer,
  createUser,
  joinServer,
  openAs,
  uniqueId,
} from './fixtures'

test.describe('사이드바 색 테마', () => {
  test('기본은 아이보리이고, 고른 색이 새로고침 뒤에도 남는다', async ({ browser }) => {
    const owner = await createUser('theme')
    const server = await createServer(owner)
    const { context, page } = await openAs(browser, owner, server)

    await page.goto(channelUrl(server))
    await expect(page.locator('.chat-sidebar')).toBeVisible()

    // 아무것도 고르지 않은 첫 방문 → 아이보리
    await expect(page.locator('html')).toHaveAttribute('data-sidebar-theme', 'ivory')

    await page.getByRole('button', { name: '사이드바 색 고르기' }).click()
    await page.getByRole('menuitemradio', { name: '다크' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-sidebar-theme', 'dark')

    // 새로고침해도 유지된다 (localStorage)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-sidebar-theme', 'dark')

    await context.close()
  })
})

test.describe('이름 바꾸기', () => {
  test('서버·채널 이름을 바꾸면 다른 사람 화면에도 바로 반영된다', async ({ browser }) => {
    const owner = await createUser('rename-owner')
    const guest = await createUser('rename-guest')
    const server = await createServer(owner)
    await joinServer(guest, server.inviteCode)

    const a = await openAs(browser, owner, server)
    const b = await openAs(browser, guest, server)
    await a.page.goto(channelUrl(server))
    await b.page.goto(channelUrl(server))
    await expect(a.page.locator('.sidebar-server-name')).toBeVisible()
    await expect(b.page.locator('.sidebar-server-name')).toBeVisible()

    const newServerName = `바뀐모임-${uniqueId().slice(-6)}`
    await a.page.getByRole('button', { name: '모임 이름 바꾸기' }).click()
    await a.page.getByLabel('모임 이름').fill(newServerName)
    await a.page.getByLabel('모임 이름').press('Enter')

    await expect(a.page.locator('.sidebar-server-name')).toHaveText(newServerName)
    // 남의 화면도 새로고침 없이 따라온다 (server.renamed 브로드캐스트)
    await expect(b.page.locator('.sidebar-server-name')).toHaveText(newServerName)

    const newChannelName = `잡담-${uniqueId().slice(-6)}`
    await a.page.locator('.sidebar-channel-row').first().hover()
    await a.page.getByRole('button', { name: /채널 이름 바꾸기$/ }).first().click()
    await a.page.getByLabel('채널 이름').fill(newChannelName)
    await a.page.getByLabel('채널 이름').press('Enter')

    await expect(a.page.locator('.sidebar-channel .name')).toHaveText(newChannelName)
    await expect(b.page.locator('.sidebar-channel .name')).toHaveText(newChannelName)
    // 헤더의 채널 이름도 같이 바뀐다
    await expect(b.page.locator('.chat-channel-name')).toContainText(newChannelName)

    await a.context.close()
    await b.context.close()
  })

  test('Esc로 취소하면 원래 이름이 남는다', async ({ browser }) => {
    const owner = await createUser('rename-esc')
    const server = await createServer(owner)
    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))
    await expect(page.locator('.sidebar-server-name')).toHaveText(server.name)

    await page.getByRole('button', { name: '모임 이름 바꾸기' }).click()
    await page.getByLabel('모임 이름').fill('취소될이름')
    await page.getByLabel('모임 이름').press('Escape')

    await expect(page.locator('.sidebar-server-name')).toHaveText(server.name)
    await context.close()
  })
})

test.describe('관심사 통계 다시 보기', () => {
  test('멤버 패널의 버튼으로 통계 모달을 다시 열 수 있다', async ({ browser }) => {
    const owner = await createUser('stats')
    const server = await createServer(owner)
    // 태그를 미리 넣어 온보딩 모달이 자동으로 뜨지 않게 한다 —
    // "다시 열 수 있는가"만 보려는 테스트다.
    await apiRequest(`/servers/${server.id}/tags`, {
      method: 'PUT',
      body: { tag1: '축구', tag2: '커피', tag3: '등산' },
      token: owner.token,
    })

    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))
    // 셸이 그려지길 먼저 기다린다 — isVisible()은 즉시 판정이라, 앱이 아직
    // 렌더되기 전에 물으면 "닫혀 있다"로 잘못 읽고 열려 있던 패널을 되레 닫는다.
    await expect(page.locator('.chat-sidebar')).toBeVisible()

    // 이 폭(1280)에서는 멤버 패널이 기본으로 열려 있다. 혹시 닫혀 있으면 연다.
    const statsBtn = page.getByRole('button', { name: '이 모임의 관심사 보기' })
    if ((await page.locator('.side-panel').count()) === 0) {
      await page.getByRole('button', { name: '멤버', exact: true }).click()
    }
    await expect(statsBtn).toBeVisible()
    await statsBtn.click()

    const modal = page.locator('.tag-setup-modal')
    await expect(modal).toBeVisible()
    // 자동 온보딩이 아니라 직접 열어본 자리 → 문구가 다르다
    await expect(modal.getByRole('heading')).toHaveText('이 모임의 관심사')
    await expect(modal.getByRole('button', { name: '닫기' })).toBeVisible()

    await modal.getByRole('button', { name: '닫기' }).click()
    await expect(modal).toBeHidden()

    // 닫아도 "미뤘음"으로 기록되지 않아 몇 번이든 다시 열린다
    await statsBtn.click()
    await expect(page.locator('.tag-setup-modal')).toBeVisible()

    await context.close()
  })
})

test.describe('멤버 내보내기', () => {
  test('방장만 내보내기 버튼을 갖고, 내보내면 상대는 목록으로 튕긴다', async ({ browser }) => {
    const owner = await createUser('kick-owner')
    const guest = await createUser('kick-guest')
    const server = await createServer(owner)
    await joinServer(guest, server.inviteCode)

    const a = await openAs(browser, owner, server)
    const b = await openAs(browser, guest, server)
    await a.page.goto(channelUrl(server))
    await b.page.goto(channelUrl(server))

    // 방장 화면: 손님 행에 내보내기 버튼이 있다
    const kickBtn = a.page.getByRole('button', { name: `${guest.displayName}님 내보내기` })
    await expect(kickBtn).toBeAttached()
    // 손님 화면: 아무에게도 내보내기 버튼이 없다
    await expect(b.page.locator('.member-kick')).toHaveCount(0)
    // 방장에게는 배지가 붙는다
    await expect(b.page.locator('.member-owner-badge')).toHaveCount(1)

    a.page.once('dialog', (d) => d.accept())
    await kickBtn.click()

    // 목록에서 사라진다
    await expect(a.page.locator('.member-row')).toHaveCount(1)
    // 내보내진 사람은 서버 목록으로 나간다
    await expect(b.page).toHaveURL(/\/servers$/)

    await a.context.close()
    await b.context.close()
  })
})

test.describe('채널 삭제', () => {
  test('방장이 지우면 남의 사이드바에서도 바로 사라진다', async ({ browser }) => {
    const owner = await createUser('chdel-owner')
    const guest = await createUser('chdel-guest')
    const server = await createServer(owner)
    await joinServer(guest, server.inviteCode)
    // 마지막 한 개는 지울 수 없으므로 지울 채널을 하나 더 만든다
    const extra = await apiRequest<{ id: number; name: string }>(
      `/servers/${server.id}/channels`,
      { method: 'POST', body: { name: `공지-${uniqueId().slice(-6)}` }, token: owner.token },
    )

    const a = await openAs(browser, owner, server)
    const b = await openAs(browser, guest, server)
    await a.page.goto(channelUrl(server))
    await b.page.goto(channelUrl(server))
    await expect(a.page.locator('.sidebar-channel-row')).toHaveCount(2)
    await expect(b.page.locator('.sidebar-channel-row')).toHaveCount(2)

    // 손님에게는 휴지통이 아예 없다 (방장 전용)
    await expect(b.page.locator('.sidebar-rename-btn.danger')).toHaveCount(0)

    const row = a.page.locator('.sidebar-channel-row', { hasText: extra.name })
    await row.hover()
    await a.page.getByRole('button', { name: `${extra.name} 채널 삭제` }).click()

    // 확인 모달 — 무엇을 지우는지 보여주고 한 번 더 묻는다
    const modal = a.page.locator('.modal')
    await expect(modal).toBeVisible()
    await expect(modal.locator('.del-preview')).toContainText(extra.name)
    await modal.getByRole('button', { name: '삭제' }).click()

    await expect(a.page.locator('.sidebar-channel-row')).toHaveCount(1)
    // 남의 화면도 새로고침 없이 따라온다 (channel.deleted 브로드캐스트)
    await expect(b.page.locator('.sidebar-channel-row')).toHaveCount(1)

    await a.context.close()
    await b.context.close()
  })

  test('마지막 채널에는 휴지통이 붙지 않는다', async ({ browser }) => {
    const owner = await createUser('chdel-last')
    const server = await createServer(owner)
    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))

    await expect(page.locator('.sidebar-channel-row')).toHaveCount(1)
    await page.locator('.sidebar-channel-row').first().hover()
    // 연필은 있지만 휴지통은 없다
    await expect(page.getByRole('button', { name: /채널 이름 바꾸기$/ })).toBeAttached()
    await expect(page.locator('.sidebar-rename-btn.danger')).toHaveCount(0)

    await context.close()
  })
})

test.describe('모임 나가기 / 삭제', () => {
  test('멤버는 스스로 나가고, 방장 메뉴에는 나가기 대신 삭제가 있다', async ({ browser }) => {
    const owner = await createUser('leave-owner')
    const guest = await createUser('leave-guest')
    const server = await createServer(owner)
    await joinServer(guest, server.inviteCode)

    const a = await openAs(browser, owner, server)
    const b = await openAs(browser, guest, server)
    await a.page.goto(channelUrl(server))
    await b.page.goto(channelUrl(server))
    await expect(a.page.locator('.member-row')).toHaveCount(2)

    // 방장 메뉴: 삭제만 (방장은 나갈 수 없다 — 백엔드가 400으로 막는 규칙과 짝)
    await a.page.locator('.sidebar-name-row').hover()
    await a.page.getByRole('button', { name: '모임 메뉴' }).click()
    await expect(a.page.getByRole('menuitem', { name: '모임 삭제' })).toBeVisible()
    await expect(a.page.getByRole('menuitem', { name: '모임 나가기' })).toHaveCount(0)
    await a.page.keyboard.press('Escape')

    // 손님 메뉴: 나가기만
    await b.page.locator('.sidebar-name-row').hover()
    await b.page.getByRole('button', { name: '모임 메뉴' }).click()
    await expect(b.page.getByRole('menuitem', { name: '모임 삭제' })).toHaveCount(0)
    await b.page.getByRole('menuitem', { name: '모임 나가기' }).click()
    await b.page.locator('.modal').getByRole('button', { name: '나가기' }).click()

    // 나간 사람은 서버 목록으로, 남은 방장의 멤버 목록에서도 사라진다
    await expect(b.page).toHaveURL(/\/servers$/)
    await expect(a.page.locator('.member-row')).toHaveCount(1)

    await a.context.close()
    await b.context.close()
  })

  test('모임 삭제는 이름을 입력해야 확정되고, 지우면 모두 목록으로 나간다', async ({
    browser,
  }) => {
    const owner = await createUser('srvdel-owner')
    const guest = await createUser('srvdel-guest')
    const server = await createServer(owner)
    await joinServer(guest, server.inviteCode)

    const a = await openAs(browser, owner, server)
    const b = await openAs(browser, guest, server)
    await a.page.goto(channelUrl(server))
    await b.page.goto(channelUrl(server))
    await expect(a.page.locator('.chat-sidebar')).toBeVisible()

    await a.page.locator('.sidebar-name-row').hover()
    await a.page.getByRole('button', { name: '모임 메뉴' }).click()
    await a.page.getByRole('menuitem', { name: '모임 삭제' }).click()

    const modal = a.page.locator('.modal')
    const confirmBtn = modal.getByRole('button', { name: '삭제' })
    // 이름을 적기 전에는 확정 버튼이 잠겨 있다
    await expect(confirmBtn).toBeDisabled()
    await modal.getByLabel('확인 문구').fill('아무거나')
    await expect(confirmBtn).toBeDisabled()
    await modal.getByLabel('확인 문구').fill(server.name)
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    await expect(a.page).toHaveURL(/\/servers$/)
    // 참여만 했던 사람도 새로고침 없이 밀려난다 (server.deleted 브로드캐스트)
    await expect(b.page).toHaveURL(/\/servers$/)

    await a.context.close()
    await b.context.close()
  })
})

test.describe('게임 강제 종료', () => {
  test('판을 연 사람만 끝낼 수 있고, 끝내면 모두의 화면에서 사라진다', async ({ browser }) => {
    const owner = await createUser('game-owner')
    const guest = await createUser('game-guest')
    const server = await createServer(owner)
    await joinServer(guest, server.inviteCode)

    const a = await openAs(browser, owner, server)
    const b = await openAs(browser, guest, server)
    await a.page.goto(channelUrl(server))
    await b.page.goto(channelUrl(server))

    // 미니게임 PIP를 양쪽에서 연다 (헤더의 주사위 아이콘)
    for (const page of [a.page, b.page]) {
      await page.getByRole('button', { name: /미니게임/ }).click()
      await expect(page.locator('.game-pip')).toBeVisible()
    }

    // 방장(owner)이 빙고 판을 연다
    await a.page.getByRole('button', { name: '게임 열기' }).click()
    await expect(a.page.locator('.host-end-btn')).toBeVisible()

    // 손님도 같은 판에 들어온다. 아직 아무도 "시작"을 누르지 않았으니 둘 다 대기 로비다.
    await b.page.getByRole('button', { name: /게임 (열기|참여)/ }).click()
    await expect(b.page.locator('.bingo-lobby')).toBeVisible()
    // 같은 로비를 보고 있어도 강제 종료 버튼은 판을 연 사람에게만 있다
    await expect(b.page.locator('.host-end-btn')).toHaveCount(0)
    await expect(a.page.locator('.host-end-btn')).toBeVisible()

    a.page.once('dialog', (d) => d.accept())
    await a.page.locator('.host-end-btn').click()

    // 판이 "종료"가 아니라 "없음"으로 돌아가 양쪽 다 다시 열 수 있는 화면이 된다
    await expect(a.page.getByRole('button', { name: '게임 열기' })).toBeVisible()
    await expect(b.page.getByRole('button', { name: '게임 열기' })).toBeVisible()

    await a.context.close()
    await b.context.close()
  })
})
