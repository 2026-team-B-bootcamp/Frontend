/**
 * ProfileModal(닉네임 변경 · 아바타 업로드) — 지금까지 전혀 테스트되지 않았다.
 *
 * 준비물(계정·서버)은 API로 만들고, 검증 대상인 모달만 UI로 클릭한다.
 * 모달을 여는 버튼(ChannelSidebar.tsx의 `.sidebar-me-main`)은 채널 사이드바
 * 안에 있어서 모바일에서는 드로어를 먼저 열어야 한다 → openChannelNav(page).
 */
import { expect, test, type Page } from '@playwright/test'
import {
  apiRequest,
  channelUrl,
  createServer,
  createUser,
  messageInLog,
  openAs,
  openChannelNav,
  openMembersPanel,
  sendMessage,
  type TestServer,
  type TestUser,
  uniqueId,
} from './fixtures'

/**
 * 채팅 화면이 그려지길 기다린 뒤 프로필 모달을 연다.
 *
 * ProfileModal은 열리자마자 getMe()/getMembers()를 비동기로 불러 이메일·태그
 * 필드를 다시 채운다(effect). 그 응답이 우리가 입력한 값보다 늦게 도착하면
 * 방금 타이핑한 값을 덮어써버리므로, 두 요청이 끝났다는 신호(이메일·태그1이
 * 서버 값으로 채워짐)를 기다린 뒤에야 폼을 건드린다.
 */
async function openProfileModal(page: Page, owner: TestUser, tag1: string) {
  await expect(page.locator('.chat-sidebar')).toBeVisible()
  await openChannelNav(page)
  await page.locator('.sidebar-me-main').click()
  await expect(page.locator('.profile-modal')).toBeVisible()
  await expect(page.getByLabel('이메일')).toHaveValue(owner.email)
  await expect(page.getByPlaceholder(/관심사 1/)).toHaveValue(tag1)
}

/** 관심사 태그 3개를 API로 미리 채워둔다 — 저장 검증이 태그 누락으로 막히지 않게 하려고. */
async function seedTags(owner: TestUser, server: TestServer): Promise<[string, string, string]> {
  const tags: [string, string, string] = ['축구', '커피', '등산']
  await apiRequest(`/servers/${server.id}/tags`, {
    method: 'PUT',
    body: { tag1: tags[0], tag2: tags[1], tag3: tags[2] },
    token: owner.token,
  })
  return tags
}

test.describe('닉네임 변경', () => {
  test('닉네임을 바꿔 저장하면 멤버 목록과 채팅 화면에 반영된다', async ({ browser }) => {
    const owner = await createUser('profile-rename')
    const server = await createServer(owner)
    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))

    // 여기선 태그를 API로 미리 심지 않는다 — 심어두면 ChatRoom 마운트 시
    // createWelcome()이 "환영 카드"(kind=welcome, user_id=나)를 먼저 만들어버려서,
    // 뒤이어 보낼 메시지가 5분 그룹핑 규칙에 걸려 이름(.chat-name)이 안 뜬다.
    // 그래서 태그는 저장 폼에서 직접 채운다 — 어차피 onSave가 3개를 요구한다.
    const newName = `바뀐이름-${uniqueId().slice(-6)}`
    await openProfileModal(page, owner, '')
    await page.getByLabel('닉네임').fill(newName)
    for (const [i, tag] of ['축구', '커피', '등산'].entries()) {
      await page.getByPlaceholder(new RegExp(`관심사 ${i + 1}`)).fill(tag)
    }
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.locator('.profile-modal')).toBeHidden()

    // 채팅 화면 먼저 확인: 이 채널의 첫 메시지라 그룹핑 없이 이름이 그대로 뜬다.
    // (멤버 패널을 먼저 열면 모바일에서 오버레이가 입력창을 가려 전송이 막힌다)
    const text = `프로필 변경 확인 ${uniqueId()}`
    await sendMessage(page, text)
    await expect(messageInLog(page, text)).toBeVisible()
    await expect(page.locator('.chat-name')).toHaveText(newName)

    // 멤버 패널: 내 행(.member-row.me)의 이름이 새로고침 없이 바뀐다 (onSaved → membersRefresh)
    await openMembersPanel(page)
    await expect(page.locator('.member-row.me .member-name')).toContainText(newName)

    await context.close()
  })

  test('빈 닉네임은 거부되고 모달이 닫히지 않는다', async ({ browser }) => {
    const owner = await createUser('profile-empty')
    const server = await createServer(owner)
    const [tag1] = await seedTags(owner, server)
    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))

    await openProfileModal(page, owner, tag1)
    await page.getByLabel('닉네임').fill('')
    await page.getByRole('button', { name: '저장', exact: true }).click()

    await expect(page.locator('.profile-modal .error')).toHaveText('닉네임을 입력해주세요')
    // 저장이 거부됐으니 모달은 그대로 열려 있어야 한다
    await expect(page.locator('.profile-modal')).toBeVisible()

    await context.close()
  })

  test('취소하면 바꾸던 닉네임이 반영되지 않는다', async ({ browser }) => {
    const owner = await createUser('profile-cancel')
    const server = await createServer(owner)
    const [tag1] = await seedTags(owner, server)
    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))

    await openProfileModal(page, owner, tag1)
    await page.getByLabel('닉네임').fill(`취소될이름-${uniqueId().slice(-6)}`)
    // 채팅 입력창 서식 툴바에도 "취소선" 버튼이 있어 부분일치로는 둘 다 걸린다.
    await page.getByRole('button', { name: '취소', exact: true }).click()
    await expect(page.locator('.profile-modal')).toBeHidden()

    // 사이드바의 내 이름 표시가 그대로다 — onClose는 onSaved를 부르지 않으므로
    // authContext의 displayName이 바뀌지 않는다.
    await expect(page.locator('.sidebar-me-name')).toHaveText(owner.displayName)

    // 다시 열어도 서버에서 새로 불러온 원래 닉네임이 그대로 채워져 있다.
    // 모바일에선 프로필을 열 때 드로어가 자동으로 닫히므로(ChatPage.tsx의 onProfile)
    // 다시 열어야 .sidebar-me-main에 닿을 수 있다.
    await openChannelNav(page)
    await page.locator('.sidebar-me-main').click()
    await expect(page.locator('.profile-modal')).toBeVisible()
    await expect(page.getByLabel('닉네임')).toHaveValue(owner.displayName)

    await context.close()
  })
})

test.describe('아바타 업로드', () => {
  test('이미지가 아닌 파일은 거부된다', async ({ browser }) => {
    const owner = await createUser('profile-avatar-type')
    const server = await createServer(owner)
    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))

    await openProfileModal(page, owner, '')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'not-an-image.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('이건 이미지가 아니다'),
    })

    await expect(page.locator('.profile-modal .error')).toHaveText(
      'jpg, png, webp 이미지만 업로드할 수 있어요',
    )

    await context.close()
  })

  test('5MB를 넘는 이미지는 거부된다', async ({ browser }) => {
    const owner = await createUser('profile-avatar-size')
    const server = await createServer(owner)
    const { context, page } = await openAs(browser, owner, server)
    await page.goto(channelUrl(server))

    await openProfileModal(page, owner, '')
    // ProfileModal.tsx의 MAX_AVATAR_BYTES(5 * 1024 * 1024)를 넘는 더미 버퍼.
    // 실제 이미지일 필요는 없다 — 용량 검사가 파일을 열어보기 전에 먼저 걸린다.
    await page.locator('input[type="file"]').setInputFiles({
      name: 'too-big.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1024),
    })

    await expect(page.locator('.profile-modal .error')).toHaveText(
      '이미지 용량은 5MB 이하여야 해요',
    )

    await context.close()
  })
})
