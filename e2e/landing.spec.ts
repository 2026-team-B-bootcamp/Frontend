/**
 * 랜딩 페이지(`/`) — 첫 진입점인데 이 저장소에 goto('/') 테스트가 하나도 없었다.
 * CTA가 깨지거나 JS 에러가 나도 아무도 못 잡는 상태라 여기서 최소한을 짚는다.
 *
 * LandingPage.tsx는 백엔드 요청이 거의 없는 마케팅 화면이라 API로 준비할 것도 없다 —
 * 로그인 상태만 loginAs로 심어서 CTA 목적지가 바뀌는지 확인하면 된다.
 */
import { expect, test } from '@playwright/test'
import { createUser, loginAs } from './fixtures'

test.describe('랜딩 페이지 (비로그인)', () => {
  test('히어로 문구가 뜨고 JS 에러가 없다', async ({ page }) => {
    // games.spec.ts의 pageerror 패턴 — 렌더 도중 에러가 나면 화면은 비어 보이지 않아도
    // 콘솔에는 남으므로, 조용히 깨진 애니메이션/훅을 이걸로 잡는다.
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))

    await page.goto('/')

    // RevealWords가 단어 단위로 <span>을 쪼개 렌더하고 CSS margin으로 띄우기 때문에
    // (실제 공백 문자는 없다) textContent에는 공백 없이 붙어서 나온다.
    await expect(page.locator('.landing-hero h1')).toContainText('처음만나도')
    await expect(page.locator('.landing-hero h1')).toContainText('금세친해지는채팅')
    await expect(page.locator('.landing-sub').first()).toContainText('어색한 침묵')

    expect(errors, '랜딩 렌더 중 JS 에러가 났다').toEqual([])
  })

  test('가입 CTA를 누르면 /signup으로 간다', async ({ page }) => {
    await page.goto('/')

    // 히어로의 메인 CTA — 비로그인이면 "무료로 시작하기" 문구로 /signup 이동
    await page.locator('.landing-cta .landing-cta-main').click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('상단 내비의 시작하기 버튼도 /signup으로 간다', async ({ page }) => {
    await page.goto('/')

    // 히어로/최종 CTA도 "무료로 시작하기"라 "시작하기"만으로는 부분일치로 셋 다 걸린다.
    await page.getByRole('button', { name: '시작하기', exact: true }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('로그인 링크를 누르면 /login으로 간다', async ({ page }) => {
    await page.goto('/')

    // 헤더의 로그인 링크로 고정한다 — 히어로에도 같은 텍스트의 링크가 하나 더 있어
    // getByRole('link', { name: '로그인' })만으로는 둘 다 걸린다.
    await page.locator('.landing-nav-login').click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('쇼케이스 · 통계 · 시작 단계 등 주요 섹션이 렌더된다', async ({ page }) => {
    await page.goto('/')

    // 핀 쇼케이스: 스크롤로 화면 안에 들어와야 sticky 내부가 그려진다
    await page.locator('.showcase').scrollIntoViewIfNeeded()
    await expect(page.locator('.showcase-sticky')).toBeVisible()
    await expect(page.locator('.showcase-item')).toHaveCount(3)

    await page.locator('.landing-stats').scrollIntoViewIfNeeded()
    await expect(page.locator('.stat')).toHaveCount(4)

    await page.locator('.landing-steps').scrollIntoViewIfNeeded()
    await expect(page.locator('.landing-step')).toHaveCount(4)

    await page.locator('.landing-final').scrollIntoViewIfNeeded()
    await expect(page.getByRole('heading', { name: '다음 모임, Deverapo에서 시작하세요' })).toBeVisible()
  })
})

test.describe('랜딩 페이지 (로그인 상태)', () => {
  test('로그인 상태로 방문해도 랜딩이 그대로 보이고 CTA만 /servers로 바뀐다', async ({
    page,
    context,
  }) => {
    // LandingPage.tsx는 useAuth().token 유무로 버튼 문구·목적지만 바꿀 뿐, 로그인
    // 상태라고 해서 /servers로 자동 리다이렉트하지 않는다(App.tsx에도 그런 라우팅이 없다).
    // 실제 동작이 그렇다는 걸 소스로 확인했으니 그대로 단언한다.
    const user = await createUser('landing')
    await loginAs(context, user)

    await page.goto('/')
    await expect(page).toHaveURL('/')

    await expect(page.getByRole('button', { name: '내 서버로 →' })).toBeVisible()
    await expect(page.locator('.landing-cta .landing-cta-main')).toHaveText('내 서버로 들어가기')

    await page.locator('.landing-cta .landing-cta-main').click()
    await expect(page).toHaveURL(/\/servers/)
  })
})
