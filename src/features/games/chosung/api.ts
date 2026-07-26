/**
 * 초성퀴즈(폭탄 돌리기) 게임의 서버 통신 함수 모음.
 * shared/api/client의 apiFetch를 통해 백엔드 초성퀴즈 라우터
 * (/channels/:channelId/chosung/*)를 호출한다. ChosungPanel이 이 함수들을 사용한다.
 * 초성 일치·중복 검증은 서버 몫이며, submitChosung은 그 결과가 반영된 최신 상태를
 * 그대로 돌려받는다.
 */
import { apiFetch, apiFetchOrNull } from '../../../shared/api/client'
import type { BombGameState } from '../bombGame'

export interface ChosungState extends BombGameState {
  round: number
  prompt: string | null
  words: string[]
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
export function getChosung(channelId: number) {
  return apiFetchOrNull<ChosungState>(`/channels/${channelId}/chosung`)
}
