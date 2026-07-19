import { apiFetch } from '../../shared/api/client'

export interface Message {
  id: number
  user_id: number
  display_name: string
  tags: string[]
  content: string
  created_at: string
}

export interface IcebreakerResponse {
  question: string
}

export function sendMessage(channelId: number, content: string) {
  return apiFetch<Message>(`/channels/${channelId}/messages`, {
    method: 'POST',
    body: { content },
  })
}

export function listMessages(channelId: number, afterId?: number) {
  const qs = afterId ? `?after_id=${afterId}` : ''
  return apiFetch<Message[]>(`/channels/${channelId}/messages${qs}`)
}

export function getIcebreaker(serverId: number, userId: number) {
  return apiFetch<IcebreakerResponse>(
    `/servers/${serverId}/members/${userId}/icebreaker`,
    { method: 'POST' },
  )
}
