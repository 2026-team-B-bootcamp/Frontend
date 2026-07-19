import { createContext, useContext } from 'react'

export interface AuthState {
  token: string | null
  userId: number | null
  displayName: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

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
