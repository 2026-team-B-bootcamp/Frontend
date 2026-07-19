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

export async function getWordChain(channelId: number): Promise<WordChainState | null> {
  try {
    return await apiFetch<WordChainState>(`/channels/${channelId}/wordchain`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
