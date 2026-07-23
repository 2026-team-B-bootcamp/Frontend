// 로그인 상태(토큰, 사용자 정보)를 앱 전체에 공급하는 Provider.
// main.tsx에서 App을 감싸고 있어서, 모든 화면이 useAuth()로 이 상태를 꺼내 쓸 수 있다.
// 로그인/회원가입 시 features/auth/api.ts로 서버에 요청을 보내고, 받은 토큰을
// client.ts의 setToken을 통해 localStorage에 저장한다.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getToken, setToken as persistToken } from '../../shared/api/client'
import * as authApi from './api'
import { AuthContext, userIdFromToken, type AuthState } from './authContext'

const NAME_KEY = 'display_name'
const AVATAR_KEY = 'avatar_url'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [displayName, setDisplayName] = useState<string | null>(
    () => localStorage.getItem(NAME_KEY),
  )
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => localStorage.getItem(AVATAR_KEY))

  // 로그인/회원가입 성공 시 호출: 토큰을 localStorage(persistToken)와 React 상태 둘 다에 반영해서
  // 다음 API 요청부터 자동으로 인증 헤더가 붙게 하고, 화면도 즉시 로그인 상태로 리렌더링되게 한다
  const applyToken = useCallback((newToken: string, name: string | null) => {
    persistToken(newToken)
    setTokenState(newToken)
    if (name) {
      localStorage.setItem(NAME_KEY, name)
      setDisplayName(name)
    }
  }, [])

  const setProfile = useCallback((name: string, avatar: string | null) => {
    localStorage.setItem(NAME_KEY, name)
    setDisplayName(name)
    if (avatar) localStorage.setItem(AVATAR_KEY, avatar)
    else localStorage.removeItem(AVATAR_KEY)
    setAvatarUrl(avatar)
  }, [])

  // authApi.login -> apiFetch로 POST /auth/login 요청 -> 응답의 access_token을 저장하는 흐름
  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password)
      applyToken(res.access_token, null)
    },
    [applyToken],
  )

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await authApi.signup(email, password, name)
      applyToken(res.access_token, name)
    },
    [applyToken],
  )

  // 토큰과 프로필 정보를 모두 지워 로그아웃 상태로 되돌린다 (persistToken(null)이 localStorage에서도 제거)
  const logout = useCallback(() => {
    // 서버측 토큰 무효화(전 기기 로그아웃)를 먼저 시도한다. getToken()이 아직
    // 유효 토큰을 읽는 시점(persistToken(null) 이전)에 요청이 나가야 하므로 여기서 호출.
    // 실패(이미 만료/네트워크)해도 아래 로컬 정리는 그대로 진행한다.
    void authApi.logout().catch(() => {})
    persistToken(null)
    localStorage.removeItem(NAME_KEY)
    localStorage.removeItem(AVATAR_KEY)
    setTokenState(null)
    setDisplayName(null)
    setAvatarUrl(null)
  }, [])

  // client.ts가 세션 만료(401)를 감지하면 쏘는 전역 이벤트를 듣고 로그아웃한다.
  // 토큰이 null이 되면 RequireAuth가 자동으로 /login으로 보낸다.
  // 다른 탭에서 로그아웃(storage 이벤트로 access_token 제거)한 경우도 함께 반영한다.
  useEffect(() => {
    const onUnauthorized = () => logout()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token' && e.newValue === null) logout()
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized)
      window.removeEventListener('storage', onStorage)
    }
  }, [logout])

  const value = useMemo<AuthState>(
    () => ({
      token,
      userId: token ? userIdFromToken(token) : null,
      displayName,
      avatarUrl,
      login,
      signup,
      logout,
      setProfile,
    }),
    [token, displayName, avatarUrl, login, signup, logout, setProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
