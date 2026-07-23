// auth 도메인의 실제 백엔드 요청 모음. AuthContext.tsx가 이 함수들을 호출해서
// apiFetch(shared/api/client.ts)를 거쳐 백엔드로 로그인/회원가입 요청을 보낸다.
import { apiFetch } from '../../shared/api/client'

export interface TokenResponse {
  access_token: string
  token_type: string
}

export function signup(email: string, password: string, display_name: string) {
  return apiFetch<TokenResponse>('/auth/signup', {
    method: 'POST',
    body: { email, password, display_name },
  })
}

export function login(email: string, password: string) {
  return apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

// 서버측 토큰 무효화(전 기기 로그아웃). 현재 토큰의 버전을 올려 이후 옛 토큰을 거부시킨다.
export function logout() {
  return apiFetch<void>('/auth/logout', { method: 'POST' })
}
