/**
 * 사용자(계정) 관련 API 계층 — apiFetch/apiUpload(shared/api/client)로 백엔드에 요청을 보낸다.
 * ProfileModal이 이 함수들로 내 프로필을 조회/수정하고 아바타를 업로드한다.
 */
import { apiFetch, apiUpload } from '../../shared/api/client'

export interface User {
  id: number
  email: string
  display_name: string
  avatar_url: string | null
}

// 서버(모임)별 관심사 태그 3개를 등록/수정 — 같은 유저라도 서버마다 다른 태그를 가질 수 있다
export function upsertTags(serverId: number, tag1: string, tag2: string, tag3: string) {
  return apiFetch<unknown>(`/servers/${serverId}/tags`, {
    method: 'PUT',
    body: { tag1, tag2, tag3 },
  })
}

// 내 계정 정보 조회
export function getMe() {
  return apiFetch<User>('/users/me')
}

// 닉네임/이메일 수정
export function updateMe(displayName: string, email: string) {
  return apiFetch<User>('/users/me', {
    method: 'PATCH',
    body: { display_name: displayName, email },
  })
}

// 프로필 사진 업로드 (파일은 FormData로 전송)
export function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<User>('/users/me/avatar', formData)
}
