/**
 * 빙고 게임의 백엔드 호출 모음 — shared/api/client.ts의 apiFetch를 통해 백엔드 빙고 라우터와 통신한다.
 * BingoPanel이 이 함수들을 호출해 서버 상태를 가져오고 바꾼다(보드 그리기는 BingoBoard가 담당).
 */
import { apiFetch, ApiError } from '../../../shared/api/client'

export interface BingoPlayer {
  user_id: number
  display_name: string
  completed_lines: number
}

// 호출 기록 한 줄 — 몇 번째로 누가 어떤 숫자를 불렀는지
export interface BingoCall {
  number: number
  user_id: number
  display_name: string
}

// 서버가 내려주는 빙고 게임의 현재 상태 — 진행 중인 라운드가 없으면 null(404)로 처리됨
export interface BingoState {
  status: 'waiting' | 'playing' | 'finished'
  called_numbers: number[]
  my_board: number[] | null
  players: BingoPlayer[]
  winner_user_id: number | null
  // 지금 숫자를 부를 차례인 사람 (진행 중이 아니면 null)
  turn_user_id: number | null
  // 호출된 순서 그대로의 기록. called_numbers는 정렬된 집합이라 순서를 알 수 없다.
  call_log: BingoCall[]
}

// 게임 참여(또는 새 라운드 시작) 요청 — 서버가 내 새 보드를 만들어 최신 상태를 돌려준다
export function joinBingo(channelId: number) {
  return apiFetch<BingoState>(`/channels/${channelId}/bingo/join`, { method: 'POST' })
}

// 대기 → 진행 전환 (2명 이상 모였을 때만 성공)
export function startBingo(channelId: number) {
  return apiFetch<BingoState>(`/channels/${channelId}/bingo/start`, { method: 'POST' })
}

// 숫자 하나를 클릭했다고 서버에 알린다 — 서버가 호출 숫자로 등록하고 갱신된 상태를 돌려준다
export function clickBingo(channelId: number, number: number) {
  return apiFetch<BingoState>(`/channels/${channelId}/bingo/click`, {
    method: 'POST',
    body: { number },
  })
}

// 현재 상태 조회 — 아직 게임이 시작되지 않아 404가 나면 에러 대신 null로 처리해 화면을 단순하게 만든다
export async function getBingo(channelId: number): Promise<BingoState | null> {
  try {
    return await apiFetch<BingoState>(`/channels/${channelId}/bingo`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
