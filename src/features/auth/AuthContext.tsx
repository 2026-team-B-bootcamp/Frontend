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

  // 토큰이 있으면 서버에서 내 프로필(이름·사진)을 받아와 채운다.
  //
  // 예전엔 이름·사진을 localStorage에만 두고, 로그인 응답엔 이름이 없어서(login은
  // applyToken(token, null)) 새 브라우저에서 로그인하면 이름이 비고 아바타가 "?"로
  // 떴다. 업로드한 프로필 사진도 그 기기에서 직접 올린 게 아니면 영영 보이지 않았다.
  // 서버가 진짜 값을 갖고 있으니 진입 시 한 번 맞춰 온다(localStorage는 첫 렌더용 캐시).
  useEffect(() => {
    if (!token) return
    let active = true
    authApi
      .getMe()
      .then((me) => {
        if (!active) return
        localStorage.setItem(NAME_KEY, me.display_name)
        setDisplayName(me.display_name)
        if (me.avatar_url) localStorage.setItem(AVATAR_KEY, me.avatar_url)
        else localStorage.removeItem(AVATAR_KEY)
        setAvatarUrl(me.avatar_url)
      })
      .catch(() => {
        // 만료 토큰이면 client.ts가 auth:unauthorized를 쏴서 아래 리스너가 로그아웃시킨다.
        // 일시적 네트워크 오류라면 캐시된 값으로 그냥 진행한다.
      })
    return () => {
      active = false
    }
  }, [token])

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
