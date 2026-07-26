import { expect, test } from '@playwright/test'
import { createServer, createUser, joinServer, openAs } from './fixtures'

/**
 * 미니게임 실제 대국 — 빙고 외 나머지 5종(오목·틱택토·끝말잇기·밸런스·초성퀴즈).
 *
 * games.spec.ts는 "화면이 뜨고 JS 에러가 없다"까지만 본다. 오목·틱택토는 승리 판정
 * 로직(find_winning_line)이 있는데 그 경로가 한 번도 실행되지 않은 채였다. 이 파일은
 * 두 사람이 실제로 규칙대로 판을 굴려 그 갭을 메운다. 준비물(계정·서버·참여)은
 * fixtures의 API 헬퍼로 만들고, 대국 자체만 UI로 클릭해서 검증한다.
 */

/** 슬랙 링크가 데려가는 것과 같은 전용 화면 경로. FeaturePage는 embedded라 드래그가
 *  없어서 뷰포트(데스크톱/모바일) 영향을 가장 덜 받는다. */
function playUrl(serverId: number, channelId: number, feature: string) {
  return `/servers/${serverId}/channels/${channelId}/play/${feature}`
}

async function twoPlayers(browser: Parameters<typeof openAs>[0]) {
  const host = await createUser('play-host')
  const server = await createServer(host)
  const guest = await createUser('play-guest')
  await joinServer(guest, server.inviteCode)

  const a = await openAs(browser, host, server)
  const b = await openAs(browser, guest, server)
  return { host, guest, server, a, b }
}

test.describe('틱택토 한 판', () => {
  test('열기 → 참여 → 번갈아 두기 → 3목 승리', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      const url = playUrl(server.id, server.channelId, 'tictactoe')
      await a.page.goto(url)
      await b.page.goto(url)

      // ① A가 판을 연다(선공 X) → B가 참여(후공 O). 2명이 모이면 바로 시작하고
      //   별도의 "게임 시작" 버튼은 없다(오목도 동일 — 빙고와 다른 부분).
      await a.page.getByRole('button', { name: '게임 열기' }).click()
      await expect(b.page.getByRole('button', { name: '게임 참여' })).toBeVisible({
        timeout: 20_000,
      })
      await b.page.getByRole('button', { name: '게임 참여' }).click()

      // ② B의 참여 응답은 B 화면엔 곧바로 반영되지만, A(선공)가 자기 차례임을 알려면
      //   B의 참여가 WS 브로드캐스트로 A에게 넘어오는 걸 기다려야 한다.
      await expect(a.page.locator('.panel-note')).toHaveText('내 차례예요 — 둘 곳을 누르세요', {
        timeout: 20_000,
      })

      // ③ 차례가 아닌 B의 판은 전부 잠겨 있어야 한다
      await expect(b.page.locator('.ttt-cell').first()).toBeDisabled()

      const ttt = a.page.locator('.ttt-cell')
      const tttB = b.page.locator('.ttt-cell')

      // ④ X(A)가 (0,0)(0,1)(0,2)를, O(B)가 (1,0)(1,1)을 둬서 A가 윗줄로 승리한다.
      //   .ttt-cell은 board를 행 우선으로 그리므로 인덱스 = row*3 + col.
      await ttt.nth(0).click() // A: (0,0)
      await expect(b.page.locator('.panel-note')).toHaveText('내 차례예요 — 둘 곳을 누르세요', {
        timeout: 20_000,
      })

      await tttB.nth(3).click() // B: (1,0)
      await expect(a.page.locator('.panel-note')).toHaveText('내 차례예요 — 둘 곳을 누르세요', {
        timeout: 20_000,
      })

      await ttt.nth(1).click() // A: (0,1)
      await expect(b.page.locator('.panel-note')).toHaveText('내 차례예요 — 둘 곳을 누르세요', {
        timeout: 20_000,
      })

      await tttB.nth(4).click() // B: (1,1)
      await expect(a.page.locator('.panel-note')).toHaveText('내 차례예요 — 둘 곳을 누르세요', {
        timeout: 20_000,
      })

      await ttt.nth(2).click() // A: (0,2) → 가로 3목 완성, 승리

      // ⑤ 승리 배너와 승리 줄 하이라이트가 양쪽 화면에 다 반영돼야 한다
      await expect(a.page.locator('.banner.win')).toContainText('승리했어요', { timeout: 20_000 })
      await expect(b.page.locator('.banner.lose')).toContainText('이겼어요', { timeout: 20_000 })
      await expect(a.page.locator('.ttt-cell.win')).toHaveCount(3)
      await expect(b.page.locator('.ttt-cell.win')).toHaveCount(3, { timeout: 20_000 })
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})

test.describe('오목 몇 수', () => {
  test('열기 → 참여 → 서로 착수하며 턴이 교대된다', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      const url = playUrl(server.id, server.channelId, 'omok')
      await a.page.goto(url)
      await b.page.goto(url)

      await a.page.getByRole('button', { name: '게임 열기' }).click()
      await expect(b.page.getByRole('button', { name: '게임 참여' })).toBeVisible({
        timeout: 20_000,
      })
      await b.page.getByRole('button', { name: '게임 참여' }).click()

      // A(흑, 선공)의 차례가 자기 화면에도 뜨는 걸 기다린다
      await expect(a.page.locator('.panel-note')).toHaveText('내 차례예요 — 둘 곳을 누르세요', {
        timeout: 20_000,
      })
      await expect(a.page.locator('.omok-cell')).toHaveCount(225)
      await expect(b.page.locator('.omok-cell')).toHaveCount(225)

      // 차례가 아닌 B의 판은 잠겨 있어야 한다 — 아무 빈 칸이나 하나 골라 확인
      // (exact: true 필수 — "1행 1열"은 "11행 1열" 등의 부분 문자열과도 매치된다)
      await expect(b.page.getByRole('button', { name: '1행 1열', exact: true })).toBeDisabled()

      // 15줄 판이라 5목까지는 수가 매우 길다. 여기서는 승리까지 가지 않고
      // 착수가 상대 화면에 실시간 반영되는지 + 턴 교대까지만 본다.
      await a.page.getByRole('button', { name: '8행 8열' }).click() // A: 흑
      await expect(b.page.locator('.panel-note')).toHaveText('내 차례예요 — 둘 곳을 누르세요', {
        timeout: 20_000,
      })
      await expect(b.page.locator('.omok-stone.black')).toHaveCount(1)

      await b.page.getByRole('button', { name: '1행 1열', exact: true }).click() // B: 백
      await expect(a.page.locator('.panel-note')).toHaveText('내 차례예요 — 둘 곳을 누르세요', {
        timeout: 20_000,
      })
      await expect(a.page.locator('.omok-stone.white')).toHaveCount(1)

      await a.page.getByRole('button', { name: '8행 9열' }).click() // A: 흑 한 수 더
      await expect(b.page.locator('.omok-stone.black')).toHaveCount(2, { timeout: 20_000 })
      await expect(b.page.locator('.panel-note')).toHaveText('내 차례예요 — 둘 곳을 누르세요', {
        timeout: 20_000,
      })
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})

test.describe('끝말잇기', () => {
  test('규칙에 맞게 이으면 폭탄이 다음 사람에게 넘어간다', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      const url = playUrl(server.id, server.channelId, 'wordchain')
      await a.page.goto(url)
      await b.page.goto(url)

      await a.page.getByRole('button', { name: '게임 열기' }).click()
      await expect(b.page.getByRole('button', { name: '참여하기' })).toBeVisible({
        timeout: 20_000,
      })
      await b.page.getByRole('button', { name: '참여하기' }).click()

      const startBtn = a.page.getByRole('button', { name: '시작하기' })
      await expect(startBtn).toBeEnabled({ timeout: 20_000 })
      await startBtn.click()

      // A가 폭탄을 들고 시작한다 — B 화면에 반영되는 걸 기다린다
      await expect(b.page.locator('.wc-turn-name')).toContainText('폭탄 보유', {
        timeout: 20_000,
      })
      // 차례가 아닌 B의 입력창은 잠겨 있어야 한다
      await expect(b.page.locator('.wc-input input')).toBeDisabled()

      // 첫 단어는 자유 — 실제 사전 검사가 없으므로(wordchain/logic.py는 한글 2~10자만
      // 본다) 임의의 한글 문자열로도 규칙을 정확히 통제할 수 있다.
      await a.page.locator('.wc-input input').fill('가나')
      await a.page.getByRole('button', { name: '넘기기' }).click()

      // B 화면에 그 단어가 뜨고 차례가 넘어온다
      await expect(b.page.locator('.wc-chip', { hasText: '가나' })).toBeVisible({
        timeout: 20_000,
      })
      await expect(b.page.locator('.wc-turn-name')).toContainText('내 차례', { timeout: 20_000 })

      // '가나'의 끝글자 '나'로 시작하는 단어를 잇는다
      await b.page.locator('.wc-input input').fill('나비')
      await b.page.getByRole('button', { name: '넘기기' }).click()

      await expect(a.page.locator('.wc-chip', { hasText: '나비' })).toBeVisible({
        timeout: 20_000,
      })
      await expect(a.page.locator('.wc-turn-name')).toContainText('내 차례', { timeout: 20_000 })
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })

  test('끝 글자가 안 맞는 단어는 거부된다', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      const url = playUrl(server.id, server.channelId, 'wordchain')
      await a.page.goto(url)
      await b.page.goto(url)

      await a.page.getByRole('button', { name: '게임 열기' }).click()
      await expect(b.page.getByRole('button', { name: '참여하기' })).toBeVisible({
        timeout: 20_000,
      })
      await b.page.getByRole('button', { name: '참여하기' }).click()
      const startBtn = a.page.getByRole('button', { name: '시작하기' })
      await expect(startBtn).toBeEnabled({ timeout: 20_000 })
      await startBtn.click()
      await expect(b.page.locator('.wc-turn-name')).toContainText('폭탄 보유', {
        timeout: 20_000,
      })

      await a.page.locator('.wc-input input').fill('가나')
      await a.page.getByRole('button', { name: '넘기기' }).click()
      await expect(b.page.locator('.wc-turn-name')).toContainText('내 차례', { timeout: 20_000 })

      // '가나'의 끝글자는 '나'인데, 엉뚱한 '타'로 시작하는 단어를 낸다 → 서버가 거부해야 한다
      await b.page.locator('.wc-input input').fill('타조')
      await b.page.getByRole('button', { name: '넘기기' }).click()

      await expect(b.page.locator('.error')).toContainText('시작하는 단어여야')
      // 거부됐으니 단어 목록은 그대로고, 차례도 여전히 B에게 남아 있어야 한다
      await expect(b.page.locator('.wc-chip')).toHaveCount(1)
      await expect(b.page.locator('.wc-turn-name')).toContainText('내 차례')
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})

// 초성퀴즈는 실제 사전 단어인지 검증하지 않고 "초성이 프롬프트와 글자수·글자별로
// 일치하는지"만 본다(chosung/logic.py의 initials 비교). 그래서 프롬프트의 각 초성에
// 모음 'ㅏ'(중성 인덱스 0)만 붙여 합성한 인공 단어로도 정답 판정을 통과할 수 있다 —
// 서버가 무작위로 어떤 문제를 내든 이 함수로 결정적으로 정답을 만들어낼 수 있다.
const CHOSUNG_LETTERS = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

function answerForPrompt(prompt: string): string {
  return [...prompt]
    .map((ch) => {
      const idx = CHOSUNG_LETTERS.indexOf(ch)
      return String.fromCharCode(0xac00 + idx * 588)
    })
    .join('')
}

test.describe('초성퀴즈', () => {
  test('문제 노출 → 정답 제출 → 다음 사람에게 넘어간다', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      const url = playUrl(server.id, server.channelId, 'chosung')
      await a.page.goto(url)
      await b.page.goto(url)

      await a.page.getByRole('button', { name: '게임 열기' }).click()
      await expect(b.page.getByRole('button', { name: '참여하기' })).toBeVisible({
        timeout: 20_000,
      })
      await b.page.getByRole('button', { name: '참여하기' }).click()

      const startBtn = a.page.getByRole('button', { name: '시작하기' })
      await expect(startBtn).toBeEnabled({ timeout: 20_000 })
      await startBtn.click()

      // A가 폭탄을 들고 시작 — B 화면에 문제가 뜨는 걸 기다린다
      await expect(b.page.locator('.cho-prompt')).toBeVisible({ timeout: 20_000 })
      // 차례가 아닌 B의 입력창은 잠겨 있어야 한다
      await expect(b.page.locator('.cho-input input')).toBeDisabled()

      const prompt1 = (await a.page.locator('.cho-prompt').innerText()).trim()
      await a.page.locator('.cho-input input').fill(answerForPrompt(prompt1))
      await a.page.getByRole('button', { name: '넘기기' }).click()

      // 정답이면 B에게 폭탄이 넘어가고 새 문제가 뜬다
      await expect(b.page.locator('.cho-holder-me')).toBeVisible({ timeout: 20_000 })
      await expect(b.page.locator('.cho-chip')).toHaveCount(1)

      const prompt2 = (await b.page.locator('.cho-prompt').innerText()).trim()
      await b.page.locator('.cho-input input').fill(answerForPrompt(prompt2))
      await b.page.getByRole('button', { name: '넘기기' }).click()

      await expect(a.page.locator('.cho-holder-me')).toBeVisible({ timeout: 20_000 })
      await expect(a.page.locator('.cho-chip')).toHaveCount(2)
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})

test.describe('밸런스게임', () => {
  test('투표하면 양쪽 화면에 집계가 반영된다', async ({ browser }) => {
    const { server, a, b } = await twoPlayers(browser)
    try {
      const url = playUrl(server.id, server.channelId, 'balance')
      await a.page.goto(url)
      await b.page.goto(url)

      // 밸런스게임은 턴이 없는 다수 참여형이라 별도 "참여" 단계가 없다 — 누구나 열 수 있다.
      // A가 열기 전에 B의 화면(및 WS 구독)이 먼저 자리 잡아야 브로드캐스트를 놓치지 않는다.
      await expect(b.page.getByPlaceholder('선택지 A (예: 부먹)')).toBeVisible()
      await a.page.getByPlaceholder('선택지 A (예: 부먹)').fill('부먹')
      await a.page.getByPlaceholder('선택지 B (예: 찍먹)').fill('찍먹')
      await a.page.getByRole('button', { name: '밸런스 열기' }).click()

      // B는 아무 것도 누른 적 없어도 브로드캐스트로 투표 화면을 받아야 한다
      await expect(b.page.locator('.bal-option.a')).toContainText('부먹', { timeout: 20_000 })
      await expect(b.page.locator('.bal-option.b')).toContainText('찍먹')

      await b.page.locator('.bal-option.a').click()
      await expect(a.page.locator('.bal-option.a')).toContainText('1표', { timeout: 20_000 })

      await a.page.locator('.bal-option.b').click()
      await expect(b.page.locator('.bal-option.b')).toContainText('1표', { timeout: 20_000 })

      // 1:1이니 양쪽 다 50%로 집계돼야 한다
      await expect(a.page.locator('.bal-option.a')).toContainText('50%')
      await expect(b.page.locator('.bal-option.b')).toContainText('50%')
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})
