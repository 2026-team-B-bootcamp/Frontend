// AuthContext 정의 + useAuth 훅 + JWT 토큰에서 사용자 id를 뽑아내는 헬퍼.
// AuthContext.tsx(Provider 구현)와 분리되어 있어서, 이 값들만 쓰는 컴포넌트는
// Provider 구현체까지 몰라도 된다.
import { createContext, useContext } from 'react'

export interface AuthState {
  token: string | null
  userId: number | null
  displayName: string | null
  avatarUrl: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  setProfile: (displayName: string, avatarUrl: string | null) => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// JWT는 "헤더.페이로드.서명" 형태의 문자열. 여기선 서버 검증 없이 페이로드 부분만
// base64 디코딩해서 sub(사용자 id) 클레임을 프론트에서 바로 읽어온다.
export function userIdFromToken(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    )
    const sub = Number(json.sub)
    return Number.isFinite(sub) ? sub : null
  } catch {
    return null
  }
}

// exp(만료) 클레임을 프론트에서 미리 확인한다 — 만료된 토큰으로 화면에 들어가면
// 이후 모든 API/WS가 실패하는 "깨진 껍데기"에 갇히므로, 라우트 가드에서 미리 튕겨낸다.
// 파싱 불가하거나 이미 만료면 true(=무효). exp가 없으면 서버 검증에 맡긴다(false).
export function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof json.exp !== 'number') return false
    return json.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}
