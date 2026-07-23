/**
 * 밸런스게임(게시글형 토론 + 제한시간) 백엔드 호출 모음 — apiFetch로 balance 라우터와 통신한다.
 * BalancePanel이 이 함수들로 시작/투표/의견/조회/초기화를 한다.
 */
import { apiFetch, ApiError } from '../../../shared/api/client'

export type Side = 'a' | 'b'

export interface BalanceComment {
  user_id: number
  display_name: string
  side: Side | null
  text: string
}

export interface BalanceState {
  active: boolean
  option_a: string | null
  option_b: string | null
  count_a: number
  count_b: number
  my_vote: Side | null
  comments: BalanceComment[]
  ends_at: number | null
  finished: boolean
  host_user_id: number | null
  host_name: string | null
}

export function startBalance(channelId: number, optionA: string, optionB: string) {
  return apiFetch<BalanceState>(`/channels/${channelId}/balance/start`, {
    method: 'POST',
    body: { option_a: optionA, option_b: optionB },
  })
}

export function voteBalance(channelId: number, side: Side) {
  return apiFetch<BalanceState>(`/channels/${channelId}/balance/vote`, {
    method: 'POST',
    body: { side },
  })
}

export function commentBalance(channelId: number, text: string) {
  return apiFetch<BalanceState>(`/channels/${channelId}/balance/comment`, {
    method: 'POST',
    body: { text },
  })
}

export function resetBalance(channelId: number) {
  return apiFetch<BalanceState>(`/channels/${channelId}/balance/reset`, { method: 'POST' })
}

export async function getBalance(channelId: number): Promise<BalanceState | null> {
  try {
    return await apiFetch<BalanceState>(`/channels/${channelId}/balance`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
