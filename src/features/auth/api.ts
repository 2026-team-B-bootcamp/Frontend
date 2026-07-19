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
