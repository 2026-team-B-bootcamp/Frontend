// 라우팅 최상위 컴포넌트. 이 앱의 모든 화면(URL 경로)을 여기서 정의한다.
// 로그인이 필요한 경로는 RequireAuth로 감싸서, 토큰이 없으면 자동으로 /login으로 보낸다.
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './features/auth/RequireAuth'
import { LandingPage } from './features/landing/LandingPage'
import { LoginPage } from './features/auth/LoginPage'
import { SignupPage } from './features/auth/SignupPage'
import { ServerListPage } from './features/servers/ServerListPage'
import { ChatPage } from './features/chat/ChatPage'

// 서버 화면과 채널 화면이 같은 element를 공유한다 — 서버만 골라 들어온 경우
// ChatPage가 채널 목록을 불러와 첫 채널로 replace 이동하는데, 두 라우트가 같은
// 컴포넌트 트리라 React가 리마운트하지 않고 상태를 유지한다.
// (예전에는 /servers/:serverId 가 null을 렌더하는 별도 컴포넌트여서
//  서버 전환 때마다 화면 전체가 사라졌다 나타나는 플리커가 있었다)
const chatElement = (
  <RequireAuth>
    <ChatPage />
  </RequireAuth>
)

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      {/* 아래 경로들은 로그인해야만 볼 수 있어서 RequireAuth로 감싼다 (토큰 없으면 /login으로 리다이렉트) */}
      <Route
        path="/servers"
        element={
          <RequireAuth>
            <ServerListPage />
          </RequireAuth>
        }
      />
      <Route path="/servers/:serverId" element={chatElement} />
      <Route path="/servers/:serverId/channels/:channelId" element={chatElement} />
      {/* 예전 채널 경로는 서버 구조로 통합됨 */}
      <Route path="/channels/*" element={<Navigate to="/servers" replace />} />
      <Route path="*" element={<Navigate to="/servers" replace />} />
    </Routes>
  )
}

export default App
