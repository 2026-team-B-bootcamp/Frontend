import { apiFetch, ApiError } from '../../../shared/api/client'

export interface BingoPlayer {
  user_id: number
  display_name: string
  completed_lines: number
}

export interface BingoState {
  called_numbers: number[]
  my_board: number[] | null
  players: BingoPlayer[]
  winner_user_id: number | null
}

export function joinBingo(channelId: number) {
  return apiFetch<BingoState>(`/channels/${channelId}/bingo/join`, { method: 'POST' })
}

export function clickBingo(channelId: number, number: number) {
  return apiFetch<BingoState>(`/channels/${channelId}/bingo/click`, {
    method: 'POST',
    body: { number },
  })
}

export async function getBingo(channelId: number): Promise<BingoState | null> {
  try {
    return await apiFetch<BingoState>(`/channels/${channelId}/bingo`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
