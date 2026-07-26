/**
 * 서버 레일 · 채널 사이드바 주변의 P2 커버리지 갭.
 *
 * admin.spec.ts(다른 에이전트가 지금 수정 중이라 건드리지 않는다)가 이미 보는 것과는
 * 겹치지 않게, 아래만 다룬다:
 *  - 사이드바 색 테마 "전체 종류" (admin.spec.ts는 기본값 + 1색만 본다)
 *  - 초대코드 복사 버튼
 *  - 서버 레일 "+" 로 여는 ServerAddModal (auth.spec.ts는 /servers 페이지의 폼만 본다)
 *  - ServerListPage의 마지막 방문 서버 자동 이동
 *  - HostControls 강제종료를 빙고가 아닌 게임(오목)에서 1건 — 6게임이 컴포넌트를 공유한다
 *  - TagPills의 겹치는 관심사 강조
 */
import { expect, test } from '@playwright/test'
import {
  apiRequest,
  channelUrl,
  createServer,
  createUser,
  joinServer,
  loginAs,
  openAs,
  openChannelNav,
  openMembersPanel,
  uniqueId,
} from './fixtures'
// 색상 종류를 테스트에 하드코딩하지 않고 소스에서 그대로 읽는다 — 나중에 팀이 색을
// 추가/제거해도 이 파일을 고칠 필요가 없다. sidebarTheme.ts는 document/localStorage를
// 함수 안에서만 건드리므로 Node(Playwright) 쪽에서 import해도 안전하다.
import { DEFAULT_SIDEBAR_THEME, SIDEBAR_THEMES } from '../src/shared/lib/sidebarTheme'

test.describe('사이드바 색 테마 (전체 종류)', () => {
  test('선택 가능한 색 전부가 적용되고, 새로고침 뒤에도 마지막 선택이 남는다', async ({
    browser,
  }) => {
    const owner = await createUser('theme-all')
    const server = await createServer(owner)
    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))
    await expect(page.locator('.chat-sidebar')).toBeVisible()

    await expect(page.locator('html')).toHaveAttribute('data-sidebar-theme', DEFAULT_SIDEBAR_THEME)

    await openChannelNav(page)
    for (const t of SIDEBAR_THEMES) {
      const themeBtn = page.getByRole('button', { name: '사이드바 색 고르기' })
      await themeBtn.scrollIntoViewIfNeeded()
      await themeBtn.click()
      const opt = page.getByRole('menuitemradio', { name: t.label })
      await opt.click()
      await expect(page.locator('html')).toHaveAttribute('data-sidebar-theme', t.key)
    }

    // 마지막으로 고른 색(목록의 마지막 항목)이 새로고침 후에도 유지된다 (localStorage)
    const last = SIDEBAR_THEMES[SIDEBAR_THEMES.length - 1]
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-sidebar-theme', last.key)

    // openChannelNav(fixtures.ts)는 토글 버튼의 isVisible()을 즉시 판정한다 — reload
    // 직후 아직 첫 페인트 전이면 순간적으로 false로 읽혀 드로어를 열지 않고 지나친다
    // (admin.spec.ts가 openMembersPanel에 남긴 것과 같은 종류의 함정). 셸이 그려지길
    // 먼저 기다린 뒤에 열어야 한다.
    await expect(page.locator('.chat-sidebar')).toBeVisible()
    // 다시 열었을 때도 방금 고른 색에 체크(aria-checked)가 붙어 있어야 한다
    await openChannelNav(page)
    const themeBtnAfterReload = page.getByRole('button', { name: '사이드바 색 고르기' })
    await themeBtnAfterReload.scrollIntoViewIfNeeded()
    await themeBtnAfterReload.click()
    await expect(page.getByRole('menuitemradio', { name: last.label })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await context.close()
  })
})

test.describe('초대코드 복사', () => {
  test('복사 버튼을 누르면 "복사됨!" 피드백이 뜨고 실제로 클립보드에 담긴다', async ({
    browser,
  }) => {
    const owner = await createUser('invite-copy')
    const server = await createServer(owner)
    const { context, page } = await openAs(browser, owner, server)
    // 클립보드 API는 브라우저 권한이 필요하다 — Chromium 계열(desktop/mobile 둘 다
    // Chromium 엔진)은 grantPermissions로 프롬프트 없이 허용할 수 있다.
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(channelUrl(server))
    await expect(page.locator('.chat-sidebar')).toBeVisible()
    await openChannelNav(page)

    await expect(page.locator('.invite-chip .invite-code')).toHaveText(server.inviteCode)
    await page.locator('.invite-chip').click()

    await expect(page.locator('.copied-note')).toHaveText('복사됨!')
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toBe(server.inviteCode)

    await context.close()
  })
})

test.describe('서버 레일 "+" 모달 (ServerAddModal)', () => {
  test('레일의 + 버튼으로 새 서버를 만들면 그 서버로 전환된다', async ({ browser }) => {
    const owner = await createUser('rail-create')
    const server = await createServer(owner)
    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))
    await expect(page.locator('.chat-sidebar')).toBeVisible()
    // 서버 레일(ServerRail)도 채널 사이드바처럼 nav-drawer 안에 있다
    await openChannelNav(page)

    await page.getByRole('button', { name: '서버 추가/참여' }).click()
    // 새로 만든 서버는 태그가 비어 있어 TagSetupModal(onboarding)도 곧이어 자동으로
    // 뜬다 — 둘 다 클래스가 'modal'이라 그냥 '.modal'로는 strict mode에 걸린다.
    const modal = page.locator('.modal:not(.tag-setup-modal)')
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', { name: '서버 추가' })).toBeVisible()

    const newName = `E2E 레일생성-${uniqueId().slice(-6)}`
    await modal.getByPlaceholder('서버 이름 (예: 부트캠프 3기)').fill(newName)
    await modal.getByRole('button', { name: '만들기' }).click()

    await expect(modal).toBeHidden()
    await expect(page).toHaveURL(/\/servers\/\d+/)
    await expect(page.locator('.sidebar-server-name')).toHaveText(newName)

    await context.close()
  })

  test('레일의 + 모달에서 초대코드로 남의 서버에 참여할 수 있다', async ({ browser }) => {
    const host = await createUser('rail-join-host')
    const target = await createServer(host)
    const guest = await createUser('rail-join-guest')
    const guestServer = await createServer(guest) // 참여자도 자기 서버가 하나 있어야 채팅 화면에 들어간다
    const { context, page } = await openAs(browser, guest, guestServer)
    await page.goto(channelUrl(guestServer))
    await expect(page.locator('.chat-sidebar')).toBeVisible()
    await openChannelNav(page)

    await page.getByRole('button', { name: '서버 추가/참여' }).click()
    // 참여할 target 서버도 손님(guest)에게는 태그가 비어 있어 onboarding 모달이
    // 곧이어 자동으로 뜰 수 있다 — 위 테스트와 같은 이유로 범위를 좁힌다.
    const modal = page.locator('.modal:not(.tag-setup-modal)')
    await expect(modal).toBeVisible()
    await modal.getByPlaceholder('예: 7K2FQ9XL').fill(target.inviteCode)
    await modal.getByRole('button', { name: '참여', exact: true }).click()

    await expect(modal).toBeHidden()
    await expect(page).toHaveURL(new RegExp(`/servers/${target.id}`))

    await context.close()
  })
})

test.describe('마지막 방문 서버 자동 이동 (ServerListPage)', () => {
  test('저장된 last_server_id가 있으면 그 서버로 바로 이동한다', async ({ browser }) => {
    const owner = await createUser('lastserver-valid')
    await createServer(owner, `A-${uniqueId().slice(-6)}`)
    const target = await createServer(owner, `B-${uniqueId().slice(-6)}`)

    const context = await browser.newContext()
    await loginAs(context, owner)
    // ChatPage가 채널에 들어갈 때마다 이 키를 갱신하므로(ChatPage.tsx:113), 아직 어떤
    // 서버도 방문하지 않은 새 컨텍스트에서 미리 심어야 그 값이 그대로 살아남는다.
    await context.addInitScript((id) => {
      window.localStorage.setItem('last_server_id', String(id))
    }, target.id)
    const page = await context.newPage()

    await page.goto('/servers')
    // ServerListPage가 /servers/{id}로 옮긴 뒤, 같은 element를 공유하는 ChatPage가 곧바로
    // /servers/{id}/channels/{cid}로 한 번 더(client-side) 리다이렉트한다(ChatPage.tsx:165-167).
    // 끝에 $만 걸면 그 두 번째 리다이렉트가 끝나기 전 찰나에만 맞는 반쪽짜리 검증이 되어
    // 타이밍에 따라 흔들린다 — 뒤에 /channels/... 가 붙어도 통과하게 경계를 둔다.
    await expect(page).toHaveURL(new RegExp(`/servers/${target.id}(/|$)`))

    await context.close()
  })

  test('저장된 값이 없거나 유효하지 않으면 목록의 서버로 이동한다', async ({ browser }) => {
    const owner = await createUser('lastserver-invalid')
    await createServer(owner)

    const context = await browser.newContext()
    await loginAs(context, owner)
    await context.addInitScript(() => {
      // 탈퇴/삭제된 서버 id 같은, 지금은 존재하지 않는 값
      window.localStorage.setItem('last_server_id', '999999999')
    })
    const page = await context.newPage()

    await page.goto('/servers')
    // ServerListPage.tsx: 목록에서 못 찾으면 servers[0]으로 대체 이동한다 —
    // 정확히 어떤 서버가 "첫 번째"인지는 API 정렬에 달려 있으니, 목록에 머물지 않고
    // 어떤 서버로든 넘어갔다는 것만 확인한다. (위 테스트와 같은 이유로 /channels/...
    // 접미사가 붙어도 통과하게 경계를 둔다)
    await expect(page).toHaveURL(/\/servers\/\d+(\/|$)/)

    await context.close()
  })
})

test.describe('게임 강제 종료 (빙고 아닌 게임 — 오목)', () => {
  test('오목도 판을 연 사람만 강제 종료할 수 있고, 끝내면 양쪽 다 다시 열 수 있는 화면이 된다', async ({
    browser,
  }) => {
    const owner = await createUser('omok-host')
    const guest = await createUser('omok-guest')
    const server = await createServer(owner)
    await joinServer(guest, server.inviteCode)

    const a = await openAs(browser, owner, server)
    const b = await openAs(browser, guest, server)
    await a.page.goto(channelUrl(server))
    await b.page.goto(channelUrl(server))
    await expect(a.page.locator('.chat-sidebar')).toBeVisible()
    await expect(b.page.locator('.chat-sidebar')).toBeVisible()

    for (const page of [a.page, b.page]) {
      await page.getByRole('button', { name: /미니게임/ }).click()
      await expect(page.locator('.game-pip')).toBeVisible()
      await page.locator('.game-select-card', { hasText: '오목' }).click()
    }

    // 방장(owner)이 오목판을 연다 — HostEndButton은 판이 존재하는 한(대기 중이어도) 바로 뜬다
    await a.page.getByRole('button', { name: '게임 열기' }).click()
    await expect(a.page.locator('.host-end-btn')).toBeVisible()

    // 손님은 아직 참여 전이라 강제 종료 버튼이 없다
    await expect(b.page.getByRole('button', { name: '게임 참여' })).toBeVisible()
    await expect(b.page.locator('.host-end-btn')).toHaveCount(0)

    a.page.once('dialog', (d) => d.accept())
    await a.page.locator('.host-end-btn').click()

    // 판이 사라지고 양쪽 다 "게임 열기"로 되돌아간다 (useGameEnded → state null)
    await expect(a.page.getByRole('button', { name: '게임 열기' })).toBeVisible()
    await expect(b.page.getByRole('button', { name: '게임 열기' })).toBeVisible()

    await a.context.close()
    await b.context.close()
  })
})

test.describe('TagPills 겹침 강조', () => {
  test('나와 겹치는 관심사 태그가 다른 스타일(.common)로 강조된다', async ({ browser }) => {
    const owner = await createUser('tagpills-owner')
    const guest = await createUser('tagpills-guest')
    const server = await createServer(owner)
    await joinServer(guest, server.inviteCode)
    // 서로 "커피"만 겹치게 태그를 심는다
    await apiRequest(`/servers/${server.id}/tags`, {
      method: 'PUT',
      body: { tag1: '커피', tag2: '축구', tag3: '등산' },
      token: owner.token,
    })
    await apiRequest(`/servers/${server.id}/tags`, {
      method: 'PUT',
      body: { tag1: '커피', tag2: '재즈', tag3: '보드게임' },
      token: guest.token,
    })

    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))
    await expect(page.locator('.chat-sidebar')).toBeVisible()
    await openMembersPanel(page)

    // 손님 행: TagPills.tsx가 common_with_me에 있는 태그만 .pill.common으로 그린다
    const guestRow = page.locator('.member-row:not(.me)')
    await expect(guestRow.locator('.pill.common')).toHaveCount(1)
    await expect(guestRow.locator('.pill.common')).toHaveText('커피')
    await expect(guestRow.locator('.pill:not(.common)')).toHaveCount(2)

    // 내 행: MembersPanel.tsx가 다른 멤버들의 common_with_me를 모아(myCommon) 내 태그에도
    // 똑같이 강조를 준다 — "커피"가 누군가와 통한다는 걸 내 줄에서도 보여준다
    const myRow = page.locator('.member-row.me')
    await expect(myRow.locator('.pill.common')).toHaveCount(1)
    await expect(myRow.locator('.pill.common')).toHaveText('커피')

    await context.close()
  })
})
