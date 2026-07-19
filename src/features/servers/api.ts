import { apiFetch } from '../../shared/api/client'

export interface Server {
  id: number
  name: string
  invite_code: string
}

export interface Channel {
  id: number
  server_id: number
  name: string
}

export interface Member {
  user_id: number
  display_name: string
  tags: string[]
  common_with_me: string[]
}

export function createServer(name: string) {
  return apiFetch<Server>('/servers', { method: 'POST', body: { name } })
}

export function joinServer(invite_code: string) {
  return apiFetch<Server>('/servers/join', { method: 'POST', body: { invite_code } })
}

export function listServers() {
  return apiFetch<Server[]>('/servers')
}

export function listChannels(serverId: number) {
  return apiFetch<Channel[]>(`/servers/${serverId}/channels`)
}

export function createChannel(serverId: number, name: string) {
  return apiFetch<Channel>(`/servers/${serverId}/channels`, {
    method: 'POST',
    body: { name },
  })
}

export function getMembers(serverId: number) {
  return apiFetch<Member[]>(`/servers/${serverId}/members`)
}
