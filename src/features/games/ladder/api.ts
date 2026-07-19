/**
 * 사다리타기 게임의 서버 통신 함수 모음.
 * shared/api/client의 apiFetch를 통해 백엔드 사다리타기 라우터
 * (/channels/:channelId/ladder/*)를 호출한다. LadderPanel이 이 함수들을 사용한다.
 */
import { apiFetch, ApiError } from '../../../shared/api/client'

export interface LadderEntry {
  id: number
  label: string
  added_by: string
}

export interface LadderState {
  status: 'waiting' | 'revealed'
  participants: LadderEntry[]
  results: LadderEntry[]
  rungs: boolean[][] | null
  assignment: number[] | null
  run_by: string | null
}

export function joinLadder(channelId: number) {
  return apiFetch<LadderState>(`/channels/${channelId}/ladder/join`, { method: 'POST' })
}

export function addParticipant(channelId: number, label: string) {
  return apiFetch<LadderState>(`/channels/${channelId}/ladder/participants`, {
    method: 'POST',
    body: { label },
  })
}

export function removeParticipant(channelId: number, entryId: number) {
  return apiFetch<LadderState>(`/channels/${channelId}/ladder/participants/${entryId}`, {
    method: 'DELETE',
  })
}

export function addResult(channelId: number, label: string) {
  return apiFetch<LadderState>(`/channels/${channelId}/ladder/results`, {
    method: 'POST',
    body: { label },
  })
}

export function removeResult(channelId: number, entryId: number) {
  return apiFetch<LadderState>(`/channels/${channelId}/ladder/results/${entryId}`, {
    method: 'DELETE',
  })
}

export function runLadder(channelId: number) {
  return apiFetch<LadderState>(`/channels/${channelId}/ladder/run`, { method: 'POST' })
}

export function resetLadder(channelId: number) {
  return apiFetch<LadderState>(`/channels/${channelId}/ladder/reset`, { method: 'POST' })
}

// 아직 채널에 사다리 게임이 생성되지 않은 경우 서버가 404를 반환하는데,
// 이 경우 에러를 던지지 않고 null로 변환해 "게임 없음" 상태로 다룰 수 있게 한다.
export async function getLadder(channelId: number): Promise<LadderState | null> {
  try {
    return await apiFetch<LadderState>(`/channels/${channelId}/ladder`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
