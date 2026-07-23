/**
 * 틱택토 게임의 백엔드 호출 모음 — apiFetch로 백엔드 tictactoe 라우터와 통신한다.
 * TicTacToePanel이 이 함수들로 서버 상태를 가져오고 바꾼다(판 그리기는 TicTacToeBoard가 담당).
 * 구조는 오목(omok/api.ts)과 동일하고, 마크만 X(선공)/O로 다르다.
 */
import { apiFetch, ApiError } from '../../../shared/api/client'

export const X = 1
export const O = 2

export interface TicTacToePlayer {
  user_id: number
  display_name: string
  mark: number
}

export interface TicTacToeState {
  status: 'waiting' | 'playing' | 'finished'
  board: number[][]
  players: TicTacToePlayer[]
  turn: number | null
  turn_user_id: number | null
  winner_user_id: number | null
  winning_line: number[][] | null
  last_move: number[] | null
}

export function joinTicTacToe(channelId: number) {
  return apiFetch<TicTacToeState>(`/channels/${channelId}/tictactoe/join`, { method: 'POST' })
}

export function placeMark(channelId: number, row: number, col: number) {
  return apiFetch<TicTacToeState>(`/channels/${channelId}/tictactoe/place`, {
    method: 'POST',
    body: { row, col },
  })
}

export function resetTicTacToe(channelId: number) {
  return apiFetch<TicTacToeState>(`/channels/${channelId}/tictactoe/reset`, { method: 'POST' })
}

export async function getTicTacToe(channelId: number): Promise<TicTacToeState | null> {
  try {
    return await apiFetch<TicTacToeState>(`/channels/${channelId}/tictactoe`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
