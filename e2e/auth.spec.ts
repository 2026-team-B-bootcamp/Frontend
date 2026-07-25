import { expect, test } from '@playwright/test'
import { createServer, createUser, loginAs, uniqueId } from './fixtures'

/**
 * 로그인·회원가입·접근 제어.
 *
 * 여기만 UI로 끝까지 클릭한다 — 다른 spec은 이 흐름이 동작한다고 보고 토큰을
 * 심어서 시작하므로, 이 파일이 그 전제를 지키는 자리다.
 */

test.describe('회원가입 · 로그인', () => {
  test('가입하면 곧바로 로그인된 채로 온보딩으로 들어간다', async ({ page }) => {
    const id = uniqueId()
    const email = `e2e-signup-${id}@test.local`
    const name = `가입테스트${id.slice(-4)}`

    await page.goto('/signup')
    await page.getByLabel('이름').fill(name)
    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('비밀번호').fill('e2e-pass-1234')
    await page.getByRole('button', { name: '회원가입' }).click()

    // 서버가 하나도 없는 새 계정이라 온보딩 화면으로 간다.
    await expect(page.getByRole('heading', { name: new RegExp(name) })).toBeVisible()
    await expect(page.getByText('새 서버 만들기')).toBeVisible()

    // 가입 = 로그인이어야 한다. 토큰이 없으면 새로고침에 로그인으로 튕긴다.
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeTruthy()
  })

  test('가입한 계정으로 다시 로그인할 수 있다', async ({ page }) => {
    const user = await createUser('login')

    await page.goto('/login')
    await page.getByLabel('이메일').fill(user.email)
    await page.getByLabel('비밀번호').fill(user.password)
    await page.getByRole('button', { name: '로그인', exact: true }).click()

    await expect(page.getByText('새 서버 만들기')).toBeVisible()
  })

  test('비밀번호가 틀리면 에러를 보여주고 그 자리에 머문다', async ({ page }) => {
    const user = await createUser('badpw')

    await page.goto('/login')
    await page.getByLabel('이메일').fill(user.email)
    await page.getByLabel('비밀번호').fill('틀린비밀번호')
    await page.getByRole('button', { name: '로그인', exact: true }).click()

    await expect(page.locator('.error')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
    // 실패한 로그인이 토큰을 남기면 안 된다.
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull()
  })

  test('없는 계정으로는 로그인할 수 없다', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('이메일').fill(`nobody-${uniqueId()}@test.local`)
    await page.getByLabel('비밀번호').fill('아무비밀번호')
    await page.getByRole('button', { name: '로그인', exact: true }).click()

    await expect(page.locator('.error')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('이미 쓰는 이메일로는 가입되지 않는다', async ({ page }) => {
    const user = await createUser('dup')

    await page.goto('/signup')
    await page.getByLabel('이름').fill('중복시도')
    await page.getByLabel('이메일').fill(user.email)
    await page.getByLabel('비밀번호').fill('e2e-pass-1234')
    await page.getByRole('button', { name: '회원가입' }).click()

    await expect(page.locator('.error')).toBeVisible()
    await expect(page).toHaveURL(/\/signup/)
  })
})

test.describe('접근 제어', () => {
  test('로그인 없이 채팅으로 들어가면 로그인으로 보낸다', async ({ page }) => {
    await page.goto('/servers/1/channels/1')
    await expect(page).toHaveURL(/\/login/)
  })

  test('로그인 없이 게임 전용 화면도 막힌다', async ({ page }) => {
    await page.goto('/servers/1/channels/1/play/bingo')
    await expect(page).toHaveURL(/\/login/)
  })

  test('로그아웃하면 토큰이 지워지고 다시 들어갈 수 없다', async ({ page, context }) => {
    const user = await createUser('logout')
    await loginAs(context, user)

    await page.goto('/servers')
    await page.getByRole('button', { name: '로그아웃' }).click()
    await expect(page).toHaveURL(/\/login/)
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull()

    // 뒤로 가기로 되돌아가도 막혀야 한다.
    await page.goto('/servers')
    await expect(page).toHaveURL(/\/login/)
  })

  test('토큰이 망가져 있으면 조용히 로그인으로 되돌린다', async ({ page, context }) => {
    // 만료·서명 위조 등으로 서버가 401을 주는 상황. 앱은 흰 화면이 아니라
    // 로그인 화면을 보여줘야 한다 (client.ts의 auth:unauthorized 경로).
    await context.addInitScript(() => {
      window.localStorage.setItem('access_token', 'not.a.real.token')
    })

    await page.goto('/servers')
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })
})

test.describe('서버 온보딩', () => {
  test('서버를 만들면 그 서버의 채팅으로 들어간다', async ({ page, context }) => {
    const user = await createUser('create')
    await loginAs(context, user)

    await page.goto('/servers')
    const name = `E2E 만든모임 ${uniqueId().slice(-4)}`
    await page.getByPlaceholder('서버 이름').fill(name)
    await page.getByRole('button', { name: '만들기' }).click()

    await expect(page).toHaveURL(/\/servers\/\d+/)
    // 서버를 만들면 기본 채널이 하나 생기고 그리로 이동한다.
    await expect(page).toHaveURL(/\/channels\/\d+/, { timeout: 15_000 })
  })

  test('초대코드로 남의 서버에 참여할 수 있다', async ({ page, context }) => {
    const owner = await createUser('owner')
    const server = await createServer(owner)
    const guest = await createUser('guest')
    await loginAs(context, guest)

    await page.goto('/servers')
    await page.getByPlaceholder('예: 7K2FQ9XL').fill(server.inviteCode)
    await page.getByRole('button', { name: '참여', exact: true }).click()

    await expect(page).toHaveURL(new RegExp(`/servers/${server.id}`))
  })

  test('엉터리 초대코드는 에러를 보여준다', async ({ page, context }) => {
    const user = await createUser('badcode')
    await loginAs(context, user)

    await page.goto('/servers')
    await page.getByPlaceholder('예: 7K2FQ9XL').fill('ZZZZZZZZ')
    await page.getByRole('button', { name: '참여', exact: true }).click()

    await expect(page.locator('.error')).toBeVisible()
  })
})
