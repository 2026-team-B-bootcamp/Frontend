/**
 * 초성퀴즈(폭탄 돌리기) 게임의 서버 통신 함수 모음.
 * shared/api/client의 apiFetch를 통해 백엔드 초성퀴즈 라우터
 * (/channels/:channelId/chosung/*)를 호출한다. ChosungPanel이 이 함수들을 사용한다.
 * 초성 일치·중복 검증은 서버 몫이며, submitChosung은 그 결과가 반영된 최신 상태를
 * 그대로 돌려받는다.
 */
import { apiFetch, ApiError } from '../../../shared/api/client'

export interface ChosungPlayer {
  user_id: number
  display_name: string
  alive: boolean
}

export interface ChosungState {
  status: 'waiting' | 'playing' | 'finished'
  round: number
  players: ChosungPlayer[]
  turn_user_id: number | null
  prompt: string | null
  words: string[]
  loser_user_id: number | null
  seconds_left: number | null
  last_event: string | null
}

export function joinChosung(channelId: number) {
  return apiFetch<ChosungState>(`/channels/${channelId}/chosung/join`, {
    method: 'POST',
  })
}

export function startChosung(channelId: number) {
  return apiFetch<ChosungState>(`/channels/${channelId}/chosung/start`, {
    method: 'POST',
  })
}

export function submitChosung(channelId: number, word: string) {
  return apiFetch<ChosungState>(`/channels/${channelId}/chosung/submit`, {
    method: 'POST',
    body: { word },
  })
}

// 아직 채널에 초성퀴즈 게임이 생성되지 않은 경우 서버가 404를 반환하는데,
// 이 경우 에러를 던지지 않고 null로 변환해 "게임 없음" 상태로 다룰 수 있게 한다.
export async function getChosung(channelId: number): Promise<ChosungState | null> {
  try {
    return await apiFetch<ChosungState>(`/channels/${channelId}/chosung`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
