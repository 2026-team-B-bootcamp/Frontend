/**
 * 끝말잇기 게임의 서버 통신 함수 모음.
 * shared/api/client의 apiFetch를 통해 백엔드 끝말잇기 라우터
 * (/channels/:channelId/wordchain/*)를 호출한다. WordChainPanel이 이 함수들을 사용한다.
 * 단어 규칙(첫 글자 일치, 중복 등) 검증은 서버 몫이며, submitWord는 그 결과가 반영된
 * 최신 게임 상태를 그대로 돌려받는다.
 */
import { apiFetch, ApiError } from '../../../shared/api/client'

export interface WordChainPlayer {
  user_id: number
  display_name: string
  alive: boolean
}

export interface WordEntry {
  user_id: number
  display_name: string
  word: string
}

export interface WordChainState {
  status: 'waiting' | 'playing' | 'finished'
  players: WordChainPlayer[]
  turn_user_id: number | null
  words: WordEntry[]
  winner_user_id: number | null
  seconds_left: number | null
  last_event: string | null
}

export function joinWordChain(channelId: number) {
  return apiFetch<WordChainState>(`/channels/${channelId}/wordchain/join`, {
    method: 'POST',
  })
}

export function startWordChain(channelId: number) {
  return apiFetch<WordChainState>(`/channels/${channelId}/wordchain/start`, {
    method: 'POST',
  })
}

export function submitWord(channelId: number, word: string) {
  return apiFetch<WordChainState>(`/channels/${channelId}/wordchain/submit`, {
    method: 'POST',
    body: { word },
  })
}

// 아직 채널에 끝말잇기 게임이 생성되지 않은 경우 서버가 404를 반환하는데,
// 이 경우 에러를 던지지 않고 null로 변환해 "게임 없음" 상태로 다룰 수 있게 한다.
export async function getWordChain(channelId: number): Promise<WordChainState | null> {
  try {
    return await apiFetch<WordChainState>(`/channels/${channelId}/wordchain`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
