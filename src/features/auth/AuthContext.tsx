import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { getToken, setToken as persistToken } from '../../shared/api/client'
import * as authApi from './api'
import { AuthContext, userIdFromToken, type AuthState } from './authContext'

const NAME_KEY = 'display_name'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [displayName, setDisplayName] = useState<string | null>(
    () => localStorage.getItem(NAME_KEY),
  )

  const applyToken = useCallback((newToken: string, name: string | null) => {
    persistToken(newToken)
    setTokenState(newToken)
    if (name) {
      localStorage.setItem(NAME_KEY, name)
      setDisplayName(name)
    }
  }, [])

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

  const logout = useCallback(() => {
    persistToken(null)
    localStorage.removeItem(NAME_KEY)
    setTokenState(null)
    setDisplayName(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      token,
      userId: token ? userIdFromToken(token) : null,
      displayName,
      login,
      signup,
      logout,
    }),
    [token, displayName, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
