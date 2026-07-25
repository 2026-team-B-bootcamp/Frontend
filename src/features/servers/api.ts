/**
 * 서버(모임)/채널/멤버 관련 API 계층 — apiFetch(shared/api/client)로 백엔드에 요청을 보낸다.
 * ChatPage, ChannelSidebar, MembersPanel 등 여러 컴포넌트가 이 함수들을 통해서만 백엔드와 통신한다.
 */
import { apiFetch } from '../../shared/api/client'

export interface Server {
  id: number
  name: string
  invite_code: string
  // 이 모임을 만든 사람(방장). 멤버 내보내기 버튼을 누구에게 보일지의 기준.
  owner_user_id: number | null
}

export interface Channel {
  id: number
  server_id: number
  name: string
}

export interface Member {
  user_id: number
  display_name: string
  // 프로필 사진 (없으면 이름 첫 글자 아바타로 대체)
  avatar_url: string | null
  tags: string[]
  common_with_me: string[]
  // 이 멤버가 모임을 만든 사람인가 — 방장 자신은 내보낼 수 없다
  is_owner: boolean
}

// 새 서버(모임) 생성
export function createServer(name: string) {
  return apiFetch<Server>('/servers', { method: 'POST', body: { name } })
}

// 초대코드로 기존 서버에 참여
export function joinServer(invite_code: string) {
  return apiFetch<Server>('/servers/join', { method: 'POST', body: { invite_code } })
}

// 내가 속한 서버 목록
export function listServers() {
  return apiFetch<Server[]>('/servers')
}

// 특정 서버의 채널 목록
export function listChannels(serverId: number) {
  return apiFetch<Channel[]>(`/servers/${serverId}/channels`)
}

// 채널 생성
export function createChannel(serverId: number, name: string) {
  return apiFetch<Channel>(`/servers/${serverId}/channels`, {
    method: 'POST',
    body: { name },
  })
}

// 서버(모임) 이름 변경 — 멤버면 누구나 할 수 있다
export function renameServer(serverId: number, name: string) {
  return apiFetch<Server>(`/servers/${serverId}`, { method: 'PATCH', body: { name } })
}

// 채널 이름 변경
export function renameChannel(serverId: number, channelId: number, name: string) {
  return apiFetch<Channel>(`/servers/${serverId}/channels/${channelId}`, {
    method: 'PATCH',
    body: { name },
  })
}

// 서버 멤버 목록 (각 멤버의 관심사 태그, 나와 겹치는 태그 포함)
export function getMembers(serverId: number) {
  return apiFetch<Member[]>(`/servers/${serverId}/members`)
}

// 멤버 내보내기 — 모임을 만든 사람만 호출할 수 있다(아니면 403)
export function kickMember(serverId: number, userId: number) {
  return apiFetch<void>(`/servers/${serverId}/members/${userId}`, { method: 'DELETE' })
}
