/**
 * 오목 게임의 백엔드 호출 모음 — shared/api/client.ts의 apiFetch를 통해 백엔드 오목 라우터와 통신한다.
 * OmokPanel이 이 함수들을 호출해 서버 상태를 가져오고 바꾼다(보드 그리기는 OmokBoard가 담당).
 */
import { apiFetch, ApiError } from '../../../shared/api/client'

// 돌 색을 숫자로 표현 — 보드 배열의 각 칸 값도 0(빈 칸)/BLACK/WHITE 중 하나다
export const BLACK = 1
export const WHITE = 2

export interface OmokPlayer {
  user_id: number
  display_name: string
  color: number
}

// 서버가 내려주는 오목 게임의 현재 상태
export interface OmokState {
  status: 'waiting' | 'playing' | 'finished'
  board: number[][]
  players: OmokPlayer[]
  turn: number | null
  turn_user_id: number | null
  winner_user_id: number | null
  winning_line: number[][] | null
  last_move: number[] | null
}

// 게임 참여(또는 재대국 시작) 요청
export function joinOmok(channelId: number) {
  return apiFetch<OmokState>(`/channels/${channelId}/omok/join`, { method: 'POST' })
}

// (row, col) 칸에 내 돌을 두겠다고 서버에 요청 — 서버가 착수 유효성·승패 판정을 처리한다
export function placeStone(channelId: number, row: number, col: number) {
  return apiFetch<OmokState>(`/channels/${channelId}/omok/place`, {
    method: 'POST',
    body: { row, col },
  })
}

// 대국을 초기화(그만두기)하는 요청
export function resetOmok(channelId: number) {
  return apiFetch<OmokState>(`/channels/${channelId}/omok/reset`, { method: 'POST' })
}

// 현재 상태 조회 — 아직 게임이 시작되지 않아 404가 나면 에러 대신 null로 처리해 화면을 단순하게 만든다
export async function getOmok(channelId: number): Promise<OmokState | null> {
  try {
    return await apiFetch<OmokState>(`/channels/${channelId}/omok`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
