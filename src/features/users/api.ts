import { apiFetch } from '../../shared/api/client'

export function upsertTags(serverId: number, tag1: string, tag2: string, tag3: string) {
  return apiFetch<unknown>(`/servers/${serverId}/tags`, {
    method: 'PUT',
    body: { tag1, tag2, tag3 },
  })
}
