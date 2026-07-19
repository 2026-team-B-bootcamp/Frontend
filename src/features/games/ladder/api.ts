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

export async function getLadder(channelId: number): Promise<LadderState | null> {
  try {
    return await apiFetch<LadderState>(`/channels/${channelId}/ladder`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
