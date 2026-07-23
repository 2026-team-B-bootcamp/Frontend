// 라우팅 보호(route guard) 컴포넌트. App.tsx에서 로그인 필요한 경로들을 이걸로 감싼다.
// 로그인 안 된 상태(token 없음)면 화면을 렌더링하지 않고 /login으로 튕겨낸다.
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { isTokenExpired, useAuth } from './authContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const location = useLocation()
  // 토큰이 없거나 이미 만료됐으면 화면을 그리지 않고 로그인으로 보낸다.
  // (만료 토큰으로 진입하면 이후 API·WS가 전부 실패하는 껍데기에 갇힌다)
  if (!token || isTokenExpired(token)) {
    // 로그인 후 원래 가려던 곳으로 돌아올 수 있도록 현재 위치(location)를 state로 함께 넘긴다
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}
