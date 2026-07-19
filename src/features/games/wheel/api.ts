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

export async function getWheel(channelId: number): Promise<WheelState | null> {
  try {
    return await apiFetch<WheelState>(`/channels/${channelId}/wheel`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
