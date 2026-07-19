/**
 * 돌림판 게임의 서버 통신 함수 모음.
 * shared/api/client의 apiFetch를 통해 백엔드 돌림판 라우터
 * (/channels/:channelId/wheel/*)를 호출한다. WheelPanel이 이 함수들을 사용한다.
 */
import { apiFetch, ApiError } from '../../../shared/api/client'

export interface WheelOption {
  id: number
  label: string
  added_by: string
}

export interface WheelState {
  options: WheelOption[]
  result_option_id: number | null
  spun_by: string | null
}

export function joinWheel(channelId: number) {
  return apiFetch<WheelState>(`/channels/${channelId}/wheel/join`, { method: 'POST' })
}

export function addWheelOption(channelId: number, label: string) {
  return apiFetch<WheelState>(`/channels/${channelId}/wheel/options`, {
    method: 'POST',
    body: { label },
  })
}

export function removeWheelOption(channelId: number, optionId: number) {
  return apiFetch<WheelState>(`/channels/${channelId}/wheel/options/${optionId}`, {
    method: 'DELETE',
  })
}

export function spinWheel(channelId: number) {
  return apiFetch<WheelState>(`/channels/${channelId}/wheel/spin`, { method: 'POST' })
}

export function resetWheel(channelId: number) {
  return apiFetch<WheelState>(`/channels/${channelId}/wheel/reset`, { method: 'POST' })
}

// 아직 채널에 돌림판 게임이 생성되지 않은 경우 서버가 404를 반환하는데,
// 이 경우 에러를 던지지 않고 null로 변환해 "게임 없음" 상태로 다룰 수 있게 한다.
export async function getWheel(channelId: number): Promise<WheelState | null> {
  try {
    return await apiFetch<WheelState>(`/channels/${channelId}/wheel`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
